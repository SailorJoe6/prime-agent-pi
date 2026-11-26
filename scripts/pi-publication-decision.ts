import { createHash } from "node:crypto";
import { parsePiReleaseManifest, type PiReleaseManifest } from "../packages/coding-agent/src/utils/pi-release-manifest.js";
import { comparePiReleases } from "../packages/coding-agent/src/utils/pi-release-version.js";

export interface PublicationBundle {
	manifestJson: string;
	checksums: string;
	releaseNotes: string;
	assetDigests: Readonly<Record<string, string>>;
}

const stableChecks = ["repository", "compatibility", "prime-claw", "docker-lifecycle", "parity", "release-identity"] as const;

type PublicationCheck = (typeof stableChecks)[number];

export interface PublicationInput {
	source: { repository: string; ref: string; event: string; before: string; after: string; codeChanged: boolean };
	bundle: PublicationBundle;
	prerelease: boolean;
	stableBump?: { sourceSha: string; previousVersion: string; publicVersion: string };
	parityClaim?: string;
	checks: Partial<Record<PublicationCheck, { status: string; subject: string; reference: string; claim?: string }>>;
	existing?: { tags: readonly string[]; releases: readonly string[] };
}

type PublicationDecision =
	| { kind: "fixture-candidate"; tag: string; prerelease: boolean; subject: string }
	| { kind: "denied"; reason: string };

function bundleManifest(bundle: PublicationBundle): PiReleaseManifest | undefined {
	try {
		return parsePiReleaseManifest(JSON.parse(bundle.manifestJson));
	} catch {
		return undefined;
	}
}

function checkedSubject(bundle: PublicationBundle, manifest: PiReleaseManifest): string | undefined {
	const assets = [...manifest.binaries, manifest.installer];
	if (!bundle.releaseNotes.trim() || Object.keys(bundle.assetDigests).length !== assets.length) return undefined;
	const expected = new Set(assets.map(({ file, sha256 }) => `${sha256}  ${file}`));
	const lines = bundle.checksums.replace(/\n$/, "").split("\n");
	if (
		lines.length !== expected.size ||
		lines.some((line) => !expected.delete(line)) ||
		assets.some(({ file, sha256 }) => bundle.assetDigests[file] !== sha256)
	) {
		return undefined;
	}
	// The exact manifest and checksum text binds the source, release identity and verified asset digests.
	return createHash("sha256")
		.update(JSON.stringify(["pi-publication-v1", bundle.manifestJson, bundle.checksums, bundle.releaseNotes]))
		.digest("hex");
}

export function publicationSubject(bundle: PublicationBundle): string | undefined {
	const manifest = bundleManifest(bundle);
	return manifest && checkedSubject(bundle, manifest);
}

function commitSha(value: string): boolean {
	return value.length === 40 && !/[^a-f0-9]/.test(value) && value !== "0".repeat(40);
}

function stableBumpMatches(bump: PublicationInput["stableBump"], manifest: PiReleaseManifest): boolean {
	if (!bump || bump.sourceSha !== manifest.sourceSha || bump.publicVersion !== manifest.publicVersion) return false;
	try {
		return comparePiReleases({ publicVersion: bump.previousVersion }, manifest) < 0;
	} catch {
		return false;
	}
}

// This function evaluates supplied fixture observations. It does not obtain or authenticate them, or publish anything.
export function decidePiPublication(input: PublicationInput): PublicationDecision {
	const deny = (reason: string): PublicationDecision => ({ kind: "denied", reason });
	const { source, bundle, existing, prerelease, stableBump, checks, parityClaim } = input;
	if (
		source.repository !== "SailorJoe6/prime-agent-pi" ||
		source.ref !== "refs/heads/main" ||
		source.event !== "push" ||
		!commitSha(source.before) ||
		!commitSha(source.after) ||
		source.before === source.after
	) {
		return deny("not-canonical-main-push");
	}
	const manifest = bundleManifest(bundle);
	if (!manifest || manifest.sourceSha !== source.after) return deny("manifest-source-mismatch");
	const subject = checkedSubject(bundle, manifest);
	if (!subject) return deny("incomplete-or-mismatched-bundle");
	if (!Array.isArray(existing?.tags) || !Array.isArray(existing?.releases)) return deny("missing-release-inventory");
	if (existing.tags.includes(manifest.tag) || existing.releases.includes(manifest.tag)) {
		return deny("release-identity-already-exists");
	}
	if (prerelease !== (manifest.channel === "preview")) return deny("channel-marking-mismatch");
	if (prerelease) {
		if (source.codeChanged !== true || stableBump !== undefined) return deny("not-preview-code-change");
	} else if (!stableBumpMatches(stableBump, manifest)) {
		return deny("missing-or-mismatched-stable-bump");
	}

	for (const check of prerelease ? (["repository"] as const) : stableChecks) {
		const receipt = checks?.[check];
		if (receipt?.status !== "pass" || receipt.subject !== subject || !receipt.reference?.trim()) {
			return deny(`missing-or-mismatched-check:${check}`);
		}
		if (check === "parity") {
			const prefix = "Upstream parity: ";
			const declarations = bundle.releaseNotes.split(/\r?\n/).filter((line) => line.startsWith("Upstream parity:"));
			const upstreamVersion = manifest.publicVersion.split(".").slice(0, 3).join(".");
			const expected = `PrimeIntellect-ai/prime-agent v${upstreamVersion}`;
			if (declarations.length !== 1 || declarations[0] !== `${prefix}${expected}` || parityClaim !== expected || receipt.claim !== expected) {
				return deny("parity-claim-mismatch");
			}
		}
	}
	return { kind: "fixture-candidate", tag: manifest.tag, prerelease, subject };
}
