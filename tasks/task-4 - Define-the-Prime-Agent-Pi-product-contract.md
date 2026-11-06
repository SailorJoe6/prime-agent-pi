---
id: TASK-4
title: Define the Prime Agent Pi product contract
status: In Design
assignee: []
created_date: '2026-11-01 16:15'
updated_date: '2026-11-06 15:19'
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
documentation:
  - README.md
type: task
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Context

Prime Agent Pi is now an independent TypeScript/pi product in `SailorJoe6/prime-agent-pi`, with full upstream ancestry and a separate `SailorJoe6/prime-agent-upstream` provenance mirror. The installed runtime remains the validated `cwd-fix-v0.9.8-r1` baseline, but the future product contract is not yet coherent. Decisions about product scope, compatibility, versioning, packaging, distribution, and governance are currently spread across brainstorming and operational history rather than one reviewable source of truth.

The repository remains mostly inherited upstream content. One critical bug has been fixed and merged as TASK-2; other product changes are intentionally held until the product-contract decisions are made. Inherited README, AGENTS, release tooling, and other material are baseline evidence, not adopted Prime Agent Pi policy. This task establishes the first coherent Pi product contract rather than reconciling policies already chosen for Pi.

This task is the product-contract thought-work Epic. It is discovery and decision work. It does not authorize implementation.

## Outcome

Produce one reviewed, version-controlled Prime Agent Pi product contract that makes subsequent release, packaging, compatibility, feature, and maintenance work ready for separate specification. Resolve the coupled product decisions together without turning routine evidence or maintenance into unnecessary approval machinery.

## Interview direction

Conduct an interviewer-led Q&A with Joe, one material question at a time. Keep settled answers in this living task, then produce the concise canonical product contract and the smallest separate implementation specifications. Do not infer product choices from inherited upstream documentation or tooling.

Joe set the nearest-term goal as reaching parity with the current upstream release, integrating new upstream features and fixing upstream-discovered bugs that also affect Prime Agent Pi. `v0.10.2` is the working comparison target, not a freshly verified latest-release claim; TASK-1 owns the stable-release audit. This replaces the earlier assumption that scope is limited to selected enhancements without a parity goal; it does not authorize implementation, Rust adoption, or mechanical Rust merges.

### Settled: capability-and-behavior parity

Parity means providing the same user-facing capabilities and behavior and fixing the same applicable bugs, implemented in Prime Agent Pi’s TypeScript/Python architecture. Matching upstream Rust internals is not a goal; an internal Rust change alone does not require copying its implementation. Allowed parity exceptions beyond the compatibility rule below, release-channel eligibility, and the ongoing catch-up commitment remain open interview decisions.

### Settled: preserve existing compatibility by default

When an upstream change conflicts with existing Orca or Prime Claw integrations, TypeScript extensions, or Python-first workflows, preserve those by default and adapt the upstream capability around them. Do not break compatibility automatically in pursuit of parity. Bring any unavoidable compatibility break to Joe as an explicit product decision before implementation. This is not blanket approval for an exception or a break; the treatment of a specific unavoidable conflict remains for that decision.

### Settled: parity with released upstream versions is the finish line

Catch-up is complete when Prime Agent Pi reaches the agreed capability-and-behavior parity with current released upstream versions, not merely when a frozen historical target is completed and not by matching upstream main. Incorporate later upstream releases that arrive during catch-up rather than automatically deferring them to another cycle to preserve a fixed finish line. Joe rejected that fixed-target approach because upstream does not change too often to catch up. Record exact released-version comparison revisions for evidence, not as permission to declare success while relevant newer released changes remain unaddressed. Upstream main is not the parity target. The previously settled compatibility rule still applies. Whether published prereleases qualify remains an open release-channel decision.

### Settled: audience and product purpose

Prime Agent Pi is intended to help any Prime Agent user affected by the removal of the Pi-derived extensibility APIs in the upstream Rust rewrite, not only Joe’s personal workflows. Its principal reason for existing is to retain those extensibility APIs while providing the same feature updates and applicable bug fixes that upstream releases receive. This is an extensible TypeScript/Python continuation with released-upstream capability-and-behavior parity, not a frozen legacy fork. This audience decision does not by itself create a support-service commitment, platform matrix, or compatibility promise beyond the separately settled rules.

### Settled: full public v0.9.8 extensibility baseline

Preserve the entire public extensibility surface from the final upstream TypeScript release, v0.9.8, not only APIs used in Joe’s own workflows. The commitment includes extension hooks, custom tools and commands, and TUI customization. The previously settled compatibility rule applies: preserve compatibility by default and require Joe’s explicit decision before implementing an unavoidable break. This public-surface commitment does not turn private implementation details into supported APIs or freeze internal architecture.

### Settled: upstream-aligned product version with a Pi revision

Use the first three version components to identify the released upstream version whose feature and applicable-bug-fix parity Pi has reached. Track Pi’s own fixes against that baseline with a fourth component: `0.10.2.1`, `0.10.2.2`, and so on. Advance to `0.10.3` only after integrating that released version’s features and applicable fixes under the settled compatibility rules, not merely because upstream published it. Joe explicitly confirmed this readback after noting speech-to-text errors in the original proposal. This replaces the interviewer’s independent-version-series recommendation. Whether Pi revisions also include independently approved enhancements remains open.

The four-numeric-part product version is not valid npm SemVer. Preserve the approved upstream-version-plus-Pi-revision meaning; machine/package encoding, ordering, initial fourth-component convention, and the relationship to immutable legacy cwd-fix tags remain to be resolved with distribution decisions. This task does not change manifests, tags, installers, release scripts, or the installed runtime.

### Settled: retain the public prime-agent command for now

The public executable must remain `prime-agent` to keep existing systems’ Prime Agent integrations functional. Do not adopt the interviewer’s suggested `prime-agent-pi` command as the current contract. Joe may choose to change the command in the future; this is the present compatibility requirement, not an irrevocable naming promise or authorization for a later rename. Package/distribution identity is decided separately below. Configuration/state and updater identities and the installation mechanism remain open. This interview makes no launcher or command changes.

### Settled: ready-to-install prime-agent-pi distribution

Provide a ready-to-install public package rather than requiring ordinary users to install from a source checkout. Joe delegated the package name choice; use `prime-agent-pi` as the public package/distribution identity and Prime Agent Pi as the product name, while installing the previously agreed `prime-agent` executable. A distinct distribution name does not authorize renaming that executable or inherited source workspaces during this task. Platform coverage is decided below. The package format, delivery channel, registry-specific availability or scope, installer/update behavior, and any source-install policy beyond the preserved platform routes remain to be specified. No package is created, reserved, published, or installed by this interview decision.

### Settled: retain the final upstream TypeScript platform coverage

Joe chose the same platform coverage as upstream’s final Pi-based release, v0.9.8 (`7d442aafa985f9342134fac16c2ef41f03fb45c1`), rather than a newly narrowed set. Keep the distinction between shipped native packages and additional documented setup routes:

- Native packages: macOS Apple Silicon (`darwin-arm64`) and Intel (`darwin-x64`); Linux ARM64 on glibc and musl; Linux x64 on glibc and musl, each with ordinary and baseline/non-AVX2 variants. These are the eight targets in tagged `scripts/release-platforms.mjs`, corroborated by the actual v0.9.8 GitHub release assets.
- Windows: retain the documented Bash-based setup, including Git Bash or another configured Bash/WSL route. The v0.9.8 Windows guide exists, but the release shipped no Windows native archive; this decision does not invent a native Windows package requirement.
- Android: retain the documented Termux source-install route with its existing limitations, including text-only clipboard integration and unavailable optional native dependencies. The release shipped no Android native archive.

Evidence: the exact-tag release-platform source and `packages/coding-agent/docs/windows.md` and `termux.md`, plus https://github.com/PrimeIntellect-ai/prime-agent/releases/tag/v0.9.8. This is verified historical support intent/artifact coverage, not a claim that Pi has already been tested on all those systems. Preserve the coverage and document/test the respective routes during separately authorized implementation; do not silently promote supplemental setup notes into stronger native-package guarantees.

## Required decisions

- Define the intended users, core use cases, product promise, and the reason Prime Agent Pi exists separately from upstream Prime Agent.
- Define the product boundary and parity goal: how new upstream features, applicable upstream bug fixes, local fixes, and incompatible upstream architecture are evaluated. Specify observable parity, any justified exceptions, and ongoing intake expectations without reducing the product to a frozen fork or assuming identical Rust architecture.
- Define the compatibility contract for Orca, Prime Claw, the TypeScript extension surface, Python-first execution, saved sessions, daemon protocol behavior, and rollback. Distinguish hard compatibility requirements from best-effort behavior and state how an intentional incompatibility would be proposed.
- Complete the upstream-version-plus-Pi-revision model: resolve exact spelling and machine/package encoding, initial revision convention, ordering, release channels, release cadence, support window, and the relationship to immutable downstream runtime releases. Do not assume an indefinite `0.9.x` line or next `0.9.9` release.
- Provide a ready-to-install `prime-agent-pi` public package/distribution while retaining the `prime-agent` executable for current integration compatibility, with a possible future command rename left to Joe. Match the final upstream TypeScript platform coverage and complete package-format, delivery-channel, installer/update, platform-validation, and source-install decisions. Address the risk that the upstream Prime Agent installer installs the Rust product rather than Prime Agent Pi.
- Define the relationship to `PrimeIntellect-ai/prime-agent` and `SailorJoe6/prime-agent-upstream`: what is mirrored, what is audited, what may be adapted, and what must never be merged mechanically into product `main`.
- Define lightweight feature and release governance: who decides, what evidence is required, how decisions are recorded, and which changes require explicit operator authority. Prefer direct product decisions over generalized approval infrastructure.
- Identify the smallest set of child specifications needed to implement the contract. Keep maintenance intake (`TASK-1`), the RLM settlement bug (`TASK-2`), and the local checkout rename (`TASK-3`) as distinct work rather than absorbing them into this Epic.

## Deliverables

- A canonical version-controlled product-contract document linked from the repository documentation.
- Provider-native child tasks for each independently plannable implementation stream revealed by the approved contract, without prematurely planning or implementing them.
- A short baseline-to-contract check against the inherited README, AGENTS, maintenance material, task specifications, release artifacts, and installer guidance. Identify later changes needed to match the approved contract without treating inherited upstream content as adopted Pi policy or starting premature cleanup.

## Constraints

- Preserve the current validated runtime, launcher, sessions, rollback route, repository ancestry, immutable tags, and active compatibility while this thought-work is performed.
- Do not adopt Rust, change the live runtime, rename packages or commands, publish a release, enable automation, or modify compatibility behavior as part of this task.
- Use the existing repository and research evidence. Record uncertainty explicitly instead of inventing policy.
- Ask material product questions one at a time. Keep the resulting contract concise enough to guide work rather than becoming a speculative architecture document.

## Non-goals

- Performing the stable-release audit in `TASK-1`.
- Reopening or broadening the completed and merged `TASK-2` fix.
- Moving the local checkout in `TASK-3`.
- Building maintenance automation, changing CI, publishing packages, or cutting a release.
- Implementing any child task created from the approved product contract.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The contract identifies Prime Agent users affected by the Rust rewrite’s removal of Pi-derived extensibility APIs as the intended audience. It states the core promise: retain those APIs while providing the same user-facing feature updates and applicable bug fixes as released upstream versions, without reducing the product to a frozen legacy fork.
- [ ] #2 The contract defines capability-and-behavior parity with released upstream user-facing features and applicable bug fixes, implemented in Prime Agent Pi’s TypeScript/Python architecture rather than by matching Rust internals. Catch-up finishes at parity with current released versions, not upstream main or completion of a frozen historical target; later upstream releases arriving during catch-up are incorporated. The contract specifies released-version comparison evidence, release-channel eligibility, architecture and compatibility conflict handling, any justified exceptions, and ongoing intake expectations alongside local fixes.
- [ ] #3 The contract preserves the entire public v0.9.8 extensibility surface, including extension hooks, custom tools and commands, and TUI customization, not only APIs Joe uses. It preserves existing Orca and Prime Claw integrations and Python-first workflows by default when upstream parity conflicts with them, adapting upstream capabilities where possible and requiring Joe’s explicit decision before implementing an unavoidable compatibility break. It also identifies hard and best-effort commitments for saved sessions, daemon protocol behavior, and rollback, including how intentional incompatibilities are proposed.
- [ ] #4 The contract uses the released upstream version as the first three components and a fourth Pi revision for local fixes, such as `0.10.2.1` and `0.10.2.2`, advancing to a new upstream version only after integrating its released features and applicable fixes under the compatibility rules. It resolves machine/package encoding for the four-part product version, initial revision convention, ordering, release channels, cadence, support window, and relationship to immutable legacy runtime releases without inheriting an indefinite `0.9.x` or next-`0.9.9` assumption.
- [ ] #5 The contract requires a ready-to-install `prime-agent-pi` distribution while retaining the `prime-agent` command, with any future command rename left to Joe. It preserves v0.9.8’s eight macOS/Linux native targets (macOS arm64/x64; Linux arm64 glibc/musl; Linux x64 glibc/musl with ordinary and baseline variants) and its additional documented Windows Bash-based and Android Termux setup routes, without inventing Windows/Android native archives. It defines package format, delivery channel, platform validation, installer/update and source-install policy, resolves registry-specific naming constraints, and addresses the upstream installer’s Rust-product behavior without publishing or installing anything in this task.
- [ ] #6 The contract defines the product’s relationship to `PrimeIntellect-ai/prime-agent` and `SailorJoe6/prime-agent-upstream`, including stable-release intake, provenance preservation, adaptation boundaries, and the prohibition on mechanical Rust merges into product `main`.
- [ ] #7 The contract defines lightweight feature and release decision ownership, required evidence, durable recording, and explicit-authority boundaries without creating generalized approval machinery for ordinary observations or maintenance.
- [ ] #8 A canonical version-controlled product-contract document is linked from repository documentation, and a baseline-to-contract check identifies inherited material or stale task claims needing separate correction without treating inherited upstream documentation or tooling as adopted Pi policy.
- [ ] #9 Each independently plannable implementation stream revealed by the approved contract has a separate provider-native `In Design` child task; `TASK-1`, `TASK-2`, and `TASK-3` remain distinct and are not broadened by this Epic.
- [ ] #10 No product code, runtime, launcher, package, command, automation, branch topology, release artifact, installation, session, or compatibility behavior is changed while completing this thought-work Epic.
<!-- AC:END -->
