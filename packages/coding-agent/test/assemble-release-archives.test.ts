import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { assembleBinaryArchives } from "../../../scripts/assemble-release-archives.mjs";

const platform = "linux-x64-musl-baseline";
const sourcePackage = { name: "prime-agent", version: "0.9.8", description: "Legacy fixture" };
const provenance = { sourceSha: "a".repeat(40), catalogSha: "b".repeat(40) };
const preview = {
	...provenance,
	publicVersion: "0.10.2.10",
	packageVersion: "0.10.2-preview.3+pi.10",
	channel: "preview" as const,
	previewSequence: 3,
};
const stable = {
	...provenance,
	publicVersion: "0.10.2.10",
	packageVersion: "0.10.2+pi.10",
	channel: "stable" as const,
};

function makeCompiledTarget(source: string) {
	// The production validators require at least 42 transport tuples and 20 MCP services.
	const models = Array.from({ length: 50 }, (_, i) => ({
		id: "fixture",
		name: "Fixture model",
		provider: `fixture-${i}`,
		api: "openai-completions",
		baseUrl: `https://models-${i}.example.test/v1`,
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 4096,
	}));
	const entries = Array.from({ length: 25 }, (_, i) => {
		const server = `fixture-${i}`;
		const url = `https://${server}.example.test/mcp`;
		return {
			server,
			service: server,
			label: server,
			url,
			aliases: [],
			transport: { type: "http", url },
			auth: { strategy: "none" },
			setup: { status: "ready" },
			verification: { status: "unverified" },
			legacyBuiltin: false,
			provenance: [{ source: "prime" }],
		};
	});
	const files: Record<string, string> = {
		"prime-agent": "#!/bin/sh\nexit 0\n",
		"package.json": JSON.stringify(sourcePackage),
		"models.bundled.json": JSON.stringify({ schemaVersion: 1, models }),
		"mcp-services.bundled.json": JSON.stringify({ version: 2, entries }),
	};
	for (const name of [
		"install.sh",
		"README.md",
		"CHANGELOG.md",
		"LICENSE",
		"skills/test/SKILL.md",
		"docs/index.md",
		"assets/test.txt",
		"examples/test.ts",
		"photon_rs_bg.wasm",
		"prime-agent-runtime/pyproject.toml",
		"prime-agent-runtime/src/rlm/repl.py",
		"theme/prime.json",
		"theme/dark.json",
		"theme/light.json",
		"export-html/template.html",
		"export-html/template.css",
		"export-html/template.js",
		"export-html/vendor/marked.min.js",
		"export-html/vendor/highlight.min.js",
	])
		files[name] = `fixture content for ${name}\n`;
	for (const [name, content] of Object.entries(files)) {
		const path = join(source, name);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, content, { mode: name === "prime-agent" ? 0o755 : 0o644 });
	}
	return files;
}

function withCompiledTarget(
	check: (fixture: {
		binaryDir: string;
		artifactsDir: string;
		source: string;
		unpacked: string;
		files: Record<string, string>;
	}) => void,
) {
	const root = mkdtempSync(join(tmpdir(), "assemble-release-archives-test-"));
	try {
		const binaryDir = join(root, "compiled");
		const artifactsDir = join(root, "artifacts");
		const source = join(binaryDir, platform);
		const unpacked = join(root, "unpacked");
		mkdirSync(unpacked);
		check({ binaryDir, artifactsDir, source, unpacked, files: makeCompiledTarget(source) });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

function topLevelFiles(files: Record<string, string>) {
	return [...new Set(Object.keys(files).map((name) => name.split("/")[0]))];
}

function sha256(path: string) {
	return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, "utf8"));
}

describe("assembleBinaryArchives (PAPI-61)", () => {
	it.each([
		{ piRelease: stable, version: "0.10.2.10", file: "prime-agent-pi-0.10.2.10-linux-x64-musl-baseline.tar.gz" },
		{
			piRelease: preview,
			version: "0.10.2.10-preview.3",
			file: "prime-agent-pi-0.10.2.10-preview.3-linux-x64-musl-baseline.tar.gz",
		},
	])("assembles the $piRelease.channel Pi identity into the archive and its entry", ({ piRelease, version, file }) => {
		withCompiledTarget(({ binaryDir, artifactsDir, source, unpacked, files }) => {
			const archives = assembleBinaryArchives({ binaryDir, artifactsDir, version, piRelease, requireAll: false });
			expect(readdirSync(artifactsDir)).toEqual([file]);
			const archive = join(artifactsDir, file);
			execFileSync("tar", ["-xzf", archive, "-C", unpacked]);
			const identity = { ...piRelease, platform };
			const binary = join(unpacked, "prime-agent");
			expect(statSync(binary).mode & 0o111).not.toBe(0);
			expect(archives).toEqual([
				{ ...identity, file, sha256: sha256(archive), executableSha256: sha256(join(source, "prime-agent")) },
			]);
			expect(sha256(binary)).toBe(sha256(join(source, "prime-agent")));
			expect(readdirSync(unpacked).sort()).toEqual(
				["pi-release.json", ...topLevelFiles(files).filter((name) => name !== "install.sh")].sort(),
			);
			expect(readJson(join(unpacked, "package.json"))).toEqual({
				...sourcePackage,
				version,
				description: "Prime Agent Pi",
				piRelease: identity,
			});
			expect(readJson(join(unpacked, "pi-release.json"))).toEqual(identity);
			expect(existsSync(join(source, "pi-release.json"))).toBe(false);
			for (const [name, content] of Object.entries(files)) {
				expect(readFileSync(join(source, name), "utf8"), name).toBe(content);
				if (name !== "package.json" && name !== "install.sh") {
					expect(readFileSync(join(unpacked, name), "utf8"), name).toBe(content);
				}
			}
		});
	});

	it("keeps the legacy archive layout and entry when Pi identity is omitted", () => {
		withCompiledTarget(({ binaryDir, artifactsDir, source, unpacked, files }) => {
			const version = "0.9.9-preview.2";
			const file = "prime-agent-0.9.9-preview.2-linux-x64-musl-baseline.tar.gz";
			const archives = assembleBinaryArchives({ binaryDir, artifactsDir, version, requireAll: false });
			expect(readdirSync(artifactsDir)).toEqual([file]);
			const archive = join(artifactsDir, file);
			execFileSync("tar", ["-xzf", archive, "-C", unpacked]);
			expect(archives).toEqual([
				{ platform, file, sha256: sha256(archive), executableSha256: sha256(join(source, "prime-agent")) },
			]);
			expect(readdirSync(unpacked).sort()).toEqual(topLevelFiles(files).sort());
			expect(readJson(join(unpacked, "package.json"))).toEqual({ ...sourcePackage, version });
		});
	});

	it("rejects missing Pi release targets by default before writing an archive", () => {
		withCompiledTarget(({ binaryDir, artifactsDir }) => {
			expect(() =>
				assembleBinaryArchives({ binaryDir, artifactsDir, version: "0.10.2.10-preview.3", piRelease: preview }),
			).toThrow(/missing compiled binaries/i);
			expect(existsSync(artifactsDir)).toBe(false);
		});
	});
});
