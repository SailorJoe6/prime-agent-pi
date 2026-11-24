---
id: PAPI-18
title: Preview a fresh root prompt offline
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-0
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-cli/src/prompt_command.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/cli/command-registry.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#commands-installation-and-terminal-controls
type: feature
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose the effective fresh-root prompt in the public CLI. Keep Pi resource resolution and Python tools; do not promise to reproduce live extension or session-time changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Text and JSON identify instructions and static versus dynamic content for a fixture directory.
- [ ] #2 Changing cwd or model reflects its prompt inputs without a provider call, worker or saved session.
<!-- AC:END -->
