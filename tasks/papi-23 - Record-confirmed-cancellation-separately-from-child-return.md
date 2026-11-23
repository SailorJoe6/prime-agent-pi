---
id: PAPI-23
title: Record confirmed cancellation separately from child return
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/71beca9478f552dc6fc898bba9685f9ce00515cf
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/semantic-edges.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.2 records a cancellation edge (71beca9478f5), supervisor + parent semantic ledger. Restart/update alone is not cancellation. Not TASK-2 orphan settlement. Keep old return readers and records usable. Preserve existing Python callers, session IDs and legacy records; negotiate optional daemon features.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Confirmed cancel/delete-live/parent-kill records one request-anchored parent→child cancelled edge with correct cause, no clean return.
- [ ] #2 Refused abort leaves child live/retryable with no cancel edge.
- [ ] #3 Natural completion records normal return only.
<!-- AC:END -->
