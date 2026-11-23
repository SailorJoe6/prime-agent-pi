---
id: PAPI-29
title: Create a user-owned session inside the roster scope
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/2231687fcdaf2b53b3e932d92192c5696397a1d8
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/modes/agents-view/agents-view-mode.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#commands-installation-and-terminal-controls
type: feature
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.0 scoped new session. Agents view + daemon create. No worker spawn, child ownership, or change to RLM depth policy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Scoped New in A (different cwd from launch) opens a user session one level below A in A’s cwd.
- [ ] #2 Back returns to that row in A.
- [ ] #3 Unscoped New remains a root.
<!-- AC:END -->
