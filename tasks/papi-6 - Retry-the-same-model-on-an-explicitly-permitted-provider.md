---
id: PAPI-6
title: Retry the same model on an explicitly permitted provider
status: In Progress
assignee: []
created_date: '2026-11-22T22:03:00Z'
updated_date: '2026-11-25T13:52:00Z'
labels: []
milestone: m-0
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-core/src/session_engine/provider_failover.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/agent-session.ts
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/docs/settings.md#L250-L258
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/2982dadec68a9fb6b94ade67c1f733b6ca461893/docs/upstream-feature-inventory.md#what-the-release-notes-leave-out
  - packages/coding-agent/docs/settings.md
modified_files:
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/test/suite/agent-session-retry-events.test.ts
  - packages/coding-agent/docs/settings.md
  - docs/upstream-feature-inventory.md
  - packages/coding-agent/.changes/papi-6-provider-failover.md
type: feature
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Original Pi partially covers turn failover. Its explicit providerBackupModel can immediately select a configured different model before the primary retry budget expires and later restore the primary. Add only expressly permitted post-budget routing for the same model; credentials alone do not permit a switch. This is not fresh-session or child model discovery.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 With two permitted faux routes serving M, exhausting the first route allows the second to finish the same turn on M.
- [x] #2 The new post-budget mechanism does not use a route serving only N or a route not explicitly permitted for M.
- [x] #3 With the new policy unset and providerBackupModel set to N, a transient primary failure can select N before primary retries run out, then restore the primary. With neither policy set, current primary-route retry/park behavior remains.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add one opt-in user-global `retry.failover.providers` list of exact alternate `provider/model-id` references in settings. Resolve in list order from the existing model registry; only a different provider serving the effective model's exact ID is eligible. Reject unknown, unconfigured, incompatible, daemon-policy-denied, primary, and duplicate routes. Credentials or a broad daemon allowlist alone are not opt-in. Do not change model admission, new-session/child discovery, or `providerBackupModel` settings.
2. Add one branch to the existing `AgentSession` retry path, before the quota-wait shortcut and budget-exhausted wait/give-up when valid same-model alternates exist. Use the existing retry tail and keep only the in-memory route position, retry accounting and original route needed by this turn. Do not introduce a second retry loop, worker, scheduler, durable state, or a new routing framework. A usable route list activates the v0.10.0 behavior: exhaust a per-provider retry budget, switch immediately and continue the same turn, and stop at the end of the list or at the released chain ceiling (8 retry decisions, including switches). Reuse Pi's retry count, delay/cap and cancellation, not the Rust-specific defaults/timing knobs. Keep the legacy immediate backup first; if taken, keep that turn on the legacy path. With no usable list, preserve the current retry/wait/park path. Deterministic errors and cancellation never advance. Honor Retry-After and preserve the existing quota-park outcome for waits above the cap rather than treating the cap as budget exhaustion.
3. Restore the original route and effective thinking, service tier and overrides at turn exit (including failure, abort, and handoff to quota park), without undoing an explicit user model change. Reuse the existing temporary switch/restore seam and backup retry event, preserving the original snapshot across multiple switches; no new event or daemon protocol. No model change persists into the next turn.
4. Extend existing faux retry tests with the three acceptance scenarios, ordered/bounded route progression, and terminal restore/cancel/capped-wait cases using the existing harness and fake time; no new test framework or live calls. Assert request order, same turn completion and next-turn routing; prove regressions fail without the behavior. Run the changed suites and repository checks. Document the opt-in, precedence, and Pi divergence from upstream credential-based discovery in settings docs and the parity inventory; add one changelog fragment.

Keep this a runtime routing change only. Do not add deterministic task reconciliation, iterative plan updates, or workflow machinery; leave planning and review judgment to the Conversation/Episode.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Slice 1 implemented global opt-in exact route matching, per-provider retry budget, turn-scoped restore and existing backup precedence. Released v0.10.0 tag resolves to 763094e1b6a7c17450ee8399b06cda1853847ca5 (provider_failover.rs; 8 total retry decisions). Retry suite seed 61 passed all 61 tests. Disabling route resolution made the new faux request-order test fail as expected. npm run check passed. Supplementary image-model-override suite passed 13/14; existing “refuses an unusable imageModel” also failed with the two unmodified production files at base caa95ae869730cc94f13821d973e523bdadd98d8 using the same generated catalog. Remaining before claiming full validation: focused multi-alternate/ceiling, deterministic failure, cancellation and capped quota wait cases.

Slice 2 completed the recorded focused offline validation with four additional faux-provider regressions: configured provider order and exactly eight decisions (nine requests, no third alternate); deterministic invalid request stops on the first alternate; cancelling an alternate retry wait makes no further request; an over-cap quota reset parks instead of switching and the wake runs on the original route. Terminal failure and cancellation also return subsequent prompts to the original route. Deliberately raising the ceiling, routing permanent failures, omitting cancel restoration, or bypassing quota parking caused the corresponding tests to fail; all temporary mutations were reverted. Run from packages/coding-agent: npx tsx ../../node_modules/vitest/dist/cli.js --run test/suite/agent-session-retry-events.test.ts --sequence.shuffle --sequence.seed=806 (also 608); both passed 65/65. npm run check passed. No runtime edits were needed in this slice; the unchanged-base image override failure remains outside scope.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented explicit same-model, post-budget provider failover with an eight-decision ceiling and turn-scoped restoration. Legacy providerBackupModel retains immediate precedence; fresh-session and child discovery are unchanged. Focused offline validation is complete and the candidate awaits independent review. No live-provider tests were performed.
<!-- SECTION:FINAL_SUMMARY:END -->
