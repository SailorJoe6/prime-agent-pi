---
id: TASK-4
title: Inventory released upstream feature-parity gaps
status: In Planning
assignee: []
created_date: '2026-11-21 16:53'
updated_date: '2026-11-21 20:04'
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
- Inventory completion means the feature gaps have been assessed through the stated current-stable cutoff, not that the missing features have been implemented or upstream catch-up is complete. The inventory may finish with unresolved entries when each is explicitly documented, its uncertainty is explained, and a concrete next investigation is recorded. Unknowns must not be hidden or counted as equivalence; resolving every investigation is not a completion prerequisite. Confirmed independently plannable feature gaps still require the separate reviewable specifications described below. The standing contract continues to govern later releases.

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
- [ ] #5 A version-controlled Markdown inventory under docs is linked from repository documentation and summarizes coverage, gaps, unresolved questions, the resulting feature-gap specifications, and recommended next work. Explicitly documented unresolved entries with explained uncertainty and concrete next investigations do not block inventory completion; they are not hidden or counted as equivalent, and confirmed feature gaps still require their reviewable specifications. It distinguishes assessment completion from actual implemented parity and references the standing product contract without turning that policy into a task or Epic.
- [ ] #6 TASK-1 remains the separate unchanged bug-audit stream, with mixed changes cross-referenced rather than duplicated and no unnecessary dependency. TASK-2, TASK-3, the archived product-contract record, and the standing policy remain unchanged. The assessment performs no feature implementation, packaging/release work, automation activation, paid-provider invocation, or live code/runtime/state changes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Pin the assessment baseline and release coverage (AC 1, 6).
   - Read `docs/product-contract.md` and this task at execution start. Record the exact audited Pi code HEAD, final TypeScript v0.9.8 baseline `7d442aafa985f9342134fac16c2ef41f03fb45c1`, observation time, and stable upstream releases after that baseline through the latest stable then verified.
   - Resolve release provenance to immutable commit IDs and release/source URLs using the fetch-only upstream reference. Keep upstream main/prereleases as context only; do not merge, activate, or rewrite any upstream or historical refs.

2. Build the released-capability inventory (AC 2, 5).
   - Create `docs/upstream-feature-inventory.md` with baseline/cutoff, audited release coverage, capability entries, exclusions, and a summary. Give capability entries stable anchors for follow-up references.
   - Inspect each covered release's notes alongside relevant commits, documentation, linked issues/PRs, and tests. Reconcile the release coverage with grouped capabilities so changelog omissions or multiple commits for one behavior do not create silent omissions or duplicate entries.
   - Record user-visible behavior and release/commit provenance. Explain implementation-only exclusions with evidence; Rust internals alone do not exclude an observable capability. Keep pure bug-fix intake in TASK-1 and cross-reference mixed feature/fix changes without editing TASK-1 or duplicating its ledger.

3. Assess the actual TypeScript/Python equivalents (AC 3, 6).
   - Inspect relevant Pi modules, public interfaces, documentation, and existing tests at the recorded code revision; read the relevant files rather than relying on keyword snippets. Record analogous paths, upstream evidence, and a supported `present/equivalent`, `partial`, `missing`, or `unresolved` conclusion for each capability.
   - Clear code and existing-test inspection is sufficient. Label inspection evidence explicitly and list any executed checks separately; neither inspected tests nor this assessment prove runtime/release validation. Support absence claims with the surfaces examined, not merely a failed keyword search.
   - Record the remaining behavior for partial/missing entries. Explain each unresolved question and its concrete next investigation. Flag conflicts with v0.9.8 extensibility, Orca/Prime Claw/Python workflows, state, or rollback for Joe; do not silently waive compatibility or implement a fix.

4. Author the confirmed-gap specifications (AC 4).
   - Reconcile confirmed gaps with existing native work to avoid duplicate specifications. For each independently plannable confirmed gap not already covered by an adequate specification, use the native Backlog CLI to create a reviewable `In Design` task with a bounded outcome, affected surfaces, observable acceptance criteria, compatibility constraints, and links to its inventory entry and upstream evidence. Record any adequate existing coverage explicitly.
   - Group related capabilities and genuinely coupled work across releases. Recommend dependency-aware ordering with reasons and retain each release's provenance; do not split per commit/release or infer dependencies on TASK-1. Keep uncertain findings as documented investigations with next steps, not speculative feature commitments.
   - Publish new specifications through the existing independent `.backlog` task store and verify their actual IDs, statuses, contents, and publication. Link the inventory to those IDs and published task-branch URLs, not public links into an ignored `.backlog` directory. Do not plan or implement the gap tasks.

5. Finish the reviewable documentation and verify the evidence (AC 1–6).
   - Refresh the upstream stable-release list immediately before the final report. Include and assess newly released stable changes, update the cutoff and coverage, and reconcile the resulting entries/specifications before reporting. If release evidence is unavailable, report that limit rather than claiming current-stable coverage.
   - Add the inventory to the root README's Documentation section. Summarize classifications, confirmed-gap task links, unresolved questions/next investigations, and recommended ordering. State that explicit unresolved entries may remain at inventory completion and that assessment completion is not implemented parity or permission to advance a public parity version.
   - Check coverage against all six criteria, provenance, local paths/anchors, published task links, and the gap-to-specification mapping. Run `git diff --check` in each changed repository and required `npm run check:test-policy`; record exact results and distinguish document consistency checks from behavioral evidence. No product/test code changes or provider-backed tests are needed for this documentation/specification-only work.
   - Verify that TASK-1, TASK-2, TASK-3, the archived contract task, and `docs/product-contract.md` remain unchanged. Update only TASK-4's execution evidence/criteria as actually satisfied and report the inventory and published specifications for review. Follow ordinary source review/merge authority; no automatic merge, feature implementation, release, runtime, launcher, credential, migration, or installed-state change is authorized.

This plan has no dependency on completion of TASK-1. It plans execution of the finite inventory and gap-specification work only; the current operator request authorizes planning, not starting that execution.
<!-- SECTION:PLAN:END -->
