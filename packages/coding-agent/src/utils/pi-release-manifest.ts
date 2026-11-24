import { NATIVE_PLATFORMS } from "./native-installation.js";
import { encodePiPackageVersion, type PiReleaseIdentity } from "./pi-release-version.js";

export const PI_RELEASE_MANIFEST = "pi-release-manifest.json";
export const PI_RELEASE_CHECKSUMS = "SHA256SUMS";
export const PI_RELEASE_INSTALLER = "install-pi.sh";

interface AssetChecksum {
	file: string;
	sha256: string;
}

interface NativeArtifact extends AssetChecksum {
	platform: (typeof NATIVE_PLATFORMS)[number];
	executableSha256: string;
}

export interface PiReleaseManifest extends PiReleaseIdentity {
	schemaVersion: 1;
	tag: string;
	channel: "stable" | "preview";
	packageVersion: string;
	sourceSha: string;
	catalogSha: string;
	installer: AssetChecksum;
	binaries: NativeArtifact[];
}

export function record(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

export function parsePiReleaseTag(tag: string): PiReleaseIdentity | undefined {
	const match = /^pi-v([0-9.]+)(?:-preview\.([0-9]+))?$/.exec(tag);
	if (!match || match[0] !== tag) return undefined;
	if (match[1].split(".").length === 4 && match[1].endsWith(".0")) return undefined;
	const identity = { publicVersion: match[1], ...(match[2] ? { previewSequence: Number(match[2]) } : {}) };
	if (match[2] !== undefined && String(identity.previewSequence) !== match[2]) return undefined;
	try {
		encodePiPackageVersion(identity);
		return identity;
	} catch {
		return undefined;
	}
}

function checksum(value: unknown): value is string {
	return typeof value === "string" && value.length === 64 && !/[^a-f0-9]/.test(value);
}

function commit(value: unknown): value is string {
	return typeof value === "string" && value.length === 40 && !/[^a-f0-9]/.test(value);
}

export function parsePiReleaseManifest(input: unknown): PiReleaseManifest | undefined {
	const manifest = record(input);
	if (!manifest || manifest.schemaVersion !== 1 || typeof manifest.tag !== "string") return undefined;
	const identity = parsePiReleaseTag(manifest.tag);
	if (!identity) return undefined;
	const channel = identity.previewSequence === undefined ? "stable" : "preview";
	const packageVersion = encodePiPackageVersion(identity);
	if (
		manifest.publicVersion !== identity.publicVersion ||
		manifest.previewSequence !== identity.previewSequence ||
		manifest.channel !== channel ||
		manifest.packageVersion !== packageVersion ||
		!commit(manifest.sourceSha) ||
		!commit(manifest.catalogSha)
	)
		return undefined;
	const installer = record(manifest.installer);
	if (installer?.file !== PI_RELEASE_INSTALLER || !checksum(installer.sha256)) return undefined;
	if (!Array.isArray(manifest.binaries) || manifest.binaries.length !== NATIVE_PLATFORMS.length) return undefined;
	const binaries: NativeArtifact[] = [];
	for (const platform of NATIVE_PLATFORMS) {
		const candidate = manifest.binaries.map(record).find((entry) => entry?.platform === platform);
		const file = `prime-agent-pi-${manifest.tag.slice(4)}-${platform}.tar.gz`;
		if (candidate?.file !== file || !checksum(candidate.sha256) || !checksum(candidate.executableSha256))
			return undefined;
		binaries.push({ platform, file, sha256: candidate.sha256, executableSha256: candidate.executableSha256 });
	}
	return {
		...identity,
		schemaVersion: 1,
		tag: manifest.tag,
		channel,
		packageVersion,
		sourceSha: manifest.sourceSha,
		catalogSha: manifest.catalogSha,
		installer: { file: PI_RELEASE_INSTALLER, sha256: installer.sha256 },
		binaries,
	};
}
