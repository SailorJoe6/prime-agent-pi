---
id: PAPI-53
title: Include per-target dependency notices in assembled Pi payload
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-4
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/8980e66f2f07762d62a6c1d73b347a4cac5275cc/scripts/release/assemble_artifacts.py
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/scripts/assemble-release-archives.mjs
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#daemon-terminal-packaging-and-accounting-findings
type: feature
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.4 target-specific third-party notice vs archive assembler; confirmed gap is GENERATION/ASSEMBLY, not a claim about past published bytes or legal compliance. Use Pi dependency closure/eight target matrix; no Rust crate-list copy, no need to first publish/download historical artifact to establish assembler gap.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Assemble target-specific fixture and find license text/attribution for bundled dependency.
- [ ] #2 Target A-only dependency not misrepresented on B.
- [ ] #3 Project license remains.
<!-- AC:END -->
