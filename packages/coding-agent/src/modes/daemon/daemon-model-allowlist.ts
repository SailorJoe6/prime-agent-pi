import { minimatch } from "minimatch";
import type { SettingsManager } from "../../core/settings-manager.js";

export class DaemonModelAdmissionError extends Error {}

function matchesModelPattern(value: string, pattern: string): boolean {
	if (!/[*?[]/.test(pattern)) return value.toLowerCase() === pattern.toLowerCase();
	// Model globs are not path globs. In particular, provider/* also admits IDs containing slashes.
	return minimatch(value.replaceAll("/", "\0"), pattern.replaceAll("/", "\0"), {
		nocase: true,
		nocomment: true,
		nonegate: true,
		dot: true,
		noext: true,
	});
}

export function assertAllowedDaemonModel(settings: SettingsManager, model: { provider: string; id: string }): void {
	const selector = `${model.provider}/${model.id}`;
	const policy = settings.getModelAdmissionPolicy();
	if ("error" in policy) {
		throw new DaemonModelAdmissionError(
			`Cannot admit model "${selector}": ${policy.error}. Fix global settings.json and retry.`,
		);
	}
	if (policy.patterns.length === 0) return;

	const allowed = policy.patterns.some(
		(pattern) => matchesModelPattern(selector, pattern) || matchesModelPattern(model.id, pattern),
	);
	if (!allowed) {
		throw new DaemonModelAdmissionError(
			`Model "${selector}" is blocked by the daemon allowedModels policy. Pick an allowed model or update global settings.json.`,
		);
	}
}
