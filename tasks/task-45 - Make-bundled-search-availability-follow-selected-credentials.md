---
id: TASK-45
title: Make bundled search availability follow selected credentials
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/75ec606135c9734feb1f72d04e5beca9c98bf37d
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/settings-manager.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#providers-model-selection-and-web-search
type: feature
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.2 follow credential availability; new-session skill gate/settings. This is not a new Serper service or permission to change credential source precedence. Can be observed on Serper independently of Eco.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With automatic availability, a fresh session omits the bundled skill without its selected fixture key and includes it with one.
- [ ] #2 Explicit enable/disable wins in both cases.
- [ ] #3 A user’s same-name skill retains precedence.
<!-- AC:END -->
