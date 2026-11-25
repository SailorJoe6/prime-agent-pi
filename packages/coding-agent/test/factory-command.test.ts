import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ENV_AGENT_DIR } from "../src/config.js";
import { getKernelVenvDir, kernelVenvPython } from "../src/core/kernel/bootstrap.js";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const cli = join(repo, "packages/coding-agent/src/cli.ts");
const tsxLoader = join(repo, "node_modules/tsx/dist/loader.mjs");

function kernelPython(): string {
	// test:ci provisions the native kernel before Vitest. Resolve it before isolating the child's home.
	const python =
		process.env.PRIME_AGENT_KERNEL_PYTHON ||
		[
			kernelVenvPython(getKernelVenvDir()),
			kernelVenvPython(
				join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "prime/agent/kernel-venv"),
			),
		].find((candidate) => existsSync(candidate));
	if (!python)
		throw new Error("Factory CLI tests require the kernel provisioned by test:ci or PRIME_AGENT_KERNEL_PYTHON.");
	return python;
}

function fixture(name: string, description: string, dependency = "outline"): Buffer {
	return Buffer.from(
		[
			"---",
			`name: ${name}`,
			`description: ${description}`,
			'version: "2.1"',
			"author: Format Team",
			"---",
			"",
			"Notes on document formatting — preserve this prose and line endings.",
			"",
			"```machine-spec",
			'{ "nodes": [',
			'  { "id": "outline", "subagent": { "prompt": "Outline the document." } },',
			`  { "id": "format", "depends_on": ["${dependency}"], "subagent": { "prompt": "Format the document." } }`,
			"] }",
			"```",
		].join("\r\n"),
	);
}

function writeFixture(path: string, bytes: Buffer): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, bytes);
}

function runCli(root: string, python: string, ...args: string[]) {
	const result = spawnSync(process.execPath, ["--import", tsxLoader, cli, ...args], {
		cwd: root,
		encoding: "utf8",
		input: "",
		timeout: 25_000,
		windowsHide: true,
		env: {
			PATH: process.env.PATH,
			SystemRoot: process.env.SystemRoot,
			HOME: root,
			USERPROFILE: root,
			DO_NOT_TRACK: "1",
			NO_COLOR: "1",
			TSX_TSCONFIG_PATH: join(repo, "tsconfig.json"),
			[ENV_AGENT_DIR]: join(root, "agent"),
			PRIME_AGENT_MACHINES_DIR: join(root, "shared"),
			PRIME_AGENT_KERNEL_PYTHON: python,
			PYTHONPATH: process.env.PYTHONPATH,
			PRIME_AGENT_KERNEL_VENV: join(root, "unexpected-kernel-venv"),
			PRIME_AGENT_INSTALL_UV: "0",
		},
	});
	if (result.error) throw result.error;
	expect(result.signal, result.stderr).toBeNull();
	return result;
}

function withLibrary(test: (root: string) => void): void {
	const root = mkdtempSync(join(realpathSync(tmpdir()), "prime-factory-cli-"));
	try {
		test(root);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

function successJson(result: ReturnType<typeof runCli>): unknown {
	expect(result.status, result.stderr).toBe(0);
	expect(result.stderr).toBe("");
	return JSON.parse(result.stdout);
}

function expectFailure(result: ReturnType<typeof runCli>, message: RegExp): void {
	expect(result.status).not.toBe(0);
	expect(result.stdout).toBe("");
	expect(result.stderr).toMatch(message);
}

describe("factory sharing CLI", () => {
	it("advertises factory commands and prints their help without a usable Python", () => {
		withLibrary((root) => {
			const python = join(root, "missing-python");
			const overview = runCli(root, python, "help");
			expect(overview.status, overview.stderr).toBe(0);
			expect(overview.stdout).toMatch(/^\s+factory\s+/m);

			const help = runCli(root, python, "help", "factory");
			expect(help.status, help.stderr).toBe(0);
			expect(help.stderr).toBe("");
			for (const op of ["list", "import", "export"]) {
				expect(help.stdout).toMatch(new RegExp(`^ +${op} +`, "m"));
			}
		});
	});

	it.each([
		{ args: ["list", "extra"], message: /usage.*factory list/i },
		{ args: ["import"], message: /usage.*factory import/i },
		{ args: ["export", "format-doc", "--out"], message: /--out.*path/i },
	])("rejects malformed factory arguments: $args", ({ args, message }) => {
		withLibrary((root) => {
			expectFailure(runCli(root, join(root, "missing-python"), "factory", ...args), message);
		});
	});

	it("PAPI-12: imports, replaces, lists and exports authored bytes without overwriting an existing output", () => {
		withLibrary((root) => {
			const python = kernelPython();
			const input = join(root, "input copy", "MACHINE.md");
			const path = join(root, "agent", "machines", "format-doc", "MACHINE.md");
			const out = join(root, "output copy", "MACHINE.md");
			const raw = fixture("format-doc", "Format a document");
			writeFixture(input, raw);

			expect(successJson(runCli(root, python, "factory", "import", input, "--json"))).toEqual({
				ok: true,
				name: "format-doc",
				path,
				created: true,
			});
			expect(readFileSync(path)).toEqual(raw);
			expect(successJson(runCli(root, python, "factory", "list", "--json"))).toEqual({
				ok: true,
				machines: [
					{
						name: "format-doc",
						description: "Format a document",
						version: "2.1",
						author: "Format Team",
						source: "user",
						path,
					},
				],
				warnings: [],
			});
			expect(successJson(runCli(root, python, "factory", "export", "format-doc", "--out", out, "--json"))).toEqual({
				ok: true,
				name: "format-doc",
				path: out,
				source: "library",
			});
			expect(readFileSync(out)).toEqual(raw);

			const existing = Buffer.from("Existing output\n");
			writeFileSync(out, existing);
			expectFailure(runCli(root, python, "factory", "export", "format-doc", "--out", out, "--json"), /exist/i);
			expect(readFileSync(out)).toEqual(existing);

			const replacement = fixture("format-doc", "Updated document formatting");
			writeFileSync(input, replacement);
			expect(successJson(runCli(root, python, "factory", "import", input, "--json"))).toEqual({
				ok: true,
				name: "format-doc",
				path,
				created: false,
			});
			expect(readFileSync(path)).toEqual(replacement);
		});
	});

	it("rejects an unknown dependency without creating or replacing an installed machine", () => {
		withLibrary((root) => {
			const python = kernelPython();
			const input = join(root, "input", "MACHINE.md");
			const installed = join(root, "agent", "machines", "format-doc", "MACHINE.md");
			writeFixture(input, fixture("format-doc", "Invalid version", "missing-section"));

			expectFailure(runCli(root, python, "factory", "import", input, "--json"), /missing-section/);
			expect(existsSync(installed)).toBe(false);

			const previous = fixture("format-doc", "Installed version");
			writeFixture(installed, previous);
			expectFailure(runCli(root, python, "factory", "import", input, "--json"), /missing-section/);
			expect(readFileSync(installed)).toEqual(previous);
		});
	});

	it.each(["text", "json"] as const)(
		"PAPI-12: lists one %s warning per broken file, even with the same name",
		(mode) => {
			withLibrary((root) => {
				const python = kernelPython();
				const path = join(root, "shared", "format-doc", "MACHINE.md");
				const broken = [
					{ path: join(root, "shared", "broken-first", "MACHINE.md"), dependency: "unknown-section" },
					{ path: join(root, "shared", "broken-second", "MACHINE.md"), dependency: "unknown-heading" },
				];
				writeFixture(path, fixture("format-doc", "Format a document"));
				for (const entry of broken) {
					writeFixture(entry.path, fixture("broken-doc", "Broken", entry.dependency));
				}

				const args = mode === "json" ? ["--json"] : [];
				const listed = runCli(root, python, "factory", "list", ...args);
				let warnings: string[];
				if (mode === "json") {
					const result = successJson(listed) as { ok: boolean; warnings: string[] };
					expect(result.ok).toBe(true);
					warnings = result.warnings;
				} else {
					expect(listed.status, listed.stderr).toBe(0);
					warnings = listed.stderr.trimEnd().split(/\r?\n/);
				}
				expect(warnings).toHaveLength(broken.length);
				for (const entry of broken) {
					const prefix = `${mode === "text" ? "Warning: " : ""}${entry.path}:`;
					expect(warnings.filter((warning) => warning.startsWith(prefix))).toEqual([
						expect.stringContaining(entry.dependency),
					]);
				}
				if (mode === "text") expect(listed.stdout).toMatch(/format-doc\s+repo\s+Format a document/);
			});
		},
	);

	it("distinguishes a broken declared name from a missing name when exporting", () => {
		withLibrary((root) => {
			const python = kernelPython();
			writeFixture(
				join(root, "shared", "broken-first", "MACHINE.md"),
				fixture("broken-doc", "Broken", "unknown-section"),
			);
			writeFixture(
				join(root, "shared", "broken-second", "MACHINE.md"),
				fixture("broken-doc", "Broken", "unknown-heading"),
			);
			expectFailure(
				runCli(root, python, "factory", "export", "broken-doc", "--out", "broken.md"),
				/unknown-section/,
			);
			expectFailure(
				runCli(root, python, "factory", "export", "missing-doc", "--out", "missing.md"),
				/no matching MACHINE\.md/,
			);
		});
	});

	it("PAPI-12: lists and exports the repo definition when a user definition has the same name", () => {
		withLibrary((root) => {
			const python = kernelPython();
			const shared = join(root, "shared", "format-doc", "MACHINE.md");
			const personal = join(root, "agent", "machines", "format-doc", "MACHINE.md");
			const out = join(root, "output", "MACHINE.md");
			const raw = fixture("format-doc", "Shared definition");
			writeFixture(shared, raw);
			writeFixture(personal, fixture("format-doc", "Personal definition"));

			expect(successJson(runCli(root, python, "factory", "list", "--json"))).toEqual({
				ok: true,
				machines: [
					{
						name: "format-doc",
						description: "Shared definition",
						version: "2.1",
						author: "Format Team",
						source: "repo",
						path: shared,
					},
				],
				warnings: [],
			});
			expect(successJson(runCli(root, python, "factory", "export", "format-doc", "--out", out, "--json"))).toEqual({
				ok: true,
				name: "format-doc",
				path: out,
				source: "library",
			});
			expect(readFileSync(out)).toEqual(raw);
		});
	});
});
