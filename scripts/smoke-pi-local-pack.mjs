#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const [artifacts, cache] = process.argv.slice(2);
if (!artifacts || !cache || process.platform !== "darwin") {
	throw new Error("macOS usage (from repo root): node scripts/smoke-pi-local-pack.mjs ARTIFACTS NPM_CACHE");
}
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, data) => writeFileSync(path, JSON.stringify(data));
const { tarballs, ...identity } = readJson(join(artifacts, "pi-pack-receipt.json"));
assert.equal(identity.localOnly, true);
assert.deepEqual(tarballs.map(({ name }) => name).sort(), [
	"@earendil-works/pi-agent-core", "@earendil-works/pi-ai", "@earendil-works/pi-tui", "prime-agent-pi",
]);
const cli = tarballs.find(({ name }) => name === "prime-agent-pi");
const manifest = { name: "pi-pack-smoke", private: true, dependencies: { [cli.name]: `file:./${cli.file}` } };
const workspaceLock = readJson("package-lock.json");
const scratch = mkdtempSync(join(tmpdir(), "pi-install-smoke-"));
try {
	const installDir = join(scratch, "install");
	const home = join(scratch, "home");
	const cwd = join(scratch, "empty");
	for (const dir of [installDir, home, cwd]) mkdirSync(dir);
	for (const { file, sha256 } of tarballs) {
		const path = join(artifacts, file);
		assert.equal(createHash("sha256").update(readFileSync(path)).digest("hex"), sha256, file);
		copyFileSync(path, join(installDir, file));
	}
	writeJson(join(installDir, "package.json"), manifest);
	writeJson(join(installDir, "package-lock.json"), {
		name: manifest.name,
		lockfileVersion: workspaceLock.lockfileVersion,
		packages: {
			"": manifest,
			...Object.fromEntries(Object.entries(workspaceLock.packages).filter(([key, value]) => key.startsWith("node_modules/") && !value.link)),
		},
	});
	const env = { PATH: process.env.PATH, HOME: home, TMPDIR: scratch, TERM: "xterm", PI_STARTUP_BENCHMARK: "1", UV_OFFLINE: "1" };
	execFileSync("npm", ["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", "--cache", resolve(cache)], {
		cwd: installDir, env, stdio: "inherit",
	});
	const installedLock = readJson(join(installDir, "package-lock.json"));
	for (const { name, file } of tarballs) {
		const key = `node_modules/${name}`;
		const installed = readJson(join(installDir, key, "package.json"));
		assert.equal(installed.name, name);
		assert.equal(installed.version, identity.packageVersion);
		assert.deepEqual(installed.piRelease, identity);
		assert.equal(installedLock.packages[key].resolved, `file:${file}`);
		assert.ok(existsSync(join(installDir, key, "LICENSE")));
		if (name === cli.name) {
			assert.equal(installed.description, "Prime Agent Pi");
			assert.deepEqual(installed.bin, { "prime-agent": "dist/bundle/cli.js" });
		}
	}
	const fixture = join(cwd, "extension.ts");
	const marker = join(cwd, "extension-ok");
	writeFileSync(fixture, `
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Agent } from "@earendil-works/pi-agent-core";
import { getModels } from "@earendil-works/pi-ai";
export default function () {
	for (const value of [SessionManager.inMemory, Text, Agent, getModels]) assert.equal(typeof value, "function");
	writeFileSync(${JSON.stringify(marker)}, "extension-ok");
	process.exit(0);
}
`);
	const socket = join(scratch, "private.sock");
	execFileSync("/usr/bin/script", ["-q", "/dev/null", join(installDir, "node_modules/.bin/prime-agent"),
		"--offline", "--no-session", "--no-extensions", "--no-skills", "--no-prompt-templates", "--no-context-files", "--daemon-socket", socket, "-e", fixture,
	], { cwd, env, stdio: ["ignore", "inherit", "inherit"], timeout: 15_000 });
	assert.equal(readFileSync(marker, "utf8"), "extension-ok");
	assert.ok(!existsSync(socket));
	console.log(`Local install and four extension imports passed: ${identity.publicVersion} (${identity.packageVersion})`);
} finally {
	rmSync(scratch, { recursive: true, force: true });
}
