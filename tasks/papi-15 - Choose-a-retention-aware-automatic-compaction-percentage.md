---
id: PAPI-15
title: Choose a retention-aware automatic compaction percentage
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-1
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/a498cbd49321f932e2c8bfe62a8777277f94f489
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/compaction/compaction.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose the trigger percentage in settings while retaining reserve and keep settings, existing output headroom and hooks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Changing a valid percentage moves the trigger for a fixed model window.
- [ ] #2 Low percentages floor at retained history plus summary reserve without repeatedly compacting the same history; high settings respect available headroom.
<!-- AC:END -->
