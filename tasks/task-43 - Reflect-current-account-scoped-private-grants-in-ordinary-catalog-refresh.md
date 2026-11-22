---
id: TASK-43
title: Reflect current account-scoped private grants in ordinary catalog refresh
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/fa6cda7f95b9c63b9c1da710efe6a68f425f8ec1
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/model-registry.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#providers-model-selection-and-web-search
type: feature
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.4 updates private catalog grants on regular refresh; catalog refresh, picker and child resolver. Keep caches isolated, existing key/team precedence and TASK-5 scoped search; a new catalog table or timer is not itself the deliverable. Separate wrong-key/team pairing is TASK-1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A teamless fixture account sees its specifically returned private row.
- [ ] #2 Removal on a successful representative refresh removes availability from picker and child resolution.
- [ ] #3 Public rows remain available.
<!-- AC:END -->
