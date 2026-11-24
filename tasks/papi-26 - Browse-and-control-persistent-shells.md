---
id: PAPI-26
title: Browse and control persistent shells
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-3
dependencies:
  - PAPI-25
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/69a826f982f9141bd0ee629767b36458cc69867f
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/modes/agents-view/agents-view-mode.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
richer roster v0.10.3 roster counts and navigation, agents view + daemon shell inventory. Requires durable shell identity and inventory; optional UI must degrade with older daemon. Preserve existing Python callers, session IDs and legacy records; negotiate optional daemon features.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Counts match owned fixtures (orphan distinguished).
- [ ] #2 Opening a selected shell reveals its output, not another's.
- [ ] #3 Explicit stop changes only selected verified shell.
- [ ] #4 An idle owner shows its shell once in roster and dock. Following the shell selects the owner; exit updates counts without a live session kernel.
<!-- AC:END -->
