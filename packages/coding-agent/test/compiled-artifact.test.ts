import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
	closeSync,
	copyFileSync,
	existsSync,
	fstatSync,
	mkdirSync,
	mkdtempSync,
	openSync,
	readdirSync,
	readFileSync,
	readSync,
	realpathSync,
	renameSync,
	rmSync,
	statSync,
	symlinkSync,
	writeFileSync,
	writeSync,
} from "node:fs";
import { createServer } from "node:http2";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DaemonClient } from "../src/modes/daemon/daemon-client.js";

// Keep process-local failure deadlines below Vitest's default budget so failures report their
// stderr instead of being replaced by a suite-wide timeout.
const RUN_TIMEOUT = 25000;
const CONNECT_TIMEOUT = 5000;

const archive = process.env.PRIME_AGENT_TEST_ARCHIVE;
const uv = process.env.PRIME_AGENT_TEST_UV;
const children = new Set<ChildProcess>();
let root = "";
let extracted = "";
let binary = "";
let home = "";
let cwd = "";
let socket = "";
let environment: NodeJS.ProcessEnv;

const pythonSmokeDiagnostics = process.env.PRIME_AGENT_PYTHON_SMOKE_DIAGNOSTICS === "1";
const bootstrapMarker = ".prime/agent/kernel-venv/.bootstrap-version";
let pythonSmoke: ReturnType<typeof startPythonSmokeDiagnostics> | undefined;

function tail(path: string): string {
	const fd = openSync(path, "r");
	try {
		const size = fstatSync(fd).size;
		const buffer = Buffer.alloc(Math.min(size, 4096));
		return buffer.toString("utf8", 0, readSync(fd, buffer, 0, buffer.length, size - buffer.length));
	} finally {
		closeSync(fd);
	}
}

function uvLogSummary() {
	try {
		// Report only fixed labels, never raw uv output (which can contain URLs or paths).
		return tail(join(home, "uv.log"))
			.split(/\r?\n/)
			.filter((line) => line.trim())
			.slice(-8)
			.map((line) => {
				if (/\b(error|failed|warning)\b/i.test(line)) return "error-or-warning";
				if (/\b(download(?:ing|ed)?|fetching)\b/i.test(line)) return "download";
				if (/\b(building|built)\b/i.test(line)) return "build";
				if (/\b(resolved|prepared|installed|audited|creating)\b/i.test(line)) return "progress";
				return "other";
			});
	} catch {
		return null;
	}
}

function startPythonSmokeDiagnostics() {
	const startedAt = new Date().toISOString();
	const extensionPath = join(cwd, "extension.ts");
	const marker = (name: string) => join(home, `python-smoke-${name}`);
	// Instrument only the fixture copy. Keep marker writes independent of test results.
	const cells = ["print(rlm.__file__)", "print((await bash('printf artifact-shell-ok')).output)"];
	const sessionStart = 'pi.on("session_start", async () => {';
	let instrumented = false;
	try {
		writeFileSync(marker("enabled"), "");
		const extension = readFileSync(extensionPath, "utf8");
		if (![sessionStart, ...cells].every((anchor) => extension.includes(anchor))) throw new Error();
		let source = extension.replace(
			sessionStart,
			`${sessionStart}\n\t\ttry { writeFileSync(${JSON.stringify(marker("session"))}, ""); } catch {}`,
		);
		for (const [index, anchor] of cells.entries()) {
			const code = `\ntry:\n    with open(${JSON.stringify(marker(`cell-${index + 1}`))}, 'w'):\n        pass\nexcept OSError:\n    pass`;
			source = source.replace(anchor, () => anchor + JSON.stringify(code).slice(1, -1));
		}
		const replacement = marker("extension.ts");
		writeFileSync(replacement, source);
		renameSync(replacement, extensionPath);
		instrumented = true;
	} catch {
		// Preserve the original fixture if this best-effort instrumentation is unavailable.
	}

	function markerTime(name: string) {
		return statSync(marker(name), { throwIfNoEntry: false })?.mtime.toISOString() ?? null;
	}

	const cli: Partial<Record<"exit" | "close", { at: string; code: number | null; signal: NodeJS.Signals | null }>> =
		{};
	let reported = false;
	return {
		observe(event: "exit" | "close", code: number | null, signal: NodeJS.Signals | null) {
			cli[event] = { at: new Date().toISOString(), code, signal };
		},
		cli,
		snapshot(reason: "timeout" | "settled") {
			if (reported) return;
			reported = true;
			try {
				let bootstrap: { runtimePresent: boolean; pythonSkillCount: number | null } | "missing" | "unreadable" =
					"missing";
				const path = join(home, bootstrapMarker);
				if (existsSync(path)) {
					try {
						const data = JSON.parse(readFileSync(path, "utf8"));
						bootstrap = {
							runtimePresent: typeof data.runtime === "string" && data.runtime.startsWith("sha256:"),
							pythonSkillCount: Array.isArray(data.pythonSkills) ? data.pythonSkills.length : null,
						};
					} catch {
						bootstrap = "unreadable";
					}
				}
				let uvStages: string[] | null = null;
				try {
					uvStages = tail(marker("uv"))
						.split("\n")
						.filter((line) =>
							/^\d{10} (python-install|venv|base-install|skill-install|other) (start|end [0-9]{1,3})$/.test(
								line,
							),
						)
						.slice(-16);
				} catch {
					/* No uv invocation recorded yet. */
				}
				console.info(
					"[python-smoke]",
					JSON.stringify({
						reason,
						startedAt,
						snapshotAt: new Date().toISOString(),
						instrumented,
						sessionStart: markerTime("session"),
						cell1: markerTime("cell-1"),
						cell2AfterShell: markerTime("cell-2"),
						cliExit: cli.exit ?? null,
						cliClose: cli.close ?? null,
						socketPresent: existsSync(socket),
						bootstrap,
						uvStages,
						uvLogTail: uvLogSummary(),
					}),
				);
			} catch {
				console.info("[python-smoke] snapshot unavailable");
			}
		},
	};
}

/** SIGKILL is a deterministic teardown signal and cannot be blocked by the supervisor. */
function terminateSupervisor(pid: number): boolean {
	try {
		return process.kill(pid, "SIGKILL");
	} catch {
		/* The supervisor may already have exited after acknowledging shutdown. */
		return false;
	}
}

async function run(args: string[], extraEnv: NodeJS.ProcessEnv = {}, timeout = RUN_TIMEOUT, input?: string) {
	const child = spawn(binary, args, { cwd, env: { ...environment, ...extraEnv }, stdio: ["pipe", "pipe", "pipe"] });
	children.add(child);
	const diagnostics = pythonSmoke;
	if (diagnostics) child.once("exit", (code, signal) => diagnostics.observe("exit", code, signal));
	let stdout = "";
	let stderr = "";
	child.stdout.on("data", (chunk) => {
		stdout += chunk.toString();
	});
	child.stderr.on("data", (chunk) => {
		stderr += chunk.toString();
	});
	child.stdin.end(input);
	return await new Promise<{ code: number | null; stdout: string; stderr: string }>((done, reject) => {
		const timer = setTimeout(() => {
			try {
				diagnostics?.snapshot("timeout");
			} finally {
				const signalSent = child.kill("SIGKILL");
				reject(
					new Error(
						diagnostics ? "Python artifact timed out" : `Artifact timed out: ${args.join(" ")}\n${stderr}`,
					),
				);
				if (diagnostics) console.info("[python-smoke] timeout SIGKILL sent:", signalSent);
			}
		}, timeout);
		child.once("error", (error) => {
			clearTimeout(timer);
			reject(error);
		});
		child.once("close", (code, signal) => {
			diagnostics?.observe("close", code, signal);
			clearTimeout(timer);
			children.delete(child);
			done({ code, stdout, stderr });
		});
	});
}

function sessionArgs(): string[] {
	return [
		"--offline",
		"--daemon-socket",
		socket,
		"--no-context-files",
		"--no-extensions",
		"-e",
		join(cwd, "extension.ts"),
		"--provider",
		"artifact-faux",
		"--model",
		"artifact",
	];
}

function crc32(buffer: Buffer): number {
	let crc = 0xffffffff;
	for (const byte of buffer) {
		crc ^= byte;
		for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const content = Buffer.concat([Buffer.from(type), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(content));
	return Buffer.concat([length, content, crc]);
}

describe.skipIf(!archive)("extracted standalone archive", () => {
	beforeAll(() => {
		root = realpathSync(mkdtempSync(join(process.platform === "darwin" ? "/tmp" : tmpdir(), "pa-bin-")));
		extracted = join(root, "extracted app");
		mkdirSync(extracted);
		execFileSync("tar", ["-xzf", resolve(archive!), "-C", extracted]);
		binary = join(extracted, "prime-agent");
		if (process.platform === "darwin") {
			execFileSync("/usr/bin/codesign", ["--verify", "--deep", "--strict", "--verbose=4", binary]);
		}
		const bin = join(root, "bin");
		mkdirSync(bin);
		for (const command of [
			"sh",
			"bash",
			"ps",
			"kill",
			"env",
			"uname",
			"which",
			"cat",
			"mkdir",
			"rm",
			"ls",
			"sleep",
			"cc",
			"clang",
			"ld",
			"ar",
			"ranlib",
			"xcrun",
			"install_name_tool",
		]) {
			const source = ["/bin", "/usr/bin"].map((path) => join(path, command)).find(existsSync);
			if (source) symlinkSync(source, join(bin, command));
		}
		if (uv) {
			symlinkSync(resolve(uv), join(bin, "uv-real"));
			writeFileSync(
				join(bin, "uv"),
				pythonSmokeDiagnostics
					? `#!/bin/sh
if [ ! -f "$HOME/python-smoke-enabled" ]; then
	exec "\${0%/*}/uv-real" "$@" 2>> "$HOME/uv.log"
fi
case "$1 $2" in
	'python install') stage=python-install ;;
	'venv '*) stage=venv ;;
	'pip install')
		if [ "$5" = '--editable' ]; then stage=skill-install; else stage=base-install; fi ;;
	*) stage=other ;;
esac
printf '%s %s start\\n' "$(/bin/date +%s)" "$stage" >> "$HOME/python-smoke-uv"
"\${0%/*}/uv-real" "$@" 2>> "$HOME/uv.log"
status=$?
printf '%s %s end %s\\n' "$(/bin/date +%s)" "$stage" "$status" >> "$HOME/python-smoke-uv"
exit "$status"
`
					: `#!/bin/sh\nexec "\${0%/*}/uv-real" "$@" 2>> "$HOME/uv.log"\n`,
				{ mode: 0o755 },
			);
		}
	});
	beforeEach(() => {
		home = mkdtempSync(join(root, "home-"));
		cwd = join(home, "project with spaces");
		mkdirSync(cwd);
		socket = join(home, "d.sock");
		environment = {
			HOME: home,
			PATH: join(root, "bin"),
			TMPDIR: root,
			SHELL: "/bin/sh",
			DO_NOT_TRACK: "1",
			PRIME_AGENT_CODING_AGENT_DIR: join(home, "agent"),
			PRIME_AGENT_INSTALL_UV: "0",
			UV_CACHE_DIR: join(root, "uv-cache"),
			UV_PYTHON_INSTALL_DIR: join(root, "python"),
		};
		mkdirSync(environment.PRIME_AGENT_CODING_AGENT_DIR!);
		writeFileSync(
			join(environment.PRIME_AGENT_CODING_AGENT_DIR!, "settings.json"),
			JSON.stringify({ retry: { enabled: false } }),
		);
		copyFileSync(resolve(__dirname, "fixtures/compiled-artifact-extension.ts"), join(cwd, "extension.ts"));
	});
	afterEach(async () => {
		let termSignalsSent = 0;
		for (const child of children) if (child.kill("SIGTERM")) termSignalsSent++;
		const client = new DaemonClient(socket);
		let supervisorPid: number | undefined;
		let shutdownError: unknown;
		let daemonShutdown = "not-connected";
		try {
			await client.connect(CONNECT_TIMEOUT);
			daemonShutdown = "hello-not-received";
			supervisorPid = (await client.waitForHello()).supervisorPid;
			daemonShutdown = "shutdown-not-acknowledged";
			const shutdown = await client.request({ type: "shutdown", force: true });
			daemonShutdown = shutdown.success ? "acknowledged" : "rejected";
		} catch (error) {
			if (existsSync(socket)) shutdownError = error;
		} finally {
			client.close();
		}
		// The supervisor is terminated even when the shutdown request failed, so an unresponsive
		// daemon reports its own error instead of leaking a process into the next test.
		const supervisorKillSent = supervisorPid !== undefined && terminateSupervisor(supervisorPid);
		let killSignalsSent = 0;
		for (const child of children) {
			if (child.exitCode === null && child.signalCode === null && child.kill("SIGKILL")) killSignalsSent++;
		}
		children.clear();
		if (pythonSmoke) {
			console.info(
				"[python-smoke] owned teardown",
				JSON.stringify({
					daemonShutdown,
					supervisorKillSent,
					termSignalsSent,
					killSignalsSent,
					cliExit: pythonSmoke.cli.exit ?? null,
					cliClose: pythonSmoke.cli.close ?? null,
					socketPresent: existsSync(socket),
				}),
			);
			pythonSmoke = undefined;
		}
		if (shutdownError) throw shutdownError;
	});
	afterAll(() => {
		let removed = false;
		try {
			if (root) rmSync(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
			removed = true;
		} finally {
			if (pythonSmokeDiagnostics && root) console.info("[python-smoke] fixture root removal:", removed);
		}
	});

	it("has verified checksums, clean sidecars, and runtime-free help/version startup", async () => {
		const sum = createHash("sha256").update(readFileSync(archive!)).digest("hex");
		expect(readFileSync(join(dirname(archive!), "SHA256SUMS"), "utf8")).toContain(`${sum}  ${basename(archive!)}`);
		const listing = execFileSync("tar", ["-tzf", archive!], { encoding: "utf8" });
		expect(listing).not.toMatch(/(^|\/)(node_modules|\.venv|__pycache__|\.pytest_cache)(\/|$)/m);
		for (const name of [
			"prime-agent-runtime/src/rlm/repl.py",
			"photon_rs_bg.wasm",
			"export-html/template.css",
			"export-html/template.js",
			"theme/prime.json",
		])
			expect(listing).toContain(name);
		for (const name of ["node", "npm", "bun"]) expect(existsSync(join(environment.PATH!, name))).toBe(false);
		const metadata = JSON.parse(readFileSync(join(extracted, "package.json"), "utf8"));
		expect(metadata.name).toBe("@earendil-works/pi-coding-agent");
		expect(await run(["--version"])).toMatchObject({ code: 0, stdout: `${metadata.version}\n` });
		const help = await run(["--help"]);
		expect(help.code, help.stderr).toBe(0);
		expect(help.stdout).toContain("Python REPL");
	});

	it.skipIf(process.platform !== "darwin")("rejects a tampered copy without changing the verified executable", () => {
		const originalHash = createHash("sha256").update(readFileSync(binary)).digest("hex");
		const tampered = join(home, "tampered-prime-agent");
		copyFileSync(binary, tampered);
		const descriptor = openSync(tampered, "r+");
		try {
			const byte = Buffer.alloc(1);
			expect(readSync(descriptor, byte, 0, 1, 4096)).toBe(1);
			byte[0] ^= 1;
			writeSync(descriptor, byte, 0, 1, 4096);
		} finally {
			closeSync(descriptor);
		}
		expect(() =>
			execFileSync("/usr/bin/codesign", ["--verify", "--deep", "--strict", "--verbose=4", tampered], {
				stdio: "pipe",
			}),
		).toThrow();
		expect(createHash("sha256").update(readFileSync(binary)).digest("hex")).toBe(originalHash);
	});

	it("executes hot JavaScript in the extracted runtime, not only help/version startup", async () => {
		const extensionPath = join(cwd, "extension.ts");
		writeFileSync(
			extensionPath,
			`${readFileSync(extensionPath, "utf8")}
const hot = new Function("value", "for (let i = 0; i < 128; i++) value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value;");
let value = 1;
for (let i = 0; i < 100000; i++) value = hot(value);
writeFileSync(join(process.cwd(), "hot-runtime.json"), JSON.stringify({ value, executable: process.execPath }));
`,
		);
		const result = await run([...sessionArgs(), "--no-tools", "-p", "artifact hot runtime"]);
		expect(result.code, result.stderr).toBe(0);
		expect(JSON.parse(readFileSync(join(cwd, "hot-runtime.json"), "utf8"))).toEqual({
			value: 1000067073,
			executable: binary,
		});
		expect(result.stdout.trim()).toBe(`artifact-ok:${"x".repeat(131072)}:complete`);
	});

	it("loads extensions and skills, flushes piped output, and starts an owned daemon", async () => {
		const result = await run([...sessionArgs(), "--no-tools", "-p", "artifact test"]);
		expect(result.code, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe(`artifact-ok:${"x".repeat(131072)}:complete`);
		expect(JSON.parse(readFileSync(join(cwd, "loaded-assets.json"), "utf8")).skills.length).toBeGreaterThan(0);
		const client = new DaemonClient(socket);
		try {
			await client.connect();
			const hello = await client.waitForHello();
			expect(hello.runtime?.executablePath).toBe(binary);
			expect((await client.request({ type: "list" })).success).toBe(true);
		} finally {
			client.close();
		}
	});

	it("loads Photon WASM to resize an attachment and exports HTML with its theme", async () => {
		const header = Buffer.alloc(13);
		header.writeUInt32BE(3000, 0);
		header.writeUInt32BE(1, 4);
		header[8] = 8;
		header[9] = 2;
		const png = Buffer.concat([
			Buffer.from("89504e470d0a1a0a", "hex"),
			pngChunk("IHDR", header),
			pngChunk("IDAT", deflateSync(Buffer.alloc(9001))),
			pngChunk("IEND", Buffer.alloc(0)),
		]);
		writeFileSync(join(cwd, "wide.png"), png);
		const result = await run([...sessionArgs(), "--no-tools", "-p", "@wide.png", "artifact image"], {
			PRIME_AGENT_ARTIFACT_CASE: "image",
		});
		expect(result.code, result.stderr).toBe(0);
		const sessionsRoot = join(environment.PRIME_AGENT_CODING_AGENT_DIR!, "sessions");
		const sessions = readdirSync(sessionsRoot, { recursive: true })
			.map(String)
			.filter((path) => path.endsWith(".jsonl"));
		expect(sessions.length).toBeGreaterThan(0);
		const output = join(cwd, "export.html");
		const exported = await run(["session", "export", join(sessionsRoot, sessions[0]!), output]);
		expect(exported.code, exported.stderr).toBe(0);
		const html = readFileSync(output, "utf8");
		const encoded = html.match(/<script id="session-data" type="application\/json">([A-Za-z0-9+/=]+)<\/script>/)?.[1];
		expect(encoded, "HTML export must embed its session data").toBeDefined();
		expect(Buffer.from(encoded!, "base64").toString("utf8").includes("artifact image")).toBe(true);
	});

	it("handles RPC state and shell requests over pipes and exits on EOF", async () => {
		const input = [
			{ id: "state", type: "get_state" },
			{ id: "shell", type: "bash", command: "printf artifact-rpc-shell" },
		]
			.map((command) => `${JSON.stringify(command)}\n`)
			.join("");
		const result = await run([...sessionArgs(), "--no-tools", "--mode", "rpc"], {}, RUN_TIMEOUT, input);
		expect(result.code, result.stderr).toBe(0);
		const frames = result.stdout
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));
		expect(frames.find((frame) => frame.id === "state")).toMatchObject({
			success: true,
			data: { model: { provider: "artifact-faux" } },
		});
		expect(frames.find((frame) => frame.id === "shell")).toMatchObject({
			success: true,
			data: { output: "artifact-rpc-shell", exitCode: 0 },
		});
	});

	it("selects Bedrock from AWS environment credentials and loads its bundled request path", async () => {
		const requests: string[] = [];
		const server = createServer((request, response) => {
			requests.push(request.url ?? "");
			response.writeHead(400, { "Content-Type": "application/json", "x-amzn-errortype": "ValidationException" });
			response.end(JSON.stringify({ message: "artifact-bedrock-request-ok" }));
		});
		await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
		const address = server.address();
		if (!address || typeof address === "string") throw new Error("Missing local provider port");
		try {
			const result = await run(
				[
					"--offline",
					"--daemon-socket",
					socket,
					"--no-tools",
					"--no-extensions",
					"--no-skills",
					"-p",
					"offline provider test",
				],
				{
					AWS_ACCESS_KEY_ID: "artifact-test",
					AWS_SECRET_ACCESS_KEY: "artifact-test",
					AWS_REGION: "us-east-1",
					AWS_EC2_METADATA_DISABLED: "true",
					AWS_ENDPOINT_URL_BEDROCK_RUNTIME: `http://127.0.0.1:${address.port}`,
				},
			);
			expect(
				requests.some((path) => path.includes("converse-stream")),
				result.stderr + result.stdout,
			).toBe(true);
			expect(result.code).not.toBe(0);
			expect(result.stderr + result.stdout).toContain("artifact-bedrock-request-ok");
		} finally {
			await new Promise<void>((done) => server.close(() => done()));
		}
	});

	it("bootstraps the shipped Python sources and executes persistent cells and shell commands", async () => {
		expect(uv, "Set PRIME_AGENT_TEST_UV to an absolute uv executable for artifact validation").toBeTruthy();
		const constraint = process.env.PRIME_AGENT_TEST_UV_CONSTRAINT;
		if (constraint) {
			expect(existsSync(constraint), "Expected the prepared Python smoke dependency constraint").toBe(true);
			environment.UV_CONSTRAINT = constraint;
		}
		if (pythonSmokeDiagnostics) pythonSmoke = startPythonSmokeDiagnostics();
		try {
			const result = await run(
				[...sessionArgs(), "--tools", "ipython", "-p", "artifact python"],
				{ PRIME_AGENT_ARTIFACT_CASE: "python" },
				300000,
			);
			const uvLog = join(home, "uv.log");
			expect(
				result.code,
				pythonSmoke
					? "See Python smoke diagnostics"
					: `${result.stderr}\n${existsSync(uvLog) ? readFileSync(uvLog, "utf8") : ""}`,
			).toBe(0);
			expect(result.stdout).toContain("artifact-python-result 42");
			expect(result.stdout).toContain("artifact-shell-ok");
			const bootstrap = JSON.parse(readFileSync(join(home, bootstrapMarker), "utf8"));
			expect(bootstrap.runtime).toMatch(/^sha256:/);
			expect(bootstrap.pythonSkills.length).toBeGreaterThan(0);
			expect(
				bootstrap.pythonSkills.every((skill: { packagePath: string }) => skill.packagePath.startsWith(extracted)),
			).toBe(true);
		} finally {
			pythonSmoke?.snapshot("settled");
		}
	}, 320000);
});
