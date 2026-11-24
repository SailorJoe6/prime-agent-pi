---
id: PAPI-47
title: >-
  Honor endpoint thinking-signature requirements for unsigned
  Anthropic-compatible history
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-2
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/ea9d9602ec0938d9e454e8963107cd85af1565c6/crates/pa-ai/src/providers/anthropic/convert.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/ai/src/providers/anthropic.ts
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/e3e21add5aacaaa42a5937505b3ed311ad9f1bfd/crates/pa-ai/src/providers/anthropic/mod.rs#L161-L182
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#adapter-and-mcp-findings
type: feature
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
For unsigned reasoning in Anthropic-compatible history, resolve the signature requirement per model. An explicit requiresThinkingSignature boolean wins. When omitted, the Anthropic provider or a model ID containing Claude (case-insensitive) requires a signature. Preserve adapter IDs, ordinary text and persisted transcripts; signed-block replay repairs stay in TASK-1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An unsigned fixture reasoning block stays reasoning on a non-signing endpoint.
- [ ] #2 On a signature-required endpoint it is omitted, not re-emitted as visible assistant text.
- [ ] #3 Ordinary text survives both.
- [ ] #4 With the same unsigned history, explicit false on a Claude model retains the thinking block without a signature; explicit true on a non-Claude compatible model omits the block without converting it to text. Omitting the override restores the model default.
<!-- AC:END -->
