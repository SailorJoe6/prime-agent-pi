---
id: PAPI-11
title: Expand inline skill references during prompt submission
status: In Design
assignee: []
created_date: '2026-11-22T22:17:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-5
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/crates/pa-core/src/skills/mod.rs#L272-L319
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/crates/pa-core/src/skills/mod.rs#L482-L509
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/agent-session.ts#L6211-L6234
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#skill-discovery-and-invocation
type: feature
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expand standalone inline references without changing Pi’s leading command routing or skill precedence.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Two distinct names expand, including a hidden skill; a repeated name inserts its instructions only once.
- [ ] #2 Code spans and paths stay literal. Unknown inline names remain visible with a notice; leading invocations still receive their arguments.
<!-- AC:END -->
