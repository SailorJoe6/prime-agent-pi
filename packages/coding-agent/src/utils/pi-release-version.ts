export type PiReleaseChannel = "stable" | "preview";

export interface PiReleaseIdentity {
	readonly publicVersion: string;
	readonly previewSequence?: number;
}

function parsePublicVersion(version: string): [number, number, number, number] {
	const parts = version.split(".");
	if (parts.length < 3 || parts.length > 4 || parts.some((part) => !/^(0|[1-9][0-9]*)$/.test(part))) {
		throw new Error(`Invalid Pi public version: ${version}`);
	}
	const [major, minor, patch, revision = 0] = parts.map(Number);
	if (![major, minor, patch, revision].every(Number.isSafeInteger)) {
		throw new Error(`Invalid Pi public version: ${version}`);
	}
	return [major, minor, patch, revision];
}

function parseIdentity({ publicVersion, previewSequence }: PiReleaseIdentity) {
	if (previewSequence !== undefined && (!Number.isSafeInteger(previewSequence) || previewSequence < 1)) {
		throw new Error(`Invalid Pi preview sequence: ${previewSequence}`);
	}
	return { version: parsePublicVersion(publicVersion), previewSequence };
}

export function encodePiPackageVersion(identity: PiReleaseIdentity): string {
	const {
		version: [major, minor, patch, revision],
		previewSequence,
	} = parseIdentity(identity);
	const preview = previewSequence === undefined ? "" : `-preview.${previewSequence}`;
	const repair = revision === 0 ? "" : `+pi.${revision}`;
	return `${major}.${minor}.${patch}${preview}${repair}`;
}

export function comparePiReleases(left: PiReleaseIdentity, right: PiReleaseIdentity): number {
	const a = parseIdentity(left);
	const b = parseIdentity(right);
	for (const [index, part] of a.version.entries()) {
		const difference = part - b.version[index];
		if (difference !== 0) return Math.sign(difference);
	}
	if (a.previewSequence === undefined) return b.previewSequence === undefined ? 0 : 1;
	if (b.previewSequence === undefined) return -1;
	return Math.sign(a.previewSequence - b.previewSequence);
}

export function selectLatestPiRelease<T extends PiReleaseIdentity>(
	releases: readonly T[],
	channel: PiReleaseChannel = "stable",
): T | undefined {
	let latest: T | undefined;
	for (const release of releases) {
		if (release.previewSequence !== undefined && channel !== "preview") continue;
		if (comparePiReleases(release, latest ?? release) >= 0) latest = release;
	}
	return latest;
}
