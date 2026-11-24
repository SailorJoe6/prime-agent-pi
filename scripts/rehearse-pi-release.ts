#!/usr/bin/env node
import { assemblePiReleaseManifest } from "./build-pi-release-manifest.js";
import { decidePiPublication, publicationSubject } from "./pi-publication-decision.js";

const [artifactsDir, installerPath, expectedSource, ...extra] = process.argv.slice(2);
if (!artifactsDir || !installerPath || !expectedSource || !/^[a-f0-9]{40}$/.test(expectedSource) || extra.length) {
	throw new Error("Usage: tsx scripts/rehearse-pi-release.ts ARTIFACTS_DIR INSTALLER_PATH EXPECTED_SOURCE_SHA");
}

const { manifest, manifestJson, checksums, assetDigests } = await assemblePiReleaseManifest(artifactsDir, installerPath);
if (manifest.sourceSha !== expectedSource) throw new Error("Native receipt source does not match expected source SHA");

const releaseNotes = "Fixture only: release pipeline rehearsal. Not release notes or a parity claim.\n";
const bundle = { manifestJson, checksums, assetDigests, releaseNotes };
const subject = publicationSubject(bundle);
if (!subject) throw new Error("Assembled bundle does not match the observed asset digests");

// The archive hashes above are measured. Everything in this policy scenario is synthetic.
const fixture = {
	source: {
		repository: "SailorJoe6/prime-agent-pi",
		ref: "refs/heads/main",
		event: "push",
		before: (expectedSource === "1".repeat(40) ? "2" : "1").repeat(40),
		after: expectedSource,
		codeChanged: true,
	},
	prerelease: manifest.channel === "preview",
	checks: { repository: { status: "pass", subject, reference: "fixture-only: simulated repository checks" } },
	existing: { tags: [], releases: [] },
};
const decision = decidePiPublication({ ...fixture, bundle });
console.log(JSON.stringify({ mode: "nonpublishing-dry-run", manifestJson, checksums, assetDigests, fixtureOnly: { releaseNotes, ...fixture, decision } }, null, 2));
