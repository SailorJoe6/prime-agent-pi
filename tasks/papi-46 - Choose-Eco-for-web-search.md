---
id: PAPI-46
title: Choose Eco for web search
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-3
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/6aaa3a25518b1d01389540eabb4e3a89bca666bb
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/settings-manager.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#providers-model-selection-and-web-search
type: feature
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.3 added Eco; search settings, key slot/guidance and Python skill. Keep Serper default and Python caller/result contract. No external search.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Selected Eco with both dummy keys uses only Eco and returns title/link/snippet from recorded data.
- [ ] #2 With only the other key, show setup guidance for Eco.
- [ ] #3 On an Eco error report it without fallback to Serper.
<!-- AC:END -->
