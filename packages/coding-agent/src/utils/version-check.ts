import type { SettingsManager } from "../core/settings-manager.js";
import { type DiscoveredPiRelease, discoverPiRelease } from "./pi-release-discovery.js";
import { parsePiReleaseTag } from "./pi-release-manifest.js";
import { comparePiReleases, type PiReleaseChannel } from "./pi-release-version.js";

// `nightly` is a compatibility alias for explicit preview opt-in.
export type UpdateChannel = PiReleaseChannel | "nightly";
interface ParsedVersion {
	major: number;
	minor: number;
	patch: number;
	prerelease?: string;
}

function comparePrereleaseIdentifiers(leftPrerelease: string, rightPrerelease: string): number {
	const leftIdentifiers = leftPrerelease.split(".");
	const rightIdentifiers = rightPrerelease.split(".");
	const length = Math.max(leftIdentifiers.length, rightIdentifiers.length);

	for (let index = 0; index < length; index += 1) {
		const left = leftIdentifiers[index];
		const right = rightIdentifiers[index];
		if (left === right) continue;
		if (left === undefined) return -1;
		if (right === undefined) return 1;

		const leftIsNumeric = /^\d+$/.test(left);
		const rightIsNumeric = /^\d+$/.test(right);
		if (leftIsNumeric && rightIsNumeric) {
			const leftNumber = left.replace(/^0+(?=\d)/, "");
			const rightNumber = right.replace(/^0+(?=\d)/, "");
			if (leftNumber.length !== rightNumber.length) return leftNumber.length - rightNumber.length;
			const comparison = leftNumber.localeCompare(rightNumber);
			if (comparison !== 0) return comparison;
			continue;
		}
		if (leftIsNumeric) return -1;
		if (rightIsNumeric) return 1;
		return left.localeCompare(right);
	}

	return 0;
}

function parsePackageVersion(version: string): ParsedVersion | undefined {
	const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/);
	if (!match) {
		return undefined;
	}
	return {
		major: Number.parseInt(match[1], 10),
		minor: Number.parseInt(match[2], 10),
		patch: Number.parseInt(match[3], 10),
		prerelease: match[4],
	};
}

export function comparePackageVersions(leftVersion: string, rightVersion: string): number | undefined {
	const left = parsePackageVersion(leftVersion);
	const right = parsePackageVersion(rightVersion);
	if (!left || !right) {
		return undefined;
	}

	if (left.major !== right.major) return left.major - right.major;
	if (left.minor !== right.minor) return left.minor - right.minor;
	if (left.patch !== right.patch) return left.patch - right.patch;
	if (left.prerelease === right.prerelease) return 0;
	if (!left.prerelease) return 1;
	if (!right.prerelease) return -1;
	return comparePrereleaseIdentifiers(left.prerelease, right.prerelease);
}

export function isNewerPackageVersion(candidateVersion: string, currentVersion: string): boolean {
	const comparison = comparePackageVersions(candidateVersion, currentVersion);
	if (comparison !== undefined) {
		return comparison > 0;
	}
	return candidateVersion.trim() !== currentVersion.trim();
}

/** Normalize the global preference for Pi without changing the legacy SettingsManager API. */
export function getPiUpdateChannelPreference(settingsManager: SettingsManager): PiReleaseChannel | undefined {
	// Accept the Pi spelling on disk too, without exposing it through the legacy accessor.
	const channel: unknown = settingsManager.getGlobalSettings().updateChannel;
	if (channel === "nightly" || channel === "preview") return "preview";
	return channel === "stable" ? "stable" : undefined;
}

export function resolveUpdateChannel(_currentVersion: string, preferred?: UpdateChannel): PiReleaseChannel {
	return preferred === "preview" || preferred === "nightly" ? "preview" : "stable";
}

function releaseIdentity(version: string) {
	return parsePiReleaseTag(`pi-v${version.trim().replace(/^v/, "")}`);
}

/** Do not implicitly cross to an older public version, even when forced. */
export function isBaseVersionDowngrade(candidateVersion: string, currentVersion: string): boolean {
	const candidate = releaseIdentity(candidateVersion);
	const current = releaseIdentity(currentVersion);
	if (candidate && current) {
		return (
			comparePiReleases({ publicVersion: candidate.publicVersion }, { publicVersion: current.publicVersion }) < 0
		);
	}
	const legacy = parsePackageVersion(currentVersion);
	return Boolean(
		candidate &&
			legacy &&
			comparePiReleases(
				{ publicVersion: candidate.publicVersion },
				{ publicVersion: `${legacy.major}.${legacy.minor}.${legacy.patch}` },
			) < 0,
	);
}

export function isReleaseUpdateCandidate(
	candidateVersion: string,
	currentVersion: string,
	channel?: UpdateChannel,
): boolean {
	const candidate = releaseIdentity(candidateVersion);
	if (!candidate) return false;
	const preview = candidate.previewSequence !== undefined;
	const optedIn = resolveUpdateChannel(currentVersion, channel) === "preview";
	if (preview && !optedIn) return false;
	const current = releaseIdentity(currentVersion);
	if (!current) {
		const legacy = parsePackageVersion(currentVersion);
		return Boolean(legacy && !isBaseVersionDowngrade(candidateVersion, currentVersion));
	}
	return (
		comparePiReleases(candidate, current) > 0 ||
		(preview &&
			current.previewSequence === undefined &&
			comparePiReleases({ publicVersion: candidate.publicVersion }, current) === 0)
	);
}

export async function getLatestPiRelease(
	currentVersion: string,
	options: { timeoutMs?: number; channel?: UpdateChannel } = {},
): Promise<(DiscoveredPiRelease & { version: string }) | undefined> {
	if (process.env.PI_SKIP_VERSION_CHECK || process.env.PI_OFFLINE) return undefined;
	const release = await discoverPiRelease({
		channel: resolveUpdateChannel(currentVersion, options.channel),
		signal: AbortSignal.timeout(options.timeoutMs ?? 10000),
	});
	return release && { ...release, version: release.tag.slice(4) };
}

export async function getLatestPiVersion(
	currentVersion: string,
	options: { timeoutMs?: number; channel?: UpdateChannel } = {},
): Promise<string | undefined> {
	return (await getLatestPiRelease(currentVersion, options))?.version;
}

export async function checkForNewPiVersion(
	currentVersion: string,
	channel?: UpdateChannel,
): Promise<string | undefined> {
	try {
		const latestVersion = await getLatestPiVersion(currentVersion, { channel });
		if (latestVersion && isReleaseUpdateCandidate(latestVersion, currentVersion, channel)) {
			return latestVersion;
		}
		return undefined;
	} catch {
		return undefined;
	}
}
