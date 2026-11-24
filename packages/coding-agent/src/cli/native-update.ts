import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { accessSync, constants, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { APP_NAME, type SelfUpdateCommand } from "../config.js";
import {
	getNativeInstallationTarget,
	readNativeInstallation,
	readNativeRollbackInstallation,
} from "../utils/native-installation.js";
import {
	getLatestPiRelease,
	isBaseVersionDowngrade,
	isReleaseUpdateCandidate,
	type UpdateChannel,
} from "../utils/version-check.js";

const PI_RELEASES_URL = "https://github.com/SailorJoe6/prime-agent-pi/releases";

/** The release manifest for the requested channel could not be resolved; the installed version was kept. */
export class NativeReleaseUnavailableError extends Error {
	constructor(cause?: unknown) {
		super(
			cause instanceof Error
				? `Could not resolve a compiled release: ${cause.message}. The installed version was kept.`
				: "Could not resolve a compiled release. The installed version was kept.",
			cause instanceof Error ? { cause } : undefined,
		);
		this.name = "NativeReleaseUnavailableError";
	}
}

export interface NativeUpdatePlan {
	command?: SelfUpdateCommand;
	targetVersion: string;
	/** Set when the channel's current release has a lower base version than the installed one; nothing is planned. */
	refusedDowngradeTo?: string;
}

export async function getNativeUpdatePlan(options: {
	force: boolean;
	rollback: boolean;
	channel?: UpdateChannel;
	executable?: string;
}): Promise<NativeUpdatePlan> {
	const current = getNativeInstallationTarget(options.executable);
	if (!current)
		throw new Error(
			"This compiled application is not owned by the Prime Agent installer. Update it using its original installer.",
		);
	const active = readNativeInstallation(current.root);
	const installation = active ?? readNativeInstallation(current.root, "previous");
	if (!installation || installation.platform !== current.platform)
		throw new Error(
			`The compiled installation is damaged. Use the verified installer at ${PI_RELEASES_URL} to repair it.`,
		);
	accessSync(installation.root, constants.W_OK);
	accessSync(join(installation.root, "bin"), constants.W_OK);
	const environment = [
		"PRIME_AGENT_INSTALL_METHOD=binary",
		`PRIME_AGENT_INSTALL_DIR=${installation.root}`,
		"PRIME_AGENT_INSTALL_LINK=0",
		"PRIME_AGENT_INSTALLER_NONINTERACTIVE=1",
		"PRIME_AGENT_INSTALLER_PLAIN=1",
		"PRIME_AGENT_BOOTSTRAP_KERNEL_ON_INSTALL=0",
		`PRIME_AGENT_EXPECTED_CURRENT=${relative(join(current.root, "bin"), current.executable)}`,
	];
	const retained = join(installation.releaseDir, "install.sh");
	if (options.rollback && !/^# prime-agent-native-recovery-v1$/m.test(readFileSync(retained, "utf8"))) {
		throw new Error(`The retained installer does not support rollback. Repair via ${PI_RELEASES_URL}.`);
	}
	if (options.rollback) {
		const previous = readNativeRollbackInstallation(installation.root);
		if (!previous || previous.executable === current.executable)
			throw new Error("No valid previous compiled release is available.");
		let reportedVersion: string;
		try {
			reportedVersion = execFileSync(previous.executable, ["--version"], {
				encoding: "utf8",
				timeout: 10000,
			});
		} catch {
			throw new Error("The previous compiled release executable could not be validated.");
		}
		if (reportedVersion !== previous.version && reportedVersion !== `${previous.version}\n`)
			throw new Error("The previous compiled release executable reports a different version.");
		try {
			execFileSync(previous.executable, ["--help"], { stdio: "ignore", timeout: 10000 });
		} catch {
			throw new Error("The previous compiled release executable failed its help probe.");
		}
		const previousTarget = relative(join(installation.root, "bin"), previous.executable);
		return {
			targetVersion: previous.version,
			command: {
				command: "/usr/bin/env",
				args: [
					...environment,
					"PRIME_AGENT_PI_TAG=",
					`PRIME_AGENT_EXPECTED_PREVIOUS=${previousTarget}`,
					"sh",
					retained,
					"--rollback",
				],
				display: `${APP_NAME} update --rollback`,
			},
		};
	}

	let release: Awaited<ReturnType<typeof getLatestPiRelease>>;
	try {
		release = await getLatestPiRelease(current.version, { channel: options.channel });
	} catch (error) {
		throw new NativeReleaseUnavailableError(error);
	}
	if (!release) throw new NativeReleaseUnavailableError();
	if (active && isBaseVersionDowngrade(release.version, current.version)) {
		return { targetVersion: current.version, refusedDowngradeTo: release.version };
	}
	if (active && !options.force && !isReleaseUpdateCandidate(release.version, current.version, options.channel)) {
		return { targetVersion: current.version };
	}
	const artifact = release.binaries.find((entry) => entry.platform === current.platform);
	if (!artifact) throw new Error(`No verified compiled archive is available for ${current.platform}.`);
	const { tag, version, installer, assetBaseUrl } = release;
	const display = `${APP_NAME} update${options.force ? " --force" : ""}`;
	return {
		targetVersion: version,
		command: {
			command: "/usr/bin/env",
			args: [],
			display,
			prepare: async () => {
				const response = await fetch(`${assetBaseUrl}/${installer.file}`, { signal: AbortSignal.timeout(10_000) });
				if (!response.ok)
					throw new Error("Could not download the tagged Pi installer. The installed version was kept.");
				const bytes = Buffer.from(await response.arrayBuffer());
				if (createHash("sha256").update(bytes).digest("hex") !== installer.sha256) {
					throw new Error("Pi installer checksum mismatch. The installed version was kept.");
				}
				const staging = mkdtempSync(join(tmpdir(), "prime-agent-pi-update-"));
				const cleanup = () => rmSync(staging, { recursive: true, force: true });
				const script = join(staging, installer.file);
				try {
					writeFileSync(script, bytes, { mode: 0o600, flag: "wx" });
					return {
						command: "/usr/bin/env",
						args: [
							...environment,
							`PRIME_AGENT_PI_TAG=${tag}`,
							`PRIME_AGENT_EXPECTED_SHA256=${artifact.sha256}`,
							"sh",
							script,
							version,
						],
						cleanup,
					};
				} catch (error) {
					cleanup();
					throw error;
				}
			},
		},
	};
}
