import { statSync } from "node:fs";
import { resolve } from "node:path";
import { APP_NAME, getAgentDir } from "../config.js";
import { DefaultResourceLoader } from "../core/resource-loader.js";
import { SettingsManager } from "../core/settings-manager.js";
import { previewSystemPrompt } from "../core/system-prompt.js";

export async function runPromptCommand(args: string[]): Promise<void> {
	let directory = process.cwd();
	let model: string | undefined;
	let json = false;
	for (let index = 0; index < args.length; index++) {
		const option = args[index];
		if (option === "--json") {
			json = true;
		} else if (option === "--cwd" || option === "--model") {
			const value = args[++index];
			if (!value?.trim() || value.startsWith("-")) throw new Error(`${option} requires a value`);
			if (option === "--cwd") directory = value;
			else model = value;
		} else {
			throw new Error(`Unknown prompt option: ${option}. Run ${APP_NAME} help prompt for usage.`);
		}
	}

	const cwd = resolve(directory);
	if (!statSync(cwd, { throwIfNoEntry: false })?.isDirectory()) {
		throw new Error(`Not a directory: ${cwd}`);
	}
	const agentDir = getAgentDir();
	const settings = SettingsManager.create(cwd, agentDir);
	const loader = new DefaultResourceLoader({
		cwd,
		agentDir,
		settingsManager: settings,
		noExtensions: true,
		noPromptTemplates: true,
		noThemes: true,
	});
	await loader.reload({ localInspection: true });

	const defaultModel = settings.getDefaultModel();
	const defaultProvider = settings.getDefaultProvider();
	const modelInput = model ?? (defaultModel && defaultProvider ? `${defaultProvider}/${defaultModel}` : defaultModel);
	const {
		instructions,
		static: staticContent,
		dynamic,
	} = previewSystemPrompt({
		cwd,
		customPrompt: loader.getSystemPrompt(),
		appendSystemPrompt: loader.getAppendSystemPrompt().join("\n\n"),
		contextFiles: loader.getAgentsFiles().agentsFiles,
		skills: loader.getSkills().skills,
		allowRecursion: (settings.getRlmMaxDepth() ?? Number(process.env.RLM_MAX_DEPTH || 2)) > 0,
		rlmDepth: 0,
	});

	if (json) {
		console.log(
			JSON.stringify({ cwd, model: modelInput ?? null, instructions, static: staticContent, dynamic }, null, 2),
		);
	} else {
		console.log(
			`Working directory: ${cwd}\nModel: ${modelInput ?? "not specified"}\n\n# Instructions\n\n${instructions}\n\n# Static\n\n${staticContent}\n\n# Dynamic\n\n${dynamic}`,
		);
	}
}
