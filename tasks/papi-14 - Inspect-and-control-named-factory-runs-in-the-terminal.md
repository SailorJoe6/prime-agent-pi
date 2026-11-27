---
id: PAPI-14
title: Inspect and control named factory runs in the terminal
status: In Progress
assignee: []
created_date: '2026-11-22T22:17:00Z'
updated_date: '2026-11-27T18:29:00Z'
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
  - packages/coding-agent/.changes/papi-14-factory-page.md
  - packages/coding-agent/package.json
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/kernel/repl-manager.ts
  - packages/coding-agent/src/core/kernel/shared.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/core/slash-commands.ts
  - packages/coding-agent/src/core/tools/ipython.ts
  - packages/coding-agent/src/modes/agent-connection/daemon-agent-connection.ts
  - >-
    packages/coding-agent/src/modes/agent-connection/in-process-agent-connection.ts
  - packages/coding-agent/src/modes/agent-connection/types.ts
  - packages/coding-agent/src/modes/daemon/daemon-mode.ts
  - packages/coding-agent/src/modes/daemon/daemon-protocol.ts
  - packages/coding-agent/src/modes/daemon/daemon-routed-client.ts
  - packages/coding-agent/src/modes/daemon/daemon-supervisor.ts
  - packages/coding-agent/src/modes/interactive/components/factory-page.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/test/agent-connection-daemon.test.ts
  - packages/coding-agent/test/daemon-client.test.ts
  - packages/coding-agent/test/daemon-mode.test.ts
  - packages/coding-agent/test/daemon-protocol.test.ts
  - packages/coding-agent/test/interactive-mode-command-usage.test.ts
  - packages/coding-agent/test/ipython-provisioner.test.ts
  - packages/coding-agent/test/settings-manager.test.ts
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
- [x] #1 The terminal factory page shows the selected live or paused run, its state and its diagram. A live run prevents disabling the factory.
- [x] #2 From the selected run’s available actions, stop acts only on that run and resume acts only on the selected paused run; other runs and ordinary session navigation are unaffected.
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

Slice 3 terminal review checkpoint: /factory renders the current session’s selected live/paused run, state, active nodes and transitions. Configurable picker keys control selection, diagram scrolling, action confirmation and dismissal. Refresh and dispatch check the captured run, and the owning Python loop revalidates exact stop/resume eligibility. No inspection provisions Python. The optional daemon transport uses schema 31 and capability negotiation with protocol 7 unchanged; it uses the attached session without worker startup or action replay. Ordinary session navigation is unchanged. /factory on/off/status, settings alignment and live-run disable refusal are explicitly remaining; no acceptance checks changed.

Validation: npm run check (including check:test-policy) and git diff --check passed. From packages/coding-agent, bounded Vitest runs via npx --no-install tsx ../../node_modules/vitest/dist/cli.js --run --no-file-parallelism: interactive-mode-command-usage, slash-commands and ipython-provisioner gave 67 default passes and, separately using --tagsFilter kernel-heavy, 1 real kernel pass. The six focused terminal cases passed shuffle seeds 14 and 310; deliberately sending the wrong run ID failed the exact-action test, and production was restored. Retained package-level uv sync: the isolated kernel CI job installs uv but does not otherwise create the runtime .venv used by the unconditional provisioner case. Daemon-protocol/client/routed-client and AgentConnection passed 186 tests; 8 focused transport cases passed, including older endpoints and attached session controls. The broader daemon-mode test for passive child completion failed with undefined on both candidate and clean host-read HEAD using the same dependencies. Python factory: 27 pass; focused REPL: 2 pass at seeds 14/310/763; full REPL: 117/119, with the two previously documented unchanged-base startup errors. No live model provider used for validation. This is a review checkpoint, not a merge candidate.

Settings slice: compared released v0.10.0 commands and factory lane at 763094e1b6a7c17450ee8399b06cda1853847ca5. Pi uses its existing agent settings.json, read by the owning Python kernel on use. No restart needed on the supported path and no daemon protocol change in this slice. Bare /factory is gated. Off checks the current attached session without starting a kernel; unsupported and unavailable reads cannot prove zero.

Acceptance evidence: interactive-mode-command-usage tests cover selected diagrams, remapped controls, stale actions, exact Stop/Resume, normal /tree navigation, and on/off/status including no write for running, paused, stopping or unreadable state, plus allowance after settlement and definite absence. Real-kernel ipython-provisioner regression uses two benign paused runs, verifies exact selected actions and that the other run remains active, confirms a truly empty read after settlement, and rechecks Python and host action gating without restart. Settings tests cover persistent existing-store behavior and unrelated setting retention.

Validation: from packages/coding-agent, bounded Vitest via npx --no-install tsx ../../node_modules/vitest/dist/cli.js --run --no-file-parallelism passed 137 default tests across interactive-mode-command-usage, slash-commands, ipython-provisioner and settings-manager. Separately, --tagsFilter kernel-heavy passed the real-kernel provisioner regression. Focused terminal, kernel and settings runs passed shuffle seeds 14/310/763. The command tests failed on the previous implementation; isolated negative controls for Python action gating and preservation of nested settings also failed as intended. npm run check (including test policy) and git diff --check passed. No live provider was used. Earlier broader daemon and two REPL failures reproduced on baseline as noted above; those suites were not rerun in the settings slice. Published for independent review, not activated or merged.

Targeted Astra revision: run(spec_id) emits native name:null. The host now accepts mixed named/unnamed snapshots; the terminal uses spec_id when the scrubbed name is absent or blank, as in released factory_view.rs. Display labels never route actions. The existing file-backed SettingsManager binds its global settings path against host cwd at creation and AgentSession passes that same directory to Python, not the session cwd. Default-off behavior, unknown-liveness refusal, action eligibility and navigation are unchanged.

Regression evidence: the mixed real-kernel snapshot was unavailable before the fix; now it shows both paused runs and independently resumes the named run and stops the unnamed one. Terminal red cases failed for null and blank labels; green tests verify shared visible labels cannot retarget a confirmation after reordering. The relative SDK agentDir test asserts distinct host/session path resolution and uses normal AgentSession provisioning (only interpreter selection is stubbed). Python stayed disabled after the host write on the old code and now observes off/on/off without restart.

Validation: 140 targeted default Vitest tests passed across ipython-provisioner, interactive-mode-command-usage, slash-commands and settings-manager; separate --tagsFilter kernel-heavy passed both offline real-kernel tests. Terminal and kernel shuffle seeds 14, 310 and 763 passed. npm run check (including test policy) and git diff --check passed. Previously documented broad baseline failures were not rerun or repaired. Published for targeted review, not merged or activated.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Pi supports the v0.10.0 session-local factory page, exact selected-run Stop and Resume, and /factory on/off/status. The terminal and Python use factory.enabled in existing global settings (off by default). Off does not write while a live run exists or its liveness cannot be confirmed; a settled or definitively absent kernel permits disabling. Later factory navigation and aggregation are outside this candidate. Unnamed runs use the spec ID as a label without changing action routing. Pi and Python share the same global settings file even when the SDK agentDir is relative.
<!-- SECTION:FINAL_SUMMARY:END -->
