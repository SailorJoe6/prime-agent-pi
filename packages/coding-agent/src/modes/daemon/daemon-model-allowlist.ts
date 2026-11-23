import { minimatch } from "minimatch";
import type { SettingsManager } from "../../core/settings-manager.js";

export class DaemonModelAdmissionError extends Error {}

function matchesFlatGlob(value: string, pattern: string): boolean {
	// A regular wildcard can span slashes in a model ID.
	return minimatch(value.replaceAll("/", "\0"), pattern.replaceAll("/", "\0"), {
		nocase: true,
		nocomment: true,
		nonegate: true,
		dot: true,
		noext: true,
	});
}

function matchesModelPattern(value: string, pattern: string): boolean {
	if (!/[*?[]/.test(pattern)) return value.toLowerCase() === pattern.toLowerCase();

	// A whole **/ component can skip zero or more directories. Keep the
	// ordinary glob rules for the runs between recursive components.
	let rest = pattern;
	let starts = new Set([0]);
	for (let recursive = /(^|\/)\*\*\//.exec(rest); recursive; recursive = /(^|\/)\*\*\//.exec(rest)) {
		const prefix = rest.slice(0, recursive.index + recursive[1].length);
		rest = rest.slice(recursive.index + recursive[0].length);
		const ends = new Set<number>();
		for (const start of starts) {
			const boundaries = [start];
			for (let slash = value.indexOf("/", start); slash !== -1; slash = value.indexOf("/", slash + 1)) {
				boundaries.push(slash + 1);
			}
			let prefixMatched = false;
			for (const end of boundaries) {
				prefixMatched ||= matchesFlatGlob(value.slice(start, end), prefix);
				if (prefixMatched) ends.add(end);
			}
		}
		if (ends.size === 0) return false;
		starts = ends;
	}
	return [...starts].some((start) => matchesFlatGlob(value.slice(start), rest));
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
