import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	checkForNewPiVersion,
	comparePackageVersions,
	getLatestPiVersion,
	isBaseVersionDowngrade,
	isNewerPackageVersion,
	isReleaseUpdateCandidate,
	resolveUpdateChannel,
} from "../src/utils/version-check.js";
import { clearAmbientRuntimeEnv } from "./ambient-env.js";

import { fakeFeed, listingUrl, taggedRelease } from "./fixtures/pi-release-feed.js";

let restoreAmbientRuntimeEnv: () => void;
beforeEach(() => {
	restoreAmbientRuntimeEnv = clearAmbientRuntimeEnv();
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	restoreAmbientRuntimeEnv();
});

describe("version checks", () => {
	it("compares package versions", () => {
		expect(comparePackageVersions("0.70.6", "0.70.5")).toBeGreaterThan(0);
		expect(comparePackageVersions("0.70.5", "0.70.5")).toBe(0);
		expect(comparePackageVersions("0.70.4", "0.70.5")).toBeLessThan(0);
		expect(comparePackageVersions("0.70.5-beta.10.1.abcdef0", "0.70.5-beta.9.1.1234567")).toBeGreaterThan(0);
		expect(isNewerPackageVersion("0.70.5", "0.70.5")).toBe(false);
		expect(isNewerPackageVersion("0.70.6", "0.70.5")).toBe(true);
	});

	it("PAPI-61 startup notice uses only tagged Pi metadata, never downloads a payload or honors the legacy mirror", async () => {
		const stable = taggedRelease("1.2.3.10");
		const preview = taggedRelease("1.2.4-preview.11");
		const feed = fakeFeed(preview, stable);
		vi.stubGlobal("fetch", feed.fetcher);
		vi.stubEnv("PRIME_AGENT_DOWNLOAD_BASE_URL", "https://legacy.invalid");
		await expect(checkForNewPiVersion("1.2.3.2")).resolves.toBe("1.2.3.10");
		expect(feed.requests).toEqual([listingUrl, `${stable.base}/pi-release-manifest.json`]);
		await expect(checkForNewPiVersion("1.2.3.2", "preview")).resolves.toBe("1.2.4-preview.11");
		await expect(checkForNewPiVersion("1.2.3.10")).resolves.toBeUndefined();
	});

	it.each(["PI_SKIP_VERSION_CHECK", "PI_OFFLINE"])("does not call GitHub when %s is set", async (name) => {
		vi.stubEnv(name, "1");
		const feed = fakeFeed();
		vi.stubGlobal("fetch", feed.fetcher);
		await expect(getLatestPiVersion("1.2.3")).resolves.toBeUndefined();
		expect(feed.requests).toEqual([]);
	});

	it("PAPI-61 does not infer preview opt-in from running version; explicit legacy nightly opt-in is honored", () => {
		expect(resolveUpdateChannel("1.2.4-preview.1")).toBe("stable");
		expect(resolveUpdateChannel("1.2.4-beta.123.1.1234567")).toBe("stable");
		expect(resolveUpdateChannel("1.2.4", "nightly")).toBe("preview");
	});

	it.each([
		["1.2.3.10", "1.2.3.2", undefined, true],
		["1.2.3.2", "1.2.3.10", "preview", false],
		["1.2.3-preview.11", "1.2.3-preview.2", "preview", true],
		["1.2.3-preview.11", "1.2.3", "preview", true],
		["1.2.3-preview.11", "1.2.3", undefined, false],
		["1.2.3", "1.2.3-preview.11", "preview", true],
		["1.2.3", "1.2.3-beta.11.1.abcdef0", "stable", true],
	] as const)("offers %s over %s on %s only according to Pi ordering", (candidate, current, channel, expected) => {
		expect(isReleaseUpdateCandidate(candidate, current, channel)).toBe(expected);
	});

	it("flags lower public versions, including repairs, but not stable promotion", () => {
		expect(isBaseVersionDowngrade("1.2.3.2", "1.2.3.10")).toBe(true);
		expect(isBaseVersionDowngrade("1.2.2", "1.2.3-beta.5.1.abcdef0")).toBe(true);
		expect(isBaseVersionDowngrade("1.2.3", "1.2.3-preview.11")).toBe(false);
	});
});
