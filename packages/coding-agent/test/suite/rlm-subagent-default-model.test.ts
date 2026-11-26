import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { describe, expect, it, vi } from "vitest";
import { ENV_AGENT_DIR } from "../../src/config.js";
import { getKernelVenvDir, kernelVenvPython } from "../../src/core/kernel/bootstrap.js";
import { createHarness, getMessageText } from "./harness.js";

const provider = "faux-eng-subagent-default-model";

describe("subagent default model setting", () => {
	it("resolves unpinned spawns against subagentDefaultModel", { timeout: 30_000 }, async () => {
		const harness = await createHarness({
			provider,
			models: [{ id: "parent-model" }, { id: "child-model" }],
			settings: { subagentDefaultModel: `${provider}/child-model` },
		});
		try {
			harness.setResponses([fauxAssistantMessage("child answer")]);

			const result = await harness.session.runRlmChild("do the work");

			expect(result.model).toBe(`${provider}/child-model`);
			await vi.waitFor(
				async () => {
					const childEntry = (await harness.session.listRlmSubagents()).subagents[0];
					expect(childEntry?.status).toBe("completed");
					expect(harness.session.getRlmChildSession(childEntry!.rlm_child_id)?.model?.id).toBe("child-model");
				},
				{ timeout: 10_000 },
			);
		} finally {
			harness.cleanup();
		}
	});

	it("keeps an explicit spawn model ahead of subagentDefaultModel", { timeout: 30_000 }, async () => {
		const harness = await createHarness({
			provider,
			models: [{ id: "parent-model" }, { id: "child-model" }],
			settings: { subagentDefaultModel: `${provider}/child-model` },
		});
		try {
			harness.setResponses([fauxAssistantMessage("parent answer")]);

			const result = await harness.session.runRlmChild("do the work", { model: `${provider}/parent-model` });

			expect(result.model).toBe(`${provider}/parent-model`);
			await vi.waitFor(
				async () => {
					const childEntry = (await harness.session.listRlmSubagents()).subagents[0];
					expect(childEntry?.status).toBe("completed");
					expect(harness.session.getRlmChildSession(childEntry!.rlm_child_id)?.model?.id).toBe("parent-model");
				},
				{ timeout: 10_000 },
			);
		} finally {
			harness.cleanup();
		}
	});

	it("fails an unpinned spawn when the configured default is unavailable", { timeout: 30_000 }, async () => {
		const harness = await createHarness({
			provider,
			models: [{ id: "parent-model" }],
			settings: { subagentDefaultModel: `${provider}/missing-model` },
		});
		try {
			await expect(harness.session.runRlmChild("do the work")).rejects.toThrow(
				`Requested subagent model "${provider}/missing-model" is unavailable, unauthenticated, or expired`,
			);
			expect((await harness.session.listRlmSubagents()).subagents).toEqual([]);
		} finally {
			harness.cleanup();
		}
	});

	it("fails an unpinned spawn when the configured parent-model default is stale", { timeout: 30_000 }, async () => {
		// A default naming the parent model must pass the same availability and
		// authentication preflight as any other reference; the parent-model
		// equality shortcut would start a child that fails its model request.
		const harness = await createHarness({
			provider,
			models: [{ id: "parent-model" }, { id: "child-model" }],
			settings: { subagentDefaultModel: `${provider}/parent-model` },
		});
		try {
			expect(harness.session.modelRegistry.markProviderAuthStale(provider)).toBe(true);
			expect(harness.session.modelRegistry.markProviderAuthStale(provider)).toBe(true);
			expect(harness.session.modelRegistry.getProviderAuthStatus(provider)).toMatchObject({
				source: "stale",
				label: "expired",
			});
			harness.setResponses([fauxAssistantMessage("child answer")]);

			await expect(harness.session.runRlmChild("do the work")).rejects.toThrow(
				`Requested subagent model "${provider}/parent-model" is unavailable, unauthenticated, or expired`,
			);
			expect((await harness.session.listRlmSubagents()).subagents).toEqual([]);
		} finally {
			harness.cleanup();
		}
	});

	it("inherits the parent model when no default is configured", { timeout: 30_000 }, async () => {
		const harness = await createHarness({
			provider,
			models: [{ id: "parent-model" }, { id: "child-model" }],
		});
		try {
			harness.setResponses([fauxAssistantMessage("parent answer")]);

			const result = await harness.session.runRlmChild("do the work");

			expect(result.model).toBe(`${provider}/parent-model`);
			await vi.waitFor(
				async () => {
					const childEntry = (await harness.session.listRlmSubagents()).subagents[0];
					expect(childEntry?.status).toBe("completed");
				},
				{ timeout: 10_000 },
			);
		} finally {
			harness.cleanup();
		}
	});

	it("treats a non-string subagentDefaultModel setting as unset on unpinned spawns", { timeout: 30_000 }, async () => {
		// Corrupted settings (e.g. 42) must degrade to "unset" in the spawn hot
		// path: the child inherits the parent model instead of throwing.
		const harness = await createHarness({
			provider,
			models: [{ id: "parent-model" }, { id: "child-model" }],
			settings: { subagentDefaultModel: 42 as unknown as string },
		});
		try {
			harness.setResponses([fauxAssistantMessage("parent answer")]);

			const result = await harness.session.runRlmChild("do the work");

			expect(result.model).toBe(`${provider}/parent-model`);
			await vi.waitFor(
				async () => {
					const childEntry = (await harness.session.listRlmSubagents()).subagents[0];
					expect(childEntry?.status).toBe("completed");
				},
				{ timeout: 10_000 },
			);
		} finally {
			harness.cleanup();
		}
	});
});

it("PAPI-13 passes output from a saved subagent to the next named machine step through IPython", async () => {
	// CI provisions this interpreter before Vitest; never bootstrap it inside the test.
	const python =
		process.env.PRIME_AGENT_KERNEL_PYTHON ||
		[
			kernelVenvPython(getKernelVenvDir()),
			kernelVenvPython(
				join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "prime/agent/kernel-venv"),
			),
		].find((candidate) => existsSync(candidate));
	if (!python) throw new Error("Run the test:ci kernel bootstrap first or set PRIME_AGENT_KERNEL_PYTHON.");
	const agentDir = mkdtempSync(join(tmpdir(), "pi-suite-factory-"));
	vi.stubEnv(ENV_AGENT_DIR, agentDir);
	vi.stubEnv("PRIME_AGENT_KERNEL_PYTHON", python);
	try {
		writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ factory: { enabled: true } }));
		const harness = await createHarness({ provider: "faux-named-factory", persistSession: true });
		try {
			const childPrompts: string[] = [];
			const savedPrompt = "Choose a title for the sample document.";
			const title = "Cobalt Meadow";
			const code = `
import asyncio
from rlm import rlm

rlm.harness.create_subagent("Title chooser", ${JSON.stringify(savedPrompt)}, id="title-chooser")
rlm.harness.save_factory("format-document", {
    "nodes": [
        {"id": "choose", "subagent": "title-chooser", "outputs": [{"name": "title", "type": "text"}]},
        {"id": "label", "subagent": {"prompt": "Label this document: {title}"},
         "inputs": [{"name": "title", "type": "text", "from": "choose.title"}]},
    ],
})
run_id = (await rlm.factory.run("format-document"))["run_id"]
async with asyncio.timeout(12):
    result = await rlm.factory.watch(run_id)
    while result["state"] == "running":
        result = await rlm.factory.watch(run_id, timeout=12)
        assert result["changed"], result
assert result["state"] == "done", result
print("named machine finished")
`;
			harness.session.setActiveToolsByName(["ipython"]);
			harness.setResponses([
				fauxAssistantMessage(fauxToolCall("ipython", { code }), { stopReason: "toolUse" }),
				(context) => {
					childPrompts.push(getMessageText(context.messages.filter((message) => message.role === "user").at(-1)));
					return fauxAssistantMessage(title);
				},
				(context) => {
					childPrompts.push(getMessageText(context.messages.filter((message) => message.role === "user").at(-1)));
					return fauxAssistantMessage("Document labeled");
				},
				fauxAssistantMessage("Finished"),
			]);

			await harness.session.promptAndWait("Run the sample document machine.");

			expect(
				harness.session.messages.filter((message) => message.role === "toolResult").map(getMessageText),
			).toEqual([expect.stringContaining("named machine finished")]);
			expect(childPrompts.map((prompt) => prompt.split("\n").at(-1))).toEqual([
				savedPrompt,
				`Label this document: ${title}`,
			]);
		} finally {
			await harness.session.disposeAsync({ kernelSnapshot: false });
			harness.cleanup();
		}
	} finally {
		vi.unstubAllEnvs();
		rmSync(agentDir, { recursive: true, force: true });
	}
});
