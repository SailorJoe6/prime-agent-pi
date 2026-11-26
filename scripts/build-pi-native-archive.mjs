#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePiPackageVersion } from "../packages/coding-agent/src/utils/pi-release-version.ts";
import { assembleBinaryArchives } from "./assemble-release-archives.mjs";
import { releasePlatforms } from "./release-platforms.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [platform, catalogDir, output, inputVersion, sequence, ...extra] = process.argv.slice(2);
if (!releasePlatforms.includes(platform) || !catalogDir || !output || !inputVersion || extra.length ||
	(sequence !== undefined && !/^[1-9][0-9]*$/.test(sequence))) {
	throw new Error("Usage: tsx scripts/build-pi-native-archive.mjs TARGET CATALOG_CHECKOUT NEW_OUTPUT_DIR X.Y.Z[.R] [PREVIEW_SEQUENCE]");
}
const previewSequence = sequence === undefined ? undefined : Number(sequence);
const packageVersion = encodePiPackageVersion({ publicVersion: inputVersion, previewSequence });
const publicVersion = inputVersion.split(".").length === 4 && inputVersion.endsWith(".0") ? inputVersion.slice(0, -2) : inputVersion;
const version = previewSequence === undefined ? publicVersion : `${publicVersion}-preview.${previewSequence}`;
const catalog = resolve(catalogDir);
const artifactsDir = resolve(output);
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const sourceSha = git(root, "rev-parse", "HEAD");
const sourceDirty = Boolean(git(root, "status", "--porcelain"));
const catalogSha = git(catalog, "rev-parse", "HEAD");
if (git(catalog, "status", "--porcelain")) throw new Error("Catalog checkout must be clean");
const piRelease = { publicVersion, packageVersion, previewSequence, channel: sequence === undefined ? "stable" : "preview", sourceSha, sourceDirty, catalogSha };
const run = (script, args = []) => execFileSync(process.execPath, [script, ...args], { cwd: root, stdio: "inherit" });

mkdirSync(artifactsDir);
try {
	run("packages/coding-agent/scripts/catalog-assets.mjs", ["generate", "--catalog-dir", catalog]);
	run("packages/coding-agent/scripts/build-binary.mjs", ["--platform", platform]);
	const [receipt] = assembleBinaryArchives({ binaryDir: join(root, "packages/coding-agent/binaries"), artifactsDir, version, platform, piRelease });
	writeFileSync(join(artifactsDir, "SHA256SUMS"), `${receipt.sha256}  ${receipt.file}\n`);
	writeFileSync(join(artifactsDir, `pi-native-${platform}.json`), `${JSON.stringify(receipt, null, 2)}\n`);
	console.log(`Built ${receipt.file} (${receipt.sha256})`);
} catch (error) {
	rmSync(artifactsDir, { recursive: true, force: true });
	throw error;
}
