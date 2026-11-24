---
id: PAPI-54
title: Select supported thinking levels for Gemini models
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-2
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/0a0b4c6de01742d598e49e87774424c8e313a148
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/ai/src/providers/google-shared.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#adapter-and-mcp-findings
type: feature
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Use model-family level metadata on Google and Vertex while preserving budget controls for legacy models. No change to provider selection.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A captured request for a newer fixture alias uses its supported level rather than an unconditional budget.
- [ ] #2 Unsupported off selects the lowest supported level. A legacy budget model keeps its valid budget request.
<!-- AC:END -->
