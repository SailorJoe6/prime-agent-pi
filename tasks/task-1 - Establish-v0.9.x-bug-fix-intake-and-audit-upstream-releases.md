---
id: TASK-1
title: Establish v0.9.x bug-fix intake and audit upstream releases
status: In Design
assignee: []
created_date: '2026-10-28 20:14'
updated_date: '2026-11-01 15:39'
labels: []
dependencies: []
references:
  - 'https://github.com/PrimeIntellect-ai/prime-agent/releases'
  - 'https://github.com/SailorJoe6/prime-agent-pi'
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/commit/a1faacd53ac4473a75de1d434afaf50945c2f647
  - 'https://github.com/SailorJoe6/prime-agent-upstream'
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Context

Prime Agent Pi is the independent TypeScript/pi product in `SailorJoe6/prime-agent-pi`, with full upstream ancestry and the current validated runtime baseline `cwd-fix-v0.9.8-r1` at `a1faacd53ac4473a75de1d434afaf50945c2f647`. Its product `main` remains TypeScript. Rust upstream development and the separate `SailorJoe6/prime-agent-upstream` mirror provide provenance and applicability signals; they are not mechanically mergeable product branches and do not authorize Rust adoption.

Prime Agent Pi may evolve through evidence-backed local fixes, applicable upstream fixes, and separately approved enhancements. This task covers only the maintenance intake for bug fixes. Product versioning, package and command identity, feature governance, release cadence, distribution, and replacement automation require separate decisions and tasks.

## Outcome

Establish a durable, repeatable bug-fix intake process for Prime Agent Pi and use it to audit upstream stable releases `v0.10.0`, `v0.10.1`, and `v0.10.2`. Produce a complete applicability ledger that identifies which upstream fixes are architecturally irrelevant, already safe, potentially applicable, reproduced in the TypeScript product, or ported and verified. Define how confirmed upstream-applicable and locally discovered defects become separately reviewable provider-native bug tasks.

This task establishes the intake process and performs the initial audit. It does not implement a candidate fix, decide the product roadmap, create a maintenance branch, modify automation, or publish a release.

## Required behavior

- Verify and record upstream stable releases `v0.10.0`, `v0.10.1`, and `v0.10.2`, including peeled commits, publication dates, immutable references, and the audit cutoff.
- Inspect release notes, commits, linked issues or pull requests, and regression tests so the inventory is not limited to changelog wording.
- Use stable upstream releases as the recurring intake trigger. Upstream `main`, nightlies, and release candidates may provide supporting provenance for a stable fix but do not independently enter the ledger or product release queue.
- Record every bug fix from each audited release exactly once in a canonical version-controlled Markdown ledger under `docs/maintenance/`. Each entry must include immutable upstream provenance, observable symptom, intended invariant, affected Rust subsystem, analogous TypeScript/pi surface, applicability classification, supporting evidence, and next action.
- Use these classifications: Rust-only or architecturally irrelevant; already safe in TypeScript; potentially applicable and needing reproduction; reproduced and requiring a TypeScript fix; ported and verified. Do not claim a stronger classification than the evidence supports.
- For every potentially applicable fix, identify exact TypeScript paths and a concrete reproduction or regression-test strategy. For every reproduced defect, create a separate provider-native bug task before implementation.
- Document the same regression-first flow for locally found defects: capture reproduction and root cause, prove a focused regression test fails without the behavior, implement the smallest justified fix, run required validation, and pass the applicable compatibility gates.
- Describe the current repository topology accurately: `SailorJoe6/prime-agent-pi` product `main` is TypeScript; `SailorJoe6/prime-agent-upstream` preserves upstream/Rust provenance; immutable downstream release tags and rollback evidence remain preserved. Do not create or repoint branches in this task.
- Make the ledger straightforward to extend when another stable release appears without duplicating prior entries or automatically modifying code, tasks, automation, branches, tags, installations, or releases.

## Constraints

- This task governs bug-maintenance intake, not the complete product scope. It must not prohibit separately approved enhancements or silently decide unresolved product policy.
- Port behavior and invariants, never Rust code mechanically. Similar wording alone is not applicability evidence.
- Preserve daemon protocol compatibility. Any future wire change must follow the repository capability and version rules.
- Any future code fix must follow repository test policy, run each modified focused test directly, prove the regression test can fail, pass `npm run check`, and retain applicable Orca, Prime Claw, extension, and Python-first behavior.
- Both retired maintenance automations remain disabled. Do not modify, re-enable, repurpose, or replace them in this task.
- Do not install, stage, activate, restart, or migrate the validated runtime.

## Non-goals

- Defining product versioning, package or CLI identity, distribution, feature admission, release cadence, or contributor governance.
- Implementing a candidate bug fix or enhancement.
- Creating a maintenance branch, cutting a release, or choosing the next release number.
- Changing the product default branch, rewriting history, or altering immutable release provenance.
- Building replacement maintenance automation.
- Adopting Rust architecture or treating upstream moving branches as independent intake releases.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The audit records stable releases `v0.10.0`, `v0.10.1`, and `v0.10.2`, their peeled commits and publication dates, immutable references, and a clear audit cutoff.
- [ ] #2 Every bug fix in those releases appears exactly once in a canonical version-controlled Markdown ledger under `docs/maintenance/` and is traceable to release notes plus its strongest available commit, issue, pull-request, or regression-test evidence.
- [ ] #3 Each ledger entry states the language-independent symptom and invariant, identifies the analogous TypeScript/pi code surface, records one defined applicability classification, and cites evidence sufficient for that classification.
- [ ] #4 Rust-only and already-safe conclusions cite concrete architectural or TypeScript evidence; potentially applicable items identify exact TypeScript paths and a reproducible investigation or regression-test strategy.
- [ ] #5 Any defect proven to affect Prime Agent Pi has its own provider-native bug task and is not implemented as part of this audit task.
- [ ] #6 The documented local-defect workflow requires reproduction, root-cause evidence, a regression test proven red without the fix, the smallest justified change, focused validation, `npm run check`, and applicable Orca, Prime Claw, extension, and Python-first compatibility verification.
- [ ] #7 The ledger and process describe the repository topology correctly: `SailorJoe6/prime-agent-pi` product `main` is TypeScript, `SailorJoe6/prime-agent-upstream` is provenance only, and immutable downstream releases and rollback evidence remain preserved; no branch is created or repointed by this task.
- [ ] #8 The task leaves product versioning, package and command identity, feature governance, release cadence, distribution, replacement automation, and release-number decisions explicitly outside its scope rather than silently deciding them.
- [ ] #9 The intake triggers only from stable upstream releases and can append a later stable release without duplicating prior entries or automatically modifying code, tasks, automation, branches, tags, installations, or releases; moving branches, nightlies, and candidates are supporting provenance only.
- [ ] #10 Both retired maintenance automations remain disabled and unchanged, and no Prime Agent build is installed, staged, activated, restarted, or migrated.
<!-- AC:END -->
