import { type Component, getKeybindings, setKeybindings } from "@earendil-works/pi-tui";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { FactoryRunAction, FactoryRunGraph, FactoryRunsRead } from "../src/core/kernel/shared.js";
import { KeybindingsManager } from "../src/core/keybindings.js";
import { InteractiveMode } from "../src/modes/interactive/interactive-mode.js";
import { initTheme } from "../src/modes/interactive/theme/theme.js";

type SubmitContext = {
	defaultEditor: { onSubmit?: (text: string) => Promise<void> };
	editor: { getText: () => string; setText: (text: string) => void };
	[key: string]: unknown;
};

type Prototype = {
	setupEditorSubmitHandler(this: SubmitContext): void;
};

const prototype = InteractiveMode.prototype as unknown as Prototype;

function makeSubmitContext() {
	const prompt = vi.fn(async () => undefined);
	let editorText = "";
	const context: SubmitContext = {
		defaultEditor: {},
		editor: {
			getText: () => editorText,
			setText: (text: string) => {
				editorText = text;
			},
		},
		agentConnection: { prompt },
		showError: vi.fn(),
		showStatus: vi.fn(),
		echoLocalCommand: vi.fn(),
		handleSessionCommand: vi.fn(async () => undefined),
		showTreeSelector: vi.fn(async () => undefined),
		showSettingsSelector: vi.fn(async () => undefined),
		showHeartbeatManager: vi.fn(async () => undefined),
		submittedInputBehavior: "steer",
		inputSubmissionGeneration: 0,
		inputSubmissionsPending: 0,
		pendingPromptStashReleases: [],
		promptStashState: {},
		pendingSubmittedPromptStash: undefined,
		snapshotPromptStash: vi.fn(() => ({ text: "" })),
		promptStash: undefined,
		promptStashSessionId: "session-1",
		sessionId: "session-1",
		clearShortcutGuide: vi.fn(),
	};
	return context;
}

describe("InteractiveMode no-argument command usage errors", () => {
	beforeAll(() => initTheme("dark"));

	it("rejects arguments to /tree with a usage error instead of prompting", async () => {
		const context = makeSubmitContext();
		const prompt = (context.agentConnection as { prompt: ReturnType<typeof vi.fn> }).prompt;
		prototype.setupEditorSubmitHandler.call(context);
		// The real editor clears its buffer before onSubmit runs; the usage
		// error must put the draft back for editing (as /clear does).
		// The real editor clears its buffer BEFORE invoking onSubmit.
		context.editor.setText("");
		await context.defaultEditor.onSubmit?.("/tree fix the bug");
		expect(context.showError).toHaveBeenCalledWith("Usage: /tree");
		expect(prompt).not.toHaveBeenCalled();
		expect(context.showTreeSelector).not.toHaveBeenCalled();
		expect(context.editor.getText()).toBe("/tree fix the bug");
	});

	it("still opens the tree selector without arguments", async () => {
		const context = makeSubmitContext();
		prototype.setupEditorSubmitHandler.call(context);
		await context.defaultEditor.onSubmit?.("/tree");
		expect(context.showTreeSelector).toHaveBeenCalledTimes(1);
		expect(context.showError).not.toHaveBeenCalled();
	});

	it.each(["settings", "session", "heartbeats"])("rejects arguments to /%s", async (command) => {
		const context = makeSubmitContext();
		const prompt = (context.agentConnection as { prompt: ReturnType<typeof vi.fn> }).prompt;
		prototype.setupEditorSubmitHandler.call(context);
		await context.defaultEditor.onSubmit?.(`/${command} stray argument`);
		expect(context.showError).toHaveBeenCalledWith(`Usage: /${command}`);
		expect(prompt).not.toHaveBeenCalled();
	});

	it("toggles /speed on and off, parses explicit args, and rejects invalid arguments", async () => {
		const context = makeSubmitContext();
		Object.setPrototypeOf(context, InteractiveMode.prototype); // runs the real setSpeedDisplay
		const footer = { setSpeedEnabled: vi.fn(), setSpeedText: vi.fn() };
		Object.assign(context, { footer, speedDisplayEnabled: false });
		Object.assign(context, { ui: { requestRender: vi.fn() }, uiServices: { settingsManager: {} } });
		prototype.setupEditorSubmitHandler.call(context);
		await context.defaultEditor.onSubmit?.("/speed");
		expect(footer.setSpeedEnabled).toHaveBeenLastCalledWith(true);
		await context.defaultEditor.onSubmit?.("/speed off");
		expect(footer.setSpeedEnabled).toHaveBeenLastCalledWith(false);
		expect(footer.setSpeedText).toHaveBeenCalledWith(undefined);
		await context.defaultEditor.onSubmit?.("/speed banana");
		expect(context.showError).toHaveBeenCalledWith("Usage: /speed [on|off]");
		expect((context.agentConnection as { prompt: ReturnType<typeof vi.fn> }).prompt).not.toHaveBeenCalled();
	});
});

describe("InteractiveMode factory page", () => {
	beforeAll(() => initTheme("dark"));

	function fixture(state: string, id = "first"): FactoryRunGraph {
		return {
			run_id: id,
			name: `Run ${id}`,
			state,
			active_nodes: ["prepare"],
			machine: { order: ["prepare", "finish"], transitions: [{ from: "prepare", to: "finish" }] },
		};
	}

	async function withPage(
		run: (
			page: Component,
			setRead: (read: FactoryRunsRead) => void,
			context: SubmitContext,
			act: ReturnType<typeof vi.fn>,
		) => Promise<void>,
	) {
		vi.useFakeTimers();
		const previousKeys = getKeybindings();
		setKeybindings(
			new KeybindingsManager({ "tui.select.confirm": "x", "tui.select.cancel": "z", "tui.select.down": "j" }),
		);
		const context = makeSubmitContext();
		Object.setPrototypeOf(context, InteractiveMode.prototype);
		let page: Component | undefined;
		let snapshot: FactoryRunsRead = { status: "ok", runs: [fixture("paused"), fixture("running", "second")] };
		const act = vi.fn(async (_id: string, _action: FactoryRunAction) => ({ status: "ok" }));
		const read = vi.fn(async () => snapshot);
		const hide = vi.fn(() => {
			page = undefined;
		});
		Object.assign(context, {
			uiServices: { settingsManager: {} },
			ui: {
				requestRender: vi.fn(),
				terminal: { rows: 24 },
				showOverlay: (component: Component) => {
					page = component;
					return { hide };
				},
			},
			connectionState: { sessionId: "session-1" },
			agentConnection: { ...(context.agentConnection as object), readFactoryRuns: read, actOnFactoryRun: act },
		});
		try {
			prototype.setupEditorSubmitHandler.call(context);
			await context.defaultEditor.onSubmit?.("/factory");
			expect(page).toBeDefined();
			await run(
				page!,
				(value) => {
					snapshot = value;
				},
				context,
				act,
			);
			expect((context.agentConnection as { prompt: ReturnType<typeof vi.fn> }).prompt).not.toHaveBeenCalled();
		} finally {
			(
				InteractiveMode.prototype as unknown as { closeFactoryPage(this: SubmitContext): void }
			).closeFactoryPage.call(context);
			setKeybindings(previousKeys);
			vi.useRealTimers();
		}
	}

	it("PAPI-14 renders a live graph, sends exact actions with remapped keys, and restores navigation", async () => {
		await withPage(async (page, setRead, context, act) => {
			const screen = () => page.render(80).join("\n");
			expect(screen()).toContain("X actions");
			expect(screen()).toContain("Z close");
			expect(screen()).toContain("Run first [paused]");
			expect(screen()).toContain("* prepare");
			expect(screen()).toContain("prepare → finish");
			page.handleInput?.("\r");
			expect(screen()).not.toContain("> Resume");
			page.handleInput?.("x");
			expect(screen()).toContain("> Resume");
			// A refresh can reorder the list without changing the selected run.
			setRead({ status: "ok", runs: [fixture("running", "second"), fixture("paused")] });
			await vi.advanceTimersByTimeAsync(1000);
			page.handleInput?.("x");
			await vi.advanceTimersByTimeAsync(0);
			expect(act.mock.calls).toEqual([["first", "resume"]]);
			page.handleInput?.("j");
			expect(screen()).toContain("Run second [running]");
			page.handleInput?.("x");
			expect(screen()).toContain("> Stop");
			expect(screen()).not.toContain("Resume");
			page.handleInput?.("x");
			await vi.advanceTimersByTimeAsync(0);
			expect(act.mock.calls).toEqual([
				["first", "resume"],
				["second", "stop"],
			]);
			page.handleInput?.("z");
			expect(context.factoryPage).toBeUndefined();
			await context.defaultEditor.onSubmit?.("/tree");
			expect(context.showTreeSelector).toHaveBeenCalledOnce();
		});
	});

	it("PAPI-14 invalidates a stale action on background refresh", async () => {
		await withPage(async (page, setRead, _context, act) => {
			page.handleInput?.("x");
			setRead({ status: "ok", runs: [fixture("running", "second")] });
			await vi.advanceTimersByTimeAsync(1000);
			const screen = page.render(80).join("\n");
			expect(screen).toContain("Run second [running]");
			expect(screen).not.toContain("> Resume");
			page.handleInput?.("x");
			await vi.advanceTimersByTimeAsync(0);
			expect(act).not.toHaveBeenCalled();
		});
	});

	it.each(["replaced", "resumed", "unavailable", "session-changed"] as const)(
		"PAPI-14 refuses a captured Resume on dispatch when %s",
		async (change) => {
			await withPage(async (page, setRead, context, act) => {
				page.handleInput?.("x");
				expect(page.render(80).join("\n")).toContain("> Resume");
				if (change === "session-changed") context.connectionState = { sessionId: "session-2" };
				else if (change === "unavailable") setRead({ status: "unavailable" });
				else setRead({ status: "ok", runs: [fixture("running", change === "replaced" ? "second" : "first")] });
				page.handleInput?.("x");
				await vi.advanceTimersByTimeAsync(0);
				if (change === "unavailable") expect(page.render(80).join("\n")).toContain("unavailable");
				expect(act).not.toHaveBeenCalled();
			});
		},
	);
});
