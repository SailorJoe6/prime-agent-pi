---
id: PAPI-19
title: Select prompt additions by resolved model
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/1e894a62c20f07311b39130fde6088fa72cecb5c
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/cli/args.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#providers-model-selection-and-web-search
type: feature
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Apply ordered shipped/user rules during prompt composition. Keep ordinary append, custom prompts, model selection and extension hooks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A matching model gets its additions once with user-file precedence; an unmatched model gets none.
- [ ] #2 An invalid map or missing file produces a diagnostic outside model context and leaves the model usable.
<!-- AC:END -->
