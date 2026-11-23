---
id: PAPI-40
title: Wait for descendant replies before print exits
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/8aac8692456c00c01d4e53e60e6d3347a3506559/crates/pa-cli/tests/print_inline_subagents_e2e.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/modes/headless-completion.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#daemon-terminal-packaging-and-accounting-findings
type: feature
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.1 print-mode fixtures. Print + existing headless descendant wait. Preserve daemon integration, output formats/depth limits; Rust daemonless execution is not required. Not TASK-2 orphan settlement.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Two children completing after parent idle both contribute to the printed final answer.
- [ ] #2 A retasked child’s second reply or a child woken by bash completion reaches the parent before print exits.
- [ ] #3 Childless print completes normally.
<!-- AC:END -->
