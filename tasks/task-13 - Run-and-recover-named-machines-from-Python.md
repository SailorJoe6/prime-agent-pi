---
id: TASK-13
title: Run and recover named machines from Python
status: In Design
assignee: []
created_date: '2026-11-22T22:17:00Z'
labels: []
dependencies:
  - TASK-12
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/prime-agent-runtime/src/rlm/factory.py#L1-L38
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/CHANGELOG.md#L218-L220
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/CHANGELOG.md#L135-L139
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/CHANGELOG.md#L62-L66
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
Expose opt-in named runs with isolated state, child ownership and notifications. Build on named machine definitions. Respect the refinement-off gate; no promise to recover a kernel-local handle after restart.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Help works when factory execution is off; starting does not. With both gates enabled, a tag/count workflow passes output between agent and Python states with bounded loopback.
- [ ] #2 Two runs have distinct children. A failed entry can be resumed without advancing its neighbor; watch and stop affect only the selected run.
<!-- AC:END -->
