---
id: PAPI-13
title: Run and recover named machines from Python
status: In Progress
assignee: []
created_date: '2026-11-22T22:17:00Z'
updated_date: '2026-11-26T21:42:00Z'
labels: []
milestone: m-0
dependencies:
  - PAPI-12
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/prime-agent-runtime/src/rlm/factory.py#L1-L38
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/prime-agent-runtime/src/rlm/__init__.py
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#factory-workflows-sessions-and-terminal-controls
modified_files:
  - docs/factory-definitions.md
  - packages/coding-agent/.changes/papi-13-factory-preview.md
  - prime-agent-runtime/src/rlm/__init__.py
  - prime-agent-runtime/src/rlm/factory.py
  - prime-agent-runtime/test/test_factory.py
type: feature
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose the upstream v0.10.0 baseline for opt-in named factory runs from Python, using PAPI-12 machine definitions. Keep run state and child ownership scoped to the run. Preserve existing Pi interfaces and user state; do not promise recovery of a kernel-local handle after restart. Later recovery, loopback refinements and Python function states are tracked separately.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Factory help is available while execution is off. Starting while disabled refuses without starting children. Once enabled, a named graph passes declared outputs between agent states within its run bounds.
- [ ] #2 Two runs have distinct identities and children. Status and watch observe the selected run; stop and resume of a paused run affect only that run.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add the local Python `rlm.factory` run surface against released upstream `v0.10.0` (`763094e1b6a7c17450ee8399b06cda1853847ca5`): help while off, and opt-in `run`, `status`, `watch`, `stop`, and paused-run `resume` by run ID (with the graph snapshot used by watch). Use the existing settings location (`factory.enabled`, default off). Resolve named definitions with PAPI-12's existing harness-first/library fallback, reusing its validator and DAG compiler. Disabled, unknown, or invalid starts must not start children or mutate definitions. Keep definition-only commands unchanged.
2. Use a small Python run executor in the existing kernel lifecycle. Return a run ID without waiting for the graph to finish. Reuse ordinary scoped RLM child sessions and their completion/results. Bind each child by exact identity to its run; carry declared outputs to successors and apply the released graph's guard, join, fan-out, and run bounds. Keep run state local to its owning session/kernel. Observe only the selected run; stop affects only its active work; resume continues the selected paused run without replaying settled states. Use existing host lifecycle primitives where possible; add no second daemon, durable run store, or generic workflow engine. If a narrow host operation proves necessary, keep it scoped and follow Pi's compatibility rules. No later failed-entry/dead-worker recovery, loopback refinements, Python function states, or PAPI-14 terminal controls.
3. Document opt-in, a short benign named-run example, the public run controls, and the kernel-lifetime limit. Exercise the public Python path offline with controlled child completions: disabled/no-spawn and unchanged definition use; output passage and graph bounds; concurrent run identity and child ownership; watch wakeup/timeout and isolated stop/resume. Use the project's test environment and completion signals, no live providers or fixed sleeps. Run changed tests directly, repeat ordering-sensitive cases with shuffle seeds where supported, and run the required code and test-policy checks. Add the user-visible changelog fragment; no version or release work.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
First execution slice: expose offline Python factory authoring help and the opt-in static graph preview. Verify the released v0.10.0 nested literal-boolean settings behavior and static graph shape. Use PAPI-12 lookup and validation; do not launch children in this slice. Run execution and lifecycle controls remain open.

Slice published at code 83a98a79369a576492db249f3925e368c46f76cd: Python factory help works while off; opt-in saved-definition graph previews expose state order, joined edges, and run limits without spawning or editing. Comparison: released v0.10.0 (763094e1), factory.py factory_enabled and _spec_snapshot. Docs: docs/factory-definitions.md. npm run check passed; 7 focused factory tests passed via uv run --locked python -m unittest discover -s test -p "test_factory*.py"; opt-in and join mutations were detected. Broader Python run: 380 tests, one failure and one error in unchanged test_bash (test_windows_without_bash_raises_teaching_error and test_unconfigured_journal_stays_permissive); baseline not re-run. No acceptance criterion fully met: named execution, outputs, and run controls remain.

Next slice: exercise the public nonblocking named-run path offline with a bounded one-shot DAG, harness/library selection, declared text output handoff and distinct run/child identities. Add selected-run status for observation; broader graph semantics and watch/stop/resume remain open.

Named text DAG slice published at code 15f1f266bf1fb5412b7a1c9b22714f6779bd2777. Opt-in run validates PAPI-12 harness-first/library lookup before scheduling, returns a run ID without waiting for child completion, checks child and transition counts, passes declared text from the exact child answer preview to successors, and exposes per-run status and child IDs. Offline Python test drives overlapping harness and library runs through the public Python API with fake host responses, tests selection and isolation, and confirms unchanged definitions. npm run check and 9 factory tests passed; focused order seeds 13, 421 and 2026 passed; output-binding and child-limit mutations were detected. This is a serial, one-shot text DAG subset, not full released parity or acceptance closure. General graph execution and watch/stop/resume remain open. Before final candidacy compare the two previously reported test_bash results against exact code base de7304377282d55d045a2ca98b13040dbf75f076 under matching native conditions; no unrelated test fixes.

Next bounded slice: add selected-run watch and stop to the existing serial executor and verify exact child ownership offline, including stopping during child admission. Keep paused-run resume and the remaining graph/output work open.

Selected-run watch/stop slice published at code 491ea1619256c845054ab3a7c86055ac12c59527. Watch uses the same live graph as graph(run_id), waiting for selected-run change or a bounded timeout. Stop prevents new admissions and uses the existing exact-child deletion path, including a stop while child admission returns. Stop does not pause or enable resume. Offline Python tests covered overlapping runs, watch wakeup and timeout, repeated stop, and exact ownership during admission. All 12 factory tests and npm run check passed; order seeds 13, 421 and 2026 passed; three watch/stop mutations were detected. No live providers. Resume, broader graph/output parity, and exact-base Bash comparison remain open; neither acceptance criterion is closed.

Next bounded slice: adapt the released v0.10.0 max_transitions pause to the existing serial text DAG path. Resume only the selected paused run with settled outputs intact and keep stop terminal. Use deterministic two-run offline tests; other graph and output behavior and the Bash baseline comparison remain open.

Transition-limit pause/resume slice published at code 99dc5306e7b76b26a57c4c8a09e3002d272d29db. Adapted released v0.10.0 factory.py transition evaluation and resume (763094e1): the next transition beyond max_transitions pauses the selected serial DAG before child admission; resume continues the same worker past that limit, retaining settled output bindings. Stop on a paused run is terminal. Offline two-run coverage exercised watch/status pause, selected resume without state replay, stop while paused, and stop immediately after resume before child admission. All 13 focused factory tests and npm run check passed; order seeds 13/421/2026 passed and two pause/stop mutations were caught. No live providers. Broader released graph and full-result/multiple-port behavior plus exact-base Bash comparison remain open. No acceptance criteria closed.

Next bounded slice: use the existing exact-child collect path with opt-in settled answer text, preserving its default preview behavior, then bind released text/JSON and multiple declared outputs in the serial DAG. Exercise the host and Python paths offline; leave explicit graph behavior and the Bash baseline open.

Declared-output slice published at code 2c8303918272e12266fae886db77057defb82835. Adapted v0.10.0 (763094e1) declared text and named JSON capture: multiple ports bind from settled child text; JSON prefers the last fenced object containing the port and falls back to a whole-answer object. JSON null is distinct from a missing port. Pi requests the exact child’s settled final assistant text through the existing kernel collect route instead of a preview. Default collect is unchanged; answers over 256 KiB are unavailable, not truncated. Offline validation: npm run check, 14 Python factory tests, 9 TypeScript collect tests, shuffle seeds 13/421/2026 for both focused suites, and three caught preview/order mutations. Existing run isolation, pause and stop tests passed. No live providers or acceptance closure. Remaining bounded explicit-machine/graph behavior and exact-base Bash comparison stay open.

Next bounded slice: run one-shot explicit task machines serially in the existing executor. Compare v0.10.0 settled-output guard and join semantics; verify filtered branches, exact input handoff and a transition-limit pause at the join with deterministic offline fixtures. Bounded re-entry, parallel and item fan-out, and the exact-base Bash comparison remain open.

Guard/join slice published at code 9ca3e485144c8e592a0d45c667d388e5fd2bbb01. Compared released v0.10.0 (763094e1) guard evaluation and settled-transition scheduling. The existing Python executor now accepts one-shot explicit task machines: evaluates guards on settled text/JSON, waits for all join sources, admits each state at most once, and exposes recent fired transitions in graph/watch. A pause at a join resumes without replay; default collect and exact child ownership are unchanged. Offline: npm run check, 15 factory tests via uv run --locked python -m unittest discover -s test -p test_factory*.py, three shuffled FactoryTest runs (13/421/2026), and three detected mutations (partial join, bool/number equality, missing path passing ne). No live providers or acceptance closure. Bounded re-entry, parallel and foreach fan-out, and the exact-base Bash comparison remain open.

Next bounded slice: adapt released v0.10.0 serial task re-entry in the same executor. Count reserved entries per state, evaluate per-settle guards and join combinations, bind the latest settled outputs without stale fallback, and account for repeated child admissions. Verify with overlapping offline document-processing runs and pause/resume without replay. Leave parallel/foreach and the Bash baseline open.

Bounded serial re-entry slice published at code 3e18f054d6845d41311cabdbcf9dcadc01899e7f. Compared released v0.10.0 (763094e1) entry caps, settle-driven transitions and joins, latest settled input binding, and total child-admission pause/resume. Re-entries use fresh exact child identities; missing ports never fall back to earlier values. Offline document fixtures overlap two runs, prove per-state entry bounds and repeated join output selection, resume one run past transition and child limits without replay, and stop the other without cross-run effects. npm run check and git diff --check passed; 16 focused factory tests via uv run --locked python -m unittest discover -s test -p test_factory*.py, three shuffled FactoryTest runs (13/421/2026), and five caught mutations. Parallel and foreach fan-out and the exact-base Bash comparison remain open. No live providers or acceptance closure.

Next bounded slice: adapt v0.10.0 run.max_parallel for plain task entries in the same Python executor. Check independent admissions, settlement-driven output binding and joins, total-admission pause, and exact-child stop across overlapping offline document runs. Leave foreach item expansion and the exact-base Bash comparison open.

Parallel plain-task slice published at code b740bc1e67c11c5644c0a5dcb29b3ddb41b7d6c3. Compared released v0.10.0 (763094e1) task admission, max_parallel, exact-child settlement, total child limits, and fail-fast/stop cleanup. The same Python executor now honors the per-run concurrency bound while successors consume exact settled text/JSON, not previews. Offline document fixtures cover independent slots refilling out of order, no early join, the total-admission pause and selected resume without replay, exact multi-child stop and fail-fast cleanup, and no cross-run effects. npm run check, git diff --check, 17 focused factory tests via uv run --locked python -m unittest discover -s test -p test_factory*.py, and three shuffled FactoryTest runs (13/421/2026) passed; five deliberate faults were caught. Foreach item expansion and the exact-base Bash comparison remain open. No live providers or acceptance closure.

Next slice: adapt released foreach expansion and ordered answer aggregation in the existing runner, verifying bounded item and child admission, stop and run isolation with offline document fixtures. Compare the two Bash failures at the exact base and assess both acceptance criteria and remaining released gaps separately.

Bounded foreach published at code 3186cc4d40a2fea2d44f6b77d5812e8574e82d66. Adapted released v0.10.0 (763094e1) item expansion and aggregate answer capture: first max items, one child per item with per-run bounds, empty array settles without children, non-arrays fail, and exact settled answers are joined in item order before text/JSON binding. Offline chapter-index runs cover out-of-order completion with no early successor, per-child admission pause and selected resume without replay, exact multi-child stop with queued items not started, and cross-run isolation.

Checks passed: npm run check (including check:test-policy), git diff --check, 18 Python factory tests, 9 TypeScript collect tests, FactoryTest shuffles 13/421/2026, and four caught deliberate foreach faults. On native macOS arm64, CPython 3.11.11, matching inherited test conditions, `uv run --locked python -m unittest discover -s test -p test_bash.py -v -k windows_without_bash_raises_teaching_error -k unconfigured_journal_stays_permissive` reproduced both results on exact base de7304377282d55d045a2ca98b13040dbf75f076 and the Episode: expected RuntimeError absent for Windows shell discovery; orphan-journal enrollment RuntimeError in the permissive case. No Bash changes; no full-suite pass claimed.

Acceptance assessment: AC1 has direct offline evidence for ungated help, disabled no-spawn, and enabled named runs passing declared settled outputs under supported task, entry, transition, concurrency and item bounds. AC2 has direct offline evidence for distinct run/child IDs, selected status/watch, and scoped stop and paused resume. This supports both literal criteria on the implemented bounded task path, not full released parity. Material released differences remain: resident states, retries, run/state time budgets, continue and escalate (released default) failure behavior, and the released inline run_machine and richer graph/watch diagnostics. DAG preflight still rejects a node count above max_children rather than admitting to that bound and pausing. No terminal UI, later recovery, live providers, or lifecycle changes. Leave acceptance checkboxes unchanged pending owner review of the remaining baseline gaps.
<!-- SECTION:NOTES:END -->
