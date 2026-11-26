---
id: PAPI-65
title: Run Python function states in factory machines
status: In Design
assignee: []
created_date: '2026-11-26T20:37:00Z'
labels: []
milestone: m-3
dependencies:
  - PAPI-13
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/CHANGELOG.md#L62-L66
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/CHANGELOG.md#L76-L77
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#factory-workflows-sessions-and-terminal-controls
type: feature
ordinal: 65000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Track the v0.10.3 runtime additions to factory execution and feedback.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A bounded tag/count graph passes declared outputs between agent states and an isolated Python function state; the diagram identifies Python states.
- [ ] #2 Ordinary state exits do not wake the parent once per state. Supported longer settle output and trailing bare JSON still bind declared ports.
<!-- AC:END -->
