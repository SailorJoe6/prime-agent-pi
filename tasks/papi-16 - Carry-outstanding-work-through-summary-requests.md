---
id: PAPI-16
title: Carry outstanding work through summary requests
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/00ec2549e2d1507e6ad4e803936ee87ca2bf450b
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/compaction/compaction.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Include recoverable work in initial, update and branch summary prompts. Preserve existing sections and hooks; the request does not guarantee model compliance or authorize restarting work.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A captured initial request asks for an in-flight child and its recovery pointer alongside ordinary progress.
- [ ] #2 Update and branch requests ask for pending jobs, delivery paths and active goal or heartbeat pointers.
<!-- AC:END -->
