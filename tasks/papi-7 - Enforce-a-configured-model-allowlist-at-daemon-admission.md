---
id: PAPI-7
title: Enforce a configured model allowlist at daemon admission
status: In Planning
assignee: []
created_date: '2026-11-22T22:04:00Z'
updated_date: '2026-11-23T22:10:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-daemon/src/model_allowlist.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/settings-manager.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/df22fd7deca6a02e50a86375e36c7fecff0b8e5f/docs/upstream-feature-inventory.md#what-the-release-notes-leave-out
type: feature
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Distinguish a global admission policy from picker cycling. Apply it at daemon model selection, including built-in explicit and auxiliary selections. Preserve normal selection when policy is genuinely absent; do not redefine extension registration or use this as evidence about unverified extension entry modes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With a fixture allowlist containing M, an explicit request for M is admitted.
- [ ] #2 A request for an unlisted built-in model is refused with an explanation, not silently substituted; auxiliary resolution respects the same policy.
- [ ] #3 Without an admission policy, enabledModels continues to control cycling without banning other explicit selections.
- [ ] #4 When the global policy cannot be read, built-in selection is refused with a reason. A readable policy with a malformed allowlist also refuses built-in selection and explains why; neither state is treated as absence. No extension restriction is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Load global `allowedModels` from the daemon's user settings (`settings.json` in the selected agent directory), not merged workspace settings or `enabledModels`. Distinguish a missing file/key from read or JSON errors and invalid field types. Validate the raw value before any lenient settings normalization; a present array of strings is a policy (an empty array admits none). Keep the state and diagnostics local to built-in daemon selection.
2. Check the final resolved `provider/model-id` before accepting a built-in selection. Use case-insensitive exact or model-glob matching on the full selector and bare model ID, preserving IDs that contain slashes. Cover daemon session startup/restore and model changes (`set_model` and cycling), and built-in auxiliary resolution such as the session summarizer. Gate candidates before state is changed or a provider request is made. Surface refusals through existing error paths with a reason; do not substitute a different model or let a fallback swallow a policy refusal. Leave selection and picker cycling unchanged when policy is absent. Do not alter extension registration, provider retry behavior, or the daemon wire format.
3. Add deterministic faux-provider tests in the existing settings and daemon suites: allowed explicit selection, refused explicit/auxiliary selection without fallback or side effects, absent-policy cycling plus an explicit model outside `enabledModels`, and separate unreadable and malformed global policy cases. Cover empty, exact and glob matching and global versus workspace scope. Inject a read failure rather than relying on filesystem permissions. Show new regressions fail without enforcement; run changed suites directly, `npm run check`, and `npm run check:test-policy`.
4. Document global `allowedModels`, refusal behavior, and its difference from `enabledModels` in coding-agent settings docs. Add a coding-agent changelog fragment and record exact test evidence on PAPI-7. No version bump or release.
<!-- SECTION:PLAN:END -->
