---
id: TASK-4
title: Inventory released upstream feature-parity gaps
status: In Design
assignee: []
created_date: '2026-11-21 16:53'
updated_date: '2026-11-21 19:15'
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

Produce a finite, evidence-backed inventory of user-facing upstream features that Prime Agent Pi already provides, partly provides, or still lacks, and separate, reviewable provider-native In Design specifications for confirmed feature gaps. This is assessment and specification work, not feature implementation or an ongoing policy Epic.

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
- The supporting code/test/documentation evidence and its limits. Clear code and existing-test inspection is sufficient to classify a feature as present/equivalent for this initial inventory; an executed behavior check is not a prerequisite. State that the assessment is inspection-based and record any checks actually run separately. Where inspection is inconclusive, keep the entry unresolved with a concrete next investigation rather than assuming equivalence or requiring a full validation project. Do not represent inspected tests as executed tests or the inventory as release-validation proof.
- For partial, missing, or unresolved behavior, a concrete next investigation or validation action. For confirmed gaps, create the smallest independently plannable provider-native In Design specifications, with bounded outcomes, affected surfaces, observable acceptance criteria, and links to the inventory evidence. Group related capabilities and genuinely coupled behavior across upstream releases rather than enforcing release-by-release implementation or creating one task per commit or changelog bullet. Recommend dependency-aware follow-up ordering to avoid repeated work in the same subsystem, retaining each capability's release provenance. This grouping is not permission to advance a public parity version before that released baseline's required feature and applicable bug-fix gaps are closed. Keep uncertain findings as explicit investigations with concrete next actions; do not turn them into speculative feature-implementation commitments.

Produce a canonical version-controlled Markdown inventory under `docs/`, linked from the repository documentation, with a concise summary of coverage, confirmed gaps, unresolved questions, and links to the resulting feature-gap specifications and the recommended next work. Keep upstream bug-fix evidence in TASK-1's stream; cross-reference mixed feature/fix changes where needed instead of duplicating the bug ledger. This task does not require completion of TASK-1 and creates no artificial dependency on it.

## Boundaries

Preserve the contract's public v0.9.8 extensibility surface, Orca/Prime Claw integrations, Python-first workflows, user state, and rollback commitments when assessing adaptation. Flag unavoidable conflicts for Joe; do not approve a compatibility break, silently narrow parity, or redefine product policy through a classification.

Authoring these follow-up specifications does not approve them, advance them into planning, or authorize implementation. This task does not implement the missing capabilities, perform TASK-1's bug audit, reopen TASK-2, move the checkout in TASK-3, or reactivate the archived product-contract record. Packaging, installers, updater changes, version encoding, and release automation remain separate finite work. Do not modify product code, daemon protocol behavior, live runtime, launcher, credentials, saved sessions, automations, installed packages, release artifacts, or release versions as part of the inventory. Use safe inspection and existing self-contained evidence; do not invoke live paid providers or perform a runtime cutover to establish coverage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The inventory identifies the exact Pi code revision and all audited stable upstream releases after v0.9.8 through the latest stable release verified at its recorded cutoff. The release list is refreshed before reporting; main/prereleases are not independent targets and a stale fixed version is not presented as current parity.
- [ ] #2 Distinct user-visible additions or capability changes are inventoried with immutable release/commit provenance using notes, relevant code, documentation, linked changes, and tests. Multiple commits for one capability are consolidated; implementation-only exclusions have evidence and do not silently exclude observable features because upstream uses Rust.
- [ ] #3 Each entry identifies the behavior, analogous Pi surfaces/paths, supported present-equivalent/partial/missing/unresolved assessment, and supporting evidence with honest limits. Clear code and existing-test inspection is sufficient for present/equivalent in this initial inventory; no executed behavior check is required. Inspection-based conclusions and any checks actually run are distinguished explicitly. Inconclusive inspection remains unresolved with a next investigation; inspected tests are not claimed as executed tests or release-validation proof.
- [ ] #4 Partial/missing/unresolved entries have concrete next actions. Each independently plannable confirmed feature gap is covered by a separate reviewable provider-native In Design specification with bounded outcomes, affected surfaces, observable acceptance, and links to inventory evidence. Related capabilities and coupled changes are grouped across releases, with dependency-aware recommended ordering and retained release provenance, rather than split per release/commit/changelog bullet. Public parity versions advance only when the claimed baseline's required feature and applicable bug-fix gaps are closed. Uncertain findings remain investigations, not speculative implementation commitments or approved compatibility exceptions; creating a specification starts no planning or implementation.
- [ ] #5 A version-controlled Markdown inventory under docs is linked from repository documentation and summarizes coverage, gaps, unresolved questions, the resulting feature-gap specifications, and recommended next work. It distinguishes assessment completion from actual implemented parity and references the standing product contract without turning that policy into a task or Epic.
- [ ] #6 TASK-1 remains the separate unchanged bug-audit stream, with mixed changes cross-referenced rather than duplicated and no unnecessary dependency. TASK-2, TASK-3, the archived product-contract record, and the standing policy remain unchanged. The assessment performs no feature implementation, packaging/release work, automation activation, paid-provider invocation, or live code/runtime/state changes.
<!-- AC:END -->
