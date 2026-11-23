---
id: PAPI-7
title: Enforce a configured model allowlist at daemon admission
status: In Progress
assignee: []
created_date: '2026-11-22T22:04:00Z'
updated_date: '2026-11-23T22:41:00Z'
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
  - packages/coding-agent/docs/settings.md#daemon-model-admission
modified_files:
  - packages/coding-agent/docs/settings.md
  - packages/coding-agent/src/core/agent-session-services.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/sdk.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/src/modes/daemon/daemon-mode.ts
  - packages/coding-agent/src/modes/daemon/daemon-session-summarizer.ts
  - packages/coding-agent/test/daemon-mode.test.ts
  - packages/coding-agent/test/daemon-session-summarizer-lifecycle.test.ts
  - packages/coding-agent/test/settings-manager.test.ts
  - >-
    packages/coding-agent/test/suite/agent-session-refine-auxiliary-model.test.ts
  - packages/coding-agent/.changes/papi-7-model-allowlist.md
  - packages/coding-agent/src/modes/daemon/daemon-model-allowlist.ts
type: feature
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Distinguish a global admission policy from picker cycling. Apply it at daemon model selection, including built-in explicit and auxiliary selections. Preserve normal selection when policy is genuinely absent; do not redefine extension registration or use this as evidence about unverified extension entry modes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 With a fixture allowlist containing M, an explicit request for M is admitted.
- [x] #2 A request for an unlisted built-in model is refused with an explanation, not silently substituted; auxiliary resolution respects the same policy.
- [x] #3 Without an admission policy, enabledModels continues to control cycling without banning other explicit selections.
- [x] #4 When the global policy cannot be read, built-in selection is refused with a reason. A readable policy with a malformed allowlist also refuses built-in selection and explains why; neither state is treated as absence. No extension restriction is introduced.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Load global `allowedModels` from the daemon's user settings (`settings.json` in the selected agent directory), not merged workspace settings or `enabledModels`. Match upstream v0.10.5 ([loader](https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/crates/pa-daemon/src/model_allowlist.rs), [settings getter](https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe/crates/pa-core/src/settings/manager.rs)): a missing file/key or explicit null is unset. Trim strings and discard blank entries; an empty or blank-only array is also unset. A nonempty normalized array is an active policy. Validate raw shape before lenient normalization; read/JSON errors, non-object documents and malformed non-null values fail closed. Keep the state and diagnostics local to built-in daemon selection.
2. Check the final resolved `provider/model-id` before accepting a built-in selection. Use case-insensitive exact or model-glob matching on the full selector and bare model ID, preserving IDs that contain slashes. Cover daemon session startup/restore and model changes (`set_model` and cycling), and built-in auxiliary resolution such as the session summarizer. Gate candidates before state is changed or a provider request is made. Surface refusals through existing error paths with a reason; do not substitute a different model or let a fallback swallow a policy refusal. Leave selection and picker cycling unchanged when policy is absent. Do not alter extension registration, provider retry behavior, or the daemon wire format.
3. Add deterministic faux-provider tests in the existing settings and daemon suites: allowed explicit selection, refused explicit/auxiliary selection without fallback or side effects, absent-policy cycling plus an explicit model outside `enabledModels`, and separate unreadable and malformed global policy cases. Cover missing, null, empty and blank-only policy, mixed blank and nonblank patterns, exact and glob matching, and global versus workspace scope. Inject a read failure rather than relying on filesystem permissions. Show new regressions fail without enforcement; run changed suites directly, `npm run check`, and `npm run check:test-policy`.
4. Document global `allowedModels`, refusal behavior, and its difference from `enabledModels` in coding-agent settings docs. Add a coding-agent changelog fragment and record exact test evidence on PAPI-7. No version bump or release.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the daemon runtime policy callback for startup and restore, daemon set_model, scoped/unscoped cycling, idle session summarization, and the shared refinement/compaction/branch-summary auxiliary resolver. Refusals do not pick a substitute. Extension registration, provider retry behavior, and wire format were not modified.

Validation (Node v25.6.0, npm ci, npm run catalog:assets): from packages/coding-agent use an empty HOME and env -i with PATH and PI_OFFLINE=1, then ../../node_modules/.bin/tsx ../../node_modules/vitest/dist/cli.js --run test/settings-manager.test.ts test/daemon-session-summarizer-lifecycle.test.ts test/daemon-session-summarizer.test.ts test/suite/agent-session-refine-auxiliary-model.test.ts test/suite/agent-session-compaction-auxiliary-model.test.ts test/suite/agent-session-branch-summary-auxiliary-model.test.ts test/daemon-mode.test.ts. Seven files, 185 tests passed. On the archived base 1777d1a4a380634904e10b87c76a6769d4b2620d, the same daemon test file with -t PAPI-7 failed seven rejection cases; two positive controls passed. Settings tests red: 24 failures; summarizer denial and two refinement refusals also failed before their guards. npm run check, npm run check:test-policy and git diff --check passed. An exploratory ambient-env run of the unmodified runtime suite showed a cycling mismatch and a provider auth error; the cycling characterization passed on both base and candidate under the isolated environment. No live-provider or extension-entry claims.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added and documented global daemon allowedModels admission, independent of enabledModels cycling. The daemon checks final built-in session and summary/refinement selections; a nonlisted model or unreadable/malformed global policy is refused without model substitution. Nine daemon fixture cases and the settings/auxiliary regressions cover the approved behavior. No version or release changes.
<!-- SECTION:FINAL_SUMMARY:END -->
