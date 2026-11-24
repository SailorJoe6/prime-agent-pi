import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readlinkSync,
	realpathSync,
	rmSync,
	symlinkSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getNativeUpdatePlan } from "../src/cli/native-update.js";
import { NATIVE_RELEASE_ASSETS } from "../src/utils/native-installation.js";
import { fakeFeed, listingUrl, taggedRelease } from "./fixtures/pi-release-feed.js";

describe("native Pi update", () => {
	let root: string;
	let executable: string;
	let target: string;
	const baseUrl = "https://releases.example";

	beforeEach(() => {
		vi.stubEnv("PI_SKIP_VERSION_CHECK", "");
		vi.stubEnv("PI_OFFLINE", "");
		vi.stubEnv("PRIME_AGENT_DOWNLOAD_BASE_URL", baseUrl);
		root = realpathSync(mkdtempSync(join(tmpdir(), "prime-native-metadata-")));
		const checksum = "a".repeat(64);
		const releaseName = `1.2.3.2-linux-x64-${checksum}`;
		const releaseDir = join(root, "releases", releaseName);
		mkdirSync(releaseDir, { recursive: true });
		mkdirSync(join(root, "bin"));
		writeFileSync(join(root, ".managed"), "prime-agent-native-v1\n");
		for (const asset of NATIVE_RELEASE_ASSETS) {
			mkdirSync(dirname(join(releaseDir, asset)), { recursive: true });
			writeFileSync(join(releaseDir, asset), "fixture\n");
		}
		writeFileSync(join(releaseDir, ".archive-sha256"), checksum);
		writeFileSync(join(releaseDir, ".install-source"), baseUrl);
		writeFileSync(join(releaseDir, "package.json"), JSON.stringify({ version: "1.2.3.2" }));
		executable = join(releaseDir, "prime-agent");
		writeFileSync(executable, "fixture executable");
		target = `../releases/${releaseName}/prime-agent`;
		symlinkSync(target, join(root, "bin", "prime-agent"));
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
		rmSync(root, { recursive: true, force: true });
	});

	it("PAPI-61 refuses incomplete tagged releases without downloading an installer", async () => {
		const release = taggedRelease("1.2.3.10");
		release.listing.assets.pop();
		const feed = fakeFeed(release);
		vi.stubGlobal("fetch", feed.fetcher);
		await expect(getNativeUpdatePlan({ force: true, rollback: false, executable })).rejects.toThrow(
			"installed version was kept",
		);
		expect(feed.requests).toEqual([listingUrl]);
		expect(readlinkSync(join(root, "bin", "prime-agent"))).toBe(target);
	});

	it("PAPI-61 prepares only the byte-verified installer for a pinned archive after update planning", async () => {
		const release = taggedRelease("1.2.3.10");
		const feed = fakeFeed(release);
		vi.stubGlobal("fetch", feed.fetcher);
		const plan = await getNativeUpdatePlan({ force: false, rollback: false, executable });
		expect(plan.targetVersion).toBe("1.2.3.10");
		expect(feed.requests).toEqual([listingUrl, `${release.base}/pi-release-manifest.json`]);
		if (!plan.command?.prepare) throw new Error("Missing update preparation");
		const prepared = await plan.command.prepare();
		const installer = prepared.args.at(-2);
		if (!installer) throw new Error("Missing installer path");
		try {
			expect(readFileSync(installer, "utf8")).toBe(release.script);
			expect(prepared.args).toContain(`PRIME_AGENT_PI_TAG=${release.manifest.tag}`);
			expect(prepared.args).toContain(`PRIME_AGENT_EXPECTED_SHA256=${"c".repeat(64)}`);
			expect(prepared.args).toContain(`PRIME_AGENT_EXPECTED_CURRENT=${target}`);
			expect(prepared.args.at(-1)).toBe("1.2.3.10");
		} finally {
			prepared.cleanup();
		}
		expect(existsSync(installer)).toBe(false);
	});

	it("PAPI-61 rejects installer byte mismatch without altering the active launcher", async () => {
		const release = taggedRelease("1.2.3.10");
		release.script += "# modified transport bytes\n";
		const feed = fakeFeed(release);
		vi.stubGlobal("fetch", feed.fetcher);
		const plan = await getNativeUpdatePlan({ force: false, rollback: false, executable });
		if (!plan.command?.prepare) throw new Error("Missing update preparation");
		await expect(plan.command.prepare()).rejects.toThrow("Pi installer checksum mismatch");
		expect(readlinkSync(join(root, "bin", "prime-agent"))).toBe(target);
	});

	it("PAPI-61 refuses to install an older public revision even with --force", async () => {
		vi.stubGlobal("fetch", fakeFeed(taggedRelease("1.2.3.1")).fetcher);
		await expect(getNativeUpdatePlan({ force: true, rollback: false, executable })).resolves.toEqual({
			targetVersion: "1.2.3.2",
			refusedDowngradeTo: "1.2.3.1",
		});
	});

	it("PAPI-61 plans a tagged repair when the active release metadata is damaged", async () => {
		const previous = `1.2.3-linux-x64-${"b".repeat(64)}`;
		const previousDir = join(root, "releases", previous);
		mkdirSync(previousDir, { recursive: true });
		for (const asset of NATIVE_RELEASE_ASSETS) {
			const destination = join(previousDir, asset);
			mkdirSync(dirname(destination), { recursive: true });
			writeFileSync(destination, readFileSync(join(dirname(executable), asset)));
		}
		writeFileSync(join(previousDir, ".archive-sha256"), "b".repeat(64));
		writeFileSync(join(previousDir, "package.json"), JSON.stringify({ version: "1.2.3" }));
		symlinkSync(`../releases/${previous}/prime-agent`, join(root, "bin", "previous"));
		unlinkSync(join(dirname(executable), "package.json"));
		vi.stubGlobal("fetch", fakeFeed(taggedRelease("1.2.3.2")).fetcher);
		const plan = await getNativeUpdatePlan({ force: false, rollback: false, executable });
		expect(plan.targetVersion).toBe("1.2.3.2");
		expect(typeof plan.command?.prepare).toBe("function");
	});
});
