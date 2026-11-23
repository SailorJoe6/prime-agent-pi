---
id: PAPI-6
title: Retry the same model on an explicitly permitted provider
status: In Design
assignee: []
created_date: '2026-11-22T22:03:00Z'
updated_date: '2026-11-22T23:24:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-core/src/session_engine/provider_failover.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/agent-session.ts
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/docs/settings.md#L250-L258
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/2982dadec68a9fb6b94ade67c1f733b6ca461893/docs/upstream-feature-inventory.md#what-the-release-notes-leave-out
type: feature
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Original Pi partially covers turn failover. Its explicit providerBackupModel can immediately select a configured different model before the primary retry budget expires and later restore the primary. Add only expressly permitted post-budget routing for the same model; credentials alone do not permit a switch. This is not fresh-session or child model discovery.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With two permitted faux routes serving M, exhausting the first route allows the second to finish the same turn on M.
- [ ] #2 The new post-budget mechanism does not use a route serving only N or a route not explicitly permitted for M.
- [ ] #3 With the new policy unset and providerBackupModel set to N, a transient primary failure can select N before primary retries run out, then restore the primary. With neither policy set, current primary-route retry/park behavior remains.
<!-- AC:END -->
