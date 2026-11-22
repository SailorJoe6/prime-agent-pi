---
id: TASK-20
title: Rename the current session or a direct child from Python
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/022c90b9f2d79543447aac05c839462b0d64acbd
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/prime-agent-runtime/src/rlm/__init__.py
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.0 Python self/direct-child rename, runtime + daemon session registry. CLI rename exists, not this API. Preserve existing Python callers, session IDs and legacy records; negotiate optional daemon features.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Self rename persists across reopen.
- [ ] #2 Rename direct child by handle/ID updates roster with same identity.
- [ ] #3 Unrelated target or sibling-name collision changes neither.
<!-- AC:END -->
