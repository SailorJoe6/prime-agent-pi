---
id: TASK-47
title: >-
  Honor endpoint thinking-signature requirements for unsigned
  Anthropic-compatible history
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/ea9d9602ec0938d9e454e8963107cd85af1565c6/crates/pa-ai/src/providers/anthropic/convert.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/ai/src/providers/anthropic.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#adapter-and-mcp-findings
type: feature
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.2 v0.10.2 Anthropic converter, e3e21add5; adapter replay conversion. Preserve existing adapter IDs and persisted transcripts. Do not include later signed-block repairs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An unsigned fixture reasoning block stays reasoning on a non-signing endpoint.
- [ ] #2 On a signature-required endpoint it is omitted, not re-emitted as visible assistant text.
- [ ] #3 Ordinary text survives both.
<!-- AC:END -->
