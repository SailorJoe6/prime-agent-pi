---
id: PAPI-13
title: Run and recover named machines from Python
status: In Progress
assignee: []
created_date: '2026-11-22T22:17:00Z'
updated_date: '2026-11-26T21:02:00Z'
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
<!-- SECTION:NOTES:END -->
