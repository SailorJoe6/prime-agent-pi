import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
	decidePiPublication,
	type PublicationBundle,
	type PublicationInput,
	publicationSubject,
} from "../../../scripts/pi-publication-decision.js";
import type { PiReleaseManifest } from "../src/utils/pi-release-manifest.js";

const platforms = [
	"darwin-arm64",
	"darwin-x64",
	"linux-arm64",
	"linux-arm64-musl",
	"linux-x64",
	"linux-x64-baseline",
	"linux-x64-musl",
	"linux-x64-musl-baseline",
] as const;
const requiredChecks = [
	"repository",
	"compatibility",
	"prime-claw",
	"docker-lifecycle",
	"parity",
	"release-identity",
] as const;
const after = "a".repeat(40);
const before = "b".repeat(40);
const publicVersion = "0.10.2.10";
const parityClaim = "PrimeIntellect-ai/prime-agent v0.10.2";
const installer = "install-pi.sh";
const digest = (text: string) => createHash("sha256").update(text).digest("hex");

function manifestFixture(prerelease: boolean): PiReleaseManifest {
	const runtimeVersion = prerelease ? `${publicVersion}-preview.3` : publicVersion;
	return {
		schemaVersion: 1,
		tag: `pi-v${runtimeVersion}`,
		publicVersion,
		...(prerelease ? { previewSequence: 3 } : {}),
		channel: prerelease ? "preview" : "stable",
		packageVersion: prerelease ? "0.10.2-preview.3+pi.10" : "0.10.2+pi.10",
		sourceSha: after,
		catalogSha: "c".repeat(40),
		binaries: platforms.map((platform) => ({
			platform,
			file: `prime-agent-pi-${runtimeVersion}-${platform}.tar.gz`,
			sha256: digest(`fixture archive: ${platform}`),
			executableSha256: digest(`fixture executable: ${platform}`),
		})),
		installer: { file: installer, sha256: digest("fixture installer") },
	};
}

function bundleFixture(manifest: PiReleaseManifest): PublicationBundle {
	const assets = [...manifest.binaries, manifest.installer];
	return {
		manifestJson: `${JSON.stringify(manifest, null, 2)}\n`,
		checksums: assets.map(({ sha256, file }) => `${sha256}  ${file}\n`).join(""),
		releaseNotes: `# ${manifest.tag}\n\nFixture notes for ${manifest.channel}. Upstream version: ${parityClaim}.\n`,
		assetDigests: Object.fromEntries(assets.map(({ file, sha256 }) => [file, sha256])),
	};
}

function requireSubject(bundle: PublicationBundle): string {
	const subject = publicationSubject(bundle);
	if (!subject) throw new Error("Expected a subject for the valid fixture bundle");
	return subject;
}

function evidenceFor(bundle: PublicationBundle, prerelease: boolean): PublicationInput["checks"] {
	const subject = requireSubject(bundle);
	const checks: PublicationInput["checks"] = {};
	for (const name of prerelease ? (["repository"] as const) : requiredChecks) {
		checks[name] = {
			status: "pass",
			subject,
			reference: `fixture:${name}`,
			...(name === "parity" ? { claim: parityClaim } : {}),
		};
	}
	return checks;
}

function fixture(prerelease = false): PublicationInput {
	const bundle = bundleFixture(manifestFixture(prerelease));
	return {
		source: {
			repository: "SailorJoe6/prime-agent-pi",
			ref: "refs/heads/main",
			event: "push",
			before,
			after,
			codeChanged: true,
		},
		bundle,
		prerelease,
		...(prerelease
			? {}
			: { stableBump: { sourceSha: after, previousVersion: "0.10.2.9", publicVersion }, parityClaim }),
		checks: evidenceFor(bundle, prerelease),
		existing: { tags: ["pi-v0.10.2.9"], releases: ["pi-v0.10.2.9"] },
	};
}

function expectDenied(result: ReturnType<typeof decidePiPublication>) {
	expect(result).toMatchObject({ kind: "denied", reason: expect.stringMatching(/\S/) });
}

const channels = [
	{ channel: "stable", prerelease: false, tag: "pi-v0.10.2.10" },
	{ channel: "preview", prerelease: true, tag: "pi-v0.10.2.10-preview.3" },
] as const;

describe.each(channels)("$channel publication eligibility", ({ prerelease, tag }) => {
	it("returns only a fixture candidate for a valid push and matching evidence", () => {
		const input = fixture(prerelease);
		expect(decidePiPublication(input)).toEqual({
			kind: "fixture-candidate",
			tag,
			prerelease,
			subject: requireSubject(input.bundle),
		});
	});

	it.each([
		["the upstream repo", { repository: "PrimeIntellect-ai/prime-agent" }],
		["a lookalike repo spelling", { repository: "sailorjoe6/prime-agent-pi" }],
		["a feature branch", { ref: "refs/heads/topic" }],
		["a pull request event", { event: "pull_request" }],
		["a tag push", { ref: "refs/tags/pi-v0.10.2.10" }],
		["an abbreviated before SHA", { before: before.slice(0, 7) }],
		["an abbreviated after SHA", { after: after.slice(0, 7) }],
		["an unchanged before/after SHA", { before: after }],
	] as const)("denies %s", (_label, source) => {
		const input = fixture(prerelease);
		expectDenied(decidePiPublication({ ...input, source: { ...input.source, ...source } }));
	});

	it("denies a fully evidenced bundle built from a different commit", () => {
		const input = fixture(prerelease);
		expectDenied(
			decidePiPublication({
				...input,
				source: { ...input.source, after: "d".repeat(40) },
				...(input.stableBump ? { stableBump: { ...input.stableBump, sourceSha: "d".repeat(40) } } : {}),
			}),
		);
	});

	it("denies a prerelease flag inconsistent with the manifest channel", () => {
		const input = fixture(prerelease);
		const { stableBump } = fixture();
		expectDenied(
			decidePiPublication({
				...input,
				prerelease: !prerelease,
				stableBump: prerelease ? stableBump : undefined,
				parityClaim,
				checks: evidenceFor(input.bundle, !prerelease),
			}),
		);
	});

	it("denies a target whose tag and release inventory is unknown", () => {
		const input = fixture(prerelease);
		delete input.existing;
		expectDenied(decidePiPublication(input));
	});

	it.each(["tags", "releases"] as const)(
		"does not write to the fixture publisher when %s already contains the exact target",
		(key) => {
			const input = fixture(prerelease);
			const tags = new Set<string>(key === "tags" ? [tag] : []);
			const releases = new Set<string>(key === "releases" ? [tag] : []);
			const existing = { tags: Object.freeze([...tags]), releases: Object.freeze([...releases]) };
			const decision = decidePiPublication({ ...input, existing });
			if (decision.kind === "fixture-candidate") {
				tags.add(decision.tag);
				releases.add(decision.tag);
			}
			expectDenied(decision);
			expect([...tags]).toEqual(key === "tags" ? [tag] : []);
			expect([...releases]).toEqual(key === "releases" ? [tag] : []);
		},
	);
});

describe("preview evidence", () => {
	it("denies a push without a code change", () => {
		const input = fixture(true);
		expectDenied(decidePiPublication({ ...input, source: { ...input.source, codeChanged: false } }));
	});

	it("denies a preview carrying an explicit stable bump", () => {
		expectDenied(
			decidePiPublication({
				...fixture(true),
				stableBump: { sourceSha: after, previousVersion: "0.10.2.9", publicVersion },
			}),
		);
	});

	it("denies a preview with no repository receipt", () => {
		expectDenied(decidePiPublication({ ...fixture(true), checks: {} }));
	});
});

describe("stable evidence", () => {
	it("denies an ordinary main commit without an explicit stable bump", () => {
		const input = fixture();
		delete input.stableBump;
		expectDenied(decidePiPublication(input));
	});

	it.each([
		["an unchanged version", { previousVersion: publicVersion }],
		["a rollback version", { previousVersion: "0.10.2.11" }],
		["an invalid previous version", { previousVersion: "not-a-version" }],
		["a different commit", { sourceSha: before }],
		["a version not matching the manifest", { publicVersion: "0.10.3" }],
	] as const)("denies an explicit bump with %s", (_label, bump) => {
		const stableBump = { sourceSha: after, previousVersion: "0.10.2.9", publicVersion, ...bump };
		expectDenied(decidePiPublication({ ...fixture(), stableBump }));
	});

	it.each(requiredChecks)("denies stable when the %s receipt is missing", (name) => {
		const input = fixture();
		delete input.checks[name];
		expectDenied(decidePiPublication(input));
	});

	it.each([
		["failed", { status: "failed" }],
		["not run", { status: "skipped" }],
		["for another subject", { subject: "f".repeat(64) }],
		["unreferenced", { reference: " \t" }],
	] as const)("denies a repository receipt that is %s on either channel", (_label, change) => {
		for (const prerelease of [false, true]) {
			const input = fixture(prerelease);
			input.checks.repository = {
				status: "pass",
				subject: requireSubject(input.bundle),
				reference: "fixture:repository",
				...change,
			};
			expectDenied(decidePiPublication(input));
		}
	});

	it("denies stable publication without an explicit parity claim", () => {
		const input = fixture();
		delete input.parityClaim;
		expectDenied(decidePiPublication(input));
	});

	it("denies a passing parity receipt for a different claim", () => {
		const input = fixture();
		input.checks.parity = {
			status: "pass",
			subject: requireSubject(input.bundle),
			reference: "fixture:parity",
			claim: "v0.10.1",
		};
		expectDenied(decidePiPublication(input));
	});

	it("denies stable when the release notes omit the parity claim despite all receipts matching the bundle", () => {
		const input = fixture();
		const bundle = {
			...input.bundle,
			releaseNotes: `# ${manifestFixture(false).tag}\n\nFixture notes without a parity claim.\n`,
		};
		expectDenied(decidePiPublication({ ...input, bundle, checks: evidenceFor(bundle, false) }));
	});
});

describe("bundle validation and evidence binding", () => {
	it.each([
		["invalid JSON", (bundle: PublicationBundle) => ({ ...bundle, manifestJson: "{" })],
		[
			"a duplicate platform instead of all eight",
			() => {
				const manifest = manifestFixture(true);
				manifest.binaries[1] = manifest.binaries[0];
				return bundleFixture(manifest);
			},
		],
		["blank release notes", (bundle: PublicationBundle) => ({ ...bundle, releaseNotes: " \n" })],
		[
			"a missing checksum entry",
			(bundle: PublicationBundle) => ({
				...bundle,
				checksums: bundle.checksums.slice(bundle.checksums.indexOf("\n") + 1),
			}),
		],
		[
			"a duplicate checksum entry",
			(bundle: PublicationBundle) => ({
				...bundle,
				checksums: `${bundle.checksums}${bundle.checksums.split("\n")[0]}\n`,
			}),
		],
		[
			"an incorrect checksum entry",
			(bundle: PublicationBundle) => ({
				...bundle,
				checksums: digest("wrong checksum") + bundle.checksums.slice(64),
			}),
		],
		[
			"an extra checksum entry",
			(bundle: PublicationBundle) => ({
				...bundle,
				checksums: `${bundle.checksums}${digest("extra")}  extra.tar.gz\n`,
			}),
		],
		[
			"a missing installer digest",
			(bundle: PublicationBundle) => {
				const assetDigests = { ...bundle.assetDigests };
				delete assetDigests[installer];
				return { ...bundle, assetDigests };
			},
		],
		[
			"a replaced installer",
			(bundle: PublicationBundle) => ({
				...bundle,
				assetDigests: { ...bundle.assetDigests, [installer]: digest("replacement installer") },
			}),
		],
		[
			"an unexpected asset digest",
			(bundle: PublicationBundle) => ({
				...bundle,
				assetDigests: { ...bundle.assetDigests, "extra.tar.gz": digest("extra") },
			}),
		],
	] as const)("denies a preview bundle with %s", (_label, changeBundle) => {
		const input = fixture(true);
		const bundle = changeBundle(input.bundle);
		expect(publicationSubject(bundle)).toBeUndefined();
		expectDenied(decidePiPublication({ ...input, bundle }));
	});

	it.each([
		[
			"release notes bytes",
			(bundle: PublicationBundle) => ({ ...bundle, releaseNotes: `${bundle.releaseNotes}\nMore fixture notes.\n` }),
		],
		["manifest bytes", (bundle: PublicationBundle) => ({ ...bundle, manifestJson: `${bundle.manifestJson}\n` })],
		[
			"an archive with updated manifest and inventory",
			() => {
				const manifest = manifestFixture(false);
				manifest.binaries[0].sha256 = digest("replacement archive");
				return bundleFixture(manifest);
			},
		],
	] as const)("requires new evidence after changing %s", (_label, changeBundle) => {
		const input = fixture();
		const bundle = changeBundle(input.bundle);
		const subject = requireSubject(bundle);
		expect(subject).not.toBe(requireSubject(input.bundle));
		expectDenied(decidePiPublication({ ...input, bundle }));
	});
});
