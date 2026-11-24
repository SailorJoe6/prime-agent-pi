import { describe, expect, it } from "vitest";
import { comparePiReleases, encodePiPackageVersion, selectLatestPiRelease } from "../src/utils/pi-release-version.js";

const stable = (publicVersion: string) => ({ publicVersion });
const preview = (publicVersion: string, previewSequence: number) => ({ publicVersion, previewSequence });

describe("Pi release versions", () => {
	it.each([
		[stable("0.10.2"), "0.10.2"],
		[stable("0.10.2.0"), "0.10.2"],
		[stable("0.10.2.10"), "0.10.2+pi.10"],
		[preview("0.10.2", 1), "0.10.2-preview.1"],
		[preview("0.10.2.10", 12), "0.10.2-preview.12+pi.10"],
	])("encodes %j as %s for npm", (release, expected) => {
		expect(encodePiPackageVersion(release)).toBe(expected);
	});

	it("normalizes initial revisions for comparison", () => {
		expect(comparePiReleases(stable("0.10.2"), stable("0.10.2.0"))).toBe(0);
	});

	it.each([
		[stable("0.10.2"), stable("0.10.2.1")],
		[stable("0.10.2.2"), stable("0.10.2.10")],
		[stable("0.10.2.10"), preview("0.10.3", 1)],
		[preview("0.10.3", 2), preview("0.10.3", 10)],
		[preview("0.10.3", 10), stable("0.10.3")],
	])("orders %j before %j and reverses the comparison for rollback", (older, newer) => {
		expect(comparePiReleases(older, newer)).toBeLessThan(0);
		expect(comparePiReleases(newer, older)).toBeGreaterThan(0);
	});

	it("defaults to stable, and includes older stable releases and newer previews when opted in", () => {
		const repair = stable("0.10.2.10");
		const candidate = preview("0.10.3", 2);
		const releases = [candidate, repair, preview("0.10.3", 1), stable("0.10.2.2")];
		expect(selectLatestPiRelease(releases)).toEqual(repair);
		expect(selectLatestPiRelease([candidate])).toBeUndefined();
		expect(selectLatestPiRelease(releases, "preview")).toEqual(candidate);
		const promoted = stable("0.10.3");
		expect(selectLatestPiRelease([promoted, ...releases], "preview")).toEqual(promoted);
	});

	it.each([
		"0.10",
		"0.10.2.1.0",
		"00.10.2",
		"0.10.02",
		"0.10.2.01",
		"0.10.2+pi.1",
		"0.10.2-rc.1",
		"0.10.-2",
		"0.10.2 ",
		"0.10.2\n",
		"0.10.9007199254740992",
	])("rejects malformed public version %j", (version) => {
		expect(() => encodePiPackageVersion(stable(version))).toThrow("Invalid Pi public version");
	});

	it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 9007199254740992])(
		"rejects malformed preview sequence %s",
		(sequence) => {
			expect(() => encodePiPackageVersion(preview("0.10.2", sequence))).toThrow("Invalid Pi preview sequence");
		},
	);
});
