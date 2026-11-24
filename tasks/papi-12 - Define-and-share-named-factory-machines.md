---
id: PAPI-12
title: Define and share named factory machines
status: In Planning
assignee: []
created_date: '2026-11-22T22:17:00Z'
updated_date: '2026-11-24T14:38:00Z'
labels: []
milestone: m-0
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-cli/src/factory_command.rs
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/prime-agent-runtime/test/test_factory.py
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#factory-workflows-sessions-and-terminal-controls
type: feature
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make validated machine graphs available by name through the harness and library CLI. Preserve existing harness entries and Pi storage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Exporting and importing a document-formatting graph preserves its states and transitions; an invalid reference persists nothing.
- [ ] #2 A stored same-name specification wins. Selecting a library-only machine requires no new harness entry.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Implement inert Python definition validation for the released explicit machine graph and DAG-to-machine forms. Use v0.10.0 `763094e1b6a7c17450ee8399b06cda1853847ca5`, `prime-agent-runtime/src/rlm/factory.py` (`validate_factory_machine`, `compile_factory_dag`, `validate_factory_spec`) as the schema oracle, including declared state/node IDs and references, guards, joins, bounded loops and fan-out as data only. Preserve the authored spec for round trips; validate before any durable mutation. Never evaluate prompts/guards or launch sessions.
2. Add harness definition save/get/list or equivalent additive APIs through Pi’s existing HarnessState storage and scope conventions. Preserve existing kinds, public signatures and persisted state; no migration. Add a read-only name selector returning the stored definition first and otherwise the validated library definition without creating an entry. Released `test_factory.py::test_stored_entries_win_over_library_machines` checks that the stored graph wins; `.changes/feat-machine-library.md` says “without creating a harness entry.” Do not add the released run API in this task.
3. Implement shareable `MACHINE.md` with the released frontmatter, strict single `machine-spec` JSON block and declared names. Read shared and personal levels (shared first, honoring Pi agent-dir conventions and upstream `PRIME_AGENT_MACHINES_DIR`); select and list from the same validated definition set, distinguishing broken files from missing names. Preserve valid imported file bytes, validate before writing to the personal library and replace a valid same-name personal import without truncating the prior definition on validation failure. Separate CLI library export from stored-first harness selection; a Python definition export can serialize a stored graph for sharing. Use exclusive/no-clobber export. Released library note says “an invalid machine never persists” and “an existing export target is refused instead of silently overwritten”; released `test_export_dispatch_resolves_the_library_only` says “a stored factory entry never intercepts the CLI's export.” Use benign document-formatting fixtures; upstream bundled seeds and packaging are not part of this scoped task.
4. Add TypeScript command registry/help and dispatch for `prime-agent factory list | import <path> | export <name> --out <path>` with `--json` and actionable failures/nonzero exits. Follow released `crates/pa-cli/src/factory_command.rs`’s JSON dispatch boundary; reuse Pi’s kernel Python discovery and keep validation/filesystem logic in Python. Do not change daemon wire behavior, extension APIs, or current settings. Document the inert API/CLI and add the coding-agent changelog fragment; leave product policy and all other tasks unchanged.
5. Prove both ACs with a formatting graph: definition/store/reopen, stored export/import and library byte round trip, invalid state/DAG reference leaving no new state or changed prior bytes, shared/personal and stored/library collisions, library-only selection without mutation, broken vs missing diagnostics, and no-clobber CLI export. Cover CLI help/text/JSON/exit behavior through tests using temporary homes and native Python; no models, children or terminal run controls. Run each touched test file under its package environment, verify regressions fail when hooks are temporarily broken, and run `npm run check` and `npm run check:test-policy`. Record evidence and exact candidate for independent review; stop before merge, release or activation.
<!-- SECTION:PLAN:END -->
