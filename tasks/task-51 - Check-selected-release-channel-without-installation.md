---
id: TASK-51
title: Check selected release channel without installation
status: In Design
assignee: []
created_date: '2026-11-22T22:19:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-cli/src/update_flow/update_command.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/cli/command-registry.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#commands-installation-and-terminal-controls
type: feature
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.0 check, archive and source paths, 763094e1:crates/pa-cli/src/installer_update.rs; Pi 6cd28f90:packages/coding-agent/src/cli/public-command.ts update option set excludes --check. Existing startup notices/rollback not missing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Current vs newer Pi manifest yields distinguishable verdict.
- [ ] #2 Stable ignores preview unless selected.
- [ ] #3 No install, restart or channel-setting writes.
<!-- AC:END -->
