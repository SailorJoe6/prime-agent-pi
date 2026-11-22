---
id: TASK-32
title: Recover elapsed time for an interrupted tool call
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/8aac8692456c00c01d4e53e60e6d3347a3506559/crates/pa-agent/src/agent_loop/tool_call.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/modes/interactive/components/ipython-cell.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#daemon-terminal-packaging-and-accounting-findings
type: feature
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.1 records start, heartbeat and elapsed-on-abort. Tool lifecycle/history and event consumers, not new tool execution. Additive data; old transcripts and extension events remain readable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Start a quiet fixture tool and observe its start and later elapsed progress.
- [ ] #2 Abort then reopen its record to see aborted status and elapsed time.
- [ ] #3 No later ticks after settle.
<!-- AC:END -->
