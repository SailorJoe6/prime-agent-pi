---
id: PAPI-61
title: Build and validate the Prime Agent Pi packaging and release pipeline
status: In Progress
assignee: []
created_date: '2026-11-24T00:57:00Z'
updated_date: '2026-11-24T02:05:00Z'
labels: []
dependencies: []
documentation:
  - docs/product-contract.md
  - docs/pi-release-engineering.md
modified_files:
  - packages/coding-agent/src/utils/pi-release-version.ts
  - packages/coding-agent/test/pi-release-version.test.ts
  - docs/pi-release-engineering.md
  - scripts/pack-prime-agent-release.mjs
  - scripts/pack-prime-agent-pi-local.mjs
  - scripts/smoke-pi-local-pack.mjs
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Slice 1 (AC1–2, partial): defined the shared Pi release identity comparator, stable-default/preview-opt-in selection, and npm-compatible encoding in packages/coding-agent/src/utils/pi-release-version.ts. Local Darwin arm64, Node v25.6.0/npm 11.19.0: npm run check and npm run check:test-policy passed; test/pi-release-version.test.ts passed all 29 cases with Vitest shuffle seeds 61, 62 and 63. A temporary encoding/ordering/selection mutation failed 28 cases and was restored before seed 63. This is fixture evidence only; no package artifacts, registry-independent lockstep staging, CI, Docker lifecycle, or consumer wiring proven. Next: stage the pack-only manifests and prove local pack/install of the lockstep dependencies before building the platform matrix. No acceptance box checked, version bumped, or release published.

Handoff: the owning Conversation accepted slice 1 at code e835c05a8b5b523db3a088494e15ad2604d004b5 / Backlog 9acd30662ead83977c4e0fb330bd7cf0131519fb after independent review found no material versioning defect. The next bounded slice is isolated pack-only lockstep manifest staging and local pack/install without using a registry as a distribution endpoint; keep Prime Agent Pi branding, the prime-agent executable, source versions and public extension imports. Record actual evidence and limits and stop before the eight-target matrix. No inherited publishing, public version bump, tag, release, merge or live install/activation.

Slice 2 (AC1–2, partial): isolated pack-only local Pi manifests and SHA-256 receipt; all four staged packages used 0.10.2-preview.3+pi.10 for public fixture 0.10.2.10 preview 3; source manifests and lockfile unchanged. On Darwin arm64 (Node 25.6.0/npm 11.19.0), npm installed 272 packages offline with lifecycle scripts disabled using the workspace lock and warm third-party npm cache. The installed lock resolved every Pi package to its local tarball, and the installed prime-agent loaded a fixture extension importing runtime exports under the four existing public package names. A tampered tarball failed checksum verification. Both npm run check and npm run check:test-policy passed. Commands, four hashes and limits are in docs/pi-release-engineering.md. Fixture only, not native matrix, runtime public version display, release CI, or Docker lifecycle proof. No version bump, release, tag, merge or live runtime change; all ACs remain unchecked.

Handoff: the owning Conversation accepted slice 2 at code 8110435d5bbda284bae3f34b813220bb3c425725 / Backlog c46ec0be4b2ccd851b9dc97f1172055cf4fa4d45. Independent review matched the four fixture checksums and internal tarball dependencies and found no material defect. The warm-cache local fixture is not exact-commit release evidence. Next bounded slice: wire and validate the nonpublishing eight-target native archive build using existing builders, with Pi artifact identity, the prime-agent executable, runtime assets, licenses, and per-target checksum/source receipts. Report actual coverage and any unavailable runners or production catalog inputs; do not count fixtures as release proof. Stop for review before installer/feed integration. No inherited R2/npm publication, public bump, release, tag, merge, or operator-runtime install/activation.
<!-- SECTION:NOTES:END -->
