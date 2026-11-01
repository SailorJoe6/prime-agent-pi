# Downstream cwd-fix maintenance runbook

## 1. Preflight and mode boundary

Confirm `pwd` and Python `os.getcwd()` are `/Users/jlanders/code/prime-agent`. Read repository `AGENTS.md`, `CONTRIBUTING.md`, development/install docs, and current release workflow. Verify remotes exactly:

- TypeScript product: `origin = https://github.com/SailorJoe6/prime-agent-pi.git`
- Rust fork mirror: `mirror = https://github.com/SailorJoe6/prime-agent-upstream.git`
- Upstream reference: `upstream = https://github.com/PrimeIntellect-ai/prime-agent.git` with push URL `DISABLED`

Verify `.agents/skills/maintain-downstream-cwd-fix/` is ignored with `git check-ignore -v --no-index`.

### Daily Orca automated maintenance

The daily Orca automation has standing authority to complete the repository, publication, and local installation workflow. It must stop only before restarting or cutting over the resident Prime Agent processes.

Before the maintenance preflight, notify the exact Prime-Agent Expert saved session `01a0e47b-77dd-755e-9f2b-883d4053c4d3` that the run is starting. Use `agent_observe.list_agents()` to resolve that exact sibling session ID to its current session name, then call `agent_message.send`; never select by name alone because names may change or collide. Include automation ID `d9b583e8-bcaa-45de-a6a4-c0da1d527b14`, the automation session's saved and active session IDs, UTC start time, and cwd. A `delivered` or `queued` receipt is required. If exact-ID resolution or delivery fails, perform no maintenance and leave the Orca run as a visible notification blocker. The Expert session independently monitors the Orca run, handles trouble within the established authority boundaries, and reports the verified result to Joe in that session.

1. Acquire the single-flight lock before network access with `scripts/run-lock.py acquire --runner orca-daily`. Retain the returned token only for cleanup. If the lock exists or its ownership is unreadable, the helper appends a blocked audit record; stop and leave it for human review.
2. Require `git status --porcelain --untracked-files=no` to be empty. Full porcelain status must also be empty except for exact `?? main-2/`, and that exception is valid only when `orca worktree show --worktree path:/Users/jlanders/code/prime-agent/main-2 --json` confirms the same registered path. Unknown untracked state blocks the run.
3. The Orca-launched Prime Agent provider is authorized. Do not invoke an additional `prime-agent`, `prime-agent-upstream`, `prime-agent.sh`, Prime Node entrypoint, default daemon, or internal restart/update coordinator from inside the turn. Never signal, stop, restart, replace, or cut over a resident Prime process. Inspect identity passively and fail closed on an upstream, stale, or ambiguous process.
4. Project validation is authorized. Use the repository's documented focused test commands and faux providers. Sanitize inherited `PRIME_AGENT_INTERNAL_*`, `PRIME_AGENT_KERNEL_OWNER_PID`, and `RLM_DEPTH` for process tests. Use unique temporary state and clean every owned process/artifact. Never use a real provider API, paid token, default daemon socket, or side-by-side live Prime Agent instance.
5. Fetch and classify upstream main/latest stable as evidence only. If an applicable TypeScript defect is proven, transplant the smallest TypeScript fix, validate it, prove the negative control, and publish only to `origin`. Never mirror Rust `upstream/main` into the TypeScript product and never mutate `mirror` from this workflow.
6. After publication, stage the immutable exact-tag source and dependencies locally, atomically update the guarded transparent shim, and verify Git identity, dependency lock, shim syntax/hash, rollback, and non-starting metadata. Do not start or recover the new daemon to prove activation.
7. Record the installation as `installed` with `pendingRestart: true`. The final Orca report must prominently name the installed tag and tell Joe that he must restart Prime Agent before the version bump becomes active. Never label the new version `live/verified` before that restart and post-restart checks.
8. In finally-equivalent cleanup, restore the prior GitHub account, append the run outcome, and release the lock with the exact owner token. A failed cleanup or leftover lock is a blocker; never clear it blindly.

**Scheduler activation gate:** Do not use Codex for this automation. Orca 1.4.215 can mark a fresh Codex automation `completed` from its startup `done` state before the dispatched turn starts; that defect applies to fresh Codex launches, not Prime Agent. Prime Agent is Joe's required default Orca harness. Its manual and scheduled lifecycle/precheck checks passed for automation `d9b583e8-bcaa-45de-a6a4-c0da1d527b14` before activation.

### Operator-only restart and cutover

The automation may install but must never restart or cut over Prime Agent. After an installation, Joe exits resident clients and restarts through the normal `prime-agent` command. Only then may build ID, executable path, session recovery, cwd behavior, schedules, and rollback be verified and `pendingRestart` cleared. If process identity is uncertain, report it; never resolve uncertainty by starting another instance.

## 2. Account isolation

Read and save the active account without printing tokens. Switch with:

```sh
gh auth switch --hostname github.com --user SailorJoe6
test "$(gh api user --jq .login)" = SailorJoe6
```

Run only the bounded GitHub operations. Always restore the saved account and verify it before returning, including on failure. Never push to `upstream`.

## 3. Resolve upstream state

Fetch only explicit upstream refs. Stable candidates must match plain semantic tags `vX.Y.Z`; sort numerically, not lexically. Record tag name, peeled commit, and whether it is signed/annotated where available. Verify `origin/main` remains on the TypeScript product line. Compare Rust `upstream/main` for evidence only; never merge or mirror it into `origin/main`.

Inspect implementation and test coverage on both `upstream/main` and the latest stable tag. Run the authorized behavior tests in isolated, self-contained project harnesses without using the default daemon or real provider APIs:

- `DurableAgentSessionRuntimeConfig` must not persist `cwd`.
- A saved `sessionPath` with no caller cwd must send no worker-facing cwd override while the effective cwd can still launch the process.
- Explicit incoming cwd must still override the session header.
- Legacy supervisor cwd must be sanitized on read/write.
- Normal Agents View reopen and daemon recovery tests must prove the saved header cwd wins.

Classify independently:

- `main`: missing / equivalent fix merged.
- `stable`: missing / equivalent fix shipped.

Do not stop downstream releases merely because `main` is fixed.

## 4. Prepare a downstream revision

If stable lacks the fix:

1. Require a clean tree and create a local rollback ref.
2. Transplant the single minimal fix commit onto the exact stable tag. Inspect the full diff and require only generic coding-agent core, tests, and changelog files.
3. Follow repository policy. Run every modified test file directly. For subprocess/order coverage run the focused process suite with at least three distinct shuffle seeds. Run `npm run check:test-policy` and `npm run check` from the repository root.
4. In an isolated temporary worktree, restore only the changed production behavior to the stable baseline while retaining the regression test. The regression must fail for the supervisor cwd versus saved-project assertion. Remove only that owned temporary worktree afterward.
5. Recheck clean state and commit identity.

Determine the next immutable tag by listing local and `origin` tags matching `cwd-fix-vX.Y.Z-rN`. Never reuse, move, or delete a tag. Verify the exact current remote branch head immediately before:

```sh
git push origin   --force-with-lease=refs/heads/fix/daemon-cwd-session-recovery:<expected-old>   refs/heads/fix/daemon-cwd-session-recovery:refs/heads/fix/daemon-cwd-session-recovery
git push origin refs/tags/cwd-fix-vX.Y.Z-rN
```

Create one GitHub release for the immutable tag explicitly with `--repo SailorJoe6/prime-agent-pi`. Notes must name the upstream stable base, exact patch commit, validation, supported source launcher, and rollback. Verify remote branch SHA, peeled tag SHA, and release URL. On any uncertain push/release response, inspect `origin`; never blindly retry. The Rust mirror and its releases are out of scope.

## 5. Discussion tracking

Read Discussion #2454, its comments, cross-references, and #1124. Record new maintainer comments, Issue conversion/promotion, an implementation request, or upstream code/release evidence. The automation is read-only for public collaboration and never posts. A public comment is allowed only when explicitly requested. Do not open an Issue or PR. If invited, report the invitation and wait for Joe's approval.

## 6. Local exact-source installation and operator restart

The supported installation route is absolute `prime-agent.sh` after `npm ci`. Stage an independent local clone locked to the immutable downstream tag and verify its Git identity, dependency lock, launcher path, and clean state without invoking the launcher beyond non-starting metadata such as `--version`. This installation is authorized in the daily run; it does not activate the version in resident processes.

**Never start a second local Prime Agent instance or daemon, even with isolated config and a unique socket.** Joe's machine has a known failure mode where another instance can corrupt local daemon configuration or leave orphaned daemon processes. Do not run a side-by-side live probe. Do not use a plain default-socket source launch: it can reuse a same-version installed daemon and is not proof of activation.

There is no documented public atomic hot-cutover for an arbitrary source commit. Do not use internal update coordinators without explicit operator approval. Joe's transparent command is a guarded user-level shim at `~/.bun/bin/prime-agent`, ahead of `/opt/homebrew/bin` in PATH. It must verify the exact staged commit and clean tree, query daemon identity through the preserved native binary, allow only no daemon or the expected downstream build, and otherwise refuse with a loud error that identifies the actual active build and executable, explains that it may be an earlier downstream fork or upstream build, and prints the exact safe shutdown and fork-resume commands. Before invoking the source launcher, it must export `TSX_TSCONFIG_PATH="$SOURCE/tsconfig.json"`; otherwise `tsx` resolves workspace packages through missing `dist/` files when the caller is outside the Prime Agent repository. Do not `cd` into the source tree because the launched session must inherit the caller's cwd. Verify `prime-agent agents` succeeds with `TSX_TSCONFIG_PATH` removed from the caller environment from `$HOME`, `/Users/jlanders/code/orca`, and `/Users/jlanders/code/prime-claw`. `~/.bun/bin/prime-agent-upstream` preserves rollback. During automated installation, verify both paths statically and update the shim atomically when a new immutable downstream tag is published. Do not invoke either path in a way that starts or recovers a client or daemon while the resident build is active.

After automated installation, atomically record the installed tag/commit/shim and `pendingRestart: true`. The final Orca report must begin with a clear restart-required notice naming the installed version and explaining that resident clients still run the prior build. Also update the Orca worktree comment with the installed tag and `restart required` so the notification remains visible. Do not clear that notice or claim activation until Joe restarts and post-restart checks pass.

For a default-daemon cutover, inventory/checkpoint the current daemon, workers, session files, schedules, launcher, rollback path, and every resident Prime Agent client executable, then stop for human action. All pre-cutover native clients must exit before the downstream daemon starts. A stale client retains its original `process.execPath`; if the daemon disconnects, its recovery callback can win the singleton lock and restart the upstream binary even though PATH resolves to the shim. After Joe restarts/resumes this owner session with the normal `prime-agent` command, verify build ID, executable path, daemon/worker/client identity, session roster/files, cwd recovery, prompts/context/skills, kernel cwd, schedules, and rollback before claiming the fix live. If any identity is ambiguous, stop the downstream daemon before using `prime-agent-upstream`; never run both.

## 7. Durable state and reporting

Maintain:

- `state/current.json`: last observed upstream main/stable SHAs, equivalence classification, branch/tag/release, Discussion state digest, staged install identity, schedule ID, and last meaningful report.
- `state/audit.jsonl`: one compact timestamped record per run with gates and outcomes. Never include tokens, private prompts, private paths outside the repository, session IDs, or transcript content.

Write state atomically (`.tmp` then rename), with owner-only permissions. Compare current observations to `current.json`. Report only meaningful changes: new stable, upstream fix state change, Discussion movement, new downstream revision, validation failure, installation, pending restart, live verification, or schedule drift. Still append a no-change audit event. An installation report is never suppressible: always notify Joe that restart is required, even if no other state changed.
