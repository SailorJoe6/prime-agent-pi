#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	chmodSync,
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	binaryAssets,
	setBinaryVersion,
	validateBinaryAssets,
} from "../packages/coding-agent/scripts/copy-binary-assets.mjs";
import { releasePlatforms } from "./release-platforms.mjs";

const platforms = releasePlatforms;

export function assembleBinaryArchives({ binaryDir, artifactsDir, version, requireAll = true, platform: selected, piRelease }) {
	const versionPattern = piRelease ? /^\d+\.\d+\.\d+(?:\.\d+)?(?:-preview\.\d+)?$/ : /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
	if (!versionPattern.test(version)) throw new Error(`Invalid binary version: ${version}`);
	const available = readdirSync(binaryDir);
	const requested = selected ? platforms.filter((platform) => platform === selected) : platforms;
	const targets = requested.filter((platform) => available.includes(platform));
	if (targets.length === 0 || (requireAll && targets.length !== requested.length)) {
		throw new Error(`Missing compiled binaries; build all ${platforms.length} platforms before packing a release`);
	}
	mkdirSync(artifactsDir, { recursive: true });
	const archives = [];
	for (const platform of targets) {
		const source = join(binaryDir, platform);
		validateBinaryAssets(source);
		const binary = join(source, "prime-agent");
		if (!statSync(binary).isFile() || !(statSync(binary).mode & 0o111))
			throw new Error(`Missing executable: ${binary}`);
		const staging = mkdtempSync(join(tmpdir(), "prime-agent-archive-"));
		try {
			const assets = ["prime-agent", ...binaryAssets.filter((asset) => !piRelease || asset !== "install.sh")];
			for (const name of assets) cpSync(join(source, name), join(staging, name), { recursive: true });
			setBinaryVersion(staging, version);
			const identity = piRelease && { ...piRelease, platform };
			if (identity) {
				const metadataPath = join(staging, "package.json");
				const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
				metadata.description = "Prime Agent Pi";
				metadata.piRelease = identity;
				writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
				writeFileSync(join(staging, "pi-release.json"), `${JSON.stringify(identity, null, 2)}\n`);
				assets.push("pi-release.json");
			}
			chmodSync(join(staging, "prime-agent"), 0o755);
			const file = `${piRelease ? "prime-agent-pi" : "prime-agent"}-${version}-${platform}.tar.gz`;
			const output = join(artifactsDir, file);
			execFileSync("tar", ["-czf", output, "-C", staging, ...assets], {
				env: { ...process.env, COPYFILE_DISABLE: "1" },
			});
			archives.push({
				...identity,
				platform,
				file,
				sha256: createHash("sha256").update(readFileSync(output)).digest("hex"),
				executableSha256: createHash("sha256").update(readFileSync(binary)).digest("hex"),
			});
		} finally {
			rmSync(staging, { recursive: true, force: true });
		}
	}
	return archives;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	const [binaryDir, artifactsDir, version] = process.argv.slice(2);
	if (!binaryDir || !artifactsDir || !version)
		throw new Error("Usage: node scripts/assemble-release-archives.mjs <binary-dir> <out-dir> <version>");
	const archives = assembleBinaryArchives({
		binaryDir: resolve(binaryDir),
		artifactsDir: resolve(artifactsDir),
		version,
		requireAll: false,
	});
	writeFileSync(join(artifactsDir, "SHA256SUMS"), archives.map(({ sha256, file }) => `${sha256}  ${file}\n`).join(""));
	writeFileSync(
		join(artifactsDir, "binaries.json"),
		`${JSON.stringify({ version: `v${version}`, binaries: archives }, null, 2)}\n`,
	);
}
