---
id: TASK-57
title: Show the selected running child’s progress note in the roster
status: In Design
assignee: []
created_date: '2026-11-22T23:25:00Z'
updated_date: '2026-11-22T23:46:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/a8834c5b44311a9fd2b1a748d12fcbe042ce8c3e/crates/pa-tui/src/agents_view/render.rs#L614-L649
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/modes/agents-view/agents-view-mode.ts#L2799-L2817
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/agent-session.ts#L11402-L11415
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/977e7a68c68068e159efa2d8a8e77b25841c8aed/docs/upstream-feature-inventory.md#commands-installation-and-terminal-controls
type: feature
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use the existing accepted progress note from the child snapshot (v0.10.1). This is selected-row display, not a new Python API, history, or Activity column replacement.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Two running fixture children have different notes. Moving selection shows only the selected child’s latest accepted note, wrapped under its row.
- [ ] #2 A blank note or a child that is no longer running shows no stale note. Selecting another row does not change either child’s work.
<!-- AC:END -->
