---
id: PAPI-55
title: Honor adaptive thinking for Haiku 5 on existing routes
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/1cc6103a4caa8097a848a723433897fd6dbdf033
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/efb25e2be62507f8a13a157545d031da213abac9/crates/pa-ai/src/providers/bedrock/events.rs
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#adapter-and-mcp-findings
type: feature
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Apply Haiku 5.x adaptive effort on the existing Anthropic and Bedrock routes. Keep earlier models’ valid controls, transcript formats and provider choice.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 For each supported Haiku route a captured fixture request represents the selected level as adaptive effort.
- [ ] #2 Explicit off is disabled rather than implicit medium; a legacy model retains its existing request shape.
<!-- AC:END -->
