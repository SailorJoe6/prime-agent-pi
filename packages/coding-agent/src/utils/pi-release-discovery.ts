import { NATIVE_PLATFORMS } from "./native-installation.js";
import {
	PI_RELEASE_CHECKSUMS,
	PI_RELEASE_INSTALLER,
	PI_RELEASE_MANIFEST,
	type PiReleaseManifest,
	parsePiReleaseManifest,
	parsePiReleaseTag,
	record,
} from "./pi-release-manifest.js";
import { comparePiReleases, type PiReleaseChannel } from "./pi-release-version.js";

const repository = "SailorJoe6/prime-agent-pi";
const releaseList = `https://api.github.com/repos/${repository}/releases`;
const downloadRoot = `https://github.com/${repository}/releases/download`;
const pageSize = 100;

export interface DiscoveredPiRelease extends PiReleaseManifest {
	assetBaseUrl: string;
}

/** Read-only discovery. Callers must verify downloaded bytes before installation. */
export async function discoverPiRelease(
	options: { channel?: PiReleaseChannel; signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<DiscoveredPiRelease | undefined> {
	const request = options.fetcher ?? fetch;
	const signal = options.signal ?? AbortSignal.timeout(10_000);
	const candidates = [];
	for (let page = 1; ; page++) {
		const response = await request(`${releaseList}?per_page=${pageSize}&page=${page}`, {
			headers: { Accept: "application/vnd.github+json", "User-Agent": "prime-agent-pi" },
			signal,
		});
		if (!response.ok) return undefined;
		const releases: unknown = await response.json();
		if (!Array.isArray(releases)) return undefined;
		for (const value of releases) {
			const release = record(value);
			if (!release || release.draft !== false || typeof release.tag_name !== "string") continue;
			const tag = release.tag_name;
			const identity = parsePiReleaseTag(tag);
			if (!identity) continue;
			const preview = identity.previewSequence !== undefined;
			if (release.prerelease !== preview || (preview && options.channel !== "preview")) continue;
			if (!Array.isArray(release.assets)) continue;
			const assetBaseUrl = `${downloadRoot}/${tag}`;
			const assets = new Map<string, number>();
			for (const value of release.assets) {
				const asset = record(value);
				if (typeof asset?.name !== "string" || asset.state !== "uploaded") continue;
				if (asset.browser_download_url !== `${assetBaseUrl}/${asset.name}`) continue;
				assets.set(asset.name, (assets.get(asset.name) ?? 0) + 1);
			}
			const expectedAssets = [
				PI_RELEASE_MANIFEST,
				PI_RELEASE_CHECKSUMS,
				PI_RELEASE_INSTALLER,
				...NATIVE_PLATFORMS.map((platform) => `prime-agent-pi-${tag.slice(4)}-${platform}.tar.gz`),
			];
			if (expectedAssets.some((file) => assets.get(file) !== 1)) continue;
			candidates.push({ identity, tag, assetBaseUrl });
		}
		if (releases.length < pageSize) break;
	}
	candidates.sort((left, right) => comparePiReleases(right.identity, left.identity));
	for (const { tag, assetBaseUrl } of candidates) {
		const response = await request(`${assetBaseUrl}/${PI_RELEASE_MANIFEST}`, { signal });
		if (!response.ok) continue;
		const json: unknown = await response.json().catch((error: unknown) => {
			if (error instanceof SyntaxError) return undefined;
			throw error;
		});
		const manifest = parsePiReleaseManifest(json);
		if (manifest?.tag !== tag) continue;
		return { ...manifest, assetBaseUrl };
	}
	return undefined;
}
