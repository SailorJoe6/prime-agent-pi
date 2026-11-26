---
id: PAPI-14
title: Inspect and control named factory runs in the terminal
status: In Design
assignee: []
created_date: '2026-11-22T22:17:00Z'
updated_date: '2026-11-26T20:36:00Z'
labels: []
milestone: m-0
dependencies:
  - PAPI-13
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-tui/src/factory_view.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/modes/agents-view/agents-view-mode.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#factory-workflows-sessions-and-terminal-controls
type: feature
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose the original v0.10.0 terminal page and selected-run actions, building on PAPI-13. Preserve configurable controls and normal Pi session navigation. Later state-session navigation, grouped cost, and spec/run counts are tracked separately.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The terminal factory page shows the selected live or paused run, its state and its diagram. A live run prevents disabling the factory.
- [ ] #2 From the selected run’s available actions, stop acts only on that run and resume acts only on the selected paused run; other runs and ordinary session navigation are unaffected.
<!-- AC:END -->
