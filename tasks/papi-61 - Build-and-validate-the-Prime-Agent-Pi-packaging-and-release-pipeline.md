---
id: PAPI-61
title: Build and validate the Prime Agent Pi packaging and release pipeline
status: In Planning
assignee: []
created_date: '2026-11-24T00:57:00Z'
updated_date: '2026-11-24T01:43:00Z'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Define the release identity and asset contract (AC1–2). Keep source/workspace versions unchanged on this ticket. For staged packages, map public `X.Y.Z` to revision zero and `X.Y.Z.R` to a positive numeric repair revision. Use npm-valid build metadata for repair identity (`X.Y.Z+pi.R`) and a numeric preview sequence in a `-preview.N` suffix before any build metadata. Do not use npm SemVer precedence for repair ordering: use one numeric public-version/channel comparator in installer, updater and release selection; test zero normalization, revision 2→10, next parity line, preview sequence, stable promotion, rollback and malformed inputs. Verify the staged package and lockstep dependency manifests can pack/install without the registry as a distribution endpoint; carry public version and source SHA separately in archive metadata, filenames and runtime version output.

2. Build the eight-target matrix and Pi-owned delivery path (AC1, AC3). Reuse `scripts/release-platforms.mjs`, `scripts/assemble-release-archives.mjs`, the pack-only entry and native-build jobs. Build named Prime Agent Pi artifacts retaining `prime-agent`, runtime assets and license notices. Generate a tagged release manifest keyed by channel and target, installer, SHA256SUMS, and source/asset receipts; discover complete published releases from the Pi repo and consume immutable tagged assets, not a moving preview tag or R2 feed. Test target selection and reject missing or mismatched assets before changing the active binary. Preserve source launcher, Windows Bash and Termux routes; document what each route supports.

3. Adapt the existing lifecycle (AC3–4). Trace the installer, `utils/version-check.ts`, startup notices, `/update`, `cli/native-update.ts`, and restart/restore and repair links. Keep stable as default and preview explicitly selected. Keep notices check-only; preserve confirmation, CLI and interactive update/rollback, existing session restore, and intentional local/legacy recovery routes. Never silently install from upstream Rust/R2 or the npm registry. Exercise absent or incomplete feed, wrong checksum, failed replacement, and explicit rollback in disposable environments. Preserve sessions, settings, credentials, skills and extensions; do not touch the operator runtime.

4. Enforce publication rules on the tested bytes (AC4–5). Separate validation/build from the GitHub writer. For canonical product-main code changes, permit marked prereleases only after validation. For stable, require an explicit committed public stable bump and every §5 check, including parity evidence for the exact claim. Tie required CI and compatibility results, release notes, manifest and checksums to one commit/artifact set; promote only those artifacts, never rebuild at publish time. Fail closed on missing evidence, wrong repository/ref/SHA, incomplete assets, or an existing conflicting tag/release; do not rewrite old releases. Test ordinary main, explicit bump, non-main/tag/manual and failing/mismatched-gate cases with no write credentials and a fixture publisher. Do not invoke inherited R2/npm publish paths, bump a real version, create a tag, publish a release or merge on this ticket.

5. Prove and document the candidate (AC1–5). Run `npm run check`, `npm run check:test-policy`, changed focused suites and the required CI jobs for the exact candidate; use real release inputs for artifact evidence and distinguish fixture-only checks. Map eight archive/target receipts to checksums. In Docker with disposable HOME and local release fixtures, install an older package, update through the existing user path, verify version and user-state continuity, then roll back to the known bytes and reopen saved state. Smoke-test public extension imports, Orca/Prime Claw integration and Python-first behavior without paid provider calls. Record commands, run IDs, source SHA, checksums, image/architecture and actual coverage limits in release engineering docs and the task evidence. Leave parity closure and the first stable bump to their separate work.
<!-- SECTION:PLAN:END -->
