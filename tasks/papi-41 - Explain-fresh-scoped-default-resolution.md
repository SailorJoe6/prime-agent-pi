---
id: PAPI-41
title: Explain fresh scoped default resolution
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/61b89bb9809b053a236c978ba92ec5b409ce41bd
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/model-resolver.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#providers-model-selection-and-web-search
type: feature
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.1 waited for private defaults; fresh session create and opening status/history. Preserve explicit model and restore precedence. Print’s restored defaults are a separate TASK-1 comparison, not a second new selector.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A delayed fixture grant for the configured in-scope private model lets the intended selection win.
- [ ] #2 A definitively unavailable default produces a recorded fallback reason and respects the requested scope.
<!-- AC:END -->
