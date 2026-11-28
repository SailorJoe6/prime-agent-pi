---
id: PAPI-29
title: Create a user-owned session inside the roster scope
status: In Planning
assignee: []
created_date: '2026-11-22T22:18:00Z'
updated_date: '2026-11-28T19:30:00Z'
labels: []
milestone: m-0
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/2231687fcdaf2b53b3e932d92192c5696397a1d8
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/modes/agents-view/agents-view-mode.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#commands-installation-and-terminal-controls
type: feature
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.0 scoped new session. Agents view + daemon create. No worker spawn, child ownership, or change to RLM depth policy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Scoped New in A (different cwd from launch) opens a user session one level below A in A’s cwd.
- [ ] #2 Back returns to that row in A.
- [ ] #3 Unscoped New remains a root.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Match released v0.10.0 (`763094e1b6a7c17450ee8399b06cda1853847ca5`): see `crates/pa-tui/src/agents_view/data_input.rs` (New), `interactive.rs` (create config), and `interactive/run.rs` (view/chat loop). In Pi, use the roster's resolved scope root A, not its highlighted row or launch config, for the parent identity and A’s cwd. Keep the normal root New path unchanged when unscoped or when there is no saved parent to bind, as in the release.
2. Extend the existing ordinary daemon create path (`agents-view-mode.ts`, `daemon-supervisor.ts`, `daemon-mode.ts`) only as needed to create a fresh, user-owned session one level below A. Keep roster/display lineage separate from worker lifecycle and RLM ownership; do not call spawn, mint worker IDs, change depth policy, or treat it as a fork. Preserve user state and ordinary create/resume behavior. If wire data changes, use the repository’s capability/schema and compatibility test rules; an older daemon must not silently create the wrong session for a supported scope.
3. Reuse the roster’s open/back and selection state so returning from the new chat retains A’s scope and selects the exact created row. Keep existing navigation for other rows and root New.
4. Prove through the roster action and daemon create/readback with offline fixtures: distinct launch and A directories, a fresh user-owned row directly under A (not a spawned child), Back restoring A and the exact created selection, and unscoped New still creating a root. Use existing agents-view and daemon suites, with a failing regression control; run changed tests directly and the required project/test-policy checks. Add a coding-agent changelog fragment and update the scoped New entry in the parity inventory without claiming adjacent features.
<!-- SECTION:PLAN:END -->
