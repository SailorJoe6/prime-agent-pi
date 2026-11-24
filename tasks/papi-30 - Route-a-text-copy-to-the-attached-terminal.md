---
id: PAPI-30
title: Route a text copy to the attached terminal
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-0
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/33315ed7c83cbcc7a5f092a171b6d21631821983
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/utils/clipboard.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#commands-installation-and-terminal-controls
type: feature
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.0 Clipboard handling. Clipboard utility + copy feedback. Keep size limits, existing OS fallbacks, no image support promise on Termux. Mixed fix: TASK-1 may cite misleading success; don’t file it twice.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 In a fixture with two tmux clients, only the attached pane’s client receives the text.
- [ ] #2 Remote OSC 52 with no acknowledgement reports forwarding, not verified clipboard contents.
- [ ] #3 A local native/Termux text copy still works.
<!-- AC:END -->
