#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePiPackageVersion } from "../packages/coding-agent/dist/utils/pi-release-version.js";
import { copyPackageContents, createReleasePackageJson, packTarball, requireBuiltPackage } from "./pack-prime-agent-release.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageDirs = ["ai", "tui", "agent", "coding-agent"];

function packPiLocal(args) {
	const [inputVersion, flag, sequence] = args;
	if (!inputVersion || (args.length !== 1 && (args.length !== 3 || flag !== "--preview-sequence" || !/^[1-9][0-9]*$/.test(sequence)))) {
		throw new Error("Usage: node scripts/pack-prime-agent-pi-local.mjs X.Y.Z[.R] [--preview-sequence N]");
	}
	for (const packageDir of packageDirs) requireBuiltPackage(packageDir, true);
	const previewSequence = sequence === undefined ? undefined : Number(sequence);
	const packageVersion = encodePiPackageVersion({ publicVersion: inputVersion, previewSequence });
	const publicVersion = inputVersion.endsWith(".0") && inputVersion.split(".").length === 4
		? inputVersion.slice(0, -2) : inputVersion;
	const artifactVersion = `${publicVersion}${sequence === undefined ? "" : `-preview.${sequence}`}`;
	const identity = {
		publicVersion,
		packageVersion,
		channel: sequence === undefined ? "stable" : "preview",
		previewSequence,
		sourceSha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
		sourceDirty: Boolean(execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim()),
		localOnly: true,
	};
	const packages = packageDirs.map((packageDir) => {
		const source = JSON.parse(readFileSync(join(root, "packages", packageDir, "package.json"), "utf8"));
		const name = packageDir === "coding-agent" ? "prime-agent-pi" : source.name;
		return { packageDir, source, name, file: `${name.replace(/^@/, "").replace("/", "-")}-${artifactVersion}.tgz` };
	});
	const localSpecs = new Map(packages.map(({ source, file }) => [source.name, `file:./${file}`]));
	const outDir = mkdtempSync(join(tmpdir(), "prime-agent-pi-pack-"));
	const artifactsDir = join(outDir, "artifacts");
	try {
		mkdirSync(artifactsDir);
		const tarballs = packages.map(({ packageDir, source, name, file }) => {
			const stagingDir = join(outDir, "packages", packageDir);
			const staged = createReleasePackageJson(source, name, packageVersion, localSpecs);
			staged.piRelease = identity;
			staged.private = true;
			delete staged.scripts;
			if (packageDir === "coding-agent") {
				staged.description = "Prime Agent Pi";
				staged.bin = { "prime-agent": "dist/bundle/cli.js" };
			}
			copyPackageContents(join(root, "packages", packageDir), stagingDir, staged);
			cpSync(join(root, "LICENSE"), join(stagingDir, "LICENSE"));
			return packTarball(stagingDir, artifactsDir, name, file, ["--ignore-scripts", "--offline"]);
		});
		writeFileSync(join(artifactsDir, "pi-pack-receipt.json"), `${JSON.stringify({ ...identity, tarballs }, null, 2)}\n`);
		console.log(artifactsDir);
	} catch (error) {
		rmSync(outDir, { recursive: true, force: true });
		throw error;
	}
}

try {
	packPiLocal(process.argv.slice(2));
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
