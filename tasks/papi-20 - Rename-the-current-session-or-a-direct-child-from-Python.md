---
id: PAPI-20
title: Rename the current session or a direct child from Python
status: In Progress
assignee: []
created_date: '2026-11-22T22:18:00Z'
updated_date: '2026-11-25T20:58:00Z'
labels: []
milestone: m-0
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/022c90b9f2d79543447aac05c839462b0d64acbd
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/prime-agent-runtime/src/rlm/__init__.py
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/022c90b9f2d79543447aac05c839462b0d64acbd/crates/pa-tui/src/agents_view/rename.rs#L44-L75
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/modes/agents-view/agents-view-mode.ts#L1868-L1888
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/5d7098c5518b3237be05ef42207190505501b3b8/docs/upstream-feature-inventory.md#commands-installation-and-terminal-controls
modified_files:
  - packages/coding-agent/src/modes/agents-view/agents-view-mode.ts
  - packages/coding-agent/test/agents-view-mode.test.ts
  - docs/upstream-feature-inventory.md
  - packages/coding-agent/.changes/papi-20-session-rename.md
type: feature
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.0 Python self/direct-child rename, runtime + daemon session registry. CLI rename exists, not this API. Preserve existing Python callers, session IDs and legacy records; negotiate optional daemon features. The same v0.10.0 change also lets a user rename a selected child directly in the roster. Keep existing root rename and configured controls; do not require a Python call for this action.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Self rename persists across reopen.
- [ ] #2 Rename direct child by handle/ID updates roster with same identity.
- [ ] #3 Unrelated target or sibling-name collision changes neither.
- [ ] #4 From the roster, rename the selected live or saved child. Its name persists under the same identity; its sibling and the existing root rename action are unaffected.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Use released upstream v0.10.0 (763094e1b6a7c17450ee8399b06cda1853847ca5, including 022c90b9f2d79543447aac05c839462b0d64acbd) as the behavior reference, not the Rust implementation.

1. Add async `rlm.rename(new_name, *, session_id=None) -> str` to the Python module and REPL object. Omitted target means self; accept an existing spawn handle, subagent row, or exact session ID for a direct child, not a display name. Reuse existing selector conventions without changing other callers. In the host, resolve against the calling session's existing child registry, apply spawn naming rules and sibling uniqueness, and reject out-of-scope targets or collisions before changing either session. Persist through the existing session-name path and keep live registry/roster metadata consistent. Preserve routing and durable IDs, paths, child handles and legacy records. Use the existing transcript notice path where applicable for upstream behavior.
2. Extend the existing configurable roster rename action to a selected renameable child. Reuse its live active-ID and saved-file paths and refresh flow; update only the selected session and keep the root action unchanged. Do not route user actions through Python. If an existing daemon path cannot carry the scoped operation, add only the needed optional capability with the project's schema/maps and mixed-version checks. An older daemon should still start, attach and use existing supported actions.
3. Add focused offline coverage for Python self rename and reopen, direct-child handle/ID selection and roster update, rejection of unrelated targets and sibling collisions without mutation, and selected live/saved child rename with unchanged sibling, root behavior and identity. Use existing fixtures and regression suites. Run the affected Python and TypeScript tests, required checks, and project test-policy verification. Document Python use and add the user-facing changelog fragment.

Reuse the existing persistence, registry and roster controls. No new name store, migration, parallel roster, or generalized reconciliation, plan iteration, or task-decision machinery.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation paused: the isolated Orca Episode started on Anthropic while the owning session was on OpenAI Codex. The owner stopped the exact Episode; its saved session and worktree remain, and code stayed at the starting commit. Unblock by verifying a supported same-Episode continuation on OpenAI Codex without replaying the initial assignment or creating replacement resources.

Initial Episode retired without code changes. Replacement authorized. Prime Claw launched Prime Agent, which used the last-selected model. If the replacement starts on the wrong model, pause it in place for the operator to switch.

Execute checkpoint: implement the roster action (AC #4) first as an independent slice. Released v0.10.0 tag 763094e1b6a7c17450ee8399b06cda1853847ca5 contains 022c90b9f2d79543447aac05c839462b0d64acbd; its roster action accepts agent and subagent rows with live or saved routing. Reuse the existing Pi rename and rename_saved_session commands; no wire change planned. Python rename remains a separate slice.

Roster slice candidate 5d7098c5518b3237be05ef42207190505501b3b8. Validation: from packages/coding-agent, run ../../node_modules/.bin/tsx ../../node_modules/vitest/dist/cli.js --run test/agents-view-mode.test.ts test/daemon-agent-roster.test.ts test/daemon-supervisor-lazy-subagents.test.ts. Agents view 52/52 and supervisor 18/18 passed. Roster 27/28 passed; the unrelated model-change test (missing getModelAdmissionPolicy on the fixture) also failed with the production gate restored to the base version. The two new child dispatch cases failed before the fix while root passed. npm run check passed, including test policy. Tests prove selected-target dispatch and reuse existing daemon paths, not a full child reopen UAT; leave AC #4 unchecked for review of persistence evidence.

Owner accepted the independently reviewed roster slice at 5d7098c5518b3237be05ef42207190505501b3b8. Advance within the published plan to Python self/direct-child rename with exact identity, no mutation on sibling collisions or unrelated targets, and v0.9.8 compatibility. For AC #4, add focused offline reopen evidence that the renamed child retains its identity and name and that sibling/root are unchanged. No full manual UAT or unrelated fixture repair is requested.
<!-- SECTION:NOTES:END -->
