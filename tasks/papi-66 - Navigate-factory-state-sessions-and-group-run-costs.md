---
id: PAPI-66
title: Navigate factory state sessions and group run costs
status: In Design
assignee: []
created_date: '2026-11-26T20:37:00Z'
labels: []
milestone: m-3
dependencies:
  - PAPI-14
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/CHANGELOG.md#L62-L66
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/CHANGELOG.md#L72-L77
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#factory-workflows-sessions-and-terminal-controls
type: feature
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Track the v0.10.3 factory terminal and context changes on top of the original run controls; do not add a new billing engine.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Open the selected state session and return to the same run/state. Navigation does not stop work; confirmed stop and resume affect only the selected eligible run or state.
- [ ] #2 Grouped factory-run cost retains deleted-child spend, and the Agents view and activity dock distinguish stored specs from live runs.
<!-- AC:END -->
