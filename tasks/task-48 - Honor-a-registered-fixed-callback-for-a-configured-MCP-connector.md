---
id: TASK-48
title: Honor a registered fixed callback for a configured MCP connector
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/8aac8692456c00c01d4e53e60e6d3347a3506559/crates/pa-core/src/mcp/catalog_schema.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/ai/src/mcp/oauth.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#adapter-and-mcp-findings
type: feature
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.1 Slack catalog entry/c3f4ac87b; MCP registration inputs and OAuth request generation. No real callback bind or login. The generic flow gap is confirmed; any claim that Slack was absent from the shipped catalog needs the actual Pi archive/registration metadata first.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A Slack-shaped fixture yields exactly its registered redirect URI.
- [ ] #2 A simulated busy registered port reports a conflict rather than selecting another.
- [ ] #3 An ordinary dynamic-port connector keeps its existing path.
<!-- AC:END -->
