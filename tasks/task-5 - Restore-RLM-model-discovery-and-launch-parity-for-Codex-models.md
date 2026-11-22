---
id: TASK-5
title: Restore RLM model discovery and launch parity for Codex models
status: Ready for Merge
assignee: []
created_date: '2026-11-22T06:52:00Z'
updated_date: '2026-11-22T16:41:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/v0.10.5/crates/pa-core/src/models/registry.rs#L207-L239
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/v0.10.5/crates/pa-core/src/kernel/rlm_runtime.rs#L218-L264
  - https://github.com/PrimeIntellect-ai/prime-agent/pull/3146
  - https://github.com/PrimeIntellect-ai/prime-agent/pull/3501
documentation:
  - packages/coding-agent/docs/rlm-runtime.md
modified_files:
  - packages/coding-agent/src/core/model-registry.ts
  - packages/coding-agent/src/core/rlm-runtime.ts
  - >-
    packages/coding-agent/test/suite/regressions/4649-subagent-model-selection.test.ts
  - packages/coding-agent/test/model-registry.test.ts
  - packages/coding-agent/docs/rlm-runtime.md
  - packages/coding-agent/.changes/task-5-rlm-codex-model-parity.md
  - packages/coding-agent/src/core/agent-session.ts
priority: high
type: bug
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problem

Prime Agent Pi’s CLI and `/model` can list a configured Codex model that `rlm.find_models` hides and the explicit `rlm.create_session` and `rlm.spawn` selectors reject. The CLI search `prime-agent model list "openai-codex astra"` listed `openai-codex/gpt-6-astra` and `openai-codex/gpt-6.2-astra`. The affected live RLM worker found neither, including with exact selectors. An isolated, authenticated Codex catalog probe found only older Astra with `client_version=0.159.0`, and both with `0.170.0` and the same account. This explains the newer model’s omission in that probe, not the live worker’s loss of older Astra. RLM also independently fails provider-plus-family queries when the rows are present.

## Outcome

A model the CLI and picker present as usable for the current account must be discoverable in RLM and accepted by both RLM launch surfaces under the same catalog and auth conditions. Use upstream v0.10.5’s shared configured-catalog behavior as a reference, not a Rust code port. Remove the dependence on an additional version-pinned Codex lookup silently acting as the deciding gate. If an external lookup still affects eligibility, distinguish lookup failure from a confirmed absence; do not silently report the whole provider as missing. Model admission is not a guarantee of a provider response: enforce account-scoped data, fresh provider authentication, and the final launch preflight, and surface real provider errors without fallback to another provider or auth route.

Preserve existing provider and model IDs, exact selector and short-form rules, compatible RLM API/result shapes, supported thinking-level behavior, explicit user model configuration, and private model restrictions. No unrelated provider, release, install, or activation changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 With representative catalog and valid Codex OAuth fixtures, the CLI and picker’s usable Astra rows are both discoverable by `rlm.find_models`, and both exact provider-qualified selectors resolve for `rlm.create_session` and `rlm.spawn` without a provider/auth-route substitution.
- [x] #2 A stale, partial, empty, or failed Codex discovery response cannot silently hide an otherwise usable configured Codex model solely because of the client version or lookup failure. Unknown/unavailable selectors and stale, expired, or unconfigured credentials remain distinguishable; no cross-account model or credential leakage, and launch authentication preflight still runs.
- [x] #3 `rlm.find_models("openai-codex astra")` finds both Astra rows, excludes matching models on other providers, and keeps exact selectors, ordinary single-term lookup, result shape, and limits working.
- [x] #4 Deterministic regressions reproduce the search/admission gaps on the old behavior and pass with the fix. Run the affected package tests and `npm run check`. Separately record a manual isolated same-provider acceptance check for discovery and a real Astra launch (no live credentials in CI; report any provider/account limit rather than claiming success).
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Use the registry’s configured, auth-filtered model catalog for the shared RLM discovery and explicit launch path. Keep the existing catalog refresh and readiness waits; remove only the extra version-pinned Codex `/models` intersection and its now-unused code. Keep the stale/expired checks, private-model entitlements, exact and short-form launch rules, provider pins, and final `getApiKeyAndHeaders` preflight. Do not add a lookup, cache, version bump, or fallback.
2. In `findRlmModelMatches`, support a whitespace-separated provider and family when the first term names a known provider. Match the remaining text against that provider’s model IDs and names. Keep existing exact-selector and single-term matching, ordering and limits. Add a coding-agent changelog fragment.
3. Extend the existing model-registry and RLM selection regressions with deterministic fixtures for both Codex Astra rows, provider-scoped search, exact `create_session` and `spawn` selection, and auth rejection. Prove the new cases fail before the fix, then run the affected test files and `npm run check`. Separately, run the candidate in isolation with the same Codex auth route: compare CLI and RLM results, verify exact launch selection, and capture a real Astra response or the actual provider refusal. Record the evidence in TASK-5; do not merge, activate, or restart the running installation.

4. Revise `c44cc78` for the two accepted review findings only. Require a usable Codex OAuth credential for discovery and both explicit launches, including an exact parent match, when real timestamp expiry requires refresh. Keep final launch preflight; do not restore the Codex `/models` gate. Add offline failed-refresh denial coverage and retain valid-OAuth coverage. Recognize known provider prefixes from existing catalog facts even when there are no eligible rows; search only eligible rows, and preserve generic, exact and single-term behavior. Add a regression for a known provider with no eligible rows. Run focused tests and `npm run check`; verify same-Codex acceptance from isolated candidate source without starting a second Prime Agent instance or daemon, or record the actual limit. Preserve the owner review comment and publish code and task evidence separately. No merge, activation or restart.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
### Execution evidence
- Model registry now uses the auth-filtered configured catalog after the existing refresh/readiness waits. Only the extra versioned Codex catalog intersection and its cache were removed. RLM launch authentication preflight and private Prime entitlements remain in place.
- RLM provider-plus-family lookup matches only that provider’s IDs and names. Existing exact and ordinary search, limit, shape and short-form launch behavior remain covered.
- Red on base code: the partial Codex response omitted newer Astra, while empty/failed responses hid both. Both exact launch surfaces rejected the older Astra fixture with failed discovery. Scoped search on base both missed the Codex rows and could match a similarly named model from another provider.
- Green: from `packages/coding-agent`, `npx tsx ../../node_modules/vitest/dist/cli.js --run test/model-registry.test.ts test/suite/regressions/4649-subagent-model-selection.test.ts` passed (89 tests). `npm run check` passed from the repository root. CI used fixture credentials only.
- Isolated source acceptance: temporary HOME, config, cwd and sessions; only the existing Codex model overrides and stored Codex OAuth route, with no live refresh grant carried over. `prime-agent.sh model list "openai-codex astra"` and the candidate SDK’s RLM search both returned `openai-codex/gpt-6-astra` and `openai-codex/gpt-6.2-astra`. Exact lookups returned each requested selector first. The real RLM spawn used `openai-codex/gpt-6.2-astra`, stopped normally, and returned `TASK5_ASTRA_OK`. Both exact selectors were tested through both launch surfaces in deterministic tests; only spawn was exercised against the live provider. No activation or restart.

### Review revision of c44cc78
- Discovery resolves the selected Codex OAuth credential before advertising Codex rows. After timestamp expiry, failed refresh removes those rows without falling back to another credential. Both explicit launch surfaces reject an expired Codex selector, including the exact parent selector. Final launch preflight remains; no separate Codex `/models` call.
- Provider-plus-family lookup recognizes scope from the configured catalog even if the provider has no eligible rows. Results still come only from eligible rows. Existing generic, exact-selector and single-term tests remain green.
- Red on the old behavior: six focused cases failed, covering discovery, both launch surfaces (including the parent selector), and provider scoping with no eligible rows. Green on this revision: all 90 tests across `test/model-registry.test.ts` and `test/suite/regressions/4649-subagent-model-selection.test.ts` passed from `packages/coding-agent`. `npm run check` passed at the repository root. OAuth denial was deterministic and offline; fixtures also exercised valid OAuth and the launch preflight.
- Isolated source acceptance used the candidate CLI list handler and SDK RLM paths in a one-shot process with temporary config and sessions. No second Prime Agent app or daemon was launched. The configured Codex OAuth route listed both Astra selectors in CLI and RLM, both exact lookups matched, and a live `spawn` on `openai-codex/gpt-6.2-astra` stopped normally and replied `TASK5_REVISED_ASTRA_OK`. `create_session` was validated offline, not against the live provider. No merge, activation, or restart.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
author: Prime Claw Conversation
created: 2026-11-22T07:54:00Z

---

Independent review of `c44cc78ec241e97ff9bb28cae8be89073b47bbb8` on `openai-codex/gpt-6.2-sol` confirmed two in-scope defects: require usable Codex OAuth for discovery and explicit launch after failed refresh, without restoring version-pinned discovery; and return no matches when provider-plus-family names a known provider with no eligible models. Preserve launch preflight and existing search behavior elsewhere. Candidate is not ready to merge.

The canonical revision handoff stopped before the first prompt: the existing Episode worktree lacks `.prime-claw/workflows/handoff.md`. The installed implementation checks this file before prompt delivery; neither handoff nor execute was sent. The Episode remains intact and idle; no retry was made. Restore the missing managed workflow for this worktree and obtain explicit authorization before a single retry of the same bounded handoff. Status and Episode-owned content are unchanged.

---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fixed both accepted review findings: expired Codex OAuth is denied on failed refresh without restoring the model-list gate, and known providers with no eligible rows return no scoped matches. Launch preflight is preserved. All 90 focused tests and npm run check passed; isolated live Codex GPT-6.2 Astra spawn succeeded. Candidate is for Conversation review; TASK-5 remains In Progress.
<!-- SECTION:FINAL_SUMMARY:END -->
