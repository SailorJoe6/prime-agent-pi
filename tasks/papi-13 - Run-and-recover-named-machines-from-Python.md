---
id: PAPI-13
title: Run and recover named machines from Python
status: In Design
assignee: []
created_date: '2026-11-22T22:17:00Z'
updated_date: '2026-11-26T20:36:00Z'
labels: []
milestone: m-0
dependencies:
  - PAPI-12
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/prime-agent-runtime/src/rlm/factory.py#L1-L38
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/prime-agent-runtime/src/rlm/__init__.py
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#factory-workflows-sessions-and-terminal-controls
type: feature
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose the upstream v0.10.0 baseline for opt-in named factory runs from Python, using PAPI-12 machine definitions. Keep run state and child ownership scoped to the run. Preserve existing Pi interfaces and user state; do not promise recovery of a kernel-local handle after restart. Later recovery, loopback refinements and Python function states are tracked separately.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Factory help is available while execution is off. Starting while disabled refuses without starting children. Once enabled, a named graph passes declared outputs between agent states within its run bounds.
- [ ] #2 Two runs have distinct identities and children. Status and watch observe the selected run; stop and resume of a paused run affect only that run.
<!-- AC:END -->
