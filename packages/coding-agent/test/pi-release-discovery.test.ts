import { describe, expect, it } from "vitest";
import { NATIVE_PLATFORMS } from "../src/utils/native-installation.js";
import { discoverPiRelease } from "../src/utils/pi-release-discovery.js";
import { encodePiPackageVersion } from "../src/utils/pi-release-version.js";

const api = "https://api.github.com/repos/SailorJoe6/prime-agent-pi/releases?per_page=100&page=";
const root = "https://github.com/SailorJoe6/prime-agent-pi/releases/download/";
const digest = "a".repeat(64);
const manifestFile = "pi-release-manifest.json";

function release(publicVersion: string, previewSequence?: number) {
	const runtime = `${publicVersion}${previewSequence === undefined ? "" : `-preview.${previewSequence}`}`;
	const tag = `pi-v${runtime}`;
	const base = `${root}${tag}`;
	const manifest = {
		schemaVersion: 1,
		tag,
		publicVersion,
		previewSequence,
		channel: previewSequence === undefined ? "stable" : "preview",
		packageVersion: encodePiPackageVersion({ publicVersion, previewSequence }),
		sourceSha: "c".repeat(40),
		catalogSha: "d".repeat(40),
		installer: { file: "install-pi.sh", sha256: digest },
		binaries: NATIVE_PLATFORMS.map((platform) => ({
			platform,
			file: `prime-agent-pi-${runtime}-${platform}.tar.gz`,
			sha256: digest,
			executableSha256: "e".repeat(64),
		})),
	};
	const listing = {
		tag_name: tag,
		draft: false,
		prerelease: previewSequence !== undefined,
		assets: [manifestFile, "SHA256SUMS", manifest.installer.file, ...manifest.binaries.map(({ file }) => file)].map(
			(name) => ({ name, state: "uploaded", browser_download_url: `${base}/${name}` }),
		),
	};
	return { base, listing, manifest };
}

function fixture(...releases: ReturnType<typeof release>[]) {
	const requests: string[] = [];
	const fetcher: typeof fetch = async (input) => {
		const url = String(input);
		requests.push(url);
		if (url === `${api}1`) return Response.json(releases.map(({ listing }) => listing));
		const match = releases.find(({ base }) => url === `${base}/${manifestFile}`);
		if (!match) throw new Error(`Unexpected fetch: ${url}`);
		return Response.json(match.manifest);
	};
	return { fetcher, requests };
}

describe("Pi GitHub Release discovery", () => {
	it("selects numerically across GitHub pages and does not offer a preview by default", async () => {
		const older = release("0.10.2.2");
		const latest = release("0.10.2.10");
		const preview = release("0.10.3", 2);
		const { fetcher } = fixture(latest);
		const result = await discoverPiRelease({
			fetcher: async (input, init) => {
				const url = String(input);
				if (url === `${api}1`) return Response.json([older.listing, preview.listing, ...Array(98).fill(null)]);
				if (url === `${api}2`) return Response.json([latest.listing]);
				return fetcher(input, init);
			},
		});
		expect(result).toMatchObject({
			tag: latest.listing.tag_name,
			assetBaseUrl: latest.base,
			binaries: latest.manifest.binaries,
		});
	});

	it("allows explicitly opted-in previews and sorts sequences numerically", async () => {
		const stable = release("0.10.2");
		const latest = release("0.10.3", 10);
		const { fetcher } = fixture(release("0.10.3", 2), stable, latest);
		expect(await discoverPiRelease({ channel: "preview", fetcher })).toMatchObject({
			tag: "pi-v0.10.3-preview.10",
			channel: "preview",
			assetBaseUrl: latest.base,
		});
	});

	it.each([
		"draft",
		"missing archive",
		"foreign asset",
		"missing checksum file",
		"duplicate target",
		"wrong tag",
		"bad digest",
	])("does not offer a newer release with %s", (kind) => {
		const latest = release("0.10.3");
		const old = release("0.10.2");
		switch (kind) {
			case "draft":
				latest.listing.draft = true;
				break;
			case "missing archive":
				latest.listing.assets.pop();
				break;
			case "foreign asset":
				latest.listing.assets[0].browser_download_url = "https://example.invalid/manifest";
				break;
			case "missing checksum file":
				latest.listing.assets.splice(1, 1);
				break;
			case "duplicate target":
				latest.manifest.binaries[1] = latest.manifest.binaries[0];
				break;
			case "wrong tag":
				latest.manifest.tag = old.manifest.tag;
				break;
			case "bad digest":
				latest.manifest.binaries[0].sha256 += "\n";
				break;
		}
		const { fetcher } = fixture(latest, old);
		return expect(discoverPiRelease({ fetcher })).resolves.toMatchObject({ tag: old.manifest.tag });
	});

	it("returns no candidate when only legacy or unavailable releases exist", async () => {
		const old = release("0.9.8");
		old.listing.tag_name = "v0.9.8";
		const { fetcher, requests } = fixture(old);
		expect(await discoverPiRelease({ fetcher })).toBeUndefined();
		expect(requests).toEqual([`${api}1`]);
	});
});
