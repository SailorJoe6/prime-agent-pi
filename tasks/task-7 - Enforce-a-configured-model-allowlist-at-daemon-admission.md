---
id: TASK-7
title: Enforce a configured model allowlist at daemon admission
status: In Design
assignee: []
created_date: '2026-11-22T22:04:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-daemon/src/model_allowlist.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/settings-manager.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/df22fd7deca6a02e50a86375e36c7fecff0b8e5f/docs/upstream-feature-inventory.md#what-the-release-notes-leave-out
type: feature
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Distinguish a global admission policy from picker cycling. Apply it at daemon model selection, including built-in explicit and auxiliary selections. Preserve normal selection when unset; do not redefine extension registration or use this as evidence about unverified extension entry modes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With a fixture allowlist containing M, an explicit request for M is admitted.
- [ ] #2 A request for an unlisted built-in model is refused with an explanation, not silently substituted; auxiliary resolution respects the same policy.
- [ ] #3 Without an admission policy, enabledModels continues to control cycling without banning other explicit selections.
<!-- AC:END -->
