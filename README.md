<h1 align="center">Prime Agent Pi</h1>

<h3 align="center">
The TypeScript/pi RLM harness
</h3>

<p align="center">
  <a href="packages/coding-agent/docs/index.md">Documentation</a> &bull;
  <a href="https://github.com/PrimeIntellect-ai/prime-agent">Upstream</a> &bull;
  <a href="https://github.com/SailorJoe6/prime-agent-upstream">Upstream fork mirror</a>
</p>

<p align="center">
  <a href="https://github.com/SailorJoe6/prime-agent-pi/actions/workflows/ci.yml">
    <img src="https://github.com/SailorJoe6/prime-agent-pi/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <a href="https://github.com/SailorJoe6/prime-agent-pi/actions/workflows/build-binaries.yml">
    <img src="https://github.com/SailorJoe6/prime-agent-pi/actions/workflows/build-binaries.yml/badge.svg" alt="Build Binaries" />
  </a>
  <a href="https://arxiv.org/abs/2608.23552">
    <img src="https://img.shields.io/badge/arXiv-2608.23552-b31b1b.svg" alt="arXiv" />
  </a>
</p>

> [!IMPORTANT]
> **Prime Agent Pi** is an independent continuation of the TypeScript/pi-based Prime Agent. It preserves the full Git history through upstream v0.9.8 (`7d442aafa985f9342134fac16c2ef41f03fb45c1`) and starts from the validated TypeScript downstream commit `a1faacd53ac4473a75de1d434afaf50945c2f647`. Upstream moved to a Rust implementation in v0.10. Rust tracking and downstream provenance remain separate in [`SailorJoe6/prime-agent-upstream`](https://github.com/SailorJoe6/prime-agent-upstream).

Prime Agent is an open-source coding and research agent for general and long-running work. It is designed around two core abstractions:

- The **[Recursive Language Model (RLM)](https://www.primeintellect.ai/blog/rlm)** treats context as variables (*prompt-as-a-variable*) and tools like recursive subagents as function calls (*programmatic tool /sub-agent calling*) inside a persistent REPL.
- The **[Continual Harness](https://arxiv.org/abs/2605.09998)** stores supplemental prompts, memories, skill descriptions, and reusable subagent specifications as durable state that Prime Agent can refine through small, evidence-backed updates, local to the session by default.

## Install

Prime Agent Pi does not yet publish a standalone installer. The Prime Intellect installer installs the upstream Rust product and is not an installer for this repository.

Run the TypeScript product from source:

```bash
git clone https://github.com/SailorJoe6/prime-agent-pi.git
cd prime-agent-pi
npm ci
./prime-agent.sh
```

## Why Prime Agent

Prime Agent combines a persistent Python control environment with durable harness state, so useful working context and reusable operating patterns can outlive a single chat window.

- **Everything is programmatic:** a persistent Python REPL is the built-in model tool; file operations, shell commands, tool use, subagents, and context management happen through code.
- **Subagents are built in:** `rlm.spawn(...)` spawns real child agents for parallel or background work and returns their results programmatically.
- **The harness can improve:** `/refine` reviews the current trajectory and can apply small, evidence-backed updates to supplemental harness state. It never rewrites the immutable base system prompt, and recorded snapshots support rollback.
- **Skills are executable:** skills are importable Python packages, and the built-in skill creator can turn recurring workflows into project or personal skills.
- **Sessions run in the background:** daemon-backed agents keep running when the terminal disconnects and can be reattached later.
- **Agents communicate directly:** running agents can exchange messages and orchestrate one another without routing everything through the user.
- **Long tasks keep moving:** automatic compaction, persistent goals, heartbeats, schedules, autonomous mode, and retained subagents preserve progress across turns and terminal sessions.

## Getting Started

Start Prime Agent from the repository or directory you want it to work in:

```bash
cd /path/to/project
prime-agent
```

On first launch, run `/login` to choose a subscription or API-key provider. Prime Agent works in the current directory and can run commands and modify files there. Use a disposable clone, clean worktree, or another checkpoint you can inspect and restore.

> [!WARNING]
> Prime Agent executes model-generated Python and project commands with your user permissions. Its worker and kernel processes improve lifecycle isolation and recovery; they are **not** a security sandbox. Review changes and use trusted repositories, instructions, skills, and extensions only. Run untrusted code or instructions in an external sandbox or restricted environment.

Useful commands:

```bash
prime-agent agents                   # Browse running, idle, and saved sessions
prime-agent attach <agent>           # Reattach to a running session
prime-agent --resume [path|id]       # Browse sessions or resume one directly
prime-agent status                   # Inspect background service state
prime-agent doctor [--fix]           # Inspect or repair background services
prime-agent update [--force]         # Update Prime Agent
prime-agent shutdown [--force]       # Stop every agent, worker, and background service
```

## Built for Long-Running Work
Prime Agent is built for long-running work, especially for evaluations in research. These features are available in the TUI, and when run autonomously.

- **Continual Harness:** `/refine` can persist focused, reviewable lessons as supplemental prompts, memories, reusable skill descriptions, or subagent specifications, with recorded refinement history. It does not replace packaging and reviewing new executable skills.
- **Direct agent-to-agent communication:** running agents and retained subagents can discover one another, exchange messages, and steer active work.
- **Daemon-backed continuity:** active sessions, Python REPL state, schedules, and subagents keep running when the terminal detaches and can be reattached later.
- **Heartbeats and schedules:** `/heartbeat`, `rlm_heartbeat`, and `prime-agent schedule` can re-enter a session periodically or at a specific time.
- **Persistent goals:** `/goal` keeps an objective and its progress active across turns until it is completed, paused, or cleared.
- **Bounded autonomous mode:** `/autonomous` continues within configured turn, token, and time budgets and can run user-defined quality gates. A passed gate checks only what that gate verifies; reaching a limit does not imply task success.

## Documentation

- [Quickstart](packages/coding-agent/docs/quickstart.md) — install, authenticate, and run a first session
- [Usage and CLI reference](packages/coding-agent/docs/usage.md) — commands, sessions, autonomous limits, and output modes
- [Long-running and background agents](packages/coding-agent/docs/long-running-agents.md) — detach and reattach, goals, heartbeats, and schedules
- [RLM programming model](packages/coding-agent/docs/rlm.md) — the persistent Python REPL, subagents, skills, and the trust model
- [JSON mode](packages/coding-agent/docs/json.md) and [RPC mode](packages/coding-agent/docs/rpc.md) — headless automation and integrations
- [Skills](packages/coding-agent/docs/skills.md) — install and create reusable capabilities
- [Provider setup](packages/coding-agent/docs/providers.md) — subscription and API-key providers
- [Architecture overview](packages/coding-agent/docs/architecture.md) — daemon, worker, kernel, and persistence boundaries
- [Development](packages/coding-agent/docs/development.md) — build and run from source

## Contributing

Use [this repository's issues](https://github.com/SailorJoe6/prime-agent-pi/issues) for Prime Agent Pi bugs and feature proposals. Use the [upstream repository](https://github.com/PrimeIntellect-ai/prime-agent) for the Rust product.

Read the [contribution guidelines](CONTRIBUTING.md) for the full process. Report security vulnerabilities privately by following the [security policy](SECURITY.md).

## Acknowledgements

Our agent and TUI is built on top of [`pi`](https://github.com/earendil-works/pi). We thank the authors of `pi` for their valuable work.

## License

Prime Agent is fully open source and released under the [MIT License](LICENSE).

## Citation

If you use this codebase in your research, please cite Prime Agent:

```bibtex
@article{karten2026prime,
  title={Prime Agent: A Self-Improving RLM Harness},
  author={Karten, Seth and Zhang, Alex L. and Thomas, Kevin and Müller, Sebastian and Bakouch, Elie and Auras, Daniel and Senghaas, Mika and Obeid, Fares and Dunas, Konstantin and Hagemann, Johannes and Jaghouar, Sami},
  journal={arXiv preprint arXiv:2608.23552},
  year={2026}
}
```

Available at [https://arxiv.org/abs/2608.23552](https://arxiv.org/abs/2608.23552).
