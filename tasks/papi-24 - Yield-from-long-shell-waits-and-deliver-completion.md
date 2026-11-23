---
id: PAPI-24
title: Yield from long shell waits and deliver completion
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/8aac8692456c00c01d4e53e60e6d3347a3506559/prime-agent-runtime/src/rlm/bash.py
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/98bf740b001b04e26c15540066bd633f785a07e8
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/prime-agent-runtime/src/rlm/bash.py
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.1 v0.10.1 runtime, v0.10.3 v0.10.3 change, Python awaitables + session notifications. Never silently change legacy await; Joe decides unavoidable default conflict. No persistent-shell dependency. Preserve existing Python callers, session IDs and legacy records; negotiate optional daemon features.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Short command yields final output.
- [ ] #2 In completion-aware mode still-running command yields a live snapshot within one second, including repeat await, then final completion.
- [ ] #3 Existing completion-waiting caller receives its old result through a compatible path.
<!-- AC:END -->
