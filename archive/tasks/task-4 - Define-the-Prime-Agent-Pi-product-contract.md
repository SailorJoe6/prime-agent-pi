---
id: TASK-4
title: Define the Prime Agent Pi product contract
status: In Design
assignee: []
created_date: '2026-11-01 16:15'
updated_date: '2026-11-06 16:06'
labels: []
dependencies: []
references:
  - 'https://github.com/SailorJoe6/prime-agent-pi'
  - 'https://github.com/SailorJoe6/prime-agent-upstream'
  - 'https://github.com/PrimeIntellect-ai/prime-agent'
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/commit/a1faacd53ac4473a75de1d434afaf50945c2f647
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/7d442aafa985f9342134fac16c2ef41f03fb45c1/scripts/release-platforms.mjs
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/7d442aafa985f9342134fac16c2ef41f03fb45c1/packages/coding-agent/docs/windows.md
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/7d442aafa985f9342134fac16c2ef41f03fb45c1/packages/coding-agent/docs/termux.md
  - 'https://github.com/PrimeIntellect-ai/prime-agent/releases/tag/v0.9.8'
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/7d442aafa985f9342134fac16c2ef41f03fb45c1/packages/coding-agent/src/modes/shared/startup-notices.ts
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/7d442aafa985f9342134fac16c2ef41f03fb45c1/packages/coding-agent/src/utils/version-check.ts
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/7d442aafa985f9342134fac16c2ef41f03fb45c1/packages/coding-agent/src/cli/native-update.ts
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/7d442aafa985f9342134fac16c2ef41f03fb45c1/packages/coding-agent/src/package-manager-cli.ts
documentation:
  - README.md
type: task
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Purpose and authority

TASK-4 establishes Prime Agent Pi’s first coherent product contract. The repository remains mostly inherited upstream content; TASK-2’s critical fix is merged and Done. Inherited README, AGENTS, contribution rules, installers, and release tooling are baseline evidence, not previously adopted Pi policy.

This is discovery, decision recording, and documentation work only. Preserve the live validated runtime, launcher, sessions, rollback route, Git ancestry, immutable releases, and active compatibility. Do not implement product changes, alter branch topology, rename installed commands/packages, change CI or automation, publish/install a release, or restart anything. Historical runtime observations are not a fresh verification of the current installation.

The interview decisions are synthesized below for Joe’s review. The native task remains the living draft until the reviewed canonical document and documentation link are produced. No child specification or implementation is authorized merely by reading this draft.

## Product-contract draft

### 1. Audience, promise, and scope

Prime Agent Pi serves Prime Agent users affected by the upstream Rust rewrite’s removal of Pi-derived extensibility APIs. Retain those APIs while providing equivalent user-facing capabilities, behavior, and applicable bug fixes from released upstream Prime Agent, implemented in the TypeScript/Python architecture. This is an evolving product, not a frozen legacy fork or a promise to duplicate Rust internals.

The near-term finish line is parity with the current stable upstream release. Incorporate new stable releases arriving during catch-up; do not freeze an old target to declare completion. Upstream main, betas, release candidates, and other prereleases are not parity targets. `v0.10.2` is the interview’s working reference, not a newly verified latest-release claim. Record exact released-version evidence during the separate audits.

Local bug fixes are in scope. Parity is a baseline, not a feature ceiling: Joe may explicitly choose Pi-only enhancements from his own needs, user requests, or contributor proposals. Requests are not automatic commitments, and catching up remains the immediate priority. Apply the ordinary specification, review, and validation workflow to accepted work.

Adapt upstream behavior and invariants, not Rust code mechanically. A Rust-only internal defect need not be recreated or fixed in TypeScript when evidence establishes no analogous defect. Architecture differences are not permission to silently omit a user-facing capability or overstate parity. Keep unresolved gaps explicit; bring unavoidable compatibility conflicts to Joe rather than silently breaking integrations or declaring the gap solved.

### 2. Compatibility and user state

Preserve the entire public v0.9.8 TypeScript extensibility surface, including extension hooks, custom tools and commands, and TUI customization—not only APIs Joe uses. Preserve existing Orca and Prime Claw integrations and Python-first execution/model behavior by default. Adapt upstream capabilities around those commitments where possible. Joe must explicitly decide any unavoidable compatibility break before implementation.

Upgrades must reuse existing TypeScript v0.9.8 settings, credentials, extensions, and saved sessions at their current locations. Preserve a rollback route for necessary migrations. Do not require users to start from a fresh Pi-specific configuration.

Treat preservation of these public interfaces, workflows, state, and rollback as the compatibility commitments. Do not extend the promise to private implementation details, Rust-generated state formats, or an unbounded mixed-version daemon matrix. Preserve daemon integration behavior and use the repository’s capability/version rules for wire evolution; specify exact interoperability and migration evidence in the affected engineering task. This does not freeze protocol numbers or authorize an incompatible change without the separate decision required above.

### 3. Versions, channels, and support

The first three public version components identify the released upstream version whose feature/applicable-fix parity Pi has reached. Pi-only bug-fix revisions add a fourth component: `0.10.2.1`, `0.10.2.2`, and so on. Advance the upstream portion to `0.10.3` only after integrating that release’s features and applicable fixes under the compatibility rules, not merely because upstream publishes it. Do not adopt an independent public version series, an indefinite `0.9.x` ceiling, or an assumed next `0.9.9`.

Intentionally defer Pi-only enhancement versioning until the first such feature is selected. Do not assume those features increment the fourth component. This deferral does not block the initial contract or upstream catch-up.

Provide stable as the default channel and preview as an explicit opt-in. Release when changes are ready and validated, not on a weekly/monthly calendar. Maintain only the newest stable line; when stable advances from `0.10.2.*` to `0.10.3.*`, do not promise routine backports to the older line. A preview alone does not supersede stable maintenance. Retain older published releases and immutable legacy downstream releases as available rollback targets; do not move their tags or replace their artifacts.

Public four-component semantics are fixed. The inherited updater and npm tooling currently expect three-component package versions. Resolve valid internal package encoding, ordering, initial revision normalization, and preview representation in the distribution specification, preserving the public meaning and correct update/channel/rollback behavior. These are bounded engineering details, not a reason to reopen the public version policy or change packages during TASK-4.

### 4. Distribution, platforms, and updates

Provide a ready-to-install distribution named `prime-agent-pi`, branded Prime Agent Pi, while retaining the installed `prime-agent` executable for integration compatibility. A future command rename remains Joe’s decision. Host initial packages, checksums, installer, and update metadata in `SailorJoe6/prime-agent-pi` GitHub Releases. Do not launch an npm registry package or separate artifact host initially. Define archive/manifest layout and installer mechanics in the distribution specification. Preserve source installation from the Pi repository through its existing `prime-agent.sh` launcher and the documented setup routes; ordinary users should not be required to install from source.

Match final upstream TypeScript v0.9.8 platform coverage, verified against commit `7d442aafa985f9342134fac16c2ef41f03fb45c1` and the published release assets:

- Native macOS packages: Apple Silicon (`darwin-arm64`) and Intel (`darwin-x64`).
- Native Linux packages: ARM64 glibc and musl; x64 glibc and musl, each with ordinary and baseline/non-AVX2 variants. Together with macOS, these are eight native targets.
- Retain the documented Windows Bash-based setup, including Git Bash or a configured Bash/WSL route. Do not invent a native Windows archive requirement.
- Retain the documented Android Termux source-install route and its limitations, including no image clipboard and unavailable optional native dependencies. Do not invent a native Android archive requirement.

Keep the existing update experience rather than creating a new updater/notification service. Repoint actual version checks, notices, release/download references, update feeds, and applicable fallback/repair links to Pi-owned releases with our versions and changes, never silently to upstream Rust. Honor the user’s selected stable/preview channel.

The inspected TypeScript workflow checks a channel release manifest at startup, shows an update notice directing users to `/update`, and installs through the user-invoked `/update` or `prime-agent update` path. Retain applicable existing confirmation, session restart/restore, and rollback behavior. A notification or public release does not itself authorize background installation or restart. This contract does not run or modify the live update path.

### 5. Publication and release evidence

Automatically publish clearly marked previews for validated code changes merged into Pi product main. Offer them only to opted-in preview users; a preview is not stable promotion or proof of an unfinished parity milestone.

Automatically publish stable, without asking Joe for approval each time, when an explicit stable-version bump is merged into product main and all agreed checks pass for that exact commit and its packages. Ordinary commits without that bump do not publish stable. Define these rules explicitly in the future automation rather than inheriting upstream triggers accidentally.

The five stable-release checks are:

1. Required automated repository checks and tests actually run and pass.
2. Extensibility and integration compatibility checks pass.
3. Packaged install, update, and rollback checks pass in Docker.
4. Evidence supports the upstream parity claimed by the release.
5. Version, release notes, and package checksums identify exactly what was tested.

Docker lifecycle proof is sufficient initially; do not require a new per-platform environment fleet. Record the tested environment and coverage limits. Container success is not proof of untested macOS, Windows, Android, or other OS/architecture behavior, and does not reduce the chosen platform support target. Exact test/artifact mappings belong in the distribution specification; no checks are claimed to have run merely because this contract lists them.

Publication authority does not grant code-merge, scope-change, compatibility-break, or unattended local installation/activation/restart authority. TASK-4 enables no automation or publication.

### 6. Ownership, contributions, and upstream relationship

Allow direct public bug reports, feature requests, and pull requests in the Pi repository, without adopting upstream’s discussion-first or contributor-vouching restrictions. Joe retains final acceptance and code-merge authority, chooses Pi-only enhancements, and decides unavoidable compatibility breaks. Submissions do not automatically become commitments. Keep ordinary in-scope evidence and maintenance lightweight; do not build generalized approval machinery around them.

Record product policy in the canonical contract, accepted work/evidence in provider-native tasks, and release evidence in the associated release records. Concrete validation, provenance, and claimed parity must be reviewable; do not infer policy from inherited scripts or commit messages alone. These are direct records, not a new governance subsystem.

`SailorJoe6/prime-agent-pi` is the independent TypeScript/pi product. `PrimeIntellect-ai/prime-agent` is the fetch-only upstream reference; `SailorJoe6/prime-agent-upstream` preserves upstream/Rust and historical downstream provenance. Preserve ancestry, authorship, licenses, immutable tags, and rollback evidence. Audit stable upstream releases for applicable behavior and adapt justified changes through separate specifications. Never mechanically merge or mirror Rust upstream main into Pi product main. This contract does not mutate the provenance mirror or authorize upstream submissions contrary to upstream’s own rules.

## Baseline-to-contract gap check

These are inherited baselines or historical assumptions to align later, not conflicting Pi policies we previously chose. No cleanup or runtime change is performed here.

| Surface | Later alignment needed |
| --- | --- |
| README and linked installation/development docs | Current source-only Pi guidance and inherited upstream installer/global-command guidance must eventually describe the real Pi packages, repository, platform routes, and updater without directing users to Rust. Do not advertise an installer before it exists. |
| AGENTS release guidance and package metadata | Inherited lockstep/no-major/three-component conventions and upstream workspace identities do not define the approved public four-component Pi policy. Specify internal packaging compatibility without renaming the public executable. |
| CONTRIBUTING and contributor-trust workflow rules | Replace inherited upstream discussion/vouching intake with direct Pi contributions while retaining review/validation and Joe’s merge authority. |
| Release scripts, artifacts, and installer | Existing stable/beta mechanisms, upstream publication defaults, unconfigured installer feed, and legacy release tags are evidence—not a safe approved Pi release recipe. Implement the agreed GitHub distribution, triggers, exact-artifact checks, and immutable rollback preservation. Installer Node minimum guidance also differs from current package engines. |
| Version checks and update paths | The inspected files still use upstream feed/download/recovery identities and three-component version parsing. Repoint the real source and adapt version handling coherently; a changed display link alone is insufficient. |
| Cwd-fix maintenance skill/runbook | Legacy stable-tag transplant and standing publication/installation instructions are not the new product policy. Align references and boundaries separately; retired automations stay disabled until separately authorized work replaces/enables anything. |
| Related native tasks | TASK-1 remains bug-fix intake/audit, not a `0.9.x` product ceiling or feature inventory. TASK-2 is Done/merged; do not reopen it because historical notes describe earlier states. TASK-3 is the separate checkout move; its historical live-state assumptions require its own cutover revalidation, not a TASK-4 runtime action. |

## Completion outputs and minimal follow-up specifications

After Joe approves the synthesized contract:

- Produce the canonical version-controlled product-contract document and a repository documentation link. Keep it concise; do not duplicate this task’s discovery history or build a speculative architecture document.
- Preserve this short baseline gap check for the relevant follow-up work.
- Create the smallest provider-native In Design child specifications for the approved contract, without planning or implementing them. The proposed immediate streams are:
  1. **Released upstream feature-parity inventory and gap specifications.** Inventory released user-facing capabilities against the TypeScript baseline, with exact release evidence and bounded follow-up specifications for missing behavior. Keep TASK-1’s bug audit separate; do not duplicate it, assume it covers new features, or create speculative implementation work before identifying gaps. Later stable releases still enter the ongoing parity goal.
  2. **Pi distribution, updater, and automated release lifecycle.** Specify the coupled public/internal version handling, GitHub packages/installer/feed, existing update experience, stable/preview triggers, compatibility/artifact evidence, Docker lifecycle proof, and preserved rollback releases. Include the necessary repository-facing product/contribution/release/install/maintenance guidance alignment rather than creating a separate generic cleanup program.

Create additional feature/bug implementation specifications only when concrete evidence identifies independently plannable work. Existing TASK-1, completed TASK-2, and TASK-3 remain distinct, unchanged, and unbroadened by this Epic. Do not implement any child task as part of TASK-4.

## Explicit deferrals and review boundary

Pi-only feature versioning is intentionally deferred until the first such feature. Internal package-version encoding, manifest/archive layout, preview identifiers, and concrete daemon interoperability/migration/test mappings belong in referenced engineering specifications constrained by this contract. They must not silently change public versions, compatibility, platform scope, or publication authority. Reopen a product question only for a real conflict, not every engineering choice.

The canonical document/link and child tasks are still completion outputs, not already-produced artifacts. TASK-4 remains In Design for review. No planning, Episode, code branch/worktree, implementation, release, automation activation, installation, restart, path move, or compatibility change is authorized by this synthesis.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A reviewed canonical contract identifies Prime Agent extension users as the audience and promises retained Pi-derived extensibility with evolving TypeScript/Python user-facing feature and applicable-bug-fix parity, not a frozen fork or copied Rust internals.
- [ ] #2 The contract targets current stable upstream releases, incorporates later stable releases during catch-up, excludes main/prereleases as parity targets, keeps gap/evidence claims honest, allows explicitly chosen Pi-only enhancements without automatic request commitments, and prioritizes catch-up.
- [ ] #3 The contract preserves the full public v0.9.8 extension surface, Orca/Prime Claw integrations, Python-first behavior, and existing TypeScript settings/credentials/extensions/sessions at their current locations with rollback-preserving migrations. It states compatibility limits and explicit-break handling without promising Rust-state or unbounded mixed-version daemon compatibility.
- [ ] #4 The contract fixes public upstream-aligned version meaning with fourth-component Pi bug-fix revisions, default stable/opt-in preview channels, readiness-based releases, and newest-stable-line-only maintenance with immutable older rollback releases. Pi-only feature versioning is deliberately deferred; internal encoding/ordering/preview representation is assigned to a constrained engineering specification rather than silently changing public semantics.
- [ ] #5 The contract requires ready-to-install prime-agent-pi distributions with the prime-agent command, initial GitHub Releases hosting without a separate host/npm registry launch, the eight v0.9.8 macOS/Linux native targets plus documented Windows/Termux routes and limits, and the existing notifications/user-invoked updater coherently repointed to Pi-owned selected-channel releases rather than upstream Rust.
- [ ] #6 The contract defines the independent Pi product, upstream reference, and provenance mirror relationship; preserves ancestry/authorship/licenses/immutable release and rollback evidence; audits stable releases and adapts behavior through justified specifications; and prohibits mechanical Rust merges or mirroring into product main.
- [ ] #7 The contract permits direct public reports/requests/PRs with Joe retaining acceptance/merge/scope/break authority. It defines automatic validated-main-code previews and explicit-stable-version-bump publication only after exact-commit/package checks: automated checks/tests run and pass, compatibility passes, Docker install/update/rollback passes, claimed parity has evidence, and versions/notes/checksums identify tested artifacts. Docker lifecycle proof is sufficient initially with honest coverage limits; publication does not grant unattended local installation/restart or other operator authority.
- [ ] #8 The concise canonical product-contract document is version-controlled and linked from repository documentation. A short baseline-to-contract gap check identifies inherited guidance/tooling and stale task assumptions needing later alignment without treating inherited upstream content as adopted Pi policy.
- [ ] #9 After contract approval, each independently plannable follow-up stream has a separate provider-native In Design child specification without premature planning/implementation. Feature-parity inventory remains separate from TASK-1’s bug audit; distribution/version/updater/release and necessary guidance alignment are kept proportionate. TASK-1, completed TASK-2, and TASK-3 remain distinct and unbroadened.
- [ ] #10 TASK-4 changes no product code, live runtime, launcher, installed package/command, CI/automation behavior, branch topology, published release, installation, session, path, or compatibility behavior. All existing runtime/rollback/provenance resources and disabled automation state are preserved.
<!-- AC:END -->
