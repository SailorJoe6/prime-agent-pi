import { createHash } from "node:crypto";
import { NATIVE_PLATFORMS } from "../../src/utils/native-installation.js";
import { parsePiReleaseTag } from "../../src/utils/pi-release-manifest.js";
import { encodePiPackageVersion } from "../../src/utils/pi-release-version.js";

export const listingUrl = "https://api.github.com/repos/SailorJoe6/prime-agent-pi/releases?per_page=100&page=1";

export function taggedRelease(version: string, script = "#!/bin/sh\nexit 0\n") {
	const tag = `pi-v${version}`;
	const identity = parsePiReleaseTag(tag);
	if (!identity) throw new Error(`Bad test tag: ${tag}`);
	const base = `https://github.com/SailorJoe6/prime-agent-pi/releases/download/${tag}`;
	const preview = identity.previewSequence !== undefined;
	const manifest = {
		...identity,
		schemaVersion: 1,
		tag,
		channel: preview ? "preview" : "stable",
		packageVersion: encodePiPackageVersion(identity),
		sourceSha: "a".repeat(40),
		catalogSha: "b".repeat(40),
		installer: { file: "install-pi.sh", sha256: createHash("sha256").update(script).digest("hex") },
		binaries: NATIVE_PLATFORMS.map((platform) => ({
			platform,
			file: `prime-agent-pi-${version}-${platform}.tar.gz`,
			sha256: "c".repeat(64),
			executableSha256: "d".repeat(64),
		})),
	};
	const listing = {
		tag_name: tag,
		draft: false,
		prerelease: preview,
		assets: [
			"pi-release-manifest.json",
			"SHA256SUMS",
			manifest.installer.file,
			...manifest.binaries.map(({ file }) => file),
		].map((name) => ({ name, state: "uploaded", browser_download_url: `${base}/${name}` })),
	};
	return { base, manifest, listing, script };
}

export function fakeFeed(...releases: ReturnType<typeof taggedRelease>[]) {
	const requests: string[] = [];
	const fetcher: typeof fetch = async (input) => {
		const url = String(input);
		requests.push(url);
		if (url === listingUrl) return Response.json(releases.map(({ listing }) => listing));
		for (const { base, manifest, script } of releases) {
			if (url === `${base}/pi-release-manifest.json`) return Response.json(manifest);
			if (url === `${base}/install-pi.sh`) return new Response(script);
		}
		throw new Error(`Unexpected request: ${url}`);
	};
	return { fetcher, requests };
}
