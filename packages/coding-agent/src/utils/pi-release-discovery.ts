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
			const assets = new Map<string, Record<string, unknown> | null>();
			for (const value of release.assets) {
				const asset = record(value);
				if (typeof asset?.name !== "string" || asset.state !== "uploaded") continue;
				if (asset.browser_download_url !== `${assetBaseUrl}/${asset.name}`) continue;
				assets.set(asset.name, assets.has(asset.name) ? null : asset);
			}
			const expectedAssets = [
				PI_RELEASE_MANIFEST,
				PI_RELEASE_CHECKSUMS,
				PI_RELEASE_INSTALLER,
				...NATIVE_PLATFORMS.map((platform) => `prime-agent-pi-${tag.slice(4)}-${platform}.tar.gz`),
			];
			if (expectedAssets.some((file) => !assets.get(file))) continue;
			candidates.push({ identity, tag, assetBaseUrl, assets });
		}
		if (releases.length < pageSize) break;
	}
	candidates.sort((left, right) => comparePiReleases(right.identity, left.identity));
	for (const { tag, assetBaseUrl, assets } of candidates) {
		const response = await request(`${assetBaseUrl}/${PI_RELEASE_MANIFEST}`, { signal });
		if (!response.ok) continue;
		const json: unknown = await response.json().catch((error: unknown) => {
			if (error instanceof SyntaxError) return undefined;
			throw error;
		});
		const manifest = parsePiReleaseManifest(json);
		if (manifest?.tag !== tag) continue;
		const payloads = [manifest.installer, ...manifest.binaries];
		if (
			payloads.some(({ file, sha256 }) => {
				const digest = assets.get(file)?.digest;
				if (typeof digest !== "string") return false;
				const normalized = digest.toLowerCase();
				return normalized.startsWith("sha256:") && normalized !== `sha256:${sha256}`;
			})
		)
			continue;
		return { ...manifest, assetBaseUrl };
	}
	return undefined;
}
