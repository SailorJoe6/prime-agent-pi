import { randomUUID } from "node:crypto";
import type { SettingsManager as PublicSettingsManager } from "@earendil-works/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import { SettingsManager } from "../src/core/settings-manager.js";

describe("SettingsManager", () => {
	const testDir = join(tmpdir(), `prime-settings-${randomUUID()}`);
	const agentDir = join(testDir, "agent");
	const projectDir = join(testDir, "project");
	const globalPath = join(agentDir, "settings.json");
	const projectPath = join(projectDir, ".prime", "agent", "settings.json");

	beforeEach(() => {
		if (existsSync(testDir)) rmSync(testDir, { recursive: true });
		mkdirSync(agentDir, { recursive: true });
		mkdirSync(join(projectDir, ".prime", "agent"), { recursive: true });
	});

	afterEach(() => {
		if (existsSync(testDir)) rmSync(testDir, { recursive: true });
	});

	const writeSettings = (path: string, value: unknown): void => writeFileSync(path, JSON.stringify(value));
	const readSettings = (path: string): Record<string, unknown> =>
		JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;

	it("PAPI-61 preserves the v0.9.8 TypeScript API and round-trips the global nightly preference", async () => {
		writeSettings(projectPath, { updateChannel: "nightly" });
		expect(SettingsManager.create(projectDir, agentDir).getUpdateChannel()).toBeUndefined();
		writeSettings(globalPath, { updateChannel: "preview", theme: "dark" });
		const manager: PublicSettingsManager = SettingsManager.create(projectDir, agentDir);
		expectTypeOf(manager.getUpdateChannel).toEqualTypeOf<() => "stable" | "nightly" | undefined>();
		expectTypeOf(manager.setUpdateChannel).toEqualTypeOf<(channel: "stable" | "nightly") => void>();
		expect(manager.getUpdateChannel()).toBeUndefined();

		manager.setUpdateChannel("nightly");
		await manager.flush();
		const reloaded = SettingsManager.create(projectDir, agentDir);
		expect(reloaded.getUpdateChannel()).toBe("nightly");
		expect(readSettings(globalPath)).toEqual({ updateChannel: "nightly", theme: "dark" });

		reloaded.setUpdateChannel("stable");
		await reloaded.flush();
		expect(SettingsManager.create(projectDir, agentDir).getUpdateChannel()).toBe("stable");
		expect(readSettings(projectPath)).toEqual({ updateChannel: "nightly" });
	});

	describe("on-disk settings file", () => {
		it("preserves keys it does not own, including ones written after load", async () => {
			writeSettings(globalPath, { theme: "dark", defaultModel: "claude-sonnet" });
			const manager = SettingsManager.create(projectDir, agentDir);

			// A second writer (another process, or the user's editor) adds keys after load.
			writeSettings(globalPath, {
				...readSettings(globalPath),
				enabledModels: ["claude-opus-4-5", "gpt-5.2-codex"],
				shellPath: "/bin/zsh",
				extensions: ["/path/to/extension.ts"],
				defaultThinkingLevel: "low",
			});

			manager.setDefaultThinkingLevel("high");
			manager.setTheme("light");
			await manager.flush();

			expect(readSettings(globalPath)).toEqual({
				theme: "light",
				defaultModel: "claude-sonnet",
				enabledModels: ["claude-opus-4-5", "gpt-5.2-codex"],
				shellPath: "/bin/zsh",
				extensions: ["/path/to/extension.ts"],
				// In-memory changes win for keys the manager owns.
				defaultThinkingLevel: "high",
			});
		});

		it("reloads rewritten settings from disk", async () => {
			writeSettings(globalPath, { theme: "dark", extensions: ["/before.ts"] });
			const manager = SettingsManager.create(projectDir, agentDir);

			writeSettings(globalPath, { theme: "light", extensions: ["/after.ts"], defaultModel: "claude-sonnet" });
			await manager.reload();

			expect(manager.getTheme()).toBe("light");
			expect(manager.getExtensionPaths()).toEqual(["/after.ts"]);
			expect(manager.getDefaultModel()).toBe("claude-sonnet");
		});

		// An unparsable file must never be clobbered: the user's settings would be lost.
		it.each<[string, string, (manager: SettingsManager) => void, string]>([
			["global", globalPath, (manager) => manager.setRlmMaxDepth(3), "Global settings not saved"],
			[
				"project",
				projectPath,
				(manager) => manager.setProjectPackages(["npm:test-pkg"]),
				"Project settings not saved",
			],
		])("keeps invalid %s settings on disk and reports the failed save", async (scope, path, mutate, message) => {
			const invalid = `{ invalid ${scope} json`;
			writeFileSync(path, invalid);

			const manager = SettingsManager.create(projectDir, agentDir);
			expect(manager.drainErrors().map((entry) => entry.scope)).toEqual([scope]);
			expect(manager.drainErrors()).toEqual([]);

			mutate(manager);
			await manager.flush();

			const errors = manager.drainErrors();
			expect(errors).toHaveLength(1);
			expect(errors[0]?.scope).toBe(scope);
			expect(errors[0]?.error.message).toContain(message);
			expect(readFileSync(path, "utf-8")).toBe(invalid);
		});

		it("keeps the previously loaded values when a reload finds invalid JSON", async () => {
			writeSettings(globalPath, { theme: "dark" });
			const manager = SettingsManager.create(projectDir, agentDir);

			writeFileSync(globalPath, "{ invalid json");
			await manager.reload();

			expect(manager.getTheme()).toBe("dark");
		});

		it("drains errors per scope", () => {
			writeFileSync(globalPath, "{ invalid global json");
			writeFileSync(projectPath, "{ invalid project json");
			const manager = SettingsManager.create(projectDir, agentDir);

			expect(manager.drainErrors("global").map((entry) => entry.scope)).toEqual(["global"]);
			expect(manager.drainErrors().map((entry) => entry.scope)).toEqual(["project"]);
		});

		it("creates the project settings directory only when project settings are written", async () => {
			writeSettings(globalPath, { theme: "dark" });
			rmSync(join(projectDir, ".prime", "agent"), { recursive: true });

			const manager = SettingsManager.create(projectDir, agentDir);
			expect(existsSync(join(projectDir, ".prime", "agent"))).toBe(false);
			expect(manager.getTheme()).toBe("dark");

			manager.setProjectPackages([{ source: "npm:test-pkg" }]);
			await manager.flush();

			expect(existsSync(projectPath)).toBe(true);
		});
	});

	describe("PAPI-7 global model admission policy", () => {
		it.each([
			["missing file", undefined],
			["missing key", { enabledModels: ["provider/cycling-only"] }],
			["null", { allowedModels: null }],
			["empty array", { allowedModels: [] }],
			["blank-only array", { allowedModels: ["", " \t\n"] }],
		])("treats %s as unset even with a project allowlist", (_label, global) => {
			if (global !== undefined) writeSettings(globalPath, global);
			writeSettings(projectPath, { allowedModels: ["project/*"] });

			expect(SettingsManager.create(projectDir, agentDir).getModelAdmissionPolicy()).toEqual({ patterns: [] });
		});

		it("normalizes only the global allowlist and leaves cycling independent", () => {
			writeSettings(globalPath, { allowedModels: ["  Provider/Exact ", "\t", "  other/*"] });
			writeSettings(projectPath, { allowedModels: false, enabledModels: ["provider/cycling-only"] });
			const manager = SettingsManager.create(projectDir, agentDir);
			manager.applyOverrides({ allowedModels: ["overrides/*"] });

			const policy = manager.getModelAdmissionPolicy();
			expect(policy).toEqual({ patterns: ["Provider/Exact", "other/*"] });
			if ("error" in policy) throw new Error(policy.error);
			policy.patterns.length = 0;
			expect(manager.getModelAdmissionPolicy()).toEqual({ patterns: ["Provider/Exact", "other/*"] });
			expect(manager.getEnabledModels()).toEqual(["provider/cycling-only"]);
		});

		it.each(["", " \t\n", "{ invalid json"])("reports invalid JSON (%j)", (content) => {
			writeFileSync(globalPath, content);
			expect(SettingsManager.create(projectDir, agentDir).getModelAdmissionPolicy()).toEqual({
				error: expect.stringMatching(/JSON/),
			});
		});

		it.each(["null", "false", "42", '"string"', "[]"])("rejects non-object global settings (%s)", (content) => {
			writeFileSync(globalPath, content);
			expect(SettingsManager.create(projectDir, agentDir).getModelAdmissionPolicy()).toEqual({
				error: expect.stringMatching(/object/),
			});
		});

		it.each(['""', '"provider/*"', "42", "false", "{}", '["provider/*", null]', '[" ", 42]', "[[]]"])(
			"rejects malformed allowedModels (%s) without blocking unrelated settings",
			async (content) => {
				writeSettings(globalPath, { allowedModels: JSON.parse(content), theme: "dark" });
				const manager = SettingsManager.create(projectDir, agentDir);

				expect(manager.getModelAdmissionPolicy()).toEqual({ error: expect.stringMatching(/allowedModels/) });
				expect(manager.getTheme()).toBe("dark");
				manager.setTheme("light");
				await manager.flush();
				expect(readSettings(globalPath)).toEqual({ allowedModels: JSON.parse(content), theme: "light" });
			},
		);

		it("reports an injected global read failure even when project settings are readable", () => {
			const manager = SettingsManager.fromStorage({
				withLock(scope, fn) {
					if (scope === "global") throw new Error("injected read failure");
					fn(JSON.stringify({ allowedModels: ["project/*"], theme: "dark" }));
				},
			});

			expect(manager.getModelAdmissionPolicy()).toEqual({ error: expect.stringMatching(/read/) });
			expect(manager.getTheme()).toBe("dark");
		});

		it("fails closed on reload without losing unrelated settings and recovers on the next reload", async () => {
			writeSettings(globalPath, { allowedModels: ["provider/*"], theme: "dark" });
			const manager = SettingsManager.create(projectDir, agentDir);
			expect(manager.getModelAdmissionPolicy()).toEqual({ patterns: ["provider/*"] });

			writeFileSync(globalPath, "{ invalid json");
			await manager.reload();
			expect(manager.getModelAdmissionPolicy()).toEqual({ error: expect.stringMatching(/JSON/) });
			expect(manager.getTheme()).toBe("dark");

			rmSync(globalPath);
			await manager.reload();
			expect(manager.getModelAdmissionPolicy()).toEqual({ patterns: [] });
		});
	});

	describe("project vs global precedence", () => {
		it.each<[string, unknown, unknown, (manager: SettingsManager) => unknown, unknown]>([
			[
				"project sessionDir overrides global",
				{ sessionDir: "/global/sessions" },
				{ sessionDir: "./sessions" },
				(manager) => manager.getSessionDir(),
				"./sessions",
			],
			[
				"global sessionDir expands ~",
				{ sessionDir: "~/sessions" },
				{},
				(manager) => manager.getSessionDir(),
				join(homedir(), "sessions"),
			],
			[
				"mcpServers stay global-only",
				{ mcpServers: { shared: { type: "http", url: "https://global.shared/mcp" } } },
				{ mcpServers: { shared: { type: "http", url: "https://project.shared/mcp" } } },
				(manager) => manager.getGlobalMcpServers(),
				{ shared: { type: "http", url: "https://global.shared/mcp" } },
			],
			[
				"idle eviction stays global-only",
				{ idleEvictionMinutes: 60 },
				{ idleEvictionMinutes: 30 },
				(manager) => manager.getIdleEvictionMinutes(),
				60,
			],
			[
				"autonomous limits merge project over global, dropping invalid entries",
				{ autonomous: { maxContinuations: 10, maxTurns: 40 } },
				{ autonomous: { maxContinuations: "unlimited", maxTokens: "one million" } },
				(manager) => manager.getAutonomousLimits(),
				{
					maxContinuations: Number.MAX_SAFE_INTEGER,
					maxTurns: 40,
					maxTokens: undefined,
					timeoutMs: undefined,
				},
			],
		])("%s", (_label, global, project, read, expected) => {
			writeSettings(globalPath, global);
			writeSettings(projectPath, project);

			expect(read(SettingsManager.create(projectDir, agentDir))).toEqual(expected);
		});
	});

	// Telemetry may only ever be narrowed: no project file or runtime override can opt a user back in.
	describe("telemetry privacy controls", () => {
		it.each<[string, unknown, unknown, boolean]>([
			[
				"a global opt-out survives project opt-in",
				{ enabled: false, noticeShown: false },
				{ enabled: true, noticeShown: true },
				false,
			],
			["a project opt-out disables globally enabled telemetry", { enabled: true }, { enabled: false }, false],
			["both enabled keeps telemetry on", { enabled: true }, { enabled: true }, true],
		])("%s", (_label, global, project, expected) => {
			writeSettings(globalPath, { telemetry: global });
			writeSettings(projectPath, { telemetry: project });

			const manager = SettingsManager.create(projectDir, agentDir);

			expect(manager.getTelemetryEnabled()).toBe(expected);
			if (!expected) expect(manager.getTelemetryNoticeShown()).toBe(false);
		});

		it.each<[string, boolean, boolean, boolean]>([
			["further disable telemetry", true, false, false],
			["not re-enable a global opt-out", false, true, false],
		])("runtime overrides can %s", (_label, globalEnabled, overrideEnabled, expected) => {
			writeSettings(globalPath, { telemetry: { enabled: globalEnabled, noticeShown: true } });
			const manager = SettingsManager.create(projectDir, agentDir);

			manager.applyOverrides({ telemetry: { enabled: overrideEnabled, noticeShown: overrideEnabled } });

			expect(manager.getTelemetryEnabled()).toBe(expected);
		});
	});

	// Park bounds are clamped like the other wait bounds: one week per park at most,
	// and non-finite park settings fall back to the defaults.
	describe("provider park bounds", () => {
		it("clamps park bounds and falls back to defaults on invalid values", () => {
			const wait = SettingsManager.inMemory({
				retry: { provider: { waitForUsage: { maxPauseMs: 365 * 86_400_000, maxParks: 99 } } },
			}).getProviderWaitSettings();
			expect([wait.pauseUntilReset, wait.maxPauseMs, wait.maxParks]).toEqual([true, 7 * 86_400_000, 99]);
			const invalid = SettingsManager.inMemory({
				retry: { provider: { waitForUsage: { maxPauseMs: Number.NaN, maxParks: -1 } } },
			}).getProviderWaitSettings();
			expect([invalid.maxPauseMs, invalid.maxParks]).toEqual([86_400_000, 0]);
		});
	});
});
