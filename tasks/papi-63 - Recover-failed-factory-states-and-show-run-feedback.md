---
id: PAPI-63
title: Recover failed factory states and show run feedback
status: In Design
assignee: []
created_date: '2026-11-26T20:37:00Z'
labels: []
milestone: m-1
dependencies:
  - PAPI-13
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/CHANGELOG.md#L218-L220
  - https://github.com/PrimeIntellect-ai/prime-agent/pull/3631
  - https://github.com/PrimeIntellect-ai/prime-agent/pull/3713
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#factory-workflows-sessions-and-terminal-controls
type: feature
ordinal: 63000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Track the v0.10.1 refinements to baseline named factory runs and terminal feedback.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Resume re-admits the selected failed entry; dead workers can be replaced once. Run-qualified names and pause details distinguish concurrent runs.
- [ ] #2 Report run milestones and paused counts, surface factory children in the Agents view, and support the added navigation aliases alongside configured controls.
- [ ] #3 Refinement-off blocks all factory execution, including library selection; resident states reject retries.
<!-- AC:END -->
