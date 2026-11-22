---
id: TASK-17
title: Suspend refinements without deleting saved entries
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/f0c2d328ab7884512dc098f8068fa51568360096
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/agent-session.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Provide a master setting for harness refinement generation, application and injected context. Preserve existing automatic scheduling preferences.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With refinements off, neither manual nor automatic requests apply edits and saved entries remain intact.
- [ ] #2 Fresh sessions omit refinement context while off. Re-enabling restores access to the same entries.
<!-- AC:END -->
