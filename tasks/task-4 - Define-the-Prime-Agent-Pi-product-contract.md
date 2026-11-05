---
id: TASK-4
title: Define the Prime Agent Pi product contract
status: In Design
assignee: []
created_date: '2026-11-01 16:15'
updated_date: '2026-11-05 02:45'
labels: []
dependencies: []
references:
  - 'https://github.com/SailorJoe6/prime-agent-pi'
  - 'https://github.com/SailorJoe6/prime-agent-upstream'
  - 'https://github.com/PrimeIntellect-ai/prime-agent'
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/commit/a1faacd53ac4473a75de1d434afaf50945c2f647
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

Parity means providing the same user-facing capabilities and behavior and fixing the same applicable bugs, implemented in Prime Agent Pi’s TypeScript/Python architecture. Matching upstream Rust internals is not a goal; an internal Rust change alone does not require copying its implementation. Handling of compatibility conflicts, allowed parity exceptions, and the ongoing catch-up commitment remain open interview decisions.

## Required decisions

- Define the intended users, core use cases, product promise, and the reason Prime Agent Pi exists separately from upstream Prime Agent.
- Define the product boundary and parity goal: how new upstream features, applicable upstream bug fixes, local fixes, and incompatible upstream architecture are evaluated. Specify observable parity, any justified exceptions, and ongoing intake expectations without reducing the product to a frozen fork or assuming identical Rust architecture.
- Define the compatibility contract for Orca, Prime Claw, the TypeScript extension surface, Python-first execution, saved sessions, daemon protocol behavior, and rollback. Distinguish hard compatibility requirements from best-effort behavior and state how an intentional incompatibility would be proposed.
- Choose the versioning model, release channels, release cadence, support window, and relationship between product versions and immutable downstream runtime releases. Do not assume that the product must remain in `0.9.x` or that the next release is `0.9.9` without an explicit decision.
- Choose package, CLI command, installer, source-install, and distribution identity. Address the risk that the upstream Prime Agent installer installs the Rust product rather than Prime Agent Pi.
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
- [ ] #1 The product contract states Prime Agent Pi’s intended users, core use cases, product promise, and distinct reason for existing, with no contradiction between an evolving product and its current validated baseline.
- [ ] #2 The contract defines capability-and-behavior parity with upstream user-facing features and applicable bug fixes, implemented in Prime Agent Pi’s TypeScript/Python architecture rather than by matching Rust internals. It specifies the comparison release, observable parity evidence, architecture and compatibility conflict handling, any justified exceptions, and ongoing intake expectations alongside local fixes.
- [ ] #3 The contract identifies hard and best-effort compatibility commitments for Orca, Prime Claw, TypeScript extensions, Python-first execution, saved sessions, daemon protocol behavior, and rollback, including how an intentional compatibility break would be proposed.
- [ ] #4 The contract makes explicit decisions about versioning, release channels, cadence, support window, and the relationship between product versions and immutable downstream runtime releases; it does not inherit an indefinite `0.9.x` or next-`0.9.9` assumption by default.
- [ ] #5 The contract chooses package, CLI command, installer, source-install, and distribution identity and addresses the upstream installer’s Rust-product behavior without changing any installed runtime in this task.
- [ ] #6 The contract defines the product’s relationship to `PrimeIntellect-ai/prime-agent` and `SailorJoe6/prime-agent-upstream`, including stable-release intake, provenance preservation, adaptation boundaries, and the prohibition on mechanical Rust merges into product `main`.
- [ ] #7 The contract defines lightweight feature and release decision ownership, required evidence, durable recording, and explicit-authority boundaries without creating generalized approval machinery for ordinary observations or maintenance.
- [ ] #8 A canonical version-controlled product-contract document is linked from repository documentation, and a baseline-to-contract check identifies inherited material or stale task claims needing separate correction without treating inherited upstream documentation or tooling as adopted Pi policy.
- [ ] #9 Each independently plannable implementation stream revealed by the approved contract has a separate provider-native `In Design` child task; `TASK-1`, `TASK-2`, and `TASK-3` remain distinct and are not broadened by this Epic.
- [ ] #10 No product code, runtime, launcher, package, command, automation, branch topology, release artifact, installation, session, or compatibility behavior is changed while completing this thought-work Epic.
<!-- AC:END -->
