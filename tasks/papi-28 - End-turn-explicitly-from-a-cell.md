---
id: PAPI-28
title: End turn explicitly from a cell
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/74591cddef28d11249c3171112114fc4755375d7
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/agent/src/agent-loop.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.3 end-turn from a cell, kernel tool and agent-loop batches. Public extension batch semantics must survive; escalate a real conflict. Preserve existing Python callers, session IDs and legacy records; negotiate optional daemon features.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Marked cell confirms end with no extra model reply.
- [ ] #2 Sibling work in same batch completes, then turn stops.
- [ ] #3 Ordinary/extension results do not accidentally end the turn.
<!-- AC:END -->
