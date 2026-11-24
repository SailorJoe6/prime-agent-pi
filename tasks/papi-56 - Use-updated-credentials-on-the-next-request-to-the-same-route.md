---
id: PAPI-56
title: Use updated credentials on the next request to the same route
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-3
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/a05bcb6951a143cc6f0415ba547c82988ead8b46
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/auth-storage.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#providers-model-selection-and-web-search
type: feature
ordinal: 56000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.3 live renewal is distinct from v0.10.4 retry after rejection. Observe newly supplied credentials within the selected account without restarting a session. Keep expiry coordination and never change provider or account implicitly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Replace a synthetic unexpired credential for the selected account between two captured requests. Only the second request uses the new fixture revision.
- [ ] #2 Updating an unrelated account leaves the session’s requests unchanged. No live login, cross-account fallback or rejection retry is required.
<!-- AC:END -->
