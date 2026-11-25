/**
 * System prompt construction and project context loading
 */

import { buildChildAgentDoctrine, buildRlmPromptParts, buildSubagentGuidance } from "./prompts/index.js";
import { REFINE_SKILL_NAME } from "./refinement/index.js";
import { formatSkillsForPrompt, getPythonSkillRuntimeInfo, type Skill } from "./skills.js";

export interface BuildSystemPromptOptions {
	/** Custom system prompt (replaces default). */
	customPrompt?: string;
	/** Active tools. Tool schemas carry tool descriptions outside the prompt body. */
	selectedTools?: string[];
	/** Optional one-line tool snippets keyed by tool name. Used only for custom prompts. */
	toolSnippets?: Record<string, string>;
	/** Additional guideline bullets appended to the system prompt. */
	promptGuidelines?: string[];
	/** Text to append to system prompt. */
	appendSystemPrompt?: string;
	/** Working directory. */
	cwd: string;
	/** Conversation log path. */
	messagesPath?: string;
	/** Pre-loaded context files. */
	contextFiles?: Array<{ path: string; content: string }>;
	/** Pre-loaded skills. */
	skills?: Skill[];
	/** Whether to include the model-facing rlm recursion guidance. */
	allowRecursion?: boolean;
	/** Fixed recursive-agent depth for this session. */
	rlmDepth?: number;
	/** Human-readable parent name or id for child communication doctrine. */
	rlmParentAgent?: string;
	/** Enabled user-configured servers available through the generic kernel MCP API. */
	genericMcpServers?: string[];
}

/** Build the system prompt with tools, guidelines, and context. */
export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
	return assembleSystemPrompt(options)
		.map((part) => part.text)
		.join("");
}

/** Diagnostic groups, not contiguous provider cache segments. */
export function previewSystemPrompt(options: BuildSystemPromptOptions) {
	const parts = assembleSystemPrompt(options);
	return {
		instructions: parts.map((part) => part.text).join(""),
		static: parts
			.filter((part) => part.kind === "static")
			.map((part) => part.text)
			.join("")
			.trim(),
		dynamic: parts
			.filter((part) => part.kind === "dynamic")
			.map((part) => part.text)
			.join("")
			.trim(),
	};
}

function assembleSystemPrompt(options: BuildSystemPromptOptions) {
	const parts: Array<{ kind: "static" | "dynamic"; text: string }> = [];
	const add = (kind: "static" | "dynamic", text: string) => parts.push({ kind, text });
	const {
		customPrompt,
		selectedTools,
		promptGuidelines,
		appendSystemPrompt,
		cwd,
		messagesPath,
		contextFiles: providedContextFiles,
		skills: providedSkills,
		allowRecursion,
	} = options;
	const promptCwd = cwd.replace(/\\/g, "/");
	const promptMessagesPath = (messagesPath ?? "not persisted").replace(/\\/g, "/");

	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const date = `${year}-${month}-${day}`;

	const appendSection = appendSystemPrompt ? `\n\n${appendSystemPrompt}` : "";

	const contextFiles = providedContextFiles ?? [];
	const skills = providedSkills ?? [];
	const tools = selectedTools ?? ["ipython"];
	const hasIpython = tools.includes("ipython");
	const visibleSkills = skills.filter((skill) => !skill.disableModelInvocation);
	const visiblePythonSkillImportNames = getPythonSkillRuntimeInfo(visibleSkills).map((skill) => skill.importName);
	const hasRefineSkill = visibleSkills.some((skill) => skill.name === REFINE_SKILL_NAME);
	const genericMcpSection = hasIpython ? formatGenericMcpGuidance(options.genericMcpServers) : "";

	const addResources = (hasFileAccess: boolean) => {
		if (contextFiles.length > 0) {
			add("dynamic", "\n\n# Project Context\n\nProject-specific instructions and guidelines:\n\n");
			for (const { path: filePath, content } of contextFiles) {
				add("dynamic", `## ${filePath}\n\n${content}\n\n`);
			}
		}
		if (hasFileAccess && skills.length > 0) {
			add("dynamic", formatSkillsForPrompt(skills));
		}
	};

	if (customPrompt) {
		add("static", customPrompt);
		addResources(!selectedTools || hasIpython || tools.includes("bash"));
		add("dynamic", `\nCurrent date: ${date}\nCurrent working directory: ${promptCwd}`);

		const childDoctrine = buildChildAgentDoctrine({
			depth: options.rlmDepth,
			parentAgent: options.rlmParentAgent,
			installedSkills: visiblePythonSkillImportNames,
			activeTools: tools,
		});
		if (childDoctrine) add("dynamic", `\n\n${childDoctrine}`);
		if (genericMcpSection) add("dynamic", `\n\n${genericMcpSection}`);
	} else {
		const { beforeRuntime, runtime, afterRuntime } = buildRlmPromptParts({
			cwd: promptCwd,
			messagesPath: promptMessagesPath,
			installedSkills: visiblePythonSkillImportNames,
			activeTools: tools.filter((name) => name === "ipython" || name === "bash" || name === "edit"),
			allowRecursion,
			depth: options.rlmDepth,
			parentAgent: options.rlmParentAgent,
		});
		add("static", beforeRuntime);
		add("dynamic", runtime);
		add("static", afterRuntime);

		// Keep delegation doctrine after the trained RLM prefix and before the harness digest.
		if ((allowRecursion ?? true) && hasIpython) {
			const visiblePythonSkillNames = new Set(visiblePythonSkillImportNames);
			add(
				"static",
				`\n\n${buildSubagentGuidance({
					includeRefineExamples: hasRefineSkill,
					hasAgentMessage: visiblePythonSkillNames.has("agent_message"),
					hasAgentObserve: visiblePythonSkillNames.has("agent_observe"),
				})}`,
			);
		}
		if (genericMcpSection) add("dynamic", `\n\n${genericMcpSection}`);
		const guidelines = formatPromptGuidelines(promptGuidelines);
		if (guidelines) add("static", `\n\n# Additional Guidance\n\n${guidelines}`);
		addResources(hasIpython || tools.includes("bash"));
	}

	if (appendSection) add("static", appendSection);
	return parts;
}

function formatGenericMcpGuidance(servers: string[] | undefined): string {
	const enabledServers = [...new Set(servers ?? [])].sort((left, right) => left.localeCompare(right));
	if (enabledServers.length === 0) return "";

	return [
		"# Generic MCP Connections",
		"",
		"Generic MCP connections are accessed through the pre-imported Python `mcp` object in the Python REPL, not as top-level native tool namespaces or installed Python skills.",
		`Enabled generic MCP servers: ${enabledServers.map((server) => `\`${server}\``).join(", ")}.`,
		...enabledServers.map(
			(server) =>
				`For \`${server}\`, first discover its tools with \`await mcp.list_tools("${server}")\`, then call one with \`await mcp.call_tool("${server}", "<tool>", arguments)\`.`,
		),
	].join("\n");
}

function formatPromptGuidelines(promptGuidelines: string[] | undefined): string {
	const guidelinesList: string[] = [];
	const guidelinesSet = new Set<string>();

	for (const guideline of promptGuidelines ?? []) {
		const normalized = guideline.trim();
		if (normalized.length > 0 && !guidelinesSet.has(normalized)) {
			guidelinesSet.add(normalized);
			guidelinesList.push(normalized);
		}
	}

	return guidelinesList.map((guideline) => `- ${guideline}`).join("\n");
}
