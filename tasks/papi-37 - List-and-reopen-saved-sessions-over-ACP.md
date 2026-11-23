---
id: PAPI-37
title: List and reopen saved sessions over ACP
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/8980e66f2f07762d62a6c1d73b347a4cac5275cc/crates/pa-daemon/src/acp/sessions.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/modes/acp/acp-mode.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#python-shell-and-durable-session-control
type: feature
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.4 session handlers. ACP negotiation/handlers + Pi session catalog. Use existing IDs, history and extension-compatible state; preserve new/close and single-session admission, don’t advertise unsupported load.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A cwd-filtered, cursor-based list skips empty/child entries.
- [ ] #2 Loading a listed ID replays conversation in order before replying, then accepts a prompt in that same session.
- [ ] #3 Unknown ID errors without rebinding.
<!-- AC:END -->
