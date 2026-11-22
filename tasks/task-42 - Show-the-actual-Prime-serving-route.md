---
id: TASK-42
title: Show the actual Prime serving route
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/bfad069bf7ce95795886a0b5a74592d672b7f8bb
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/model-registry.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#providers-model-selection-and-web-search
type: feature
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.3 labels verified serving routes; catalog metadata and model picker. Display only: do not infer route class, grant, or entitlement from model name; do not change selection.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Hosted and gateway fixture rows display/search by their distinct serving labels.
- [ ] #2 An unlabeled row or another provider retains the provider label.
<!-- AC:END -->
