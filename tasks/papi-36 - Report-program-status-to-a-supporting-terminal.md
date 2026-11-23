---
id: PAPI-36
title: Report program status to a supporting terminal
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/9cff13ca513dc2642a4a24474838b7653a97c73e
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/tui/src/terminal.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#commands-installation-and-terminal-controls
type: feature
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.4 terminal program-status handshake. Terminal transport + interactive run lifecycle. Existing status line remains, no pressure on unsupported hosts, print or extension output.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A responding fixture terminal observes working through a multi-step run and done at normal completion.
- [ ] #2 A terminal that never acknowledges receives no status reports.
- [ ] #3 Late acknowledgement after exit does not emit status.
<!-- AC:END -->
