---
id: TASK-12
title: Define and share named factory machines
status: In Design
assignee: []
created_date: '2026-11-22T22:17:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-cli/src/factory_command.rs
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/prime-agent-runtime/test/test_factory.py
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#factory-workflows-sessions-and-terminal-controls
type: feature
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make validated machine graphs available by name through the harness and library CLI. Preserve existing harness entries and Pi storage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Exporting and importing a document-formatting graph preserves its states and transitions; an invalid reference persists nothing.
- [ ] #2 A stored same-name specification wins. Selecting a library-only machine requires no new harness entry.
<!-- AC:END -->
