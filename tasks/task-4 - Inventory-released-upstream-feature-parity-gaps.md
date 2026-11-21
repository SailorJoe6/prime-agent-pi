---
id: TASK-4
title: Inventory released upstream feature-parity gaps
status: In Design
assignee: []
created_date: '2026-11-21 16:53'
labels: []
dependencies: []
references:
  - 'https://github.com/PrimeIntellect-ai/prime-agent/releases'
  - 'https://github.com/SailorJoe6/prime-agent-pi'
  - 'https://github.com/SailorJoe6/prime-agent-upstream'
documentation:
  - docs/product-contract.md
type: task
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Outcome

Produce a finite, evidence-backed inventory of user-facing upstream features that Prime Agent Pi already provides, partly provides, or still lacks, plus bounded recommendations for the missing work. This is assessment and specification work, not feature implementation or an ongoing policy Epic.

Follow `docs/product-contract.md` as standing authority. The contract is not a backlog item to complete. TASK-1 separately owns upstream bug-fix intake and its initial bug audit; this task fills the feature-coverage gap without broadening or duplicating TASK-1.

## Assessment scope

- Start with upstream's final TypeScript release, v0.9.8 (`7d442aafa985f9342134fac16c2ef41f03fb45c1`), and inspect feature additions or observable capability changes in stable upstream releases after it through the latest stable release verified during the assessment. Do not assume `v0.10.2` is still latest.
- Record the exact Pi code revision being assessed, including merged downstream work. Compare actual Pi code, not an assumed unmodified v0.9.8 checkout or an unverified installed runtime.
- Record the audited releases, immutable upstream revisions, and observation cutoff. Refresh the stable-release list before the final report and include newly released stable changes within the assessment's coverage. Moving upstream main, betas, and release candidates may explain provenance but are not independent parity targets.
- Inventory completion means the feature gaps have been assessed through the stated current-stable cutoff, not that the missing features have been implemented or upstream catch-up is complete. The standing contract continues to govern later releases.

## Required results

Inspect release notes alongside relevant commits, documentation, linked issues/PRs, and tests. Do not rely on changelog wording alone. Consolidate multiple changes for the same capability rather than producing one task per commit.

For each distinct capability or observable change, record:

- The user-visible behavior and exact upstream release/provenance.
- Its analogous TypeScript/Python surface and relevant Pi paths, or evidence that no analogue exists yet.
- A supported assessment: present/equivalent, partial, missing, or unresolved. Identify implementation-only changes with no user-visible parity requirement separately, with a reason. Rust implementation differences alone are not grounds to exclude an observable feature.
- The supporting code/test/documentation evidence and its limits. Distinguish inspection of a test from actually running it; do not claim verification or parity beyond the evidence.
- For partial, missing, or unresolved behavior, a concrete next investigation or validation action. For confirmed gaps, describe the smallest independently plannable follow-up outcomes, affected surfaces, and observable acceptance expectations. Group genuinely coupled behavior and do not invent speculative implementation tasks for uncertain entries.

Produce a canonical version-controlled Markdown inventory under `docs/`, linked from the repository documentation, with a concise summary of coverage, confirmed gaps, unresolved questions, and recommended next specifications. Keep upstream bug-fix evidence in TASK-1's stream; cross-reference mixed feature/fix changes where needed instead of duplicating the bug ledger. This task does not require completion of TASK-1 and creates no artificial dependency on it.

## Boundaries

Preserve the contract's public v0.9.8 extensibility surface, Orca/Prime Claw integrations, Python-first workflows, user state, and rollback commitments when assessing adaptation. Flag unavoidable conflicts for Joe; do not approve a compatibility break, silently narrow parity, or redefine product policy through a classification.

This task does not implement the missing capabilities, perform TASK-1's bug audit, reopen TASK-2, move the checkout in TASK-3, or reactivate archived TASK-4. Packaging, installers, updater changes, version encoding, and release automation remain separate finite work. Do not modify product code, daemon protocol behavior, live runtime, launcher, credentials, saved sessions, automations, installed packages, release artifacts, or release versions as part of the inventory. Use safe inspection and existing self-contained evidence; do not invoke live paid providers or perform a runtime cutover to establish coverage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The inventory identifies the exact Pi code revision and all audited stable upstream releases after v0.9.8 through the latest stable release verified at its recorded cutoff. The release list is refreshed before reporting; main/prereleases are not independent targets and a stale fixed version is not presented as current parity.
- [ ] #2 Distinct user-visible additions or capability changes are inventoried with immutable release/commit provenance using notes, relevant code, documentation, linked changes, and tests. Multiple commits for one capability are consolidated; implementation-only exclusions have evidence and do not silently exclude observable features because upstream uses Rust.
- [ ] #3 Each entry identifies the behavior, analogous Pi surfaces/paths, supported present-equivalent/partial/missing/unresolved assessment, and supporting evidence with honest verification limits. Reading tests or documentation is not represented as executing them or proving full parity.
- [ ] #4 Partial/missing/unresolved entries have concrete next actions. Confirmed gaps have proportionate recommendations for independently plannable specifications, affected surfaces, and observable acceptance; uncertain entries do not become speculative implementation commitments or approved compatibility exceptions.
- [ ] #5 A version-controlled Markdown inventory under docs is linked from repository documentation and summarizes coverage, gaps, unresolved questions, and recommended follow-ups. It distinguishes assessment completion from actual implemented parity and references the standing product contract without turning that policy into a task or Epic.
- [ ] #6 TASK-1 remains the separate unchanged bug-audit stream, with mixed changes cross-referenced rather than duplicated and no unnecessary dependency. TASK-2, TASK-3, archived TASK-4, and the standing policy remain unchanged. The assessment performs no feature implementation, packaging/release work, automation activation, paid-provider invocation, or live code/runtime/state changes.
<!-- AC:END -->
