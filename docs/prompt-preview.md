# Preview a fresh-root prompt offline

```sh
prime-agent prompt
prime-agent prompt --cwd ./project --model openai/gpt-5 --json
```

Without `--cwd`, the command reads resources for the invocation directory. With it, relative paths resolve from that directory and the CLI does not change its process working directory. The preview uses Pi’s local instruction files, model-visible skill listings, custom and appended system prompts, and default Python REPL guidance. Previously installed package skills can contribute; missing packages are not installed. If settings override the npm executable, the preview skips globally installed npm packages rather than running that configured command.

Both formats include the assembled `instructions` in prompt order. The `static` and `dynamic` groups are for inspection: static shows base and configured guidance, while dynamic includes working-directory context, project instructions, and the skill listing. These groups are not cache boundaries. JSON also includes the absolute `cwd` and the model selector (an explicit `--model`, the local default if both provider and model are set, or `null`). Pi does not select its base prompt by model, so the selector is reported without resolving it with a provider.

The preview includes generic MCP guidance for enabled stdio entries with a valid server name and command in global settings, excluding names reserved by built-in services. It does not check whether commands can run, read remote catalog data, or include HTTP, account, or session-scoped connections. It does not start servers, refresh the catalog, or perform a handshake.

With `compaction.agentCallable: false`, the preview leaves out the bundled `compact` skill and its Python module guidance. It does not start a session or worker, call a provider, or execute extensions. Live extension hooks, other runtime controller filtering, and session-time changes are outside the preview.
