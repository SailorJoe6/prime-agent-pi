---
id: PAPI-61
title: Build and validate the Prime Agent Pi packaging and release pipeline
status: In Design
assignee: []
created_date: '2026-11-24T00:57:00Z'
labels: []
dependencies: []
documentation:
  - docs/product-contract.md
type: task
ordinal: 61000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Deliver the reusable Prime Agent Pi packaging and release path required by docs/product-contract.md so verified upstream parity milestones can ship actual installable stable releases. The current TypeScript product is source-installable; inherited pack/build code is reusable, but its R2/npm publication and updater defaults are not the Pi product delivery path. Keep this work separate from PAPI-1 bug-fix intake and from per-release parity implementation. Do not assign a stable version before parity and artifact evidence exist.

Build and validate without publishing as part of this design task's initial engineering work. The resulting workflow must support validated opted-in previews and gate stable publication on an explicit stable bump merged into canonical product main plus the exact contract checks. Preserve immutable legacy rollback targets, user state, existing public extensibility, Orca and Python-first workflows; do not activate or restart the operator's installation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Build a ready-to-install distribution branded Prime Agent Pi (`prime-agent-pi`), retaining `prime-agent` as executable. Verify package/installer layout and checksums for the eight contract native targets; retain documented Windows Bash and Android Termux routes and source installation.
- [ ] #2 Define and test public three/four-component version ordering and valid internal package encoding, including initial revision, stable/preview selection, and rollback ordering.
- [ ] #3 Use Pi-owned GitHub Releases for packages, installer, checksums and update metadata. Repoint existing version notices, update and repair paths without Rust or npm-registry fallback; stable is default and preview is opt-in. Preserve user-invoked install/update and rollback behavior.
- [ ] #4 Prove from an exact commit and artifact checksums: required checks, compatibility and Docker install → update → rollback with preserved user state. Document platform coverage limits and use nonpublishing fixtures before any live release.
- [ ] #5 Show that validated main changes can produce marked immutable previews, while stable requires an explicit merged stable bump, parity evidence and all five contract checks for the exact artifact set. No initial public version bump, release/tag publish, or live runtime activation is part of this task.
<!-- AC:END -->
