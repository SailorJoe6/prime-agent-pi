import { type Api, fauxAssistantMessage, type Model } from "@earendil-works/pi-ai";
import { describe, expect, it, vi } from "vitest";
import type { HostRequestHandlers } from "../../../src/core/kernel/index.js";
import {
	type CreateRlmRootSessionOptions,
	createRlmFindModelsHostHandler,
	findRlmModelMatches,
	findUniqueRlmShortFormModelMatch,
	formatRlmModelUnavailableError,
} from "../../../src/core/rlm-runtime.js";
import { SessionManager } from "../../../src/core/session-manager.js";
import { createHarness } from "../harness.js";

const provider = "faux-eng-4649";

function catalogModel(provider: string, id: string): Model<Api> {
	return { id, name: id, provider } as Model<Api>;
}

function openAICodexToken(accountId: string): string {
	const payload = Buffer.from(
		JSON.stringify({ "https://api.openai.com/auth": { chatgpt_account_id: accountId } }),
	).toString("base64url");
	return `header.${payload}.signature`;
}

describe("ENG-4649 subagent model selection", () => {
	const catalog = [
		{ provider: "openai-codex", id: "gpt-6.2-astra", name: "GPT 6.2 Astra Next Generation" },
		{ provider: "faux", id: "openai-codex-astra", name: "Astra" },
		{ provider: "openai-codex", id: "gpt-6-astra", name: "GPT 6 Astra" },
	] as Model<Api>[];
	const matches = catalog.map(({ provider, id, name }) => ({ provider, id, name, selector: `${provider}/${id}` }));
	const [newer, other, older] = matches;
	const findModels = createRlmFindModelsHostHandler((query, limit) => ({
		models: findRlmModelMatches(query, catalog, limit),
	}));

	it.each([
		{ query: "openai-codex astra", limit: 8, expected: [older, newer] },
		{ query: "  OPENAI-CODEX\tNEXT GENERATION  ", limit: 8, expected: [newer] },
		{ query: "openai-codex astra", limit: 1, expected: [older] },
		{ query: "openai-codex/gpt-6.2-astra", limit: 8, expected: [newer] },
		{ query: "astra", limit: 8, expected: [other, older, newer] },
		{ query: "gpt 6.2", limit: 8, expected: [newer] },
	])("TASK-5 returns model results for $query (limit $limit)", async ({ query, limit, expected }) => {
		await expect(findModels({ query, limit })).resolves.toEqual({ models: expected });
	});

	it("searches a bounded authenticated catalog without advertising it", async () => {
		const harness = await createHarness({
			provider,
			models: Array.from({ length: 320 }, (_, index) => ({ id: `model-${index}` })),
		});
		try {
			const prompt = harness.session.agent.state.systemPrompt;
			expect(prompt).not.toContain(`${provider}/model-319`);
			const handlers = (
				harness.session as unknown as { _createKernelHostHandlers(): HostRequestHandlers }
			)._createKernelHostHandlers();
			const findModels = handlers["rlm.find_models"];
			if (!findModels) throw new Error("Missing rlm.find_models host handler");
			await expect(findModels({ query: "model 319", limit: 5 })).resolves.toEqual({
				models: [
					{
						provider,
						id: "model-319",
						name: "model-319",
						selector: `${provider}/model-319`,
					},
				],
			});
			await expect(findModels({ query: "model", limit: 21 })).rejects.toThrow("integer from 1 to 20");
			harness.setResponses([fauxAssistantMessage("resolved child answer")]);

			const result = await harness.session.runRlmChild("use the requested model", {
				model: `${provider}/model-319`,
			});

			expect(result.model).toBe(`${provider}/model-319`);
			await vi.waitFor(async () => {
				const childEntry = (await harness.session.listRlmSubagents()).subagents[0];
				expect(childEntry?.status).toBe("completed");
				expect(harness.session.getRlmChildSession(childEntry!.rlm_child_id)?.model?.id).toBe("model-319");
			});
		} finally {
			harness.cleanup();
		}
	});

	it("omits providers whose credentials are marked expired", async () => {
		const harness = await createHarness({ provider, models: [{ id: "parent-model" }, { id: "child-model" }] });
		try {
			expect((await harness.session.findRlmModels("child", 8)).models).toHaveLength(1);
			expect(harness.session.modelRegistry.markProviderAuthStale(provider)).toBe(true);
			expect(harness.session.modelRegistry.markProviderAuthStale(provider)).toBe(true);
			expect(harness.session.modelRegistry.getProviderAuthStatus(provider)).toMatchObject({
				source: "stale",
				label: "expired",
			});
			await expect(harness.session.findRlmModels("child-model", 8)).resolves.toEqual({ models: [] });
		} finally {
			harness.cleanup();
		}
	});

	it.each(["spawn", "create_session"])("TASK-5 resolves exact Codex Astra models for %s", async (operation) => {
		const codexProvider = "openai-codex";
		const ids = ["gpt-6-astra", "gpt-6.2-astra"];
		const createRlmRootSession = vi.fn(async ({ model }: CreateRlmRootSessionOptions) => ({
			active_session_id: "fixture-active",
			session_id: "fixture-session",
			name: "fixture",
			session_file: "/fixture.jsonl",
			model: `${model.provider}/${model.id}`,
		}));
		const harness = await createHarness({
			provider: codexProvider,
			models: [{ id: "parent-model" }, ...ids.map((id) => ({ id }))],
			...(operation === "create_session"
				? {
						subagentRuntimeHost: {
							createRlmRootSession,
							createRlmSubagentRuntime: async () => {
								throw new Error("Unexpected child host request");
							},
							deleteRlmSubagentRuntime: async () => {},
						},
					}
				: {}),
		});
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
		try {
			const access = openAICodexToken("account-1");
			harness.authStorage.removeRuntimeApiKey(codexProvider);
			harness.authStorage.set(codexProvider, {
				type: "oauth",
				access,
				refresh: "fixture-refresh",
				expires: Date.now() + 60_000,
			});
			const preflight = vi.spyOn(harness.session.modelRegistry, "getApiKeyAndHeaders");
			harness.setResponses(ids.map(() => fauxAssistantMessage("Astra reply")));
			for (const id of ids) {
				const model = `${codexProvider}/${id}`;
				const options = { model };
				const result =
					operation === "spawn"
						? await harness.session.runRlmChild("reply with the selected model", options)
						: await harness.session.createRlmSession("reply with the selected model", options);
				expect(result.model).toBe(model);
				expect(preflight).toHaveBeenCalledWith(expect.objectContaining({ provider: codexProvider, id }));
			}
			const unavailable = { model: `${codexProvider}/unconfigured-model` };
			const launch =
				operation === "spawn"
					? harness.session.runRlmChild.bind(harness.session)
					: harness.session.createRlmSession.bind(harness.session);
			await expect(launch("reject unknown model", unavailable)).rejects.toThrow("is unavailable");
			// The faux harness supplies an API key fallback in addition to the stored OAuth fixture.
			expect(harness.session.modelRegistry.markProviderAuthStale(codexProvider)).toBe(true);
			expect(harness.session.modelRegistry.markProviderAuthStale(codexProvider)).toBe(true);
			expect(harness.session.modelRegistry.getProviderAuthStatus(codexProvider)).toMatchObject({
				source: "stale",
				label: "expired",
			});
			await expect(launch("reject expired credentials", { model: `${codexProvider}/${ids[1]}` })).rejects.toThrow(
				"is unavailable",
			);
		} finally {
			vi.unstubAllGlobals();
			harness.cleanup();
		}
	});

	it("includes private Prime models authorized for the selected team", async () => {
		const harness = await createHarness({ provider, models: [{ id: "parent-model" }] });
		const fetchModels = vi.fn(
			async (_input: string | URL | Request) =>
				new Response(JSON.stringify({ data: [{ id: "internal/glm-5.2-fast" }] }), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
		);
		vi.stubGlobal("fetch", fetchModels);
		try {
			harness.authStorage.set("prime-inference", {
				type: "api_key",
				key: "prime-key",
				primeTeam: { teamId: "engineering-team", name: "Prime Engineering" },
			});

			const discovered = await harness.session.findRlmModels("glm 5.2", 8);
			expect(discovered.models.map((model) => model.selector)).toContain("prime-inference/internal/glm-5.2-fast");
			const primeCatalogCalls = fetchModels.mock.calls.filter((call) =>
				String(call[0]).includes("pinference.ai/api/v1/models"),
			);
			expect(primeCatalogCalls).toHaveLength(1);
		} finally {
			vi.unstubAllGlobals();
			harness.cleanup();
		}
	});

	it("does not warn when an unavailable selector is already the parent model", async () => {
		const codexProvider = "openai-codex";
		const harness = await createHarness({ provider: codexProvider, models: [{ id: "parent-model" }] });
		const catalog = vi.spyOn(harness.session.modelRegistry, "getExecutableModels").mockResolvedValue([]);
		try {
			harness.authStorage.setRuntimeApiKey(codexProvider, openAICodexToken("account-1"));
			await expect(harness.session.findRlmModels("parent", 8)).resolves.toEqual({ models: [] });
			harness.setResponses([fauxAssistantMessage("same parent answer")]);

			const result = await harness.session.runRlmChild("keep the parent model", {
				model: `${codexProvider}/parent-model`,
			});
			expect(result.model).toBe(`${codexProvider}/parent-model`);
			await vi.waitFor(async () => {
				expect((await harness.session.listRlmSubagents()).subagents[0]?.status).toBe("completed");
			});
		} finally {
			catalog.mockRestore();
			harness.cleanup();
		}
	});

	it("resolves the parent model as its own short form when the catalog lacks it", async () => {
		const codexProvider = "openai-codex";
		const harness = await createHarness({ provider: codexProvider, models: [{ id: "parent-model" }] });
		const catalog = vi.spyOn(harness.session.modelRegistry, "getExecutableModels").mockResolvedValue([]);
		try {
			harness.authStorage.setRuntimeApiKey(codexProvider, openAICodexToken("account-1"));
			await expect(harness.session.findRlmModels("parent", 8)).resolves.toEqual({ models: [] });
			harness.setResponses([fauxAssistantMessage("short form parent answer")]);

			const result = await harness.session.runRlmChild("keep the parent model by short form", {
				model: "parent-model",
			});

			expect(result.model).toBe(`${codexProvider}/parent-model`);
			await vi.waitFor(
				async () => {
					const childEntry = (await harness.session.listRlmSubagents()).subagents[0];
					expect(childEntry?.status).toBe("completed");
					expect(harness.session.getRlmChildSession(childEntry!.rlm_child_id)?.model?.id).toBe("parent-model");
				},
				{ timeout: 5_000 },
			);
		} finally {
			catalog.mockRestore();
			harness.cleanup();
		}
	});

	it("does not start a child after its parent is disposed during preflight", async () => {
		const harness = await createHarness({
			provider,
			models: [{ id: "parent-model" }, { id: "child-model" }],
		});
		let releasePreflight!: () => void;
		const preflightGate = new Promise<void>((resolve) => {
			releasePreflight = resolve;
		});
		let providerCalls = 0;
		try {
			harness.setResponses([
				() => {
					providerCalls++;
					return fauxAssistantMessage("late child ran");
				},
			]);
			const authPreflight = vi
				.spyOn(harness.session.modelRegistry, "getApiKeyAndHeaders")
				.mockImplementationOnce(async () => {
					await preflightGate;
					return { ok: true, apiKey: "faux-key" };
				});
			const run = harness.session.runRlmChild("do not run after disposal", {
				model: `${provider}/child-model`,
			});
			await vi.waitFor(() => expect(authPreflight).toHaveBeenCalledOnce());
			harness.session.dispose();
			releasePreflight();

			await expect(run).rejects.toThrow("Cannot spawn a subagent after its parent was disposed");
			expect(providerCalls).toBe(0);
			expect((await harness.session.listRlmSubagents()).subagents).toEqual([]);
		} finally {
			releasePreflight();
			harness.cleanup();
		}
	});

	it("reserves an explicit child name while model validation is pending", async () => {
		const harness = await createHarness({
			provider,
			models: [{ id: "parent-model" }],
		});
		try {
			harness.setResponses([fauxAssistantMessage("first child answer")]);

			const first = harness.session.runRlmChild("first task", { name: "shared-reviewer" });
			await expect(harness.session.runRlmChild("second task", { name: "shared-reviewer" })).rejects.toThrow(
				'Agent name "shared-reviewer" is unavailable: an agent of that name already exists at depth 1 under this parent',
			);
			await expect(first).resolves.toMatchObject({ name: "shared-reviewer" });
		} finally {
			harness.cleanup();
		}
	});

	it("runs and retains a child on an explicitly selected model", async () => {
		const harness = await createHarness({
			provider,
			models: [
				{ id: "parent-model", reasoning: true },
				{ id: "child-model", name: "Child Model", reasoning: false },
				{ id: "later-parent-model", reasoning: true },
			],
			persistSession: true,
		});
		try {
			harness.session.setThinkingLevel("high");
			const seenModels: string[] = [];
			const respond =
				(text: string) => (_context: unknown, _options: unknown, _state: unknown, model: { id: string }) => {
					seenModels.push(model.id);
					return fauxAssistantMessage(text);
				};
			// The child completes without replying, so the parent receives a
			// host-injected terminal notice that consumes one parent-model turn.
			harness.setResponses([
				respond("initial child answer"),
				respond("terminal notice ack"),
				respond("follow-up child answer"),
				respond("terminal notice ack"),
			]);

			const result = await harness.session.runRlmChild("inspect the API", {
				name: "api-reviewer",
				model: `${provider}/child-model`,
			});
			await vi.waitFor(async () => {
				expect((await harness.session.listRlmSubagents()).subagents[0]?.status).toBe("completed");
			});
			const childEntry = (await harness.session.listRlmSubagents()).subagents[0];
			const child = harness.session.getRlmChildSession(childEntry!.rlm_child_id);
			expect(child?.model?.id).toBe("child-model");
			expect(child?.thinkingLevel).toBe("off");

			await harness.session.setModel(harness.getModel("later-parent-model")!);
			await child!.prompt("check the follow-up", { expandPromptTemplates: false, source: "extension" });
			await child!.agent.waitForIdle();

			const childTurns = seenModels.filter((id) => id === "child-model");
			expect(childTurns).toHaveLength(2);
			expect(seenModels.filter((id) => id !== "child-model").every((id) => id.endsWith("parent-model"))).toBe(true);
			expect(child?.model?.id).toBe("child-model");
			expect(result.session_dir).not.toBeNull();
			const childSessions = await SessionManager.list(harness.tempDir, result.session_dir!);
			const persisted = SessionManager.open(childSessions[0]!.path, result.session_dir!);
			expect(persisted.buildSessionContext().model).toEqual({
				provider,
				modelId: "child-model",
			});
		} finally {
			harness.cleanup();
		}
	});

	it.each([
		{ childReasoning: true, thinking: "low" as const },
		{ childReasoning: false, thinking: "off" as const },
	])("applies an explicit $thinking thinking level to the child", async ({ childReasoning, thinking }) => {
		const harness = await createHarness({
			provider,
			models: [
				{ id: "parent-model", reasoning: true },
				{ id: "child-model", reasoning: childReasoning },
			],
		});
		try {
			harness.session.setThinkingLevel("high");
			harness.setResponses([fauxAssistantMessage("child answer")]);

			await harness.session.runRlmChild("use explicit effort", {
				model: `${provider}/child-model`,
				thinking,
			});
			await vi.waitFor(async () => {
				const childEntry = (await harness.session.listRlmSubagents()).subagents[0];
				const child = harness.session.getRlmChildSession(childEntry!.rlm_child_id);
				expect(child?.thinkingLevel).toBe(thinking);
			});
		} finally {
			harness.cleanup();
		}
	});

	it("inherits the parent thinking level when no override is supplied", async () => {
		const harness = await createHarness({
			provider,
			models: [
				{ id: "parent-model", reasoning: true },
				{ id: "child-model", reasoning: true },
			],
		});
		try {
			harness.session.setThinkingLevel("high");
			harness.setResponses([fauxAssistantMessage("child answer")]);

			await harness.session.runRlmChild("inherit effort", { model: `${provider}/child-model` });
			await vi.waitFor(async () => {
				const childEntry = (await harness.session.listRlmSubagents()).subagents[0];
				const child = harness.session.getRlmChildSession(childEntry!.rlm_child_id);
				expect(child?.thinkingLevel).toBe("high");
			});
		} finally {
			harness.cleanup();
		}
	});

	it("fails spawn when an explicit thinking level is unsupported by the resolved model", async () => {
		const harness = await createHarness({
			provider,
			models: [
				{ id: "parent-model", reasoning: true },
				{ id: "child-model", reasoning: false },
			],
		});
		try {
			await expect(
				harness.session.runRlmChild("think hard", { model: `${provider}/child-model`, thinking: "high" }),
			).rejects.toThrow(
				`Requested thinking level "high" is not supported by model "${provider}/child-model"; supported levels: off`,
			);
		} finally {
			harness.cleanup();
		}
	});

	it("inherits the parent model when no override is supplied", async () => {
		const harness = await createHarness({
			provider,
			models: [{ id: "parent-model" }, { id: "child-model" }],
		});
		try {
			let seenModel: string | undefined;
			harness.setResponses([
				(_context, _options, _state, model) => {
					seenModel = model.id;
					return fauxAssistantMessage("inherited child answer");
				},
			]);

			await harness.session.runRlmChild("inherit the model");
			await vi.waitFor(() => expect(seenModel).toBe("parent-model"));
		} finally {
			harness.cleanup();
		}
	});

	it("accepts a selected model authenticated by headers", async () => {
		const harness = await createHarness({
			provider,
			models: [{ id: "parent-model" }, { id: "child-model" }],
		});
		try {
			harness.setResponses([fauxAssistantMessage("header-auth child answer")]);
			const authPreflight = vi
				.spyOn(harness.session.modelRegistry, "getApiKeyAndHeaders")
				.mockResolvedValueOnce({ ok: true, headers: { Authorization: "Bearer header-token" } });

			const result = await harness.session.runRlmChild("use header auth", {
				model: `${provider}/child-model`,
			});
			authPreflight.mockRestore();

			expect(result.model).toBe(`${provider}/child-model`);
		} finally {
			harness.cleanup();
		}
	});

	it("rejects unavailable requested models at admission without fallback", async () => {
		const harness = await createHarness({
			provider,
			models: [{ id: "parent-model" }, { id: "child-model" }],
		});
		try {
			await expect(harness.session.runRlmChild("bad type", { model: 42 })).rejects.toThrow(
				"rlm.spawn model must be a string",
			);
			await expect(
				harness.session.runRlmChild("unknown model", { model: `${provider}/missing-model` }),
			).rejects.toThrow("is unavailable, unauthenticated, or expired");
			await expect(
				harness.session.runRlmChild("unauthenticated provider", { model: "not-authed/missing-model" }),
			).rejects.toThrow("is unavailable, unauthenticated, or expired");

			const availability = vi
				.spyOn(harness.session.modelRegistry, "getAvailable")
				.mockReturnValue([harness.getModel("parent-model")!]);
			await expect(
				harness.session.runRlmChild("unavailable model", { model: `${provider}/child-model` }),
			).rejects.toThrow("is unavailable, unauthenticated, or expired");
			availability.mockRestore();

			const authPreflight = vi
				.spyOn(harness.session.modelRegistry, "getApiKeyAndHeaders")
				.mockResolvedValueOnce({ ok: false, error: "token expired" });
			await expect(
				harness.session.runRlmChild("failed auth preflight", { model: `${provider}/child-model` }),
			).rejects.toThrow("failed authentication preflight");
			authPreflight.mockRestore();

			expect((await harness.session.listRlmSubagents()).subagents).toEqual([]);
		} finally {
			harness.cleanup();
		}
	});

	it("resolves an unambiguous bare model id to its full selector", async () => {
		const harness = await createHarness({
			provider,
			models: [{ id: "parent-model" }, { id: "z-ai/glm-5.3" }],
		});
		try {
			harness.setResponses([fauxAssistantMessage("short form child answer")]);

			const result = await harness.session.runRlmChild("use the reported short form", {
				model: "z-ai/glm-5.3",
			});

			expect(result.model).toBe(`${provider}/z-ai/glm-5.3`);
			await vi.waitFor(async () => {
				const childEntry = (await harness.session.listRlmSubagents()).subagents[0];
				expect(childEntry?.status).toBe("completed");
				expect(harness.session.getRlmChildSession(childEntry!.rlm_child_id)?.model?.id).toBe("z-ai/glm-5.3");
			});
		} finally {
			harness.cleanup();
		}
	});

	it("does not auto-resolve an ambiguous bare id and hints the full selectors", async () => {
		const harness = await createHarness({
			provider,
			models: [{ id: "parent-model" }, { id: "glm-5.3" }, { id: "z-ai/glm-5.3" }],
		});
		try {
			await expect(harness.session.runRlmChild("ambiguous bare id", { model: "glm-5.3" })).rejects.toThrow(
				`close matches: "${provider}/glm-5.3", "${provider}/z-ai/glm-5.3"`,
			);
			expect((await harness.session.listRlmSubagents()).subagents).toEqual([]);
		} finally {
			harness.cleanup();
		}
	});

	it("does not auto-resolve an ambiguous bare id that also matches the parent", async () => {
		const harness = await createHarness({
			provider,
			models: [{ id: "z-ai/glm-5.3" }, { id: "glm-5.3" }, { id: "other/glm-5.3" }],
		});
		try {
			// The parent is the first model, "z-ai/glm-5.3", whose selector ends with
			// "/glm-5.3"; two other authenticated models share that short form, so the
			// reference must stay unresolved instead of silently selecting the parent.
			await expect(harness.session.runRlmChild("ambiguous parent short form", { model: "glm-5.3" })).rejects.toThrow(
				`close matches: "${provider}/glm-5.3", "${provider}/other/glm-5.3", "${provider}/z-ai/glm-5.3"`,
			);
			expect((await harness.session.listRlmSubagents()).subagents).toEqual([]);
		} finally {
			harness.cleanup();
		}
	});

	it("hints the expected selector form when a requested model is unavailable", async () => {
		const harness = await createHarness({
			provider,
			models: [{ id: "parent-model" }, { id: "z-ai/glm-5.3" }],
		});
		try {
			await expect(harness.session.runRlmChild("unknown short form", { model: "glm-5.4" })).rejects.toThrow(
				'selectors use the form "provider/model-id" (e.g. "prime-inference/z-ai/glm-5.3")',
			);
			expect((await harness.session.listRlmSubagents()).subagents).toEqual([]);
		} finally {
			harness.cleanup();
		}
	});
});

describe("rlm model selector resolution", () => {
	const primeModel = catalogModel("prime-inference", "z-ai/glm-5.3");

	it("resolves an unambiguous short form to its full selector", () => {
		expect(findUniqueRlmShortFormModelMatch("z-ai/glm-5.3", [primeModel])).toBe(primeModel);
		expect(findUniqueRlmShortFormModelMatch("glm-5.3", [primeModel])).toBe(primeModel);
	});

	it("stays unresolved when a short form matches zero or several models", () => {
		const otherModel = catalogModel("other-provider", "glm-5.3");
		expect(findUniqueRlmShortFormModelMatch("glm-5.3", [primeModel, otherModel])).toBeUndefined();
		expect(findUniqueRlmShortFormModelMatch("glm-5.4", [primeModel, otherModel])).toBeUndefined();
	});

	it("uses the fallback model only when the catalog has no short-form match", () => {
		const parentModel = catalogModel("prime-inference", "z-ai/glm-5.3");
		const siblingModel = catalogModel("other-provider", "z-ai/glm-5.3");
		expect(findUniqueRlmShortFormModelMatch("glm-5.3", [], parentModel)).toBe(parentModel);
		expect(findUniqueRlmShortFormModelMatch("glm-5.4", [], parentModel)).toBeUndefined();
		expect(findUniqueRlmShortFormModelMatch("glm-5.3", [siblingModel], parentModel)).toBe(siblingModel);
		expect(findUniqueRlmShortFormModelMatch("glm-5.3", [primeModel, siblingModel], parentModel)).toBeUndefined();
	});

	it("hints the expected selector form when no model resolves", () => {
		expect(formatRlmModelUnavailableError("glm-5.4", "subagent", [primeModel])).toBe(
			'Requested subagent model "glm-5.4" is unavailable, unauthenticated, or expired; selectors use the form "provider/model-id" (e.g. "prime-inference/z-ai/glm-5.3")',
		);
	});

	it("lists close matches alongside the form hint", () => {
		expect(formatRlmModelUnavailableError("glm-5", "top-level session", [primeModel])).toBe(
			'Requested top-level session model "glm-5" is unavailable, unauthenticated, or expired; selectors use the form "provider/model-id" (e.g. "prime-inference/z-ai/glm-5.3"); close matches: "prime-inference/z-ai/glm-5.3"',
		);
	});
});
