---
id: TASK-4
title: Define the Prime Agent Pi product contract
status: In Design
assignee: []
created_date: '2026-11-01 16:15'
updated_date: '2026-11-06 15:44'
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

Parity means providing the same user-facing capabilities and behavior and fixing the same applicable bugs, implemented in Prime Agent Pi’s TypeScript/Python architecture. Matching upstream Rust internals is not a goal; an internal Rust change alone does not require copying its implementation. Allowed parity exceptions beyond the compatibility rule below and the ongoing catch-up commitment remain open interview decisions.

### Settled: preserve existing compatibility by default

When an upstream change conflicts with existing Orca or Prime Claw integrations, TypeScript extensions, or Python-first workflows, preserve those by default and adapt the upstream capability around them. Do not break compatibility automatically in pursuit of parity. Bring any unavoidable compatibility break to Joe as an explicit product decision before implementation. This is not blanket approval for an exception or a break; the treatment of a specific unavoidable conflict remains for that decision.

### Settled: parity with released upstream versions is the finish line

Catch-up is complete when Prime Agent Pi reaches the agreed capability-and-behavior parity with current released upstream versions, not merely when a frozen historical target is completed and not by matching upstream main. Incorporate later upstream releases that arrive during catch-up rather than automatically deferring them to another cycle to preserve a fixed finish line. Joe rejected that fixed-target approach because upstream does not change too often to catch up. Record exact released-version comparison revisions for evidence, not as permission to declare success while relevant newer released changes remain unaddressed. Upstream main is not the parity target. The previously settled compatibility rule still applies. Only stable upstream releases define the parity target. Betas, release candidates, other prereleases, and upstream main do not expand that target. This is not a frozen-version policy: incorporate new stable upstream releases during catch-up. Pi’s own stable and preview channels are defined separately below; upstream prereleases remain excluded from the parity target.

### Settled: audience and product purpose

Prime Agent Pi is intended to help any Prime Agent user affected by the removal of the Pi-derived extensibility APIs in the upstream Rust rewrite, not only Joe’s personal workflows. Its principal reason for existing is to retain those extensibility APIs while providing the same feature updates and applicable bug fixes that upstream releases receive. This is an extensible TypeScript/Python continuation with released-upstream capability-and-behavior parity, not a frozen legacy fork. This audience decision does not by itself create a support-service commitment, platform matrix, or compatibility promise beyond the separately settled rules.

### Settled: full public v0.9.8 extensibility baseline

Preserve the entire public extensibility surface from the final upstream TypeScript release, v0.9.8, not only APIs used in Joe’s own workflows. The commitment includes extension hooks, custom tools and commands, and TUI customization. The previously settled compatibility rule applies: preserve compatibility by default and require Joe’s explicit decision before implementing an unavoidable break. This public-surface commitment does not turn private implementation details into supported APIs or freeze internal architecture.

### Settled: upstream-aligned product version with a Pi revision

Use the first three version components to identify the released upstream version whose feature and applicable-bug-fix parity Pi has reached. Track Pi’s own fixes against that baseline with a fourth component: `0.10.2.1`, `0.10.2.2`, and so on. Advance to `0.10.3` only after integrating that released version’s features and applicable fixes under the settled compatibility rules, not merely because upstream published it. Joe explicitly confirmed this readback after noting speech-to-text errors in the original proposal. This replaces the interviewer’s independent-version-series recommendation. Whether Pi revisions also include independently approved enhancements remains open.

The four-numeric-part product version is not valid npm SemVer. Preserve the approved upstream-version-plus-Pi-revision meaning; machine/package encoding, ordering, initial fourth-component convention, and the relationship to immutable legacy cwd-fix tags remain to be resolved with distribution decisions. This task does not change manifests, tags, installers, release scripts, or the installed runtime.

### Settled: retain the public prime-agent command for now

The public executable must remain `prime-agent` to keep existing systems’ Prime Agent integrations functional. Do not adopt the interviewer’s suggested `prime-agent-pi` command as the current contract. Joe may choose to change the command in the future; this is the present compatibility requirement, not an irrevocable naming promise or authorization for a later rename. Package/distribution identity is decided separately below. Reuse of existing TypeScript user state is decided below. The inherited update workflow and Pi-owned release sources are adopted below; package/feed hosting details remain to be specified. This interview makes no launcher or command changes.

### Settled: ready-to-install prime-agent-pi distribution

Provide a ready-to-install public package rather than requiring ordinary users to install from a source checkout. Joe delegated the package name choice; use `prime-agent-pi` as the public package/distribution identity and Prime Agent Pi as the product name, while installing the previously agreed `prime-agent` executable. A distinct distribution name does not authorize renaming that executable or inherited source workspaces during this task. Platform coverage is decided below. The package format, delivery channel, registry-specific availability or scope, installer details, and any source-install policy beyond the preserved platform routes remain to be specified. Preserve the existing update workflow with Pi-owned release sources as decided below. No package is created, reserved, published, or installed by this interview decision.

### Settled: retain the final upstream TypeScript platform coverage

Joe chose the same platform coverage as upstream’s final Pi-based release, v0.9.8 (`7d442aafa985f9342134fac16c2ef41f03fb45c1`), rather than a newly narrowed set. Keep the distinction between shipped native packages and additional documented setup routes:

- Native packages: macOS Apple Silicon (`darwin-arm64`) and Intel (`darwin-x64`); Linux ARM64 on glibc and musl; Linux x64 on glibc and musl, each with ordinary and baseline/non-AVX2 variants. These are the eight targets in tagged `scripts/release-platforms.mjs`, corroborated by the actual v0.9.8 GitHub release assets.
- Windows: retain the documented Bash-based setup, including Git Bash or another configured Bash/WSL route. The v0.9.8 Windows guide exists, but the release shipped no Windows native archive; this decision does not invent a native Windows package requirement.
- Android: retain the documented Termux source-install route with its existing limitations, including text-only clipboard integration and unavailable optional native dependencies. The release shipped no Android native archive.

Evidence: the exact-tag release-platform source and `packages/coding-agent/docs/windows.md` and `termux.md`, plus https://github.com/PrimeIntellect-ai/prime-agent/releases/tag/v0.9.8. This is verified historical support intent/artifact coverage, not a claim that Pi has already been tested on all those systems. Preserve the coverage and document/test the respective routes during separately authorized implementation; do not silently promote supplemental setup notes into stronger native-package guarantees.

### Settled: stable and opt-in preview channels

Offer both Pi release channels: stable is the default for normal users, and preview is opt-in for testing changes before promotion to stable, including extension compatibility. This does not change the stable-upstream-only parity target. Release cadence is readiness-based: release upstream catch-ups and Pi-only fixes when their changes are ready and validated, rather than waiting for a fixed weekly or monthly date. Detailed preview promotion and installer packaging remain open; retain the existing update workflow with Pi-owned release sources as decided below. Stable-publication authority is defined separately below; this interview enables no automation and authorizes no actual release or installation.

### Settled: conditional automatic stable publication

An automated process may publish stable Pi releases publicly without asking Joe for approval each time, provided the agreed validation checks pass and the rules for when to publish are explicit and unambiguous. Trigger stable publication when an explicit stable-version bump is merged into product main, and publish only after the agreed checks pass for that exact commit and its packages. Ordinary commits without a stable-version bump do not publish a stable release. This is conditional future product policy, not permission to implement or enable publication during TASK-4 or to substitute inherited upstream workflow rules for the agreed trigger and checks.

This authority is for public stable-release publication only. It does not authorize automatic installation, local update activation, or restarting Joe’s running agent, nor does it grant code-merge, product-scope, or compatibility-break authority. Preview-publication details remain to be specified. TASK-4 itself still performs no automation changes, publication, or runtime mutation.

### Settled: initial stable-release validation baseline

Required release checks are:

1. Required automated repository checks and tests actually run and pass.
2. Extensibility and integration compatibility checks pass.
3. Packaged install, update, and rollback checks pass in a Docker container. Docker-based proof is sufficient for the initial release gate; a separate validation environment for every supported platform is not required now.
4. Evidence supports the upstream parity claimed by the release.
5. Version, release notes, and package checksums identify exactly what was tested.

The Docker lifecycle gate reflects currently available environments, not a reduction in the chosen platform support target. Record the tested container environment and be explicit about coverage: container results do not prove untested macOS, Windows, Android, or other OS/architecture behavior. Do not claim a full native-platform validation matrix or require a new environment fleet as a prerequisite to the initial gate. This is a future validation requirement, not a claim that any check has already run or an authorization to change CI or run live installation/update/rollback probes during TASK-4.

### Settled: maintain the newest stable line only

Actively maintain only the newest stable Pi release line. When stable advances from an upstream-aligned line such as `0.10.2.*` to `0.10.3.*`, routine fixes move to the new stable line; do not promise routine backports to older lines. Retain older published releases as immutable, available rollback targets rather than deleting or moving their tags/artifacts. An upcoming preview does not by itself replace the current stable line for maintenance. This is a release-line support policy, not authorization to modify releases or enable maintenance automation during TASK-4.

### Settled: reuse existing TypeScript user state

Pi upgrades must reuse existing TypeScript v0.9.8 settings, credentials, extensions, and saved sessions at their current locations rather than requiring users to start from a fresh Pi-specific setup. Any necessary migration must preserve a rollback route. This commitment concerns the TypeScript baseline; it does not silently promise compatibility with Rust-generated state formats. Update/activation mechanics and detailed daemon interoperability remain separate decisions. Do not inspect private credentials, change state paths, migrate sessions, or run an upgrade during TASK-4.

### Settled: retain the existing update workflow using Pi-owned releases

Keep the TypeScript product’s existing update experience, rather than inventing a separate updater or notification service. Replace upstream-directed version checks, update notices, release/download references, and update sources with Prime Agent Pi releases from `SailorJoe6/prime-agent-pi`, containing our changes. Notifications must describe the available Pi version, not tell Pi users to install the Rust product. Use the selected Pi stable/preview channel; a fallback or repair/download instruction must not silently switch products to upstream Rust.

The inspected v0.9.8 source performs a passive startup/channel release-manifest check, displays “Update available” with `/update`, and handles installation through the existing user-invoked update path (`/update` or `prime-agent update`). Preserve that notification-versus-requested-update distinction and the applicable existing confirmation, session restart/restore, and rollback behavior. Receiving a notification or publishing a release is not itself permission for background installation or restart. This choice adopts the existing workflow with Pi-owned release sources, not a new background automatic-update policy.

Evidence: tagged `src/modes/shared/startup-notices.ts`, `src/utils/version-check.ts`, `src/cli/native-update.ts`, and `src/package-manager-cli.ts` under `packages/coding-agent`, unchanged in the inspected current checkout. The notification source is a release feed, not merely a displayed repository link; the implementation must repoint the actual feed and artifact identity coherently. Existing version parsing/native-update validation assumes three numeric components, so separately specified packaging/updater work must accommodate the approved fourth-component Pi revision and channel ordering. Feed hosting and package-format details remain implementation/design work, not grounds to replace the agreed workflow. TASK-4 changes no feed, installer, daemon, or live notification behavior.

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
- [ ] #2 The contract defines capability-and-behavior parity with current stable upstream user-facing features and applicable bug fixes, implemented in Prime Agent Pi’s TypeScript/Python architecture rather than by matching Rust internals. Catch-up incorporates later stable releases and finishes at current stable-release parity, not upstream main or a frozen historical target. Betas, release candidates, and other prereleases are excluded as parity targets. The contract specifies released-version comparison evidence, architecture and compatibility conflict handling, any justified exceptions, and ongoing intake expectations alongside local fixes.
- [ ] #3 The contract preserves the entire public v0.9.8 extensibility surface, including extension hooks, custom tools and commands, and TUI customization, not only APIs Joe uses. It preserves existing Orca and Prime Claw integrations and Python-first workflows by default when upstream parity conflicts with them, adapting upstream capabilities where possible and requiring Joe’s explicit decision before implementing an unavoidable compatibility break. Upgrades must reuse existing TypeScript v0.9.8 settings, credentials, extensions, and saved sessions at their current locations, with a rollback route preserved for necessary migrations; this does not imply Rust-format state compatibility. The contract also defines daemon protocol and rollback commitments and how intentional incompatibilities are proposed.
- [ ] #4 The contract uses the released upstream version as the first three components and a fourth Pi revision for local fixes, such as `0.10.2.1` and `0.10.2.2`, advancing to a new upstream version only after integrating its released features and applicable fixes under the compatibility rules. It provides a default stable channel and an opt-in preview channel, with readiness-based releases for upstream catch-ups and Pi-only fixes once changes are ready and validated, not a fixed calendar schedule. It maintains only the newest stable line without promising routine backports to older lines, retaining immutable older releases for rollback; a preview alone does not supersede stable maintenance. It resolves machine/package encoding for the four-part product version, initial revision convention, ordering, channel promotion, and relationship to immutable legacy runtime releases without inheriting an indefinite `0.9.x` or next-`0.9.9` assumption.
- [ ] #5 The contract requires a ready-to-install `prime-agent-pi` distribution while retaining the `prime-agent` command, with any future command rename left to Joe. It preserves v0.9.8’s eight macOS/Linux native targets (macOS arm64/x64; Linux arm64 glibc/musl; Linux x64 glibc/musl with ordinary and baseline variants) and its additional documented Windows Bash-based and Android Termux setup routes, without inventing Windows/Android native archives. It retains existing startup update notices and the user-invoked `/update`/`prime-agent update` workflow, using Pi-owned stable/preview release feeds, versions, and artifacts rather than upstream Rust, including coherent fallback/repair links and existing applicable confirmation, restart/restore, and rollback behavior. Notifications alone do not install or restart. It completes package/feed delivery, platform validation, installer/source-install policy, and registry-specific naming decisions without publishing or installing anything in this task.
- [ ] #6 The contract defines the product’s relationship to `PrimeIntellect-ai/prime-agent` and `SailorJoe6/prime-agent-upstream`, including stable-release intake, provenance preservation, adaptation boundaries, and the prohibition on mechanical Rust merges into product `main`.
- [ ] #7 The contract defines lightweight feature/release ownership, evidence, durable recording, and authority boundaries. An explicit stable-version bump merged into product main triggers automatic stable publication only after all five checks pass for that exact commit and its packages; ordinary unversioned commits do not publish stable releases. The checks are: required automated checks/tests execute and pass; extensibility/integration compatibility passes; packaged install/update/rollback passes in Docker; evidence supports claimed upstream parity; and version/notes/checksums identify the tested artifacts. Docker lifecycle validation is sufficient initially without a per-platform environment fleet, but coverage limits must be stated and the platform support target retained. This grants no automatic local installation, activation/restart, code-merge, scope-change, or compatibility-break authority and creates no generalized approval machinery for routine observations or maintenance.
- [ ] #8 A canonical version-controlled product-contract document is linked from repository documentation, and a baseline-to-contract check identifies inherited material or stale task claims needing separate correction without treating inherited upstream documentation or tooling as adopted Pi policy.
- [ ] #9 Each independently plannable implementation stream revealed by the approved contract has a separate provider-native `In Design` child task; `TASK-1`, `TASK-2`, and `TASK-3` remain distinct and are not broadened by this Epic.
- [ ] #10 No product code, runtime, launcher, package, command, automation, branch topology, release artifact, installation, session, or compatibility behavior is changed while completing this thought-work Epic.
<!-- AC:END -->
