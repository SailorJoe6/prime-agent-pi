import { spawnSync } from "node:child_process";
import { APP_NAME } from "../config.js";
import { ensureKernelPython } from "../core/kernel/bootstrap.js";
import { getCommandSpec } from "./command-registry.js";

const DISPATCH = `
import json, sys
from rlm.machine_library import _cli_dispatch
print(json.dumps(_cli_dispatch(json.load(sys.stdin.buffer))))
`;

type Request = { op: "list" } | { op: "import"; path: string } | { op: "export"; name: string; out: string };

type Result =
	| { ok: false; errors: string[] }
	| { ok: true; machines: { name: string; source: string; description: string }[]; warnings: string[] }
	| { ok: true; name: string; path: string; source?: string };

function parseFactoryArgs([op, ...args]: string[]): { request: Request; json: boolean } {
	const hint = `Run "${APP_NAME} help factory" for usage.`;
	if (op !== "list" && op !== "import" && op !== "export") {
		throw new Error(`${op ? `Unknown factory command: ${op}` : "Missing factory command."} ${hint}`);
	}
	const operands: string[] = [];
	let json = false;
	let out: string | undefined;
	for (let index = 0; index < args.length; index++) {
		const arg = args[index]!;
		if (arg === "--json") {
			json = true;
		} else if (arg === "--out" && op === "export" && out === undefined) {
			out = args[++index];
			if (!out || out.startsWith("-")) throw new Error(`--out requires a file path. ${hint}`);
		} else if (arg.startsWith("-")) {
			throw new Error(`Unexpected option for factory ${op}: ${arg}. ${hint}`);
		} else {
			operands.push(arg);
		}
	}
	if (op === "list" && operands.length === 0) return { request: { op }, json };
	const [operand] = operands;
	if (operand && operands.length === 1) {
		if (op === "import") return { request: { op, path: operand }, json };
		if (op === "export" && out) return { request: { op, name: operand, out }, json };
	}
	throw new Error(`Usage: ${APP_NAME} ${getCommandSpec(["factory", op])!.usage}`);
}

export async function runFactoryCommand(args: string[]): Promise<void> {
	const { request, json } = parseFactoryArgs(args);
	const python = await ensureKernelPython({ onProgress: (message) => console.error(message) });
	const child = spawnSync(python, ["-c", DISPATCH], {
		input: JSON.stringify(request),
		encoding: "utf8",
		windowsHide: true,
	});
	if (child.error || child.status !== 0) {
		const reason = child.error?.message || child.stderr.trim().split("\n").at(-1) || child.signal || child.status;
		throw new Error(
			`Factory could not use the kernel Python (${reason}). Check that it has the current prime-agent-runtime.`,
		);
	}
	let result: Result;
	try {
		result = JSON.parse(child.stdout);
	} catch {
		throw new Error(
			"Factory received unreadable JSON from the kernel Python. Check that it has the current prime-agent-runtime.",
		);
	}
	if (!result.ok) throw new Error(result.errors.join("\n"));
	if (json) {
		console.log(JSON.stringify(result, null, 2));
	} else if ("machines" in result) {
		for (const warning of result.warnings) console.error(`Warning: ${warning}`);
		if (result.machines.length === 0) console.log("No machines in the library.");
		for (const machine of result.machines) console.log(`${machine.name}  ${machine.source}  ${machine.description}`);
	} else if (request.op === "import") {
		console.log(`Imported ${result.name} into ${result.path}.`);
	} else {
		console.log(`Exported ${result.name} to ${result.path} (from library).`);
	}
}
