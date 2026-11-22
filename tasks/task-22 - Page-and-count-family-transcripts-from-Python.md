---
id: TASK-22
title: Page and count family transcripts from Python
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/c8cbb5ba718d15f024eb21dd2c1f113375ccf5e2
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/prime-agent-runtime/src/rlm/__init__.py
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.3 paged family transcript reads and counts, runtime + daemon active-branch transcript. Live observation/list are not a paged history API; no global session search. Preserve existing Python callers, session IDs and legacy records; negotiate optional daemon features.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Multiple pages include numbered pre-compaction messages without duplicates.
- [ ] #2 Family selection/role filter and count agree for matching rows.
- [ ] #3 Unrelated session returns no data.
<!-- AC:END -->
