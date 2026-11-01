---
name: maintain-downstream-cwd-fix
description: Maintains Joe Landers' stable-tag downstream Prime Agent cwd-recovery patch, immutable fork releases, Discussion #2454 tracking, and reversible local source staging. Use for the daily downstream cwd-fix maintenance run or when checking whether upstream main or a stable v* release contains the fix.
compatibility: Requires git, gh, Node.js >=22.8, npm, and /Users/jlanders/code/prime-agent.
---

# Maintain downstream cwd fix

Operate only in `/Users/jlanders/code/prime-agent`. Read [references/runbook.md](references/runbook.md) before acting. State is local under `state/` and must never be staged.

## Operating modes

- **Automated maintenance:** The TypeScript maintenance workflow may inspect upstream, port an applicable fix, run the full validation contract, and publish reviewed TypeScript branches, tags, and releases to the independent product `origin`. It must never mirror Rust `upstream/main` into the product. The prior TypeScript automation remains disabled unless Joe separately enables or replaces it.
- **Operator restart and live verification:** Installation does not activate a new build in the resident daemon or clients. The automation must never stop, restart, recover, replace, or cut over a Prime Agent process. After every local installation it must explicitly notify Joe that a restart is required, record `pendingRestart`, and keep installed/staged versus live/verified state separate until Joe restarts and the new build is verified.

## Contract

1. Fail closed on dirty tracked state, conflicts, unknown untracked files, ambiguous refs, failed checks, missing permissions, account mismatch, unsafe process state, or uncertain remote mutation. The exact `main-2/` untracked path is allowed only while Orca confirms it is the registered workspace `/Users/jlanders/code/prime-agent/main-2`; any other untracked path blocks the run.
2. Use `SailorJoe6` for every GitHub operation. Never use `JLandersZen` for this repository. Record the prior active `gh` account, switch explicitly, verify `gh api user --jq .login`, and restore the prior account in a `finally`-equivalent cleanup.
3. Fetch upstream `main` and tags. Select only the highest immutable tag matching `^v[0-9]+\.[0-9]+\.[0-9]+$`; exclude beta and all prereleases.
4. Keep product `origin/main` on the TypeScript/pi line. Never mirror Rust `upstream/main` into `origin/main`. Treat upstream Rust commits only as evidence and implementation ideas; never push to `upstream` or the Rust fork remote `mirror` from this TypeScript workflow.
5. Detect equivalence with code and behavior evidence. Commit messages are not evidence. Check durable cwd persistence, path-only saved-session reopen, explicit override, recovery, and focused tests on both upstream `main` and latest stable.
6. A fix on upstream `main` is not shipped. Continue stable-tag patching until the highest stable tag contains equivalent behavior.
7. If latest stable lacks the fix, transplant the minimal patch, validate every changed test file, run process coverage with multiple shuffle seeds, run `npm run check:test-policy`, run `npm run check`, and prove the regression fails without the production fix in an isolated temporary worktree. Never use a real provider API, paid token, second default daemon, or live-daemon cutover as validation.
8. Before updating a TypeScript product branch on `origin`, verify its exact remote old head. Use `--force-with-lease=<ref>:<expected-old>` only after all gates pass. Never move or delete a published tag, and never publish TypeScript refs to `mirror`.
9. Publish TypeScript tags and immutable GitHub releases explicitly in `SailorJoe6/prime-agent-pi`, with validation, installation, restart, and rollback notes. Preserve the migrated `cwd-fix-v0.9.6-r1` through `cwd-fix-v0.9.8-r1` tags. Publish nothing after any conflict, test failure, or uncertain result.
10. Check Discussion #2454 and linked/cross-referenced items for maintainer direction, Issue promotion, implementation invitation, or an upstream fix. Never post a public comment or open an Issue or PR without explicit maintainer invitation and Joe's approval.
11. After publishing, stage exact source files and dependencies locally and atomically update the guarded transparent shim to the new immutable downstream tag. Preserve the prior rollback command. Never launch a second local Prime Agent instance or daemon, even with isolated state or a unique socket. Do not signal or restart the resident daemon or clients. Installation is complete when files, dependencies, Git identity, shim syntax/hash, and rollback are verified; activation waits for Joe's restart.
12. Every run must use `scripts/run-lock.py` to acquire the atomic ignored `state/orca-run.lock` before network access or mutation and release it only with the returned owner token after cleanup. Contention or unreadable/leftover ownership blocks the run for human review; never clear it automatically.
13. After every local installation, always inform Joe in the final Orca report that a Prime Agent restart is required. Name the installed downstream tag, state that the resident process still runs the previous build, provide the normal restart/resume instruction, record `pendingRestart: true`, and do not claim `live/verified` until post-restart verification passes.
14. Report only meaningful changes, but append an owner-only audit record for every run. Report `observed`, `published`, `installed`, `pendingRestart`, and `live/verified` as distinct states. Never silently remove the schedule, state, releases, branches, tags, installations, rollback, or locks.
15. At the start of every Orca run, before the lock, network access, or repository mutation, notify the exact Prime-Agent Expert saved session ID `01a0e47b-77dd-755e-9f2b-883d4053c4d3` through `agent_message`. Resolve that ID in `agent_observe.list_agents()` and send only to the matched sibling session name; never select a namesake. Include automation ID `d9b583e8-bcaa-45de-a6a4-c0da1d527b14`, the run session's saved session ID, active session ID, start time, and cwd. Require a `delivered` or `queued` receipt. If the exact target cannot be resolved or delivery is rejected, perform no maintenance and report the notification failure in the Orca run.
