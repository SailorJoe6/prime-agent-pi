---
id: TASK-4
title: Inventory released upstream feature-parity gaps
status: In Progress
assignee: []
created_date: 2026-11-21 16:53
updated_date: '2026-11-22T21:19:00Z'
labels: []
dependencies: []
references:
  - https://github.com/PrimeIntellect-ai/prime-agent/releases
  - https://github.com/SailorJoe6/prime-agent-pi
  - https://github.com/SailorJoe6/prime-agent-upstream
documentation:
  - docs/product-contract.md
  - docs/upstream-feature-inventory.md
modified_files:
  - README.md
  - docs/upstream-feature-inventory.md
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Slice 1 — assessment baseline and release coverage pinned. `docs/upstream-feature-inventory.md` (linked from `README.md`) records Pi `6cd28f90e2391441850485c94b3ff099f579ef7a`, final TypeScript baseline v0.9.8 `7d442aafa985f9342134fac16c2ef41f03fb45c1`, and the six subsequent published stable upstream releases v0.10.0 through v0.10.5 at 2026-11-22 07:52:00 UTC, with publication URLs, exact source commits and adjacent comparison ranges. Verified from the paginated GitHub Releases list, `releases/latest`, upstream remote tags, local commit type and ancestry; repeated the remote release/tag query before writing this checkpoint and got the same coverage. `git diff --check`, `git diff --cached --check`, and `npm run check:test-policy` passed for the documentation changes. No behavioral checks ran. No acceptance criteria checked yet: the final cutoff must be refreshed after the capabilities are audited. Next slice: reconcile release notes against the pinned source ranges and start grouping and assessing observable capabilities. No confirmed-gap specifications created; TASK-1 stays separate.

Slice 2 — first capability group assessed in `docs/upstream-feature-inventory.md#skill-discovery-and-invocation` against original Pi `6cd28f90e2391441850485c94b3ff099f579ef7a`. GitHub release bodies for v0.10.0–v0.10.5 were empty; verified the pinned v0.10.5 changelog against the adjacent source range, merged upstream PR #4084 (`b144261510b985ff12fdac7569630234584a950c`), implementation, Pi skills documentation, and existing tests. Recorded partial coverage for collision handling (opposite default winner; preserve compatibility pending review), diagnostics (startup warnings exist; standalone `skills` status command absent), and slash invocation (leading form exists; inline/repeated references and notices differ). Python import origin after switching skill sources remains unresolved; the inventory gives a disposable-venv validation sequence. Stable source links/line ranges verified; `git diff --check` and `npm run check:test-policy` passed. No cited behavior tests were run. Next: group factory workflow and other released capabilities separately; keep the invalid-frontmatter fix and any analogous kernel defect in TASK-1's bug stream; refresh stable coverage before the final report. No policy, feature, lifecycle, or gap-specification change; all six criteria remain unchecked.

Factory research checkpoint (source and test inspection only; inventory entry not yet published). Resume from the saved pi-factory-surfaces and factory-release-evidence reports; do not repeat the assignments. First stable release for the machine library, run controls and original terminal page is v0.10.0 (763094e1b6a7c17450ee8399b06cda1853847ca5): see upstream #3199, #3285, #3290 and the tagged .changes/feat-machine-library.md. Trace later run recovery and notices, entry inputs, Python states, per-state session navigation and grouped costs, and the page paste fix separately from v0.10.5’s bundled skill repair (#4084). Original Pi has harness entries, child spawn/collect, session creation and roster controls; these do not establish named machine or run support. Use the saved citations to write and validate the comparison against 6cd28f90e2391441850485c94b3ff099f579ef7a; fill only material evidence holes. Reconcile subsequent TASK-5 Codex changes in later relevant coverage, not by moving the factory baseline. No behavior tests or factory runs at this checkpoint.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Ralph (owning Conversation)
created: 2026-11-21 20:50

---

Creation blocked before a durable Episode could be bound.

The approved TASK-4 inventory/specification scope passed semantic readiness. One creation operation, `83f29689-f471-440f-a78e-e2195141b84e`, published In Progress in task-history commit `0f92046a0526f79df8efb96cbd83bff0aaa06c27`, created branch `JLanders/prime-agent-task-4-episode-83f29689` and its Orca worktree, then timed out binding a fresh Prime Agent session and connected tab. Ownership remains `uncertain`; no durable Episode/routing identity or initial execute admission was established by the returned ownership evidence.

Read-only inspection of the exact recorded launch run `3185cd35-f513-4daf-9b90-a6fbf337efc6` and its terminal showed `ERR_MODULE_NOT_FOUND`: package `typebox` could not be resolved from the fresh worktree's `packages/ai/src/index.ts`. That worktree has no `node_modules`; the canonical checkout has `node_modules/typebox`. The terminal returned to a shell prompt. The launch automation remains disabled. Current native agent list/state evidence did not identify a session at the exact Episode CWD; absence from that list is not proof that no session or historical prompt effect ever existed. No launch, prompt, allocation, or handoff was retried.

Both code workspaces remain clean at `6cd28f90e2391441850485c94b3ff099f579ef7a`. No inventory work or gap specifications have been produced. Existing worktree, branch, launch automation/run, task history, selected host, and uncertain ownership are preserved.

Unblock condition: repair the fresh-worktree runtime dependency-resolution problem through an operator-approved setup/runtime action, and obtain supported owner-led creation recovery for this same operation and unchanged resources. The loaded oversight guidance refers to an Owner-led creation recovery section, but the current project implement-task workflow does not contain it. Before any continuation, establish exact existing session/launch/assignment facts and use only a supported continuation for the remaining creation step; do not infer non-delivery from an absent session ID, allocate a replacement Episode, promote ownership manually, resend an initial assignment, or use ordinary handoff. TASK-4 remains paused pending this recovery decision; its implementation authority and scope are unchanged.

---

author: Ralph (owning Conversation)
created: 2026-11-22T06:56:00Z

---

Joe explicitly confirmed discarding the failed TASK-4 setup and creating a fresh Episode from the approved plan. The failed attempt was operation `83f29689-f471-440f-a78e-e2195141b84e`, at code base `6cd28f90e2391441850485c94b3ff099f579ef7a`. Its disabled launch automation and exact empty Orca worktree/branch were removed through Orca, and absence of that worktree and branch was verified. No Episode session was identified in native live/saved-session evidence; no old prompt was resent. Only this owner's stale failed-attempt registry entry was removed, under the existing exclusive registry lock after an immediate exact-entry comparison, preserving other owners.

The current TASK-4 specification, acceptance criteria and implementation plan remain intact. The archived historical contract task has already been deleted at Joe's separate explicit request; active TASK-4 resolves normally. Fresh worktrees can resolve existing canonical packages through the project's worktree-parent dependency link; no packages were installed/upgraded and no product code, launcher or runtime version was changed. Restoring In Planning permits the explicitly approved fresh creation attempt. This does not reopen design or broaden the inventory/confirmed-gap-specification scope.

---

author: Ralph (owning Conversation)
created: 2026-11-22T07:00:00Z

---

Fresh Episode launch reached the exact durable session and delivered the initial execute assignment, but creation stopped after launch-automation removal because the connected Prime Agent tab was not retained.

Operation: c88f1d99-e6a9-4710-81d0-471530d4ecdd. Durable Episode: 01a2020b-d277-775c-bd4c-62c44ab9aa07; observed active route f35b1b242fd0. Worktree: /Users/jlanders/worktrees/prime-agent/prime-agent-task-4-episode-c88f1d99; branch JLanders/prime-agent-task-4-episode-c88f1d99; original code base 6cd28f90e2391441850485c94b3ff099f579ef7a. Admission was published at task revision 7b2575c3b157c6923461b77661448a81e84442c0.

The Episode explicitly reported receipt and stopped before assessment or code/task/registry writes. Current native list evidence identifies that same live durable session at the exact CWD, idle, no unfinished actions, and empty steering/follow-up queues. Orca lists the recorded agent terminal term_7767022c-7b67-4470-9ef3-d9e3cff05f0f as connected but orphaned; the visual layout retains only the default shell tab. Registry remains uncertain. The earlier dependency-resolution failure did not recur. Neither the initial assignment nor creation was retried.

Unblock condition: restore or attach an Orca tab to this same durable session and complete supported same-operation binding after exact native session, assignment, worktree and tab evidence is reconciled. Preserve the existing session, operation, host, code base, worktree and branch; do not resend the initial assignment, allocate another Episode or promote ownership from the receipt alone. The project workflow still lacks its referenced Owner-led creation recovery section. Any setup/workflow repair and subsequent continuation must use supported guidance and operator authority, not an invented recovery interface. Inventory work has not started; the approved specification and plan remain unchanged.

---

author: Ralph (owning Conversation)
created: 2026-11-22T07:11:00Z

---

Joe approved repair of the fresh Episode's tab attachment. Created a background Orca terminal running only `prime-agent attach 01a2020b-d277-775c-bd4c-62c44ab9aa07`, attaching to the existing durable session without creating an agent or sending task input. Native terminal/layout and screen observations prove a visible, connected Prime Agent tab in the exact recorded worktree. The original orphaned terminal and default shell were preserved.

The supported existing-operation session-binding call returned active ownership for operation c88f1d99-e6a9-4710-81d0-471530d4ecdd and the same durable session, route f35b1b242fd0, provider/task, original code base, selected host, branch and worktree. Current terminal is term_425519ca-4dc7-46d1-8f8c-4e79c7f41d05. It explicitly sent no new execute assignment. Initial delivery is independently established by the native session transcript and the Episode's earlier receipt. No manual ownership edit, workflow upgrade, product-code change or runtime cutover was needed.

The recorded creation blocker is cleared. Restoring In Progress for continuation of the same approved TASK-4 inventory and confirmed-gap In Design specification scope through canonical task handoff. The Episode had stopped before assessment; current native observations show idle, empty queues and no unfinished actions. Specification, acceptance criteria and plan remain unchanged. Historical planning-only wording is superseded by Joe's explicit implementation approval; no gap-feature implementation is authorized.

---

author: Ralph (owning Conversation)
created: 2026-11-22T07:12:00Z

---

Tab repair and supported same-operation session binding succeeded; ownership is active for the unchanged TASK-4 Episode. The subsequent canonical `handoff_task_episode` invocation stopped with `Episode worktree is missing .prime-claw/workflows/handoff.md`.

Read-only verification confirms that exact file exists in the canonical checkout but is absent from the Episode worktree. The native session remains idle at 15 messages with no unfinished actions and empty queues. Ownership still holds the original task revision; the Episode task clone remains clean at 7b2575c3b157c6923461b77661448a81e84442c0. No handoff or execute prompt was sent by this attempt. This is supported by the exact missing-file refusal and inspection of the installed matching failure path: independent-Backlog preflight constructs the handoff prompt before task-workspace preparation, evidence advancement or delivery; this missing-file throw occurs at that preflight. Installed source supports this explanation but is not an independent running-build attestation.

Stopped without retry. The restored visible tab, exact durable session, operation, active ownership, host, worktree, branch, code base, specification and plan are preserved. No inventory work has started.

Unblock condition: restore the existing canonical handoff workflow into this same Episode's ignored project-workflow location, verify its exact content and current native task/session/resource facts, and obtain an explicit informed operator decision for one canonical handoff re-invocation under the definite pre-admission refusal exception. This is not permission to resend the initial assignment, invoke raw execute, allocate resources, change product scope or upgrade/activate runtime code.

---

author: Ralph (owning Conversation)
created: 2026-11-22T07:49:00Z

---

Joe explicitly authorized the local Orca include configuration, repair of this existing worktree, and continuation of the same Episode on TASK-4. Added repo-root .worktreeinclude listing only .prime-claw/workflows, and excluded the manifest through /.worktreeinclude in the shared Git info/exclude. Git confirms both the manifest and workflow directory are excluded. This is Orca's existing native copy mechanism for future new worktrees, not a product/runtime code change or a live copy test.

Repaired this already-created Episode in place by copying all 10 existing canonical project workflow files into its previously absent .prime-claw/workflows directory; exact names and byte-for-byte equality were verified. Did not copy ownership or other local runtime state. No source code, specification, acceptance criteria, or plan changed. The existing active operation c88f1d99-e6a9-4710-81d0-471530d4ecdd, durable Episode 01a2020b-d277-775c-bd4c-62c44ab9aa07, selected host, original code base, branch and worktree remain intact.

The missing-workflow blocker is cleared. Native session evidence shows the exact Episode idle with no unfinished actions and empty steering/follow-up queues before continuation. The prior handoff attempt stopped on the missing workflow before prompt admission; this authorization permits one canonical handoff re-invocation with the same approved inventory/confirmed-gap In Design specification scope. It does not resend the initial assignment, create another Episode, or authorize gap-feature implementation, merge, release or runtime activation. Restore In Progress and continue through the canonical handoff tool after verifying task publication.

---

author: Ralph (owning Conversation)
created: 2026-11-22T07:57:00Z

---

Conversation review accepted bounded slice 1 at code candidate 93c4e7cbd5d27aa2c399a0e3fbcebbc144c732b0 and Episode-authored task history 7e2bc6f3cdee256f7869fd9eaf848355a3f3bcc8. This is an owner review of the release-coverage checkpoint, not independent EXPERT approval, final task acceptance or merge authority.

Read both changed documents and the complete native task contract. Independently re-enumerated stable GitHub release metadata and latest release; dates and six post-v0.9.8 releases v0.10.0–v0.10.5 agree with the table. Compared every listed source commit with upstream remote tag targets, verified commit object types, adjacent ancestry and baseline ancestry into the pinned Pi revision. Direct origin refs confirm candidate publication and task-history publication separately; primary main remains 6cd28f90e2391441850485c94b3ff099f579ef7a. Source diff changes only README and the inventory. The native task changes are compatible execution notes/documentation/modified paths, not specification or plan changes. Re-ran source diff --check and npm run check:test-policy successfully; no behavior checks or final parity claim. All six criteria remain unchecked, appropriately, because capability assessment and final release refresh remain outstanding.

Fresh native list shows the exact existing Episode idle, no unfinished actions, no running children, and empty action queues. No material defect found in this checkpoint. Accept and advance the same Episode to one bounded approved slice: reconcile covered release notes with pinned source ranges, relevant docs, linked changes and tests; group observable capabilities and begin supported Pi-equivalence assessment. Preserve honest unresolved entries/next investigations and the assessment-only boundaries. Do not implement features, plan follow-up gap tasks, change policy or compatibility, merge, release or activate runtime code. Refresh current-stable coverage again before the final report.

---

author: Ralph (owning Conversation)
created: 2026-11-22T16:42:00Z

---

Accepted the skill-discovery and invocation checkpoint at bc304a9052705be0c0d51035f91afda808a40a07 after owner and independent openai-codex/gpt-6.2-astra review. The pinned sources support three partial matches: skill override precedence, discovery diagnostics, and inline skill references. Switched Python import origin remains unresolved; the upstream fixture checks installer calls and records, not the module Pi imports. Preserve the documented override default. Diff and test-policy checks passed; behavior tests were inspected, not executed. This accepts only slice 2, not parity or merge readiness. Next: assess the released factory workflow and its session/TUI surfaces, keeping feature provenance distinct from the v0.10.5 factory skill repair.

---
<!-- COMMENTS:END -->
