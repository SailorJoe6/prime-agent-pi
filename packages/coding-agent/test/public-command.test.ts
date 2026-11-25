import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_AGENT_DIR, ENV_SESSION_DIR, SELF_UPDATE_INTERACTIVE_CHILD_ENV } from "../src/config.js";

const mocks = vi.hoisted(() => ({
	daemonCommands: [] as string[][],
	packageCommands: [] as string[][],
	psCalls: [] as boolean[],
	reapCalls: [] as Array<[boolean, boolean]>,
	shutdownCalls: [] as Array<[boolean, boolean]>,
	mcpCommands: [] as string[][],
	incidentCalls: [] as Array<Record<string, string | undefined>>,
	incidentWindows: [] as Array<{ sinceMs: number; untilMs: number } | undefined>,
}));

vi.mock("../src/cli/daemon-command.js", () => ({
	handleDaemonCommand: async (args: string[]) => {
		mocks.daemonCommands.push(args);
		return true;
	},
}));

vi.mock("../src/package-manager-cli.js", () => ({
	handlePackageCommand: async (args: string[]) => {
		mocks.packageCommands.push(args);
		return true;
	},
	isSelfUpdateSource: (source: string) => source === "self" || source === "pi" || source === "prime-agent",
}));

vi.mock("../src/core/mcp/mcp-command.js", () => ({
	runMcpManagementCommand: async (args: string[]) => {
		mocks.mcpCommands.push(args);
		return { action: args[0], message: "managed", changed: false };
	},
}));

vi.mock("../src/core/settings-manager.js", () => ({
	SettingsManager: {
		create: () => ({ flush: async () => {}, drainErrors: () => [], getGlobalMcpServers: () => undefined }),
	},
}));

vi.mock("../src/cli/incident.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("../src/cli/incident.js")>()),
	runIncident: async (options: Record<string, string | undefined>, window?: { sinceMs: number; untilMs: number }) => {
		mocks.incidentCalls.push(options);
		mocks.incidentWindows.push(window);
	},
}));

vi.mock("../src/cli/daemon-ps.js", () => ({
	runPs: async (json: boolean) => {
		mocks.psCalls.push(json);
	},
	runReap: async (json: boolean, force: boolean) => {
		mocks.reapCalls.push([json, force]);
	},
	runShutdownAll: async (json: boolean, force: boolean) => {
		mocks.shutdownCalls.push([json, force]);
	},
}));

import { INTERNAL_RUNTIME_COMMAND_MARKER } from "../src/cli/args.js";
import { formatTopLevelHelp } from "../src/cli/command-registry.js";
import { DAEMON_UPDATE_RESTART_COORDINATOR_FLAG } from "../src/cli/daemon-update-restart.js";
import { handlePublicCommand } from "../src/cli/public-command.js";

describe("public command routing", () => {
	beforeEach(() => {
		mocks.daemonCommands.length = 0;
		mocks.packageCommands.length = 0;
		mocks.psCalls.length = 0;
		mocks.reapCalls.length = 0;
		mocks.shutdownCalls.length = 0;
		mocks.mcpCommands.length = 0;
		mocks.incidentCalls.length = 0;
		mocks.incidentWindows.length = 0;
		process.exitCode = undefined;
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		process.exitCode = undefined;
		vi.restoreAllMocks();
	});

	it.each<[string[], Record<string, unknown>]>([
		[
			["attach", "worker"],
			{ handled: false, args: ["--resume", "worker"], explicitAgentsView: false, attachAgent: "worker" },
		],
		[
			["attach", "worker", "--verbose", "--provider", "anthropic"],
			{
				handled: false,
				args: ["--resume", "worker", "--verbose", "--provider", "anthropic"],
				explicitAgentsView: false,
				attachAgent: "worker",
			},
		],
		[
			["agents", "--verbose", "--provider", "anthropic"],
			{ handled: false, args: ["--verbose", "--provider", "anthropic"], explicitAgentsView: true },
		],
		[
			["model", "list", "sonnet", "--offline"],
			{
				handled: false,
				args: [INTERNAL_RUNTIME_COMMAND_MARKER, "--list-models", "sonnet", "--offline"],
				explicitAgentsView: false,
			},
		],
		[
			["session", "export", "session.jsonl", "session.html", "--verbose"],
			{
				handled: false,
				args: [INTERNAL_RUNTIME_COMMAND_MARKER, "--export", "session.jsonl", "session.html", "--verbose"],
				explicitAgentsView: false,
			},
		],
		[
			["help", "me", "fix", "this"],
			{ handled: false, args: ["help", "me", "fix", "this"], explicitAgentsView: false },
		],
		[["--help"], { handled: false, args: ["--help"], explicitAgentsView: false }],
		[["-h"], { handled: false, args: ["-h"], explicitAgentsView: false }],
	])("passes %j back to the interactive startup path", async (argv, expected) => {
		await expect(handlePublicCommand(argv)).resolves.toEqual(expected);
	});

	it.each<[string[], string[]]>([
		[
			["list", "--all", "--json"],
			["daemon", "list", "--all", "--json"],
		],
		[
			["sessions", "--all", "--json"],
			["daemon", "sessions", "--all", "--json"],
		],
		[
			["stop", "worker", "--daemon-socket", "/tmp/custom-daemon.sock"],
			["daemon", "kill", "worker", "--daemon-socket", "/tmp/custom-daemon.sock"],
		],
		[
			["rename", "worker", "reviewer", "--daemon-socket", "/tmp/custom-daemon.sock"],
			["daemon", "rename", "worker", "reviewer", "--daemon-socket", "/tmp/custom-daemon.sock"],
		],
		// Help-like message text after the separator stays literal payload.
		[
			["send", "worker", "--", "--help"],
			["daemon", "send", "worker", "--", "--help"],
		],
	])("routes %j through the internal protocol adapter", async (argv, forwarded) => {
		await expect(handlePublicCommand(argv)).resolves.toMatchObject({ handled: true });
		expect(mocks.daemonCommands).toEqual([forwarded]);
	});

	it.each<[string[]]>([
		[["attach", "worker", "extra"]],
		[["attach", "worker", "--resume", "other"]],
		[["attach", "worker", "-r", "other"]],
		[["attach", "worker", "--continue"]],
		[["attach", "worker", "--fork", "session.jsonl"]],
	])("rejects %j instead of starting a session", async (argv) => {
		await expect(handlePublicCommand(argv)).resolves.toMatchObject({ handled: true });
		expect(process.exitCode).toBe(1);
		expect(mocks.daemonCommands).toEqual([]);
	});

	it("routes MCP management without entering agent startup", async () => {
		await expect(
			handlePublicCommand(["mcp", "add", "local", "--", "node", "server file.js", "--stdio"]),
		).resolves.toMatchObject({ handled: true });
		expect(mocks.mcpCommands).toEqual([["add", "local", "--", "node", "server file.js", "--stdio"]]);
	});

	it("runs a management command written after global flags", async () => {
		await expect(handlePublicCommand(["--offline", "model", "list", "sonnet"])).resolves.toMatchObject({
			handled: false,
			args: [INTERNAL_RUNTIME_COMMAND_MARKER, "--list-models", "sonnet", "--offline"],
		});
		await expect(handlePublicCommand(["--offline", "list", "--json"])).resolves.toMatchObject({ handled: true });
		expect(mocks.daemonCommands).toEqual([["daemon", "list", "--json", "--offline"]]);
	});

	it("keeps rotated global flags ahead of a -- separator", async () => {
		await expect(
			handlePublicCommand(["--offline", "mcp", "add", "local", "--", "node", "server file.js", "--stdio"]),
		).resolves.toMatchObject({ handled: true });
		expect(mocks.mcpCommands).toEqual([["add", "local", "--offline", "--", "node", "server file.js", "--stdio"]]);

		await expect(
			handlePublicCommand([
				"--daemon-socket",
				"/tmp/prime.sock",
				"schedule",
				"add",
				"worker",
				"0 9 * * 1-5",
				"--",
				"Check open work",
			]),
		).resolves.toMatchObject({ handled: true });
		expect(mocks.daemonCommands.at(-1)).toEqual([
			"daemon",
			"cron",
			"add",
			"worker",
			"0 9 * * 1-5",
			"--daemon-socket",
			"/tmp/prime.sock",
			"--",
			"Check open work",
		]);
	});

	it("rejects a rotated global flag the command does not accept instead of chatting", async () => {
		await expect(
			handlePublicCommand(["--daemon-socket", "/tmp/prime.sock", "status", "--json"]),
		).resolves.toMatchObject({ handled: true });
		expect(mocks.psCalls).toEqual([]);
		expect(process.exitCode).toBe(1);
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Unknown option for status: --daemon-socket"));
	});

	it("forwards a custom daemon socket written before stop", async () => {
		await expect(
			handlePublicCommand(["--daemon-socket", "/tmp/custom-daemon.sock", "stop", "worker"]),
		).resolves.toMatchObject({ handled: true });
		expect(mocks.daemonCommands).toEqual([
			["daemon", "kill", "worker", "--daemon-socket", "/tmp/custom-daemon.sock"],
		]);
	});

	it("keeps a command word after -- as message text", async () => {
		await expect(handlePublicCommand(["--", "status"])).resolves.toEqual({
			handled: false,
			args: ["--", "status"],
			explicitAgentsView: false,
		});
		expect(mocks.psCalls).toEqual([]);
	});

	it("keeps a positional after a prompt-value flag on the message path", async () => {
		for (const flag of ["--system-prompt", "--append-system-prompt"]) {
			const args = [flag, "--offline", "status"];
			await expect(handlePublicCommand(args)).resolves.toEqual({
				handled: false,
				args,
				explicitAgentsView: false,
			});
		}
	});

	it("keeps a version request ahead of command routing instead of rotating it", async () => {
		const args = ["--version", "status"];
		await expect(handlePublicCommand(args)).resolves.toEqual({
			handled: false,
			args,
			explicitAgentsView: false,
		});
		await expect(handlePublicCommand(["-v", "status"])).resolves.toEqual({
			handled: false,
			args: ["-v", "status"],
			explicitAgentsView: false,
		});
		await expect(handlePublicCommand(args)).resolves.toEqual({
			handled: false,
			args,
			explicitAgentsView: false,
		});
	});

	it("keeps an unknown long option's value out of command routing", async () => {
		await expect(handlePublicCommand(["--extension-option", "status"])).resolves.toEqual({
			handled: false,
			args: ["--extension-option", "status"],
			explicitAgentsView: false,
		});
		await expect(handlePublicCommand(["--extension-option", "statuses", "of", "my", "agents"])).resolves.toEqual({
			handled: false,
			args: ["--extension-option", "statuses", "of", "my", "agents"],
			explicitAgentsView: false,
		});
		expect(mocks.psCalls).toEqual([]);
		expect(mocks.daemonCommands).toEqual([]);
	});

	it("still rotates a command written after flags that take no value", async () => {
		await expect(handlePublicCommand(["--verbose", "model", "list"])).resolves.toMatchObject({
			handled: false,
			args: [INTERNAL_RUNTIME_COMMAND_MARKER, "--list-models", "--verbose"],
		});
		await expect(handlePublicCommand(["-x", "model", "list"])).resolves.toMatchObject({
			handled: false,
			args: [INTERNAL_RUNTIME_COMMAND_MARKER, "--list-models", "-x"],
		});
		await expect(handlePublicCommand(["--extension-option=status", "model", "list"])).resolves.toMatchObject({
			handled: false,
			args: [INTERNAL_RUNTIME_COMMAND_MARKER, "--list-models", "--extension-option=status"],
		});
	});

	it("keeps text after -- following a value flag on the message path", async () => {
		await expect(handlePublicCommand(["--cwd", "--", "status"])).resolves.toEqual({
			handled: false,
			args: ["--cwd", "--", "status"],
			explicitAgentsView: false,
		});
		expect(mocks.psCalls).toEqual([]);
	});

	it("keeps a resume @file reference free instead of consuming it as a selector", async () => {
		await expect(handlePublicCommand(["--resume", "@prompt.md", "status"])).resolves.toEqual({
			handled: false,
			args: ["--resume", "@prompt.md", "status"],
			explicitAgentsView: false,
		});
		expect(mocks.psCalls).toEqual([]);
		expect(mocks.daemonCommands).toEqual([]);
	});

	it("keeps the positional of a print run as the message", async () => {
		await expect(handlePublicCommand(["--print", "status"])).resolves.toEqual({
			handled: false,
			args: ["--print", "status"],
			explicitAgentsView: false,
		});
		await expect(handlePublicCommand(["-p", "--offline", "list"])).resolves.toEqual({
			handled: false,
			args: ["-p", "--offline", "list"],
			explicitAgentsView: false,
		});
		expect(mocks.psCalls).toEqual([]);
		expect(mocks.daemonCommands).toEqual([]);
	});

	it("leaves a prompt that only starts like a command alone", async () => {
		await expect(handlePublicCommand(["--offline", "statuses", "of", "my", "agents"])).resolves.toEqual({
			handled: false,
			args: ["--offline", "statuses", "of", "my", "agents"],
			explicitAgentsView: false,
		});
		expect(mocks.psCalls).toEqual([]);
	});

	it("rejects a removed command written after global flags", async () => {
		await expect(handlePublicCommand(["--offline", "install", "pkg"])).resolves.toMatchObject({ handled: true });
		expect(process.exitCode).toBe(1);
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Unknown command: install"));
	});

	it("shows sessions usage in command help", async () => {
		await expect(handlePublicCommand(["help", "sessions"])).resolves.toMatchObject({ handled: true });
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("prime-agent sessions [--all] [--json]"));
	});

	it("separates Prime Agent updates from package updates", async () => {
		await handlePublicCommand(["update", "--force"]);
		await handlePublicCommand(["package", "update"]);
		await handlePublicCommand(["package", "update", "npm:@example/tools"]);

		expect(mocks.packageCommands).toEqual([
			["update", "--self", "--force"],
			["update", "--extensions"],
			["update", "npm:@example/tools"],
		]);
	});

	it("forwards hidden update restart coordinator invocations", async () => {
		const args = ["update", DAEMON_UPDATE_RESTART_COORDINATOR_FLAG, "--daemon-socket", "custom-daemon.sock"];

		await handlePublicCommand(args);

		expect(mocks.packageCommands).toEqual([args]);
	});

	it("preserves the internal interactive self-update command", async () => {
		const previousValue = process.env[SELF_UPDATE_INTERACTIVE_CHILD_ENV];
		const args = ["update", "--self", "--force", "--daemon-socket", "custom-daemon.sock"];
		process.env[SELF_UPDATE_INTERACTIVE_CHILD_ENV] = "1";

		try {
			await handlePublicCommand(args);
		} finally {
			if (previousValue === undefined) {
				delete process.env[SELF_UPDATE_INTERACTIVE_CHILD_ENV];
			} else {
				process.env[SELF_UPDATE_INTERACTIVE_CHILD_ENV] = previousValue;
			}
		}

		expect(mocks.packageCommands).toEqual([args]);
	});

	it.each<[string[]]>([
		[["update", "self"]],
		[["update", "--self"]],
		[["update", "prime-agent"]],
		[["update", "npm:@example/tools"]],
		[["update", "--extensions"]],
		[["update", "--self", "--extensions"]],
		[["package", "update", "self"]],
		[["package", "uninstall", "npm:@example/tools"]],
		[["package", "list", "ignored-source"]],
		[["daemon", "list"]],
		[["schedule", "cancell", "job-1"]],
	])("rejects the retired form %j without executing it", async (argv) => {
		await expect(handlePublicCommand(argv)).resolves.toMatchObject({ handled: true });

		expect(process.exitCode).toBe(1);
		expect(console.error).toHaveBeenCalled();
		expect(mocks.packageCommands).toEqual([]);
		expect(mocks.daemonCommands).toEqual([]);
	});

	it("uses force only when explicitly requested for full shutdown", async () => {
		await handlePublicCommand(["shutdown", "--json"]);
		await handlePublicCommand(["shutdown", "--force"]);

		expect(mocks.shutdownCalls).toEqual([
			[true, false],
			[false, true],
		]);
	});

	it("routes doctor fixes through the safe cleanup path", async () => {
		await handlePublicCommand(["doctor", "--fix", "--json"]);

		expect(mocks.reapCalls).toEqual([[true, false]]);
	});

	it("resolves command help when options precede the help flag", async () => {
		await handlePublicCommand(["list", "--all", "--help"]);
		await handlePublicCommand(["package", "install", "--local", "--help"]);

		expect(console.log).toHaveBeenCalledTimes(2);
		expect(console.error).not.toHaveBeenCalled();
		expect(mocks.daemonCommands).toEqual([]);
		expect(mocks.packageCommands).toEqual([]);
	});

	it("keeps the help topic when an explicit help flag follows it", async () => {
		await expect(handlePublicCommand(["help", "status", "--help"])).resolves.toMatchObject({ handled: true });
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("prime-agent status [--json]"));
		await expect(handlePublicCommand(["--offline", "help", "mcp", "add", "-h"])).resolves.toMatchObject({
			handled: true,
		});
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("prime-agent mcp add <name>"));
		await expect(handlePublicCommand(["help", "--help"])).resolves.toMatchObject({ handled: true });
		expect(console.log).toHaveBeenLastCalledWith(expect.not.stringContaining("prime-agent status [--json]"));
		expect(mocks.daemonCommands).toEqual([]);
	});

	it("treats help written after global flags as a help request", async () => {
		await expect(handlePublicCommand(["--offline", "help"])).resolves.toMatchObject({ handled: true });
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("prime-agent - AI coding assistant"));
		await expect(handlePublicCommand(["--offline", "help", "status"])).resolves.toMatchObject({ handled: true });
		expect(console.log).toHaveBeenLastCalledWith(expect.stringContaining("prime-agent status [--json]"));
		expect(mocks.daemonCommands).toEqual([]);
		expect(process.exitCode).toBeUndefined();
	});

	it("excludes global flags from the help command path instead of forwarding them", async () => {
		await expect(handlePublicCommand(["--offline", "help", "mcp", "add"])).resolves.toMatchObject({
			handled: true,
		});
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("prime-agent mcp add <name>"));

		await expect(handlePublicCommand(["help", "--verbose"])).resolves.toMatchObject({ handled: true });
		expect(console.log).toHaveBeenLastCalledWith(expect.stringContaining("prime-agent - AI coding assistant"));
	});

	it("excludes parseArgs-consumed flag values from the help command path", async () => {
		await expect(handlePublicCommand(["help", "--resume", "status"])).resolves.toMatchObject({
			handled: true,
		});
		expect(console.log).toHaveBeenLastCalledWith(expect.stringContaining("prime-agent - AI coding assistant"));
		await expect(handlePublicCommand(["help", "-r", "status"])).resolves.toMatchObject({ handled: true });
		expect(console.log).toHaveBeenLastCalledWith(expect.stringContaining("prime-agent - AI coding assistant"));
		await expect(handlePublicCommand(["help", "--print", "status"])).resolves.toMatchObject({
			handled: true,
		});
		expect(console.log).toHaveBeenLastCalledWith(expect.stringContaining("prime-agent - AI coding assistant"));

		// The print flag must not swallow the help flag itself: an explicit
		// --help still defers to the per-command help block.
		await expect(handlePublicCommand(["help", "--print", "--help"])).resolves.toMatchObject({
			handled: true,
		});
		expect(console.log).toHaveBeenLastCalledWith(expect.not.stringContaining("prime-agent status [--json]"));
	});

	it("keeps a -- after the help command on the message path", async () => {
		await expect(handlePublicCommand(["--offline", "help", "--", "status"])).resolves.toEqual({
			handled: false,
			args: ["help", "--offline", "--", "status"],
			explicitAgentsView: false,
		});
	});

	it("rejects invalid paths below a known help command", async () => {
		await handlePublicCommand(["help", "schedule", "nonsense"]);

		expect(process.exitCode).toBe(1);
		expect(mocks.daemonCommands).toEqual([]);
	});

	it("routes the incident command with parsed window options", async () => {
		await expect(
			handlePublicCommand(["incident", "--since", "20:02", "--until=21:00", "--session", "abc"]),
		).resolves.toEqual({
			handled: true,
			args: [],
			explicitAgentsView: false,
		});
		expect(mocks.incidentCalls).toEqual([{ since: "20:02", until: "21:00", session: "abc" }]);
		expect(process.exitCode).toBeUndefined();
	});

	it("resolves the incident window once and passes it to runIncident", async () => {
		vi.useFakeTimers();
		// Just before UTC midnight: a second resolution later would land on the
		// next day and render a different window for relative HH:MM bounds.
		vi.setSystemTime(new Date("2026-09-16T23:59:59.900Z"));
		try {
			await handlePublicCommand(["incident", "--since", "23:00", "--until", "23:30"]);
			expect(mocks.incidentCalls).toEqual([{ since: "23:00", until: "23:30" }]);
			expect(mocks.incidentWindows).toEqual([
				{ sinceMs: Date.parse("2026-09-16T23:00:00.000Z"), untilMs: Date.parse("2026-09-16T23:30:00.000Z") },
			]);
		} finally {
			vi.useRealTimers();
		}
	});

	it("rejects unknown incident options with usage guidance", async () => {
		await expect(handlePublicCommand(["incident", "--json"])).resolves.toMatchObject({ handled: true });
		expect(process.exitCode).toBe(1);
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Unknown option for incident: --json"));
		expect(mocks.incidentCalls).toEqual([]);
	});

	it("rejects an incident window where until precedes since with usage guidance", async () => {
		await expect(
			handlePublicCommand(["incident", "--since", "2026-09-10T20:30", "--until", "2026-09-10T20:00"]),
		).resolves.toMatchObject({ handled: true });
		expect(process.exitCode).toBe(1);
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining("--until must be after --since."));
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Run "prime-agent help incident" for usage.'));
		expect(mocks.incidentCalls).toEqual([]);
	});

	it("rejects a bad incident time with usage guidance", async () => {
		await expect(handlePublicCommand(["incident", "--since", "yesterday"])).resolves.toMatchObject({ handled: true });
		expect(process.exitCode).toBe(1);
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid time for --since: "yesterday"'));
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Run "prime-agent help incident" for usage.'));
		expect(mocks.incidentCalls).toEqual([]);
	});

	it("shows incident in the top-level command list", () => {
		expect(formatTopLevelHelp()).toContain("incident");
	});
});

describe("PAPI-18 prompt preview over the public CLI", () => {
	function runCli(args: string[], configure?: (projectDir: string) => void) {
		const root = mkdtempSync(join(tmpdir(), "pa-prompt-"));
		try {
			const tempDir = realpathSync(root);
			const projectDir = join(tempDir, "project");
			const agentDir = join(tempDir, "agent");
			const sessionDir = join(tempDir, "sessions");
			const runtimeDir = join(tempDir, "tmp");
			const projectConfig = join(projectDir, ".prime", "agent");
			const networkMarker = join(tempDir, "network-attempt");
			const extensionMarker = join(tempDir, "extension-executed");
			const packageMarker = join(tempDir, "package-command-executed");
			for (const dir of [agentDir, runtimeDir, join(projectConfig, "extensions")]) {
				mkdirSync(dir, { recursive: true });
			}
			writeFileSync(join(projectDir, "AGENTS.md"), "Invocation project instructions.");
			writeFileSync(
				join(projectConfig, "extensions", "preview-probe.ts"),
				`import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(extensionMarker)}, "loaded");
export default function () {}`,
			);
			const fakeNpm = join(tempDir, "fake-npm.cjs");
			writeFileSync(
				fakeNpm,
				`if (process.argv.slice(2).join(" ") === "root -g") {
  console.log(${JSON.stringify(join(tempDir, "global-node-modules"))});
} else {
  require("node:fs").writeFileSync(${JSON.stringify(packageMarker)}, "invoked");
}`,
			);
			writeFileSync(
				join(agentDir, "settings.json"),
				JSON.stringify({ packages: ["npm:preview-package-fixture"], npmCommand: [process.execPath, fakeNpm] }),
			);
			writeFileSync(
				join(projectConfig, "settings.json"),
				JSON.stringify({
					packages: ["npm:missing-project-preview-package"],
					npmCommand: [process.execPath, fakeNpm],
				}),
			);
			const offlineGuard = join(tempDir, "offline-guard.cjs");
			// Persist attempts even if the CLI catches the error and still exits successfully.
			writeFileSync(
				offlineGuard,
				`const { writeFileSync } = require("node:fs");
const { Socket } = require("node:net");
function unexpectedConnection() {
  const error = new Error("Prompt preview must not connect to a provider or daemon");
  writeFileSync(${JSON.stringify(networkMarker)}, error.stack);
  throw error;
}
globalThis.fetch = unexpectedConnection;
Socket.prototype.connect = unexpectedConnection;`,
			);
			configure?.(projectDir);
			const result = spawnSync(
				process.execPath,
				[
					"--import",
					resolve(__dirname, "../../../node_modules/tsx/dist/loader.mjs"),
					// Let the TypeScript loader initialize its own IPC before probing CLI connections.
					"--import",
					pathToFileURL(offlineGuard).href,
					resolve(__dirname, "../src/cli.ts"),
					...args,
				],
				{
					cwd: projectDir,
					// Do not pass through provider credentials or internal daemon state.
					env: {
						PATH: process.env.PATH,
						SystemRoot: process.env.SystemRoot,
						HOME: tempDir,
						USERPROFILE: tempDir,
						TMPDIR: runtimeDir,
						TEMP: runtimeDir,
						TMP: runtimeDir,
						TSX_TSCONFIG_PATH: resolve(__dirname, "../../../tsconfig.json"),
						[ENV_AGENT_DIR]: agentDir,
						[ENV_SESSION_DIR]: sessionDir,
					},
					encoding: "utf8",
					stdio: ["ignore", "pipe", "pipe"],
					timeout: 20_000,
					killSignal: "SIGKILL",
				},
			);
			expect(existsSync(networkMarker) ? readFileSync(networkMarker, "utf8") : "").toBe("");
			expect(result.error, result.stderr).toBeUndefined();
			expect(result.signal).toBeNull();
			expect(existsSync(extensionMarker), "live extension module executed").toBe(false);
			expect(existsSync(packageMarker), "package manager executed").toBe(false);
			expect(existsSync(sessionDir), "session storage created").toBe(false);
			return { ...result, projectDir };
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	}

	it("previews the invocation directory and Python defaults in JSON without a model", () => {
		const result = runCli(["prompt", "--json"]);
		expect(result.status, result.stderr).toBe(0);
		const preview = JSON.parse(result.stdout);
		expect(preview).toEqual({
			cwd: result.projectDir,
			model: null,
			instructions: expect.stringContaining("Invocation project instructions."),
			static: expect.stringContaining("Python REPL"),
			dynamic: expect.stringContaining(result.projectDir.replace(/\\/g, "/")),
		});
		expect(preview.instructions).toContain("Python REPL");
	});

	it("uses the selected directory's instructions, skills, and model override in JSON", () => {
		const result = runCli(
			["prompt", "--cwd", "../selected", "--model", "preview/override-model", "--json"],
			(cwd) => {
				const selected = resolve(cwd, "../selected");
				const config = join(selected, ".prime", "agent");
				const skills = join(config, "skills");
				mkdirSync(skills, { recursive: true });
				writeFileSync(join(selected, "AGENTS.md"), "Selected project instructions.");
				writeFileSync(join(config, "SYSTEM.md"), "Selected custom system instructions.");
				writeFileSync(join(config, "APPEND_SYSTEM.md"), "Selected appended instructions.");
				writeFileSync(join(config, "settings.json"), JSON.stringify({ defaultModel: "configured-model" }));
				writeFileSync(
					join(skills, "preview-skill.md"),
					"---\nname: preview-skill\ndescription: Visible preview skill.\n---\n",
				);
				writeFileSync(
					join(skills, "hidden-preview-skill.md"),
					"---\nname: hidden-preview-skill\ndescription: Hidden preview skill.\ndisable-model-invocation: true\n---\n",
				);
			},
		);
		expect(result.status, result.stderr).toBe(0);
		const preview = JSON.parse(result.stdout);
		expect(preview).toMatchObject({
			cwd: resolve(result.projectDir, "../selected"),
			model: "preview/override-model",
		});
		for (const text of [
			"Selected project instructions.",
			"Selected custom system instructions.",
			"Selected appended instructions.",
			"Visible preview skill.",
		]) {
			expect(preview.instructions).toContain(text);
		}
		expect(preview.instructions).not.toContain("Invocation project instructions.");
		expect(preview.instructions).not.toContain("Hidden preview skill.");
	});

	it("reports the configured model without requiring a provider", () => {
		const result = runCli(["prompt", "--json"], (cwd) => {
			writeFileSync(
				join(cwd, ".prime", "agent", "settings.json"),
				JSON.stringify({ defaultProvider: "fixture-provider", defaultModel: "local-default-model" }),
			);
		});
		expect(result.status, result.stderr).toBe(0);
		expect(JSON.parse(result.stdout)).toMatchObject({ model: "fixture-provider/local-default-model" });
	});

	it("prints static and dynamic sections with fixture instructions in text mode", () => {
		const result = runCli(["prompt"]);
		expect(result.status, result.stderr).toBe(0);
		for (const heading of [/^#+ Instructions$/m, /^#+ Static$/m, /^#+ Dynamic$/m]) {
			expect(result.stdout).toMatch(heading);
		}
		expect(result.stdout).toContain("Invocation project instructions.");
		expect(result.stdout).toContain("Python REPL");
		expect(result.stdout).toContain(result.projectDir.replace(/\\/g, "/"));
	});

	it.each([
		["prompt", "--help"],
		["help", "prompt"],
	])("advertises the prompt options via %j %j", (...args) => {
		const result = runCli(args);
		expect(result.status, result.stderr).toBe(0);
		for (const text of ["prime-agent prompt", "--cwd", "--model", "--json"]) {
			expect(result.stdout).toContain(text);
		}
	});

	it.each([
		{ args: ["--unknown"], diagnostic: "--unknown" },
		{ args: ["--model"], diagnostic: "--model" },
		{ args: ["--cwd"], diagnostic: "--cwd" },
		{ args: ["--cwd", "missing-preview-directory"], diagnostic: "missing-preview-directory" },
		{ args: ["--cwd", "AGENTS.md"], diagnostic: "AGENTS.md" },
	])("reports invalid prompt arguments $args on stderr", ({ args, diagnostic }) => {
		const result = runCli(["prompt", "--json", ...args]);
		expect(result.status).not.toBe(0);
		expect(result.stdout).toBe("");
		expect(result.stderr).toContain(diagnostic);
	});
});
