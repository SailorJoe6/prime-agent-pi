import { BUILTIN_MCP_CATALOG } from "@earendil-works/pi-ai/mcp";
import type { McpServerConfig } from "../settings-manager.js";

const GENERIC_SERVER_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export function isEnabledGenericMcpServer(name: string, config: McpServerConfig): boolean {
	return GENERIC_SERVER_NAME_PATTERN.test(name) && config.enabled !== false;
}

/** Settings-only subset: no catalog cache, credentials, or transport startup. */
export function getLocalGenericMcpServers(servers: Record<string, McpServerConfig> | undefined): string[] {
	return Object.entries(servers ?? {})
		.filter(
			([name, config]) =>
				config?.type === "stdio" &&
				isEnabledGenericMcpServer(name, config) &&
				typeof config.command === "string" &&
				config.command.trim() !== "" &&
				!config.command.includes("\0") &&
				!BUILTIN_MCP_CATALOG.some((entry) => entry.server === name),
		)
		.map(([name]) => name);
}
