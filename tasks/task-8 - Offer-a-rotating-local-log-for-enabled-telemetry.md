---
id: TASK-8
title: Offer a rotating local log for enabled telemetry
status: In Design
assignee: []
created_date: '2026-11-22T22:04:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-telemetry/src/sinks/file.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/telemetry.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/df22fd7deca6a02e50a86375e36c7fecff0b8e5f/docs/upstream-feature-inventory.md#what-the-release-notes-leave-out
type: feature
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow the operator to mirror already-enabled telemetry events to a local JSON-lines file. Scope: event delivery and settings, not new collection, account state, a telemetry CLI, or changes to consent. Use a fixture sink; no real data or transmission.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With mirroring selected, a synthetic event sent to a captured transport appears as one local JSON record.
- [ ] #2 At the size limit the log rotates and recent events remain readable.
- [ ] #3 Disabling the mirror stops local event writes without changing remote settings; disabling telemetry suppresses events even when mirroring is selected.
<!-- AC:END -->
