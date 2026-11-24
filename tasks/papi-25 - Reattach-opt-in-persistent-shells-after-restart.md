---
id: PAPI-25
title: Reattach opt-in persistent shells after restart
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-1
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/e8dc899692b3187fdeed329e1cc477a43adfeeca
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/prime-agent-runtime/src/rlm/bash.py
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.1 Persistent shells, runtime/daemon + durable records. Ordinary transient jobs and daemon recovery outside this session are unchanged. Preserve existing Python callers, session IDs and legacy records; negotiate optional daemon features.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Saved-session toy job reattaches after kernel or daemon restart with same identity/output/exit.
- [ ] #2 Ordinary nonpersistent job remains ordinary.
- [ ] #3 Stale identity never attaches to or stops another process.
<!-- AC:END -->
