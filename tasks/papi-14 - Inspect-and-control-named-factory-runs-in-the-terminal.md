---
id: PAPI-14
title: Inspect and control named factory runs in the terminal
status: In Progress
assignee: []
created_date: '2026-11-22T22:17:00Z'
updated_date: '2026-11-27T17:59:00Z'
labels: []
milestone: m-0
dependencies:
  - PAPI-13
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-tui/src/factory_view.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/modes/agents-view/agents-view-mode.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#factory-workflows-sessions-and-terminal-controls
  - docs/factory-definitions.md
modified_files:
  - docs/factory-definitions.md
  - docs/upstream-feature-inventory.md
  - packages/coding-agent/package.json
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/kernel/repl-manager.ts
  - packages/coding-agent/src/core/kernel/shared.ts
  - packages/coding-agent/src/core/tools/ipython.ts
  - packages/coding-agent/test/ipython-provisioner.test.ts
  - prime-agent-runtime/src/rlm/factory.py
  - prime-agent-runtime/src/rlm/repl.md
  - prime-agent-runtime/src/rlm/repl.py
  - prime-agent-runtime/test/test_repl.py
type: feature
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose the original v0.10.0 terminal page and selected-run actions, building on PAPI-13. Preserve configurable controls and normal Pi session navigation. Later state-session navigation, grouped cost, and spec/run counts are tracked separately.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The terminal factory page shows the selected live or paused run, its state and its diagram. A live run prevents disabling the factory.
- [ ] #2 From the selected run’s available actions, stop acts only on that run and resume acts only on the selected paused run; other runs and ordinary session navigation are unaffected.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Use released v0.10.0 (763094e1b6a7c17450ee8399b06cda1853847ca5), especially pa-tui factory_view.rs and session_ui/{commands,factory}.rs, as the behavior reference. Adapt to Pi's interactive mode. Reuse the PAPI-13 session kernel's in-memory runs and selected-run stop/resume logic. Start with a narrow typed read/control bridge to the owning kernel if needed; do not start a kernel just to inspect an empty session. Do not add a second executor, run store, or task-reconciliation machinery. If an optional daemon message is needed for the supported terminal path, use Pi's capability rules and degrade without disrupting older peers.
2. Wire the factory page into the terminal without changing normal session navigation. Show current live or paused runs, keep selection by run ID across updates, and show the selected run's state and live diagram (states/transitions and active states). Use configurable picker controls and matching hints: move selection, confirm to open/choose an action, cancel to close actions/page. Offer resume only for a paused run and stop only for a live run, using the released liveness rule (including paused/stopping or children still in flight). Revalidate actions when the run changes; never retarget a stale action to another run. Report rejected actions without changing another run or session.
3. Use the existing default-off factory.enabled setting for /factory on, off, and status. Keep page visibility and Python opt-in aligned with the effective setting and explain any client restart needed. Refuse to persist off while a live run would lose its controls or when its owning runtime cannot determine liveness; a known absent kernel is not a running one. Keep PAPI-12's definition CLI and PAPI-13's Python API unchanged. No state-session drill-in, grouped costs, or spec/run counts.
4. Validate offline with targeted terminal interaction tests and a supported-path real Pi kernel/host test with benign faux-provider runs. Exercise selected state and diagram, remapped keys, paused resume, exact stop with a second run unaffected, disable refusal then success once idle, and normal navigation after leaving the page. Run modified tests, relevant shuffle checks, npm run check and npm run check:test-policy per project rules; show a targeted regression fails when its behavior is broken. Document entry, controls, and settings behavior in factory-definitions.md; add the required changelog fragment and reflect verified scope in the parity inventory.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Slice 1: added the owning Python kernel’s capability-advertised, read-only factory_runs request. It reads compact diagrams from the existing in-memory runs on the event loop, including while a cell awaits; idle returns an empty array. Matched released v0.10.0 factory_view.rs liveness (running, paused, stopping or children still in flight). Real REPL subprocess regression verified an idle read and a named live run with its transition while a cell awaited a faux host response. Forcing the read to omit live runs made the regression fail; restored behavior passed shuffle seeds 14, 310 and 763. npm run check and npm run check:test-policy passed. No terminal wiring, controls, settings writes, acceptance checks or daemon wire changes in this slice.

Validation follow-up: test_factory.py passed 27 tests. test_repl.py ran 118 tests with two errors: test_import_rlm_defers_the_event_loop_stack and test_sigint_during_the_deferred_boot_stays_fatal. Both errors reproduced using git archive of the unchanged base ca4ae04af192571dcfd10a90b8c4e08b476b96d0 and the same interpreter (unittest discover -s test -p test_repl.py -k defer -v). The new regression passes; a green full REPL run requires the baseline deferred-import/startup failures to be fixed. This is a review checkpoint, not a merge-ready candidate.

Slice 2: added a capability-aware read through AgentSession, IpythonKernelProvisioner and ReplKernelManager. It uses the existing session kernel without starting Python or entering the cell queue. A successful empty read is distinct from an absent kernel, unsupported runtime, or unavailable read. No terminal UI, controls, settings or daemon changes.

Host validation: npm run check (including test policy) passed. From packages/coding-agent, Vitest 4.1.10 via npx --no-install tsx ../../node_modules/vitest/dist/cli.js --run --no-file-parallelism test/ipython-provisioner.test.ts passed 25 default tests and 1 real-kernel test with a separate --tagsFilter kernel-heavy invocation. Adding -t PAPI-14 --sequence.shuffle --sequence.seed=<seed> gave 4 default + 1 kernel-heavy pass for each of 14, 310 and 763. Deliberately misrouting the reply ID made the real-kernel regression fail; production routing was restored. The owner confirmed the combined filter hung in the tokenizer on a lone | and sent SIGTERM (exit 143, no test result). Earlier fork-worker exits remain unexplained and separate. The two unchanged-base REPL startup failures noted above were not addressed. This is a host-read review checkpoint; terminal display, selected-run controls and settings still remain.
<!-- SECTION:NOTES:END -->
