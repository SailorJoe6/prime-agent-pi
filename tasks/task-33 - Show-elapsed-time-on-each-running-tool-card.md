---
id: TASK-33
title: Show elapsed time on each running tool card
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/b8591c5a1a30d81e4f7671790883b46a0a79e7fb
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/modes/interactive/components/ipython-cell.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#commands-installation-and-terminal-controls
type: feature
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.3 per-running-card elapsed time. Interactive built-in tool cards. Keep custom renderers, legacy details and completed cell duration; existing live starts suffice, no hard dependency on durable timing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A silent tool’s card advances before any output.
- [ ] #2 Concurrent calls show their own durations.
- [ ] #3 Settling freezes/removes the live clock and preserves Pi’s completed rendering.
<!-- AC:END -->
