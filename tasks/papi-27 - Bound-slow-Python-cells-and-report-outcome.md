---
id: PAPI-27
title: Bound slow Python cells and report outcome
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/f07099812c4a025c68b35218d25df870bf0d67f3
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/29ab2a32f1f8f2663f51ea7cb108256cc131b2bc
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/tools/ipython.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.2 cell watchdog advisory kept result, superseded by v0.10.3 bounded cell; ipython tool/REPL manager/settings. Do not ticket obsolete warn-only default separately. Internal transport timeout is not a model contract; preserve ipython/replay, review Pi timing compatibility. Preserve existing Python callers, session IDs and legacy records; negotiate optional daemon features.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A short cell returns normal result.
- [ ] #2 Configured per-call overrun gets actionable timeout and cooperative interrupt preserves earlier variables.
- [ ] #3 Uncooperative fixture forces recovery and next cell works.
<!-- AC:END -->
