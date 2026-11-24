---
id: PAPI-49
title: Support offline consent for user-configured Workspace MCP
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-3
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/efb25e2be62507f8a13a157545d031da213abac9/docs/google-workspace-mcp.md
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/ai/src/mcp/oauth.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#adapter-and-mcp-findings
type: feature
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.3 Workspace guide; authorization request parameters and user configuration. These are configured servers, not ready-made Drive/Sheets connectors. No service account, browser login or real grant needed.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A mock configured Google client requests offline access/consent with its declared scopes.
- [ ] #2 A non-Google authorization URL has no Google-only parameters.
- [ ] #3 Setup retains environment-named secret handling and emits no secret in the browser URL.
<!-- AC:END -->
