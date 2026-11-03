import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { VERSION } from "../src/config.js";

const execute = promisify(execFile);
const launcher = fileURLToPath(new URL("../../../prime-agent.sh", import.meta.url));

describe("source launcher", () => {
	it.each(["direct", "absolute symlink", "relative symlink chain"])("reports its version through %s", async (mode) => {
		const directory = mkdtempSync(join(tmpdir(), "prime source launcher "));
		try {
			const bin = join(directory, "bin");
			const home = join(directory, "home");
			mkdirSync(bin);
			mkdirSync(home);
			let executable = launcher;
			if (mode !== "direct") {
				const target = mode === "absolute symlink" ? launcher : "./target";
				if (mode === "relative symlink chain") symlinkSync(launcher, join(bin, "target"));
				symlinkSync(target, join(bin, "prime-agent"));
				executable = "prime-agent";
			}
			const env = {
				HOME: home,
				PATH: `${bin}${delimiter}${process.env.PATH ?? ""}`,
				PRIME_AGENT_CODING_AGENT_DIR: join(home, "agent"),
			};
			const { stdout, stderr } = await execute(executable, ["--version"], { cwd: directory, env, timeout: 10000 });
			expect((stdout + stderr).trim()).toBe(VERSION);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});
