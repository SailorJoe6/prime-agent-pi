---
id: TASK-6
title: Retry the same model on an explicitly permitted provider
status: In Design
assignee: []
created_date: '2026-11-22T22:03:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-core/src/session_engine/provider_failover.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/agent-session.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/df22fd7deca6a02e50a86375e36c7fecff0b8e5f/docs/upstream-feature-inventory.md#what-the-release-notes-leave-out
type: feature
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Let a turn continue on another configured provider serving the identical model after the first route exhausts its retry allowance. Scope: turn retry and parking, not fresh-session defaults or child discovery. Preserve explicit provider/authentication boundaries; having credentials is not consent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With two permitted faux routes serving M, exhausting the first route allows the second to finish the same turn on M.
- [ ] #2 A route serving only N is never tried.
- [ ] #3 Without permission to change routes, retries and parking remain on the selected provider.
<!-- AC:END -->
