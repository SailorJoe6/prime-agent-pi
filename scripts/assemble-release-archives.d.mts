interface PiReleaseIdentity {
	publicVersion: string;
	packageVersion: string;
	channel: "stable" | "preview";
	previewSequence?: number;
	sourceSha: string;
	sourceDirty?: boolean;
	catalogSha: string;
}

interface AssembleBinaryArchivesOptions {
	binaryDir: string;
	artifactsDir: string;
	version: string;
	requireAll?: boolean;
	platform?: string;
	piRelease?: PiReleaseIdentity;
}

interface BinaryArchive extends Partial<PiReleaseIdentity> {
	platform: string;
	file: string;
	sha256: string;
	executableSha256: string;
}

export function assembleBinaryArchives(options: AssembleBinaryArchivesOptions): BinaryArchive[];
