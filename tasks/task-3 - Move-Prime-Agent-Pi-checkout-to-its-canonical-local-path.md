---
id: TASK-3
title: Move Prime Agent Pi checkout to its canonical local path
status: In Design
assignee: []
created_date: '2026-11-01 03:12'
labels: []
dependencies: []
references:
  - 'https://github.com/SailorJoe6/prime-agent-pi'
  - /Users/jlanders/code/prime-agent
  - /Users/jlanders/.bun/bin/prime-agent
type: task
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Outcome
Move the canonical local checkout for `SailorJoe6/prime-agent-pi` from `/Users/jlanders/code/prime-agent` to `/Users/jlanders/code/prime-agent-pi` without changing the validated runtime release or losing Git, Orca, session, schedule, or rollback state.

## Current context
The current absolute path is still embedded in the live launcher and runtime source location. Orca still identifies the checkout by its former upstream repository identity. Registered Git worktrees, saved sessions, active or historical terminal state, maintenance records, and other durable references may contain the old path. The current live runtime is the validated TypeScript `cwd-fix-v0.9.8-r1` release; this migration must not become a Rust adoption, version upgrade, package rename, or runtime replacement.

## Required behavior
- Prove the complete path-migration and rollback procedure first on a disposable fixture that represents the main checkout, linked worktrees, launcher, Orca registration, and old-path references.
- Obtain a separate explicit maintenance-window authorization before implementation. Quiesce relevant Prime Agent activity, sessions, terminals, and other path-sensitive processes before changing the live checkout.
- Move the canonical checkout to `/Users/jlanders/code/prime-agent-pi` while preserving repository identity, branches, remotes, tags, ignored provider state, and every registered linked worktree.
- Repair and verify Git worktree metadata and any maintained absolute-path references that must follow the canonical checkout.
- Update or recreate the Orca registration so it points to the new path and the independent `SailorJoe6/prime-agent-pi` repository identity, without orphaning unrelated Orca resources.
- Update the live launcher and other current operational references to the new canonical path. Preserve the existing release, build, schema, sessions, schedules, and rollback route.
- Create a temporary compatibility symlink from `/Users/jlanders/code/prime-agent` to `/Users/jlanders/code/prime-agent-pi` so saved sessions and historical callers that still use the old path remain usable during cleanup.
- Restart only as required by the approved cutover and verify the same validated runtime. Do not launch a second daemon or silently fall back to another installation.
- If cutover verification fails, restore the prior checkout, launcher, Git worktree, Orca, and runtime state through a documented rollback rather than leaving a partially migrated system.
- Remove the compatibility symlink only after proving that no required live references depend on it, or after the operator explicitly accepts the identified residual breakage.

## Non-goals
This task does not change Prime Agent Pi product versioning, package or command identity, runtime features, provider choice, or release policy. It does not adopt Rust, upgrade beyond `cwd-fix-v0.9.8-r1`, delete immutable historical records, or authorize implementation merely by approving this specification.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The canonical clean checkout resolves at `/Users/jlanders/code/prime-agent-pi`, retains the intended `SailorJoe6/prime-agent-pi` remotes and validated code head, and `/Users/jlanders/code/prime-agent` resolves through the approved temporary compatibility symlink.
- [ ] #2 Every Git worktree registered immediately before the maintenance window remains registered, points to the correct moved location, preserves its branch and head, and passes Git worktree integrity checks after cutover.
- [ ] #3 Orca identifies the canonical checkout at the new path under the independent Prime Agent Pi repository identity, while unrelated Orca worktrees, terminals, and resources remain unchanged.
- [ ] #4 The live launcher and maintained operational path references use `/Users/jlanders/code/prime-agent-pi`; immutable historical records are preserved rather than rewritten.
- [ ] #5 After the required restart, the effective runtime is still `cwd-fix-v0.9.8-r1` with the same supported build/schema behavior, sessions and schedules remain available, the rollback route remains valid, and no duplicate daemon or fallback installation is running.
- [ ] #6 External-cwd startup, existing session resume, task-provider access, Python-first behavior, extension loading, and Orca integration work through the new canonical path; old-path callers needed during transition work through the compatibility symlink.
- [ ] #7 A disposable rehearsal proves both cutover and rollback before the live maintenance window, and any failed live verification restores the prior checkout, launcher, worktree, Orca, and runtime state without partial migration.
- [ ] #8 The compatibility symlink is retained until a recorded scan and operational verification find no required live old-path references, unless the operator explicitly accepts each remaining breakage before removal.
- [ ] #9 Implementation starts only after separate planning and explicit maintenance-window authorization; specification approval alone performs no move, launcher edit, restart, worktree repair, Orca mutation, or symlink creation.
<!-- AC:END -->
