---
id: TASK-21
title: Choose the working directory for a spawned child
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/c6d4da9421e6087e3fc1a763e947cf37153cd76f
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/prime-agent-runtime/src/rlm/__init__.py
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.3 cwd on child spawn, Python spawn + daemon admission. Root-create cwd is already present; not TASK-3 checkout relocation. Preserve existing Python callers, session IDs and legacy records; negotiate optional daemon features.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A child reads a harmless cwd-specific AGENTS.md marker while parent cwd stays put.
- [ ] #2 Omitted cwd retains old inheritance.
- [ ] #3 Invalid directory fails without child.
<!-- AC:END -->
