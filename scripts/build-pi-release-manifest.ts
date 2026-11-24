#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { NATIVE_PLATFORMS } from "../packages/coding-agent/src/utils/native-installation.js";
import {
	parsePiReleaseManifest,
	PI_RELEASE_CHECKSUMS,
	PI_RELEASE_INSTALLER,
	PI_RELEASE_MANIFEST,
	record,
} from "../packages/coding-agent/src/utils/pi-release-manifest.js";

const identityFields = ["publicVersion", "previewSequence", "channel", "packageVersion", "sourceSha", "catalogSha"] as const;
const receiptName = (platform: string) => `pi-native-${platform}.json`;

async function receiptPaths(directory: string) {
	const entries = await readdir(directory, { withFileTypes: true });
	const directories = [directory, ...entries.filter((entry) => entry.isDirectory()).map((entry) => join(directory, entry.name))];
	const paths = new Map<string, string>();
	for (const dir of directories) {
		for (const entry of await readdir(dir, { withFileTypes: true })) {
			if (!entry.name.startsWith("pi-native-") || !entry.name.endsWith(".json")) continue;
			if (!entry.isFile() || !NATIVE_PLATFORMS.some((platform) => receiptName(platform) === entry.name)) {
				throw new Error(`Unexpected native receipt: ${join(dir, entry.name)}`);
			}
			if (paths.has(entry.name)) throw new Error(`Duplicate native receipt: ${entry.name}`);
			paths.set(entry.name, join(dir, entry.name));
		}
	}
	return NATIVE_PLATFORMS.map((platform) => {
		const path = paths.get(receiptName(platform));
		if (!path) throw new Error(`Missing native receipt: ${receiptName(platform)}`);
		return { platform, path };
	});
}

async function hashFile(path: string): Promise<string> {
	if (!(await lstat(path)).isFile()) throw new Error(`Expected a regular file: ${path}`);
	const hash = createHash("sha256");
	for await (const chunk of createReadStream(path)) hash.update(chunk);
	return hash.digest("hex");
}

async function buildManifest(artifactsDir: string, installerPath: string, outputDir: string) {
	const locations = await receiptPaths(artifactsDir);
	const archiveDirectories = new Map<string, string>();
	const binaries = [];
	let identity: Record<string, unknown> | undefined;
	for (const { platform, path } of locations) {
		const receipt = record(JSON.parse(await readFile(path, "utf8")));
		if (!receipt || receipt.platform !== platform) throw new Error(`Invalid platform in ${basename(path)}`);
		if (receipt.sourceDirty !== false) throw new Error(`Source checkout not marked clean in ${basename(path)}`);
		identity ??= receipt;
		for (const field of identityFields) {
			if (receipt[field] !== identity[field]) throw new Error(`Inconsistent ${field} in ${basename(path)}`);
		}
		archiveDirectories.set(platform, dirname(path));
		binaries.push({ platform, file: receipt.file, sha256: receipt.sha256, executableSha256: receipt.executableSha256 });
	}

	const { publicVersion, previewSequence, channel, packageVersion, sourceSha, catalogSha } = identity ?? {};
	if (typeof publicVersion !== "string" || (previewSequence !== undefined && typeof previewSequence !== "number")) {
		throw new Error("Invalid Pi release version in native receipts");
	}
	const runtimeVersion = previewSequence === undefined ? publicVersion : `${publicVersion}-preview.${previewSequence}`;
	const installer = { file: PI_RELEASE_INSTALLER, sha256: await hashFile(installerPath) };
	const manifest = parsePiReleaseManifest({
		schemaVersion: 1,
		tag: `pi-v${runtimeVersion}`,
		publicVersion,
		previewSequence,
		channel,
		packageVersion,
		sourceSha,
		catalogSha,
		binaries,
		installer,
	});
	if (!manifest) throw new Error("Native receipts do not form a valid Pi release manifest");
	for (const { platform, file, sha256 } of manifest.binaries) {
		const dir = archiveDirectories.get(platform);
		if (!dir || (await hashFile(join(dir, file))) !== sha256) throw new Error(`Archive checksum mismatch: ${file}`);
	}

	const inventory = [...manifest.binaries, manifest.installer].map(({ sha256, file }) => `${sha256}  ${file}\n`).join("");
	await mkdir(outputDir, { recursive: true });
	await writeFile(join(outputDir, PI_RELEASE_CHECKSUMS), inventory);
	await writeFile(join(outputDir, PI_RELEASE_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}

const [artifactsDir, installerPath, outputDir, ...extra] = process.argv.slice(2);
if (!artifactsDir || !installerPath || !outputDir || extra.length) {
	throw new Error("Usage: tsx scripts/build-pi-release-manifest.ts ARTIFACTS_DIR INSTALLER_PATH OUTPUT_DIR");
}
await buildManifest(artifactsDir, installerPath, outputDir);
