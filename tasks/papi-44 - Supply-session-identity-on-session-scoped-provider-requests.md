---
id: PAPI-44
title: Supply session identity on session-scoped provider requests
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-4
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/9d9361e2f93f2c085fef6afc1cd32e6d6fcd6dc5
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/ai/src/providers/openai-codex-responses.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#providers-model-selection-and-web-search
type: feature
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.4 v0.10.4 identity header; AI request facade/adapters and auxiliary calls. Preserve provider-native Codex/OpenCode affinity and custom headers, no tracing service or telemetry required.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Captured main and auxiliary requests on different transports carry the same stable X-PI-Session-Id for one session.
- [ ] #2 Sessionless requests omit it.
- [ ] #3 An explicitly supplied case-insensitive header wins.
<!-- AC:END -->
