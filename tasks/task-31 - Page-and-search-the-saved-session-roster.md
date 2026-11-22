---
id: TASK-31
title: Page and search the saved-session roster
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/8aac8692456c00c01d4e53e60e6d3347a3506559/crates/pa-tui/tests/agents_view_paged_catalog.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/test/saved-session-catalog.test.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#daemon-terminal-packaging-and-accounting-findings
type: feature
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.1 paged roster fixture, ba119a481. Agents view + saved catalog. Keep existing paths/IDs, live/detached rows and selection; no Rust archive migration. ACP list need not depend on this UI.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With >200 fixture sessions initial roster shows newest 200.
- [ ] #2 Scrolling brings in older rows without duplicates.
- [ ] #3 Search finds a session beyond loaded rows.
<!-- AC:END -->
