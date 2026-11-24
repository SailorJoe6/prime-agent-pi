---
id: PAPI-39
title: Classify ACP prompt failures for hosts
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-2
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/07ae06883e6c765bed08952811247565d589f018
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/modes/acp/acp-stop-reason.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.2 retryable transport errors. ACP error responses. No automatic retry or provider change. Mixed upstream bug/new client-visible fields: reference TASK-1 without duplicating a repair task. Report the fine error category separately from kind, advisory retryable and details.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A synthetic exhausted connection failure returns structured transport kind and advisory retryability.
- [ ] #2 A harness fault is distinguishable and not labeled retryable transport.
- [ ] #3 Existing error details remain available.
- [ ] #4 Offline failed-prompt responses for a connection reset and a request timeout both report kind=model_transport and retryable=true; category is network versus timeout, respectively, and the original details remain available. Neither response triggers a retry.
<!-- AC:END -->
