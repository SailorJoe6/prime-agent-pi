---
id: PAPI-10
title: Explain skill discovery for a chosen directory
status: In Design
assignee: []
created_date: '2026-11-22T22:17:00Z'
updated_date: '2026-11-24T00:57:00Z'
labels: []
milestone: m-5
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/crates/pa-cli/src/skills_command.rs
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/crates/pa-core/src/resources/mod.rs#L630-L737
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/skills.ts#L335-L378
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#skill-discovery-and-invocation
type: feature
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose the session resolver’s decisions in text and JSON. Preserve Pi’s user and explicit overrides; reporting must not activate a skill.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Two directory fixtures produce the same respective winners as session startup.
- [ ] #2 Active, hidden, disabled, shadowed and invalid entries show their source and reason.
<!-- AC:END -->
