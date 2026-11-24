---
id: PAPI-38
title: Expose outstanding background jobs to ACP hosts
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-4
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/ad1613303dff0c642b9a95706678559356086107
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/modes/acp/acp-mode.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.4 Background quiescence. Headless status + ACP completion/quiescence metadata. Additive read-only observation; no implicit close, wait, wake, or persistent-shell prerequisite.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Completion shows a positive count with a live job.
- [ ] #2 A finished job with an undelivered completion still counts.
- [ ] #3 After delivery count is zero.
<!-- AC:END -->
