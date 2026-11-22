---
id: TASK-9
title: Preserve the end of truncated Python cell output
status: In Design
assignee: []
created_date: '2026-11-22T22:04:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/8aac8692456c00c01d4e53e60e6d3347a3506559/crates/pa-core/src/kernel/manager/requests.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/kernel/repl-manager.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/df22fd7deca6a02e50a86375e36c7fecff0b8e5f/docs/upstream-feature-inventory.md#what-the-release-notes-leave-out
type: feature
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Keep the first and last portions of long cell stdout and stderr so a final diagnostic is not lost. Scope: the Python kernel output boundary, not other tools, stored sessions or shell execution. Preserve the existing bounded output budget.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 For each overlong fixture stream, the kept text spans a three-to-one head/tail split within the configured character budget and includes the final marker.
- [ ] #2 The omission marker reports the number of characters omitted, including for multibyte text.
- [ ] #3 At or below the limit the cell returns the original text without an omission marker.
<!-- AC:END -->
