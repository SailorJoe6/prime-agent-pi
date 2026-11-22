---
id: TASK-58
title: Include Bedrock cache points for recognized Claude 5 and later models
status: In Design
assignee: []
created_date: '2026-11-22T23:25:00Z'
updated_date: '2026-11-22T23:46:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/100e7053374b2bac188387652397820564cf92df/crates/pa-ai/src/providers/bedrock/convert.rs#L75-L105
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/100e7053374b2bac188387652397820564cf92df/crates/pa-ai/src/providers/bedrock/convert.rs#L490-L519
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/ai/src/providers/amazon-bedrock.ts#L597-L611
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/977e7a68c68068e159efa2d8a8e77b25841c8aed/docs/upstream-feature-inventory.md#adapter-and-mcp-findings
type: feature
ordinal: 58000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.2 extends the Bedrock model match used when converting a request. Pi already places cache points for eligible older models. Preserve that placement and retention behavior; no billing, signing, credential-profile or service-side claims.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 In an offline request with a short system prompt and final user message, recognized Claude Sonnet 5 and Opus 10 fixtures receive default cache points at both positions with short retention. Long retention adds the one-hour TTL.
- [ ] #2 Retention none emits no cache points. Ending on an assistant message adds no final message point. A supported Claude 4 fixture keeps its previous behavior; an unsupported 3.5 Sonnet fixture gains no point. No request is sent.
<!-- AC:END -->
