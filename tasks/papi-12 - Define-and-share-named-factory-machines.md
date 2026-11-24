---
id: PAPI-12
title: Define and share named factory machines
status: In Progress
assignee: []
created_date: '2026-11-22T22:17:00Z'
updated_date: '2026-11-24T20:45:00Z'
labels: []
milestone: m-0
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-cli/src/factory_command.rs
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/prime-agent-runtime/test/test_factory.py
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/prime-agent-runtime/src/rlm/factory.py
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/.changes/feat-machine-library.md
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#factory-workflows-sessions-and-terminal-controls
  - docs/factory-definitions.md
modified_files:
  - prime-agent-runtime/src/rlm/factory_spec.py
  - prime-agent-runtime/test/test_factory_spec.py
  - docs/factory-definitions.md
  - prime-agent-runtime/src/rlm/harness.py
  - prime-agent-runtime/test/test_harness.py
  - packages/coding-agent/src/core/refinement/refinement.ts
  - packages/coding-agent/test/refinement.test.ts
  - prime-agent-runtime/src/rlm/machine_library.py
  - prime-agent-runtime/test/test_machine_library.py
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

Slice checkpoint: Python definition validation implemented and tested. Continue with step 2 after slice review; defer the changelog to the CLI slice in step 4.

Slice checkpoint: harness save/get/list implemented. Stored-first selection remains pending until the validated library reader is available. Continue with the MACHINE.md slice only after review.

Accepted slice 2 review finding at 72bd16368: save_factory publishes the candidate to its in-memory cache before the atomic write; when the write raises, a later unrelated harness save can persist the rejected candidate. The next execute pass must revise only this failure path. Preserve the original exception and the prior definition or absence in memory and on disk. Prove replacement and initial-save failures with benign formatting fixtures and a subsequent unrelated successful write. Publish the revision and stop for review before library or CLI work.

Storage revision checkpoint: the accepted atomic write failure finding is addressed and regression-tested. Stop for review; stored-first selection, library and CLI remain pending. Both task criteria remain unchecked.

Independent Astra review accepted the failed-save repair at d6a6bbfb without material defects. Next slice: implement only the inert Python MACHINE.md library and selector from steps 2–3, using the released file format and shared-before-personal resolution. Validate before import, preserve file bytes, use no-clobber export, and keep library export separate from stored-first Python selection. Prove round trips and rejected references with benign document-formatting fixtures; show that library-only selection creates no harness entry. Publish and stop for review before CLI work; no execution or product changes.

Python library checkpoint: inert MACHINE.md import, export, listing, and stored-first selection implemented and tested. Stop for review; command registry, CLI dispatch and CLI acceptance coverage remain. Both acceptance criteria remain unchecked.

Accepted Astra review findings on code c1fbb276: (1) Within each library level prefer a valid matching canonical path over another folder declaring the same name, consistently for list, selection and library export, while shared still wins over personal. Prove that an imported document-formatting update wins and exports its new bytes without changing the noncanonical draft. (2) Refuse imports when the canonical destination holds a valid definition declaring a different name; preserve its bytes and retain valid same-name replacement. Make only this bounded library revision, with benign formatting regressions. Publish task evidence and code independently, keep In Progress and both criteria unchecked, and stop for review before CLI work. No execution, merge, release or activation.

Python library revision checkpoint: both accepted Astra findings are repaired and regression-tested. Stop for review; CLI and execution were not changed. Both acceptance criteria remain unchecked.

Accepted Astra follow-up on code 1ee9b24078f126ebd57343226ecf3a3b60323f69: on a case-insensitive volume a valid format-Document/MACHINE.md declaring format-document is reachable through the lowercase canonical import path, but comparing literal directory spelling lets a-draft win after a successful import. Prefer the valid matching file actually reachable via <root>/<name>/MACHINE.md within each library, using real filesystem path semantics rather than unconditional case folding. Preserve shared precedence, different-name occupant protection, and invalid-canonical fallback. Add a portable benign formatting regression proving imported bytes win list/select/export and the draft is unchanged; demonstrate failure before repair on the affected volume. Publish exact code and task evidence and stop for review without CLI, execution, status changes, merge, release or activation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Slice 1: implemented only the inert v0.10.0 Python schema validation and DAG compiler in rlm.factory_spec. Formatting fixtures prove input preservation, one effective-predecessor join, bounded guard/loop/fan-out handling, and rejection of invalid explicit and DAG references. No prompt or guard execution, storage, library, CLI, or wire changes. Retained the released rules; use isdecimal for spawned-label suffix checks to avoid int() on nondecimal digit glyphs. Validation: cd prime-agent-runtime && uv run --locked python -m unittest discover -s test -p test_factory_spec.py -v (5 tests pass; temporary validation, join and mutation breaks gave 18 failures; restored and reran successfully). npm run check and npm run check:test-policy passed. Both ACs remain unchecked pending persistence, sharing and selection evidence. Next: add validated harness save/get/list through existing storage.

Slice 2: added validated HarnessState save_factory/get_factory/list_factories for session-local and explicitly global named definitions in the existing harness_state.json. Stores authored explicit machines and DAGs as opaque JSON strings in an optional field so TypeScript /refine preserves them without introducing prompt or refinement entries. No migration, execution, stored/library selector, library IO, or CLI. Document-formatting graph and DAG round-trip after reopen; invalid references neither create a file nor change prior bytes; existing entries and refinement events survive. Passed 57 harness, 5 factory validation, and 87 host refinement tests; temporarily broke validation, persistence, scope routing, and host preservation and observed the four focused regressions fail, then restored and reran all three suites. Commands: (cd prime-agent-runtime && uv run --locked python -m unittest discover -s test -p test_harness.py); (cd prime-agent-runtime && uv run --locked python -m unittest discover -s test -p test_factory_spec.py -v); (cd packages/coding-agent && npx tsx ../../node_modules/vitest/dist/cli.js --run test/refinement.test.ts); npm run check; npm run check:test-policy.

Accepted Astra storage finding at 72bd16368d79b80d0634795f7b0c8b4d993276f9 fixed: save_factory restores the previous cached value or removes a newly inserted name if save raises, then re-raises the original exception. Atomic writer and storage format unchanged. The benign formatting regression injects failure at os.replace and checks the same exception object, unchanged file bytes or absence, cached value or absence, and reopened value or absence after a successful unrelated create_memory. Before the fix all four cache/reopen subcases failed; after the fix they passed. Passed 58 harness (also shuffled at seeds 12, 42, 73), 5 factory spec and 87 host refinement tests, npm run check, and npm run check:test-policy. Commands: (cd prime-agent-runtime && uv run --locked python -m unittest discover -s test -p test_harness.py); (cd prime-agent-runtime && uv run --locked python -m unittest discover -s test -p test_factory_spec.py -v); (cd packages/coding-agent && npx tsx ../../node_modules/vitest/dist/cli.js --run test/refinement.test.ts). Focused reproduction: (cd prime-agent-runtime && uv run --locked python -m unittest discover -s test -p test_harness.py -v -k test_papi_12_failed_factory_write_cannot_leak_into_a_later_save).

Python MACHINE.md slice: formatting graph saved/reopened and exported from the harness, re-imported unchanged, then replaced with a hand-authored UTF-8 BOM/CRLF file that survived import and library export byte for byte. Invalid state and DAG references create no library or export and preserve existing personal bytes. Shared wins by declared name; broken specs are skipped in list and are distinguished from missing names in resolution. Stored definitions win selection but never intercept library export, and library-only selection leaves harness state absent. Existing export targets are refused by both writers. Validation: 6 library, 58 harness, 5 factory spec tests, npm run check, and npm run check:test-policy passed. Seven deliberate mutations (agent directory, byte preservation, reference validation, single-fence check, shared precedence, stored precedence, exclusive open) failed the library tests before restoration. Commands: (cd prime-agent-runtime && uv run --locked python -m unittest discover -s test -p test_machine_library.py -v); (cd prime-agent-runtime && uv run --locked python -m unittest discover -s test -p test_harness.py); (cd prime-agent-runtime && uv run --locked python -m unittest discover -s test -p test_factory_spec.py -v).

Python library revision of c1fbb276b7dbbc78ee5738232cc3a4b8791cbe76: both Astra regressions failed on the original implementation and passed after the fix. A same-name formatting import replaces the canonical copy, wins list and Python selection, and exports its new bytes without changing the noncanonical draft. Shared canonical wins inside shared; when invalid, the shared draft still wins over personal canonical. A valid different-name occupant blocks import and retains its original bytes. Validation: 8 library, 58 harness, 5 factory-spec tests, npm run check, npm run check:test-policy, and git diff --check passed. Reproduce: (cd prime-agent-runtime && uv run --locked python -m unittest discover -s test -p test_machine_library.py -v); (cd prime-agent-runtime && uv run --locked python -m unittest discover -s test -p test_harness.py); (cd prime-agent-runtime && uv run --locked python -m unittest discover -s test -p test_factory_spec.py -v).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Python validation, storage, and inert MACHINE.md selection and sharing are implemented, including canonical precedence within each library and protection against replacing valid definitions with a different declared name. Pending review and CLI work; machine execution is out of scope.
<!-- SECTION:FINAL_SUMMARY:END -->
