---
id: PAPI-34
title: Summarize executed shell commands on collapsed Python cards
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/d38bcb56e3b800f0f728136a07bdeec37cd1039d
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/tools/code-preview.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#commands-installation-and-terminal-controls
type: feature
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.0 d38bcb56e3b8 (corrected inventory). Cell observations/result details + built-in collapsed renderer. Display only: no change to ipython identity, Python await behavior, command execution or old-record replay.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A helper issuing two harmless commands shows first actual command plus one more.
- [ ] #2 An unexecuted branch containing a literal command is not counted.
- [ ] #3 Expanded view still shows original cell.
<!-- AC:END -->
