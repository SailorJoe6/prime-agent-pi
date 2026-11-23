---
id: PAPI-14
title: Inspect and control named factory runs in the terminal
status: In Design
assignee: []
created_date: '2026-11-22T22:17:00Z'
labels: []
dependencies:
  - PAPI-13
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-tui/src/factory_view.rs
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/CHANGELOG.md#L72-L77
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
Use run and state identity in the factory page, agents view and context display. Preserve configurable bindings and normal session navigation; this is not a new billing engine.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Live and paused runs show their diagram. Factory cannot be disabled with a live run.
- [ ] #2 Opening a state session and returning restores selection. Confirmed stop or resume acts only on the selection.
- [ ] #3 Grouped cost retains deleted-child spend; the dock distinguishes specifications from runs.
<!-- AC:END -->
