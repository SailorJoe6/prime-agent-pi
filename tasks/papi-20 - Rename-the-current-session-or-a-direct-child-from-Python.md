---
id: PAPI-20
title: Rename the current session or a direct child from Python
status: In Progress
assignee: []
created_date: '2026-11-22T22:18:00Z'
updated_date: '2026-11-25T22:28:00Z'
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
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/b74b97ec95e0974412b2b775ebf92584254b41c7/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/5199fde647258e8a13fcf8a04ad16e0086903bfb/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
modified_files:
  - packages/coding-agent/src/modes/agents-view/agents-view-mode.ts
  - packages/coding-agent/test/agents-view-mode.test.ts
  - docs/upstream-feature-inventory.md
  - packages/coding-agent/.changes/papi-20-session-rename.md
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/test/agent-session-recursion.test.ts
  - packages/coding-agent/test/rlm-ledger.test.ts
  - prime-agent-runtime/src/rlm/__init__.py
  - prime-agent-runtime/test/test_subagent_registry.py
  - packages/coding-agent/src/core/agent-messages.ts
  - packages/coding-agent/src/core/kernel/bootstrap.ts
  - packages/coding-agent/src/core/messages.ts
  - packages/coding-agent/src/modes/daemon/daemon-mode.ts
  - packages/coding-agent/test/kernel-bootstrap-runtime-ready.test.ts
  - packages/coding-agent/test/kernel-bootstrap.test.ts
type: feature
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.0 Python self/direct-child rename, runtime + daemon session registry. CLI rename exists, not this API. Preserve existing Python callers, session IDs and legacy records; negotiate optional daemon features. The same v0.10.0 change also lets a user rename a selected child directly in the roster. Keep existing root rename and configured controls; do not require a Python call for this action.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Self rename persists across reopen.
- [x] #2 Rename direct child by handle/ID updates roster with same identity.
- [x] #3 Unrelated target or sibling-name collision changes neither.
- [x] #4 From the roster, rename the selected live or saved child. Its name persists under the same identity; its sibling and the existing root rename action are unaffected.
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

Bounded Python slice: expose and test self rename via the existing session-name path, including daemon naming rules and offline reopen. Keep direct-child Python selection and its no-mutation tests for the next slice; no daemon wire change. Include focused roster reopen evidence for AC #4.

Python self-rename slice b74b97ec95e0974412b2b775ebf92584254b41c7: same durable ID/name on reopen; inline child exact sibling collision rejects without changing either name; case-distinct name succeeds. The host rejects target fields in this self-only slice. AC #4 offline: existing agents-view selected live/saved/root dispatch tests plus rlm-ledger live/saved command tests reopen original child ID and file with new name; root/sibling transcripts stay byte-identical and ledger parent/child identity remains stable. No-write negative control failed both reopen tests. Validation: npm run check passed; from packages/coding-agent run ../../node_modules/.bin/tsx ../../node_modules/vitest/dist/cli.js --run test/rlm-ledger.test.ts test/agents-view-mode.test.ts (82 passed) and test/agent-session-recursion.test.ts (93 passed before second new case, then both PAPI-20 cases passed with -t PAPI-20). From prime-agent-runtime run PYTHONPATH=src ~/.prime/agent/kernel-venv/bin/python -m unittest discover -s test -p test_subagent_registry.py (27 passed). No full manual UAT; previously observed unrelated daemon roster fixture was not changed.

Independent review accepted self-rename and AC #4 offline reopen evidence at b74b97ec95e0974412b2b775ebf92584254b41c7. Next candidate: complete Python direct-child rename (AC #2/#3) with exact identity and no mutation on unrelated targets or sibling collision. Address the two accepted gaps within that scope: make missing rename support and recovery visible through existing Python runtime readiness diagnostics without replacing user overrides or breaking v0.9.8 workflows; use existing transcript mechanisms for a visible persisted notice on actual Python renames of already named daemon-backed sessions (not first naming or no-ops), matching released v0.10.0 behavior. Keep roster/root behavior and existing stores. Verify focused positive and negative paths and required checks. Publish exact separate task/code history for full-task review; no merge, activation, or release.

Full-task candidate 5199fde647258e8a13fcf8a04ad16e0086903bfb: Python module and REPL rename self or an exact direct child by handle, registry row or ID. Display names, unrelated or nested targets outside the caller's direct scope, and sibling conflicts are rejected without transcript changes. Resident and saved daemon targets keep durable ID/path and update roster/ledger; saved children are not hydrated. Actual Python renames of an already named daemon session persist a visible notice in the renamed transcript. No first-name/no-op notice and no wire or store change. The existing kernel diagnostics warn on missing direct-child rename and give recovery instructions without replacing a configured interpreter or blocking otherwise supported Python workflows.

Offline validation: npm run check and git diff --check passed. From packages/coding-agent, run ../../node_modules/.bin/tsx ../../node_modules/vitest/dist/cli.js --run with test/agent-session-recursion.test.ts (95 passed), test/rlm-ledger.test.ts (34), test/agents-view-mode.test.ts and test/daemon-supervisor-lazy-subagents.test.ts (70 combined), test/kernel-bootstrap-runtime-ready.test.ts and test/kernel-bootstrap.test.ts (30 combined). PAPI-20 ledger and runtime focused tests each passed with --sequence.shuffle --sequence.seed=41 and =73. From prime-agent-runtime run PYTHONPATH=src ~/.prime/agent/kernel-venv/bin/python -m unittest discover -s test -p test_subagent_registry.py (28 passed). Before implementation selector tests failed on missing Python/host dispatch; removing warning and transcript notice writers failed all six targeted tests, then restored code passed all six. No manual UAT, unrelated roster fixture repair, merge, activation or release.

Independent review of 5199fde647258e8a13fcf8a04ad16e0086903bfb accepted self/roster reopen, scope checks, stale-runtime guidance and transcript notices. Revision pending: (1) after Python rename of a passivated direct child, keep the supervisor public roster and sibling collision view current without a new store; prove stable identity and no mutation on rejection. (2) after reusing the former name, Python collect by current name must select the replacement without losing collection of the original run by stable ID/handle. Existing candidate evidence above is historical, not proof that these regressions are resolved. At handoff the prior readiness child still showed active model work with four queued items and no confirmed finish; the Episode code worktree was clean. Account for that exact descendant before code edits. Revalidate offline and publish separate exact code/task revisions. No merge, release, activation or unrelated cleanup.

Canonical execute verified the same Episode and exact observation 8c55c757, synchronized native Backlog, and stopped before code edits. The prior readiness child 01a2148b-70b9-75f9-96cb-2c8386b39c26 still reported running/model streaming and four queued items. Its latest visible output was an earlier repository check that can write formatting in the shared worktree; native nonblocking collect returned running/unsettled, with no completion reply. The clean code worktree and published code 5199fde647258e8a13fcf8a04ad16e0086903bfb do not account for queued or future writes. Unblock when the exact child is observed settled and its outstanding actions/effects are accounted for, or the owning Conversation verifies a supported resolution for that child. Both accepted review fixes remain pending; no lifecycle change.

Owner accepted the shared-worktree blocker reported at 70a7d535b193611181c1c2e1a0c52dd1ac4471bd. The Episode stopped before revision edits. Exact readiness child 01a2148b-70b9-75f9-96cb-2c8386b39c26 still reports working; the Episode reports four queued items and an earlier check that wrote formatting. Unblock after the child settles or an authorized targeted cancellation, with its queue and worktree effects accounted for. Preserve the current Episode and saved sessions. Both review fixes remain pending.

Blocker cleared: operator authorized stopping the exact readiness child. The Episode confirmed that child is inactive with no queued work, its saved session is retained, and other direct children are idle with empty queues. The owner verified a clean Episode worktree at the unchanged published candidate 5199fde647258e8a13fcf8a04ad16e0086903bfb. Resume only the two accepted review fixes in the same Episode.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Python self and direct-child rename preserve session identity. Exact unrelated targets and sibling-name collisions are rejected without mutation. Actual Python renames of already named daemon sessions persist a visible transcript notice; older Python runtimes get nonblocking recovery guidance. Existing live/saved roster rename and root behavior are preserved. Full-task candidate for independent review.
<!-- SECTION:FINAL_SUMMARY:END -->
