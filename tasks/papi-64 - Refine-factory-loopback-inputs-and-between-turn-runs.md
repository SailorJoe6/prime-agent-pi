---
id: PAPI-64
title: Refine factory loopback inputs and between-turn runs
status: In Design
assignee: []
created_date: '2026-11-26T20:37:00Z'
labels: []
milestone: m-2
dependencies:
  - PAPI-13
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/CHANGELOG.md#L122
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/CHANGELOG.md#L135-L139
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#factory-workflows-sessions-and-terminal-controls
type: feature
ordinal: 64000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Track the v0.10.2 follow-up to named factory runs, not the baseline executor.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 An optional entry input is null on first entry and gets its bound output on loopback; required entry inputs are still rejected.
- [ ] #2 The factory API remains available after import rlm. Between-turn starts deliver child prompts promptly and final provider failures surface as failures, not successful empty results.
<!-- AC:END -->
