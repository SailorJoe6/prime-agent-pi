import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { cleanupSessionResources } from "@earendil-works/pi-ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionContext } from "../src/core/extensions/types.js";
import type { KernelBootstrapProgressHandler } from "../src/core/kernel/bootstrap.js";
import * as kernelBootstrap from "../src/core/kernel/bootstrap.js";
import {
	type ExecuteResult,
	KernelBusyAfterInterruptError,
	type KernelClient,
	ReplKernelManager,
} from "../src/core/kernel/index.js";
import { createDeferred } from "../src/core/kernel/shared.js";
import { createAgentSession } from "../src/core/sdk.js";
import { SessionManager } from "../src/core/session-manager.js";
import { SettingsManager } from "../src/core/settings-manager.js";
import { createIpythonToolDefinition, IpythonKernelProvisioner } from "../src/core/tools/ipython.js";

import { getCodingAgentFixtureModel } from "./fixture-models.js";

let tempDir = "";

function writeFakePython(opts: { sleepSeconds?: number } = {}): { python: string; countRuns: () => number } {
	const python = join(tempDir, "python");
	const countFile = join(tempDir, "runs");
	writeFileSync(
		python,
		[
			"#!/bin/sh",
			`echo run >> "${countFile}"`,
			...(opts.sleepSeconds ? [`sleep ${opts.sleepSeconds}`] : []),
			"exit 42",
			"",
		].join("\n"),
	);
	chmodSync(python, 0o755);
	const countRuns = () => {
		try {
			return readFileSync(countFile, "utf8").split("\n").filter(Boolean).length;
		} catch {
			return 0;
		}
	};
	return { python, countRuns };
}

function okExecuteResult(): ExecuteResult {
	return { stdout: "ok", stderr: "", status: "ok", durationMs: 1 };
}

function createBusyKernelContext(
	select: (title: string, options: string[]) => Promise<string | undefined>,
	options: { throwWorkingMessage?: boolean } = {},
): {
	ctx: ExtensionContext;
	setWorkingMessage: ReturnType<typeof vi.fn>;
} {
	const setWorkingMessage = vi.fn(() => {
		if (options.throwWorkingMessage) {
			throw new Error("stale UI context");
		}
	});
	const ctx = {
		hasUI: true,
		ui: {
			select,
			setWorkingMessage,
		},
	} as unknown as ExtensionContext;
	return { ctx, setWorkingMessage };
}

function writeFakeReplRuntime(
	markerPath: string,
	options: {
		gatedExecute?: { startedPath: string; gatePath: string };
		factoryReply?: "legacy" | "failed" | "malformed";
		factoryAction?: boolean;
	} = {},
): string {
	const python = join(tempDir, "python-repl");
	const refuse = `emit({ event: "error", id: request.id, ename: "RuntimeError", evalue: "bootstrap refused", traceback: [] });
		emit({ event: "done", id: request.id, status: "error" });`;
	const capabilities = [
		...(options.factoryReply && options.factoryReply !== "legacy" ? ["factory_runs"] : []),
		...(options.factoryAction ? ["factory_action"] : []),
	];
	const executeBranch = options.gatedExecute
		? `fs.writeFileSync(${JSON.stringify(options.gatedExecute.startedPath)}, "1");
		const gate = setInterval(() => {
			if (!fs.existsSync(${JSON.stringify(options.gatedExecute.gatePath)})) return;
			clearInterval(gate);
			${refuse}
		}, 10);`
		: options.factoryReply || options.factoryAction
			? `emit({ event: "done", id: request.id, status: "ok" });`
			: refuse;
	writeFileSync(
		python,
		`#!/usr/bin/env node
const fs = require("node:fs");
const readline = require("node:readline");
const emit = (event) => process.stdout.write(JSON.stringify(event) + "\\n");
emit({ event: "ready", protocol: 3, python: process.version, capabilities: ${JSON.stringify(capabilities)} });
const input = readline.createInterface({ input: process.stdin });
let waitingCellId;
let stopped = false;
input.on("line", (line) => {
	const request = JSON.parse(line);
	if (request.type === "restore") {
		emit({ event: "done", id: request.id, status: "ok", restored: [], failed: [] });
		return;
	}
	if (request.type === "snapshot") {
		setTimeout(() => {
			fs.writeFileSync(${JSON.stringify(markerPath)}, "1");
			emit({ event: "done", id: request.id, status: "ok", saved: [], skipped: [], bytes: 0 });
		}, 150);
		return;
	}
	if (request.type === "execute") {
		if (request.code === "wait for test_barrier") {
			waitingCellId = request.id;
			emit({ event: "host_request", id: "fixture-barrier", data: { type: "test_barrier" } });
			return;
		}
		${executeBranch}
		return;
	}
	if (request.type === "host_reply" && request.id === "fixture-barrier") {
		emit({ event: "result", id: waitingCellId, text: "cell result" });
		emit({ event: "done", id: waitingCellId, status: "ok" });
		waitingCellId = undefined;
		return;
	}
	if (request.type === "factory_action") {
		if (!${JSON.stringify(options.factoryAction === true)}) process.exit(43);
		const valid = request.run_id === "fixture-run" && waitingCellId && request.id !== waitingCellId &&
			((request.action === "stop" && !stopped) || (request.action === "resume" && stopped));
		// An unrelated reply must not settle this action.
		emit({ event: "done", id: "unrelated-action", status: valid ? "error" : "ok" });
		if (!valid) {
			emit({ event: "error", id: request.id, ename: "ValueError", evalue: "action refused", traceback: [] });
		} else {
			stopped = request.action === "stop";
		}
		emit({ event: "done", id: request.id, status: valid ? "ok" : "error" });
		return;
	}
	if (request.type === "factory_runs") {
		if (${JSON.stringify(options.factoryReply ?? "")} === "legacy") process.exit(43);
		emit({ event: "done", id: request.id, status: ${JSON.stringify(options.factoryReply === "failed" ? "error" : "ok")}, runs: ${JSON.stringify(options.factoryReply === "malformed" ? [{}] : [])} });
		return;
	}
	if (request.type === "shutdown") {
		emit({ event: "done", id: request.id, status: "ok" });
		process.exit(0);
	}
});
`,
	);
	chmodSync(python, 0o755);
	return python;
}

describe("IpythonKernelProvisioner", () => {
	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "prime-agent-provisioner-"));
	});

	afterEach(() => {
		if (tempDir) {
			rmSync(tempDir, { recursive: true, force: true });
			tempDir = "";
		}
	});

	it("PAPI-14 re-reads global factory settings and controls paused and live runs in one REPL", {
		tags: ["kernel-heavy"],
	}, async () => {
		const runtime = resolve(import.meta.dirname, "../../../prime-agent-runtime");
		const python = process.env.PRIME_AGENT_KERNEL_PYTHON ?? join(runtime, ".venv", "bin", "python");
		const settings = SettingsManager.create(tempDir, tempDir);
		const paused = createDeferred<void>();
		const releaseCell = createDeferred<void>();
		const live = createDeferred<void>();
		const settle = createDeferred<void>();
		let childCount = 0;
		const provisioner = new IpythonKernelProvisioner(tempDir, {
			python,
			env: {
				PYTHONPATH: join(runtime, "src"),
				PRIME_AGENT_CODING_AGENT_DIR: tempDir,
				PRIME_AGENT_MACHINES_DIR: join(tempDir, "machines"),
				RLM_HARNESS_STATE_DIR: join(tempDir, "harness"),
			},
			hostHandlers: {
				"rlm.run": async ({ kwargs }) => ({
					rlm_child_id: `color-${++childCount}`,
					name: (kwargs as { name: string }).name,
					session_dir: tempDir,
					model: "fixture",
				}),
				"rlm.collect": async ({ targets }) => {
					const [id] = targets as string[];
					if (id === "color-3") {
						live.resolve();
						await settle.promise;
					}
					return { results: [{ rlm_child_id: id, status: "done", settled: true }] };
				},
				test_barrier: async () => {
					paused.resolve();
					await releaseCell.promise;
					return {};
				},
			},
		});
		try {
			const manager = await provisioner.ensure();
			expect(settings.getFactoryEnabled()).toBe(false);
			const checkGate = "await rlm.factory.graph()";
			const disabled = { status: "error", error: { evalue: expect.stringContaining("factory is disabled") } };
			await expect(manager.execute(`from rlm import rlm, host_request\n${checkGate}`)).resolves.toMatchObject(
				disabled,
			);
			await expect(provisioner.readFactoryRuns()).resolves.toEqual({ status: "ok", runs: [] });
			await settings.setFactoryEnabled(true);
			const cell = manager.execute(`
import asyncio
rlm.harness.save_factory("colors", {"run": {"max_children": 1}, "nodes": [
    {"id": "first", "subagent": {"prompt": "Name a color."}},
    {"id": "second", "depends_on": ["first"], "subagent": {"prompt": "Name another color."}},
]})
async def wait_for_state(run_id, state):
    async with asyncio.timeout(10):
        while (await rlm.factory.status(run_id))["state"] != state:
            await rlm.factory.watch(run_id, timeout=10)
a = (await rlm.factory.run("colors", name="palette"))["run_id"]
await wait_for_state(a, "paused")
b = (await rlm.factory.run("colors"))["run_id"]
await wait_for_state(b, "paused")
await host_request("test_barrier")
`);
			const endedBeforeSignal = cell.then((result) => {
				throw new Error(`Cell finished before control signal: ${result.error?.evalue ?? result.status}`);
			});
			try {
				await Promise.race([paused.promise, endedBeforeSignal]);
				const pair = await provisioner.readFactoryRuns();
				expect(pair).toMatchObject({
					status: "ok",
					runs: [
						{
							name: "palette",
							state: "paused",
							machine: { order: ["first", "second"], transitions: [{ to: "second" }] },
						},
						{ name: null, spec_id: "colors", state: "paused" },
					],
				});
				if (pair.status !== "ok" || !pair.runs[0] || !pair.runs[1]) throw new Error("Expected two paused runs");
				const [a, b] = pair.runs;

				// A direct global settings change bypasses the terminal's live-run disable guard.
				await settings.setFactoryEnabled(false);
				await expect(provisioner.actOnFactoryRun(a.run_id, "resume")).resolves.toMatchObject({
					status: "error",
					error: expect.stringContaining("factory is disabled"),
				});
				await expect(provisioner.readFactoryRuns()).resolves.toMatchObject({
					status: "ok",
					runs: [
						{ run_id: a.run_id, state: "paused" },
						{ run_id: b.run_id, state: "paused" },
					],
				});
				await settings.setFactoryEnabled(true);
				await expect(provisioner.actOnFactoryRun(a.run_id, "resume")).resolves.toEqual({ status: "ok" });
				await Promise.race([live.promise, endedBeforeSignal]);
				await expect(provisioner.actOnFactoryRun(b.run_id, "stop")).resolves.toEqual({ status: "ok" });
				await expect(provisioner.readFactoryRuns()).resolves.toMatchObject({
					status: "ok",
					runs: [{ run_id: a.run_id, state: "running", active_nodes: ["second"] }],
				});
			} finally {
				settle.resolve();
				releaseCell.resolve();
				await cell;
			}
			await expect(manager.execute('await wait_for_state(a, "done")')).resolves.toMatchObject({ status: "ok" });
			await expect(provisioner.readFactoryRuns()).resolves.toEqual({ status: "ok", runs: [] });
			await settings.setFactoryEnabled(false);
			await expect(manager.execute(checkGate)).resolves.toMatchObject(disabled);
		} finally {
			await provisioner.dispose({ snapshot: false });
		}
	});

	it.each(["shared", "split"] as const)(
		"PAPI-14 reads %s SDK settings without redirecting kernel resources",
		{
			tags: ["kernel-heavy"],
		},
		async (layout) => {
			const runtime = resolve(import.meta.dirname, "../../../prime-agent-runtime");
			const resourceDir = join(tempDir, "agent");
			const settingsDir = layout === "split" ? join(tempDir, "settings") : resourceDir;
			const agentDir = relative(process.cwd(), resourceDir);
			// Do not let excess ".." segments collapse at the root in both processes.
			const parentSteps = agentDir.split(sep).filter((part) => part === "..").length;
			const cwd = join(tempDir, ...Array<string>(parentSteps).fill("nested"), "project");
			mkdirSync(cwd, { recursive: true });
			const machineDir = join(resourceDir, "machines", "papi-14-personal-fixture");
			mkdirSync(machineDir, { recursive: true });
			writeFileSync(
				join(machineDir, "MACHINE.md"),
				[
					"---",
					"name: papi-14-personal-fixture",
					"description: Offline test machine",
					"version: 1",
					"---",
					"```machine-spec",
					JSON.stringify({
						states: [{ id: "fixture", entry: true, subagent: { prompt: "Format text." } }],
						transitions: [],
					}),
					"```",
					"",
				].join("\n"),
			);
			expect(resolve(cwd, agentDir)).not.toBe(resourceDir);
			const python = process.env.PRIME_AGENT_KERNEL_PYTHON ?? join(runtime, ".venv", "bin", "python");
			// Select the offline fixture interpreter without installing optional bootstrap packages.
			const selectPython = vi.spyOn(kernelBootstrap, "ensureKernelPython").mockResolvedValue(python);
			vi.stubEnv("PYTHONPATH", join(runtime, "src"));
			try {
				const { session } = await createAgentSession({
					cwd,
					agentDir,
					settingsManager: layout === "split" ? SettingsManager.create(cwd, settingsDir) : undefined,
					model: getCodingAgentFixtureModel("anthropic", "claude-sonnet-4-5")!,
					sessionManager: SessionManager.inMemory(cwd),
					tools: ["ipython"],
				});
				try {
					const tool = session.agent.state.tools.find((candidate) => candidate.name === "ipython")!;
					const execute = async (code: string) => (await tool.execute("factory-settings", { code })).content;
					await expect(
						execute(
							`import os\nfrom rlm import rlm\nprint(os.path.samefile(os.getcwd(), ${JSON.stringify(cwd)}))`,
						),
					).resolves.toEqual([{ type: "text", text: "True\n" }]);
					const checkGate = "await rlm.factory.graph()\nprint('factory enabled')";
					const disabled = [{ type: "text", text: expect.stringContaining("factory is disabled") }];
					expect(session.settingsManager.getFactoryEnabled()).toBe(false);
					await expect(execute(checkGate)).resolves.toEqual(disabled);
					await session.settingsManager.setFactoryEnabled(true);
					expect(JSON.parse(readFileSync(join(settingsDir, "settings.json"), "utf8"))).toMatchObject({
						factory: { enabled: true },
					});
					await expect(execute(checkGate)).resolves.toEqual([{ type: "text", text: "factory enabled\n" }]);
					await expect(
						execute(
							[
								"from rlm.machine_library import select_factory",
								"from rlm.harness import HarnessState",
								"print(select_factory('papi-14-personal-fixture', HarnessState())['states'][0]['id'])",
							].join("\n"),
						),
					).resolves.toEqual([{ type: "text", text: "fixture\n" }]);
					await session.settingsManager.setFactoryEnabled(false);
					await expect(execute(checkGate)).resolves.toEqual(disabled);
				} finally {
					await session.disposeAsync({ kernelSnapshot: false });
				}
			} finally {
				selectPython.mockRestore();
				vi.unstubAllEnvs();
			}
		},
	);

	it.each([
		{ factoryReply: "legacy", status: "unsupported" },
		{ factoryReply: "failed", status: "unavailable" },
		{ factoryReply: "malformed", status: "unavailable" },
	] as const)("PAPI-14 reports a $factoryReply factory read as $status", async ({ factoryReply, status }) => {
		const python = writeFakeReplRuntime(join(tempDir, "unused"), { factoryReply });
		const provisioner = new IpythonKernelProvisioner(tempDir, { python });
		try {
			const manager = await provisioner.ensure();
			await expect(provisioner.readFactoryRuns()).resolves.toEqual({ status });
			await expect(provisioner.actOnFactoryRun("fixture-run", "stop")).resolves.toEqual({ status: "unsupported" });
			await expect(manager.execute("1 + 1")).resolves.toMatchObject({ status: "ok" });
		} finally {
			await provisioner.dispose({ snapshot: false });
		}
	});

	it("PAPI-14 sends both actions to the owning kernel while a cell waits", async () => {
		const python = writeFakeReplRuntime(join(tempDir, "unused"), { factoryAction: true });
		const barrier = createDeferred<void>();
		const release = createDeferred<void>();
		const provisioner = new IpythonKernelProvisioner(tempDir, {
			python,
			hostHandlers: {
				test_barrier: async () => {
					barrier.resolve();
					await release.promise;
					return {};
				},
			},
		});
		try {
			const manager = await provisioner.ensure();
			await expect(provisioner.readFactoryRuns()).resolves.toEqual({ status: "unsupported" });
			const cell = manager.execute("wait for test_barrier");
			try {
				await Promise.race([
					barrier.promise,
					cell.then(() => {
						throw new Error("Cell finished before barrier");
					}),
				]);
				await expect(provisioner.actOnFactoryRun("fixture-run", "stop")).resolves.toEqual({ status: "ok" });
				await expect(provisioner.actOnFactoryRun("unknown-run", "resume")).resolves.toEqual({
					status: "error",
					error: "action refused",
				});
				await expect(provisioner.actOnFactoryRun("fixture-run", "resume")).resolves.toEqual({ status: "ok" });
			} finally {
				release.resolve();
				await expect(cell).resolves.toMatchObject({ status: "ok", result: "cell result" });
			}
		} finally {
			await provisioner.dispose({ snapshot: false });
		}
	});

	it("PAPI-14 distinguishes an untouched kernel from startup in flight without spawning Python", async () => {
		const { python, countRuns } = writeFakePython();
		const gate = createDeferred<void>();
		const provisioner = new IpythonKernelProvisioner(tempDir, { python, readyGate: gate.promise });
		let starting: Promise<unknown> | undefined;
		try {
			await expect(provisioner.readFactoryRuns()).resolves.toEqual({ status: "absent" });
			await expect(provisioner.actOnFactoryRun("fixture-run", "stop")).resolves.toEqual({ status: "absent" });
			starting = provisioner.ensure().catch(() => undefined);
			await expect(provisioner.readFactoryRuns()).resolves.toEqual({ status: "unavailable" });
			await expect(provisioner.actOnFactoryRun("fixture-run", "resume")).resolves.toEqual({ status: "unavailable" });
		} finally {
			const disposed = provisioner.dispose();
			gate.resolve();
			await Promise.all([disposed, starting]);
		}
		expect(countRuns()).toBe(0);
	});

	it("does not surface a failed startup before the kernel's final snapshot flush finished", async () => {
		const marker = join(tempDir, "snapshot-flushed");
		const snapshotDir = join(tempDir, "snapshots");
		mkdirSync(snapshotDir, { recursive: true });
		const python = writeFakeReplRuntime(marker);
		const provisioner = new IpythonKernelProvisioner(tempDir, { python, snapshotDir });
		try {
			await expect(provisioner.ensure()).rejects.toThrow(/Failed to initialize rlm runtime/);
			// The failed kernel's teardown (final snapshot flush included) completed
			// before the failure surfaced, so a replacement provisioner gated on this
			// one cannot race the still-flushing kernel over the same snapshot files.
			expect(existsSync(marker)).toBe(true);
		} finally {
			await provisioner.dispose();
		}
	});

	it("memoizes concurrent ensure() calls into one startup", async () => {
		const { python, countRuns } = writeFakePython();
		const provisioner = new IpythonKernelProvisioner(tempDir, { python });

		const [a, b] = await Promise.allSettled([provisioner.ensure(), provisioner.ensure()]);
		expect(a.status).toBe("rejected");
		expect(b.status).toBe("rejected");
		expect(countRuns()).toBe(1);
	});

	it("retries after a failed startup instead of caching the rejection", async () => {
		const { python, countRuns } = writeFakePython();
		const provisioner = new IpythonKernelProvisioner(tempDir, { python });

		await expect(provisioner.ensure()).rejects.toThrow(/Kernel exited before ready/);
		await expect(provisioner.ensure()).rejects.toThrow(/Kernel exited before ready/);
		expect(countRuns()).toBe(2);
	});

	it("prewarm() swallows the failure and the next ensure() starts fresh", async () => {
		const { python, countRuns } = writeFakePython();
		const provisioner = new IpythonKernelProvisioner(tempDir, { python });

		provisioner.prewarm();
		expect(provisioner.manager).toBeUndefined();

		// Once the prewarm startup settles, ensure() must launch a second attempt.
		await vi.waitFor(async () => {
			await expect(provisioner.ensure()).rejects.toThrow();
			expect(countRuns()).toBeGreaterThanOrEqual(2);
		});
	});

	it("replays the current startup stage to listeners attaching mid-flight", async () => {
		const { python } = writeFakePython({ sleepSeconds: 1 });
		const provisioner = new IpythonKernelProvisioner(tempDir, { python });

		provisioner.prewarm();
		const messages: string[] = [];
		const joined = provisioner.ensure((message) => messages.push(message));
		expect(messages).toContain("Starting Python kernel...");
		await expect(joined).rejects.toThrow();
	});

	it("dispose() settles a startup that is still in flight", async () => {
		const { python } = writeFakePython();
		const provisioner = new IpythonKernelProvisioner(tempDir, { python });

		provisioner.prewarm();
		await provisioner.dispose();
		expect(provisioner.manager).toBeUndefined();
	});

	it("skips the snapshot when dispose({ snapshot: false }) aborts a startup in flight", async () => {
		const marker = join(tempDir, "snapshot-flushed");
		const executeStarted = join(tempDir, "execute-started");
		const executeGate = join(tempDir, "execute-gate");
		const snapshotDir = join(tempDir, "snapshots");
		mkdirSync(snapshotDir, { recursive: true });
		const python = writeFakeReplRuntime(marker, {
			gatedExecute: { startedPath: executeStarted, gatePath: executeGate },
		});
		const provisioner = new IpythonKernelProvisioner(tempDir, { python, snapshotDir });

		const started = provisioner.ensure().catch(() => undefined);
		await vi.waitFor(() => expect(existsSync(executeStarted)).toBe(true));
		const disposed = provisioner.dispose({ snapshot: false });
		writeFileSync(executeGate, "1");
		await Promise.all([disposed, started]);
		expect(existsSync(marker)).toBe(false);
	});

	it("dispose({ snapshot: false }) skips the kernel's final snapshot flush", async () => {
		const { python } = writeFakePython();
		const provisioner = new IpythonKernelProvisioner(tempDir, { python });
		const shutdown = vi.fn(async () => {});
		Reflect.set(provisioner, "managerPromise", Promise.resolve({ shutdown }));

		await provisioner.dispose({ snapshot: false });
		expect(shutdown).toHaveBeenCalledWith({ snapshot: false, drainHostRequests: true });
	});

	it("dispose() before the boot slot prevents the kernel from spawning", async () => {
		const { python, countRuns } = writeFakePython();
		let release: () => void = () => {};
		const gate = new Promise<void>((r) => {
			release = r;
		});
		const provisioner = new IpythonKernelProvisioner(tempDir, { python, readyGate: gate });

		const started = provisioner.ensure().catch(() => {});
		const disposed = provisioner.dispose(); // aborts while the boot waits on readyGate
		release();
		await Promise.all([started, disposed]);
		expect(countRuns()).toBe(0); // disposed boot must never spawn a kernel
	});

	it("aborting the startup owner before the boot slot prevents the kernel from spawning", async () => {
		const { python, countRuns } = writeFakePython();
		let release: () => void = () => {};
		const gate = new Promise<void>((r) => {
			release = r;
		});
		const provisioner = new IpythonKernelProvisioner(tempDir, { python, readyGate: gate });
		const controller = new AbortController();

		const started = provisioner.ensure(undefined, controller.signal);
		controller.abort();
		await expect(started).rejects.toThrow("Python execution aborted");
		release();
		await new Promise((r) => setTimeout(r, 50));

		expect(countRuns()).toBe(0);
		expect(provisioner.manager).toBeUndefined();
	});

	it("waits for readyGate before starting the kernel", async () => {
		const { python, countRuns } = writeFakePython();
		let release: () => void = () => {};
		const gate = new Promise<void>((r) => {
			release = r;
		});
		const provisioner = new IpythonKernelProvisioner(tempDir, { python, readyGate: gate });

		const started = provisioner.ensure().catch(() => {});
		await new Promise((r) => setTimeout(r, 50));
		expect(countRuns()).toBe(0); // gated: must not spawn the kernel yet

		release();
		await started;
		expect(countRuns()).toBe(1);
	});

	it("namespace maintenance returns null when no kernel is running", async () => {
		const provisioner = new IpythonKernelProvisioner(tempDir, {});
		expect(await provisioner.listNamespaceNames()).toBeNull();
		expect(await provisioner.pruneOversizedVariables()).toBeNull();
	});

	it("does not dispose a running kernel when an ensure caller is aborted", async () => {
		const provisioner = new IpythonKernelProvisioner(tempDir, {});
		const dispose = vi.fn(async () => {});
		const manager = { dispose, isRunning: true } as unknown as KernelClient;
		Object.assign(
			provisioner as unknown as {
				managerPromise: Promise<KernelClient>;
				startedManager: KernelClient;
			},
			{
				managerPromise: Promise.resolve(manager),
				startedManager: manager,
			},
		);
		const controller = new AbortController();
		controller.abort();

		await expect(provisioner.ensure(undefined, controller.signal)).rejects.toThrow("Python execution aborted");
		expect(dispose).not.toHaveBeenCalled();
		expect(provisioner.manager).toBe(manager);
	});

	function primeKernelMemo(provisioner: IpythonKernelProvisioner, manager: KernelClient) {
		Object.assign(provisioner as unknown as { managerPromise: Promise<KernelClient>; startedManager: KernelClient }, {
			managerPromise: Promise.resolve(manager),
			startedManager: manager,
		});
	}

	it("drops a dead kernel memo so ensure() restarts instead of reusing it", async () => {
		const { python, countRuns } = writeFakePython();
		const provisioner = new IpythonKernelProvisioner(tempDir, { python });
		primeKernelMemo(provisioner, { isRunning: false, isDefunct: true } as unknown as KernelClient);

		await expect(provisioner.ensure()).rejects.toThrow(/Kernel exited before ready/);
		expect(countRuns()).toBe(1);
	});

	it("keeps the memo for a kernel that is repairing itself, not defunct", async () => {
		const { countRuns } = writeFakePython();
		const provisioner = new IpythonKernelProvisioner(tempDir, {});
		const repairing = { isRunning: false, isDefunct: false } as unknown as KernelClient;
		primeKernelMemo(provisioner, repairing);

		// A second provisioner kernel during protocol repair would split the snapshot dir.
		await expect(provisioner.ensure()).resolves.toBe(repairing);
		expect(countRuns()).toBe(0);
	});

	it("removes startup progress listeners when an ensure caller is aborted", async () => {
		const provisioner = new IpythonKernelProvisioner(tempDir, {});
		Object.assign(
			provisioner as unknown as {
				managerPromise: Promise<KernelClient>;
			},
			{
				managerPromise: new Promise<KernelClient>(() => {}),
			},
		);
		const controller = new AbortController();
		const onProgress = vi.fn();

		const ensurePromise = provisioner.ensure(onProgress, controller.signal).catch(() => undefined);
		controller.abort();
		await ensurePromise;

		const internals = provisioner as unknown as {
			startupListeners: Set<KernelBootstrapProgressHandler>;
		};
		expect(internals.startupListeners.has(onProgress)).toBe(false);
	});

	it("surfaces backgroundOutput in details without changing model content", async () => {
		const execute = vi
			.fn<KernelClient["execute"]>()
			.mockResolvedValueOnce({ ...okExecuteResult(), backgroundOutput: "bg-line" });
		const manager = { execute } as unknown as KernelClient;
		const ensure = vi.fn(async () => manager);
		const kill = vi.fn(async () => {});
		const provisioner = { ensure, kill } as unknown as IpythonKernelProvisioner;
		const tool = createIpythonToolDefinition(tempDir, { provisioner });

		const result = await tool.execute("tool-call", { code: "x = 1" }, undefined, undefined, {} as ExtensionContext);

		expect(result.details.backgroundOutput).toBe("bg-line");
		expect(result.content).toEqual([{ type: "text", text: "ok\n[background output (unattributed)]\nbg-line" }]);
	});

	it("lets the user wait when an interrupted kernel is still busy", async () => {
		const execute = vi
			.fn<KernelClient["execute"]>()
			.mockRejectedValueOnce(new KernelBusyAfterInterruptError())
			.mockResolvedValueOnce(okExecuteResult());
		const manager = { execute } as unknown as KernelClient;
		const ensure = vi.fn(async () => manager);
		const kill = vi.fn(async () => {});
		const provisioner = { ensure, kill } as unknown as IpythonKernelProvisioner;
		const select = vi.fn(async () => "Wait and preserve state");
		const { ctx, setWorkingMessage } = createBusyKernelContext(select, { throwWorkingMessage: true });
		const tool = createIpythonToolDefinition(tempDir, { provisioner });

		const result = await tool.execute("tool-call", { code: "x = 1" }, undefined, undefined, ctx);

		expect(result.details.status).toBe("ok");
		expect(result.details.kernelRestarted).toBe(false);
		expect(ensure).toHaveBeenCalledTimes(2);
		expect(kill).not.toHaveBeenCalled();
		expect(select).toHaveBeenCalledWith(
			expect.stringContaining("previous cell has not stopped"),
			["Wait and preserve state", "Kill kernel and restart"],
			{
				signal: undefined,
			},
		);
		expect(setWorkingMessage).toHaveBeenCalledWith("Waiting for Python kernel...");
		expect(setWorkingMessage).toHaveBeenLastCalledWith(undefined);
	});

	it("lets the user kill and restart a busy interrupted kernel", async () => {
		const busyManager = {
			execute: vi.fn<KernelClient["execute"]>().mockRejectedValueOnce(new KernelBusyAfterInterruptError()),
		} as unknown as KernelClient;
		const freshManager = {
			execute: vi.fn<KernelClient["execute"]>().mockResolvedValueOnce(okExecuteResult()),
		} as unknown as KernelClient;
		const ensure = vi.fn(async () => {
			return ensure.mock.calls.length === 1 ? busyManager : freshManager;
		});
		const kill = vi.fn(async () => {});
		const provisioner = { ensure, kill } as unknown as IpythonKernelProvisioner;
		const select = vi.fn(async () => "Kill kernel and restart");
		const { ctx, setWorkingMessage } = createBusyKernelContext(select, { throwWorkingMessage: true });
		const tool = createIpythonToolDefinition(tempDir, { provisioner });

		const result = await tool.execute("tool-call", { code: "x = 1" }, undefined, undefined, ctx);
		const text = result.content[0]?.type === "text" ? result.content[0].text : "";

		expect(result.details.status).toBe("ok");
		expect(result.details.kernelRestarted).toBe(true);
		expect(text).toContain("<ipython_kernel_reset>");
		expect(text).toContain("Variables, imports, async tasks, and open resources");
		expect(text).toContain("ok");
		expect(ensure).toHaveBeenCalledTimes(2);
		expect(kill).toHaveBeenCalledTimes(1);
		expect(freshManager.execute).toHaveBeenCalledWith("x = 1", expect.objectContaining({ signal: undefined }));
		expect(setWorkingMessage).toHaveBeenCalledWith("Restarting Python kernel...");
		expect(setWorkingMessage).toHaveBeenLastCalledWith(undefined);
	});

	it("does not delete the on-disk snapshot (the kernel survives compaction)", async () => {
		const snapshotDir = join(tempDir, "artifacts");
		const provisioner = new IpythonKernelProvisioner(tempDir, { snapshotDir });
		const dill = join(snapshotDir, "kernel-state.dill");
		const manifest = join(snapshotDir, "kernel-state.json");
		mkdirSync(snapshotDir, { recursive: true });
		writeFileSync(dill, "payload");
		writeFileSync(manifest, "{}");

		// listing the namespace must never touch the on-disk snapshot
		await provisioner.listNamespaceNames();

		expect(existsSync(dill)).toBe(true);
		expect(existsSync(manifest)).toBe(true);
	});
});

describe("ReplKernelManager session cleanup during startup", () => {
	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "prime-agent-kernel-cleanup-"));
	});

	afterEach(() => {
		if (tempDir) {
			rmSync(tempDir, { recursive: true, force: true });
			tempDir = "";
		}
	});

	it("disposes a kernel that is still booting when its session is cleaned up", async () => {
		const python = join(tempDir, "python");
		// Never emits the ready line - stays in the booting phase until killed.
		writeFileSync(python, ["#!/bin/sh", "sleep 30", ""].join("\n"));
		chmodSync(python, 0o755);
		const sessionId = `provisioner-test-${Date.now()}`;
		const manager = new ReplKernelManager({ python, cwd: tempDir, sessionId });

		try {
			const startup = manager.start();
			cleanupSessionResources(sessionId);
			await expect(startup).rejects.toThrow(/Kernel exited before ready|disposed during startup/);
			expect(manager.isRunning).toBe(false);
		} finally {
			await manager.shutdown({ snapshot: true, drainHostRequests: true });
		}
	});
});
