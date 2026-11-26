import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ENV_AGENT_DIR,
	SELF_UPDATE_INTERACTIVE_CHILD_ENV,
	SELF_UPDATE_NOT_ATTEMPTED_EXIT_CODE,
} from "../src/config.js";
import { main } from "../src/main.js";
import { handlePackageCommand } from "../src/package-manager-cli.js";

function restoreEnv(name: string, value: string | undefined): void {
	if (value === undefined) {
		delete process.env[name];
		return;
	}
	process.env[name] = value;
}

async function runSelfUpdateInstallChild(args: string[]): Promise<void> {
	const previousValue = process.env[SELF_UPDATE_INTERACTIVE_CHILD_ENV];
	process.env[SELF_UPDATE_INTERACTIVE_CHILD_ENV] = "1";
	try {
		await main(args);
	} finally {
		restoreEnv(SELF_UPDATE_INTERACTIVE_CHILD_ENV, previousValue);
	}
}

describe("package commands", () => {
	let tempDir: string;
	let agentDir: string;
	let projectDir: string;
	let packageDir: string;
	let originalCwd: string;
	let originalAgentDir: string | undefined;
	let originalPiPackageDir: string | undefined;
	let originalExitCode: typeof process.exitCode;
	let originalExecPath: string;

	beforeEach(() => {
		tempDir = join(tmpdir(), `pi-package-commands-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		agentDir = join(tempDir, "agent");
		projectDir = join(tempDir, "project");
		packageDir = join(tempDir, "local-package");
		mkdirSync(agentDir, { recursive: true });
		mkdirSync(projectDir, { recursive: true });
		mkdirSync(packageDir, { recursive: true });

		originalCwd = process.cwd();
		originalAgentDir = process.env[ENV_AGENT_DIR];
		originalPiPackageDir = process.env.PI_PACKAGE_DIR;
		originalExitCode = process.exitCode;
		originalExecPath = process.execPath;
		process.exitCode = undefined;
		process.env[ENV_AGENT_DIR] = agentDir;
		process.chdir(projectDir);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		process.chdir(originalCwd);
		process.exitCode = originalExitCode;
		restoreEnv(ENV_AGENT_DIR, originalAgentDir);
		restoreEnv("PI_PACKAGE_DIR", originalPiPackageDir);
		Object.defineProperty(process, "execPath", { value: originalExecPath, configurable: true });
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("should persist global relative local package paths relative to settings.json", async () => {
		const relativePkgDir = join(projectDir, "packages", "local-package");
		mkdirSync(relativePkgDir, { recursive: true });

		await main(["package", "install", "./packages/local-package"]);

		const settingsPath = join(agentDir, "settings.json");
		const settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as { packages?: string[] };
		expect(settings.packages?.length).toBe(1);
		const stored = settings.packages?.[0] ?? "";
		const resolvedFromSettings = realpathSync(join(agentDir, stored));
		expect(resolvedFromSettings).toBe(realpathSync(relativePkgDir));
	});

	it("should remove local packages using a path with a trailing slash", async () => {
		await main(["package", "install", `${packageDir}/`]);

		const settingsPath = join(agentDir, "settings.json");
		const installedSettings = JSON.parse(readFileSync(settingsPath, "utf-8")) as { packages?: string[] };
		expect(installedSettings.packages?.length).toBe(1);

		await main(["package", "remove", `${packageDir}/`]);

		const removedSettings = JSON.parse(readFileSync(settingsPath, "utf-8")) as { packages?: string[] };
		expect(removedSettings.packages ?? []).toHaveLength(0);
	});

	it("rejects combining --nightly and --stable", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		try {
			await expect(main(["update", "--nightly", "--stable"])).resolves.toBeUndefined();

			const stderr = errorSpy.mock.calls.map(([message]) => String(message)).join("\n");
			expect(stderr).toContain("and --stable cannot be combined");
			expect(process.exitCode).toBe(1);
		} finally {
			errorSpy.mockRestore();
		}
	});

	it("refuses to switch to the preview channel without a TTY or --force and changes nothing", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		try {
			await expect(main(["update", "--preview"])).resolves.toBeUndefined();

			const stderr = errorSpy.mock.calls.map(([message]) => String(message)).join("\n");
			expect(stderr).toContain("Switching to the preview channel needs confirmation");
			expect(process.exitCode).toBe(1);
			const settingsPath = join(agentDir, "settings.json");
			if (existsSync(settingsPath)) {
				expect(JSON.parse(readFileSync(settingsPath, "utf8")).updateChannel).toBeUndefined();
			}
		} finally {
			errorSpy.mockRestore();
			logSpy.mockRestore();
		}
	});

	it("PAPI-61 preserves extension updates when the self target needs a manual update", async () => {
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		await expect(handlePackageCommand(["update", "--preview", "--force"])).resolves.toBe(true);

		expect(logSpy.mock.calls.flat().join(" ")).toContain("Updated packages");
		expect(errorSpy.mock.calls.flat().join(" ")).toContain("https://github.com/SailorJoe6/prime-agent-pi/releases");
		expect(process.exitCode).toBeUndefined();
		expect(existsSync(join(agentDir, "settings.json"))).toBe(false);
	});

	it("rejects --nightly for extension-only updates instead of silently ignoring it", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		try {
			await expect(handlePackageCommand(["update", "--extensions", "--nightly"])).resolves.toBe(true);

			const stderr = errorSpy.mock.calls.map(([message]) => String(message)).join("\n");
			expect(stderr).toContain("only apply to Prime Agent itself");
			expect(process.exitCode).toBe(1);
		} finally {
			errorSpy.mockRestore();
		}
	});

	it("PAPI-61 does not query or invoke an npm fallback even for a forced interactive update", async () => {
		const globalPrefix = join(tempDir, "global-prefix");
		const selfPackageDir = join(globalPrefix, "lib", "node_modules", "@earendil-works", "pi-coding-agent");
		const fakeNpmPath = join(tempDir, "fake-npm.cjs");
		const recordPath = join(tempDir, "npm-invoked");
		mkdirSync(selfPackageDir, { recursive: true });
		writeFileSync(fakeNpmPath, `require("node:fs").writeFileSync(${JSON.stringify(recordPath)}, "invoked");`);
		const settingsPath = join(agentDir, "settings.json");
		const initialSettings = { npmCommand: [originalExecPath, fakeNpmPath, "--prefix", globalPrefix] };
		writeFileSync(settingsPath, JSON.stringify(initialSettings));
		process.env.PI_PACKAGE_DIR = selfPackageDir;
		Object.defineProperty(process, "execPath", {
			value: join(selfPackageDir, "dist", "cli.js"),
			configurable: true,
		});
		const fetchMock = vi.fn(async () => new Response("", { status: 404 }));
		vi.stubGlobal("fetch", fetchMock);
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		await expect(runSelfUpdateInstallChild(["update", "--self", "--nightly", "--force"])).resolves.toBeUndefined();

		expect(fetchMock).not.toHaveBeenCalled();
		expect(existsSync(recordPath)).toBe(false);
		expect(JSON.parse(readFileSync(settingsPath, "utf8"))).toEqual(initialSettings);
		expect(process.exitCode).toBe(SELF_UPDATE_NOT_ATTEMPTED_EXIT_CODE);
		expect(errorSpy.mock.calls.flat().join(" ")).toContain("https://github.com/SailorJoe6/prime-agent-pi/releases");
	});

	it("suggests the configured source when update input omits the npm prefix", async () => {
		const settingsPath = join(agentDir, "settings.json");
		writeFileSync(settingsPath, JSON.stringify({ packages: ["npm:pi-formatter"] }, null, 2));

		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		try {
			await expect(main(["package", "update", "pi-formatter"])).resolves.toBeUndefined();

			const stderr = errorSpy.mock.calls.map(([message]) => String(message)).join("\n");
			const stdout = logSpy.mock.calls.map(([message]) => String(message)).join("\n");
			expect(stderr).toContain("Did you mean npm:pi-formatter?");
			expect(stdout).not.toContain("Updated pi-formatter");
			expect(process.exitCode).toBe(1);

			const settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as { packages?: string[] };
			expect(settings.packages).toContain("npm:pi-formatter");
		} finally {
			errorSpy.mockRestore();
			logSpy.mockRestore();
		}
	});
});
