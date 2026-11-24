---
id: PAPI-52
title: User-invoked update from local archive with explicit source
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-0
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-cli/src/update_flow/update_command.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/scripts/assemble-release-archives.mjs
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#commands-installation-and-terminal-controls
type: feature
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.0 check, archive and source paths; same Pi parser excludes --archive and --source. This is the CLI ingress, not a claim that Pi installer cannot consume local content. No arbitrary source policy, npm bridge, live updates, publish or activation authorizations. Independent from read-only check.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 In disposable installer-owned fixture valid Pi payload + Pi source stages intended version and keeps rollback.
- [ ] #2 Invalid/inconsistent payload or unsupported source fails with old version intact.
- [ ] #3 Subsequent channel lookup retains intended Pi release origin, not upstream Rust.
<!-- AC:END -->
