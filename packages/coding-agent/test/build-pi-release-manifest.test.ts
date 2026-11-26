import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	appendFileSync,
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const script = join(root, "scripts/build-pi-release-manifest.ts");
const rehearsal = join(root, "scripts/rehearse-pi-release.ts");
const tsx = join(root, "node_modules/tsx/dist/cli.mjs");
const platforms = [
	"darwin-arm64",
	"darwin-x64",
	"linux-arm64",
	"linux-arm64-musl",
	"linux-x64",
	"linux-x64-baseline",
	"linux-x64-musl",
	"linux-x64-musl-baseline",
];
const checksum = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");

let directory: string;
beforeEach(() => {
	directory = mkdtempSync(join(tmpdir(), "pi-release-manifest-"));
});
afterEach(() => {
	rmSync(directory, { recursive: true, force: true });
});

function fixture(layout: "flat" | "nested" = "flat", previewSequence?: number) {
	const artifacts = join(directory, "artifacts");
	const output = join(directory, "output");
	const installerPath = join(directory, "installer-fixture.sh");
	const installerBytes = "#!/bin/sh\n# Installer fixture only\n";
	writeFileSync(installerPath, installerBytes);
	const identity = {
		publicVersion: "0.10.2.10",
		...(previewSequence === undefined ? {} : { previewSequence }),
		channel: previewSequence === undefined ? "stable" : "preview",
		packageVersion: previewSequence === undefined ? "0.10.2+pi.10" : "0.10.2-preview.3+pi.10",
		sourceSha: "a".repeat(40),
		catalogSha: "b".repeat(40),
	};
	const runtimeVersion = previewSequence === undefined ? "0.10.2.10" : "0.10.2.10-preview.3";
	const entries = platforms.map((platform) => {
		const dir = layout === "flat" ? artifacts : join(artifacts, `artifact-${platform}`);
		mkdirSync(dir, { recursive: true });
		const file = `prime-agent-pi-${runtimeVersion}-${platform}.tar.gz`;
		const archivePath = join(dir, file);
		const receiptPath = join(dir, `pi-native-${platform}.json`);
		const executable = `fixture executable: ${platform}`;
		const bytes = gzipSync(executable);
		const binary = { platform, file, sha256: checksum(bytes), executableSha256: checksum(executable) };
		const receipt = { ...identity, sourceDirty: false, ...binary };
		writeFileSync(archivePath, bytes);
		writeFileSync(receiptPath, JSON.stringify(receipt));
		return { binary, receipt, receiptPath, archivePath };
	});
	return {
		output,
		artifacts,
		installerPath,
		entries,
		expected: {
			schemaVersion: 1,
			tag: `pi-v${runtimeVersion}`,
			...identity,
			binaries: entries.map(({ binary }) => binary),
			installer: { file: "install-pi.sh", sha256: checksum(installerBytes) },
		},
		run: () => spawnSync(process.execPath, [tsx, script, artifacts, installerPath, output], { encoding: "utf8" }),
	};
}

function assertRejected(candidate: ReturnType<typeof fixture>, error: RegExp) {
	const result = candidate.run();
	expect(result.status, result.stderr).toBe(1);
	expect(result.stderr).toMatch(error);
	expect(existsSync(join(candidate.output, "pi-release-manifest.json"))).toBe(false);
	expect(existsSync(join(candidate.output, "SHA256SUMS"))).toBe(false);
}

describe("build-pi-release-manifest CLI", () => {
	it.each([
		["flat", undefined],
		["nested", 3],
	] as const)("writes the exact schema and checksum inventory for %s artifacts", (layout, previewSequence) => {
		const candidate = fixture(layout, previewSequence);
		const result = candidate.run();
		expect(result.status, result.stderr).toBe(0);
		const actual = JSON.parse(readFileSync(join(candidate.output, "pi-release-manifest.json"), "utf8"));
		expect(actual).toEqual(candidate.expected);
		const inventory = [...candidate.expected.binaries, candidate.expected.installer]
			.map(({ sha256, file }) => `${sha256}  ${file}\n`)
			.join("");
		expect(readFileSync(join(candidate.output, "SHA256SUMS"), "utf8")).toBe(inventory);
	});

	it.each([
		["dirty source", { sourceDirty: true }, /not marked clean/],
		["wrong platform", { platform: "darwin-arm64" }, /Invalid platform/],
		["mixed source commits", { sourceSha: "c".repeat(40) }, /Inconsistent sourceSha/],
		["mixed catalog commits", { catalogSha: "c".repeat(40) }, /Inconsistent catalogSha/],
		["mixed versions", { publicVersion: "0.10.3" }, /Inconsistent publicVersion/],
		["wrong archive filename", { file: "renamed.tar.gz" }, /valid Pi release manifest/],
	] as const)("rejects %s", (_name, changes, error) => {
		const candidate = fixture();
		const { receiptPath, receipt } = candidate.entries[candidate.entries.length - 1];
		writeFileSync(receiptPath, JSON.stringify({ ...receipt, ...changes }));
		assertRejected(candidate, error);
	});

	it("rejects consistently wrong package encoding", () => {
		const candidate = fixture();
		for (const { receiptPath, receipt } of candidate.entries) {
			writeFileSync(receiptPath, JSON.stringify({ ...receipt, packageVersion: "0.10.2.10" }));
		}
		assertRejected(candidate, /valid Pi release manifest/);
	});

	it("rejects an incomplete receipt set", () => {
		const candidate = fixture();
		rmSync(candidate.entries[0].receiptPath);
		assertRejected(candidate, /Missing native receipt/);
	});

	it("rejects a duplicate in flat and per-artifact directories", () => {
		const candidate = fixture("nested");
		const { receiptPath } = candidate.entries[0];
		copyFileSync(receiptPath, join(candidate.artifacts, "pi-native-darwin-arm64.json"));
		assertRejected(candidate, /Duplicate native receipt/);
	});

	it("rejects an archive whose bytes changed after receipt creation", () => {
		const candidate = fixture();
		appendFileSync(candidate.entries[candidate.entries.length - 1].archivePath, "changed");
		assertRejected(candidate, /Archive checksum mismatch/);
	});
});

function rehearse(candidate: ReturnType<typeof fixture>, source = candidate.expected.sourceSha) {
	return spawnSync(process.execPath, [tsx, rehearsal, candidate.artifacts, candidate.installerPath, source], {
		cwd: directory,
		env: { HOME: directory, USERPROFILE: directory, PATH: "" },
		encoding: "utf8",
	});
}

function snapshot() {
	return readdirSync(directory, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => {
			const path = join(entry.parentPath, entry.name);
			return `${path} ${checksum(readFileSync(path))}`;
		})
		.sort();
}

describe("rehearse-pi-release CLI", () => {
	it.each([3, undefined])(
		"connects all eight inputs to a fixture decision without changing files (preview sequence %s)",
		(sequence) => {
			const candidate = fixture("nested", sequence);
			const before = snapshot();
			const result = rehearse(candidate);
			expect(result.status, result.stderr).toBe(0);
			const report = JSON.parse(result.stdout);
			expect(report.mode).toBe("nonpublishing-dry-run");
			expect(JSON.parse(report.manifestJson)).toEqual(candidate.expected);
			const assets = [...candidate.expected.binaries, candidate.expected.installer];
			expect(report.checksums).toBe(assets.map(({ sha256, file }) => `${sha256}  ${file}\n`).join(""));
			expect(report.assetDigests).toEqual(Object.fromEntries(assets.map(({ file, sha256 }) => [file, sha256])));
			expect(report.fixtureOnly.source.after).toBe(candidate.expected.sourceSha);
			expect(report.fixtureOnly.checks.repository.reference).toMatch(/^fixture-only:/);
			expect(report.fixtureOnly.decision).toEqual(
				sequence === undefined
					? { kind: "denied", reason: "missing-or-mismatched-stable-bump" }
					: {
							kind: "fixture-candidate",
							tag: candidate.expected.tag,
							prerelease: true,
							subject: checksum(
								JSON.stringify([
									"pi-publication-v1",
									report.manifestJson,
									report.checksums,
									report.fixtureOnly.releaseNotes,
								]),
							),
						},
			);
			expect(snapshot()).toEqual(before);
		},
	);

	it.each(["mixed receipt source", "wrong expected source", "changed archive"] as const)(
		"emits no decision for %s",
		(mismatch) => {
			const candidate = fixture("flat", 3);
			const { receipt, receiptPath, archivePath } = candidate.entries[7];
			const otherSource = "c".repeat(40);
			if (mismatch === "mixed receipt source")
				writeFileSync(receiptPath, JSON.stringify({ ...receipt, sourceSha: otherSource }));
			if (mismatch === "changed archive") appendFileSync(archivePath, "changed");
			const result = rehearse(candidate, mismatch === "wrong expected source" ? otherSource : undefined);
			expect(result.status).toBe(1);
			expect(result.stdout).toBe("");
			expect(result.stderr).toMatch(
				{
					"mixed receipt source": /Inconsistent sourceSha/,
					"wrong expected source": /does not match expected source SHA/,
					"changed archive": /Archive checksum mismatch/,
				}[mismatch],
			);
		},
	);
});
