---
id: PAPI-7
title: Enforce a configured model allowlist at daemon admission
status: In Progress
assignee: []
created_date: '2026-11-22T22:04:00Z'
updated_date: '2026-11-23T22:56:00Z'
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
  - packages/coding-agent/.changes/papi-7-model-allowlist.md
  - packages/coding-agent/docs/settings.md
  - packages/coding-agent/src/core/agent-session-services.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/sdk.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/src/main.ts
  - packages/coding-agent/src/modes/daemon/daemon-mode.ts
  - packages/coding-agent/src/modes/daemon/daemon-model-allowlist.ts
  - packages/coding-agent/src/modes/daemon/daemon-session-summarizer.ts
  - packages/coding-agent/test/daemon-mode.test.ts
  - packages/coding-agent/test/daemon-session-summarizer-lifecycle.test.ts
  - packages/coding-agent/test/image-model-override.test.ts
  - packages/coding-agent/test/settings-manager.test.ts
  - >-
    packages/coding-agent/test/suite/agent-session-refine-auxiliary-model.test.ts
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

Accepted v0.10.5 review revision (implemented; awaiting review): PAPI-7: revise code candidate 6acf63425c6ce52e5472c6984ff71090182e2100 (reviewed task evidence 5316b01d662c2b7f0dc71832a29260b2cbd710dc). Implement only four accepted v0.10.5 parity findings: (1) gate the final built-in image override before arming it (image_route.rs); (2) read the current global policy at built-in selection rather than using a stale settings snapshot (model_switch.rs); (3) support recursive directory wildcards matching zero or more segments while preserving ordinary wildcards on slash-bearing IDs; (4) gate final built-in RLM child model before allocation or successful handle publication while retaining worker validation (rlm_children/host.rs). Preserve allowed/absent policy behavior and extension, retry, and wire boundaries. Prove with narrow offline faux-model tests, required checks, and exact independent code/task publication; no merge/release.

Accepted matcher-only review revision (pending): In candidate 066705c5e52feed4f9cd478cf7155adb1c4766ba (reviewed task ea822cc92d9db9f2eab22d37ad713510a5e633f3), splitting recursive components before recognizing brace alternatives breaks valid released v0.10.5 glob syntax. Preserve alternative boundaries and zero/nonzero recursive directory depths and keep ordinary wildcard matching across slashes. Add offline faux-config cases for a literal alternative, both recursive depths and a nonmatch. Keep the three other reviewed fixes unchanged. Record baseline and candidate checks and exact separate code/task publication; no scope expansion, live provider, exploit work, merge or release.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the daemon runtime policy callback for startup and restore, daemon set_model, scoped/unscoped cycling, idle session summarization, and the shared refinement/compaction/branch-summary auxiliary resolver. Refusals do not pick a substitute. Extension registration, provider retry behavior, and wire format were not modified.

Validation (Node v25.6.0, npm ci, npm run catalog:assets): from packages/coding-agent use an empty HOME and env -i with PATH and PI_OFFLINE=1, then ../../node_modules/.bin/tsx ../../node_modules/vitest/dist/cli.js --run test/settings-manager.test.ts test/daemon-session-summarizer-lifecycle.test.ts test/daemon-session-summarizer.test.ts test/suite/agent-session-refine-auxiliary-model.test.ts test/suite/agent-session-compaction-auxiliary-model.test.ts test/suite/agent-session-branch-summary-auxiliary-model.test.ts test/daemon-mode.test.ts. Seven files, 185 tests passed. On the archived base 1777d1a4a380634904e10b87c76a6769d4b2620d, the same daemon test file with -t PAPI-7 failed seven rejection cases; two positive controls passed. Settings tests red: 24 failures; summarizer denial and two refinement refusals also failed before their guards. npm run check, npm run check:test-policy and git diff --check passed. An exploratory ambient-env run of the unmodified runtime suite showed a cycling mismatch and a provider auth error; the cycling characterization passed on both base and candidate under the isolated environment. No live-provider or extension-entry claims.

Prior candidate and its validation remain historical evidence; owner accepted four in-scope parity fixes for the next execute pass. See pending revision in Implementation Plan.

PAPI-7 v0.10.5 parity revision validated against upstream tag v0.10.5 (033eea1705c5ae953fe7cd7a5e7e7c45317e0dfe): model_switch.rs loads policy at switch time; image_route.rs gates the resolved override before arming; rlm_children/host.rs gates the final child selection before allocation; pa-core models/allowlist.rs uses globset case-folded selector and bare-ID matching. This revision reads global policy only under the existing settings lock at selection, without reloading session settings; gates image and child selection before the side effects; preserves worker validation; handles recursive **/ and ordinary slash-spanning wildcards.

Validation from packages/coding-agent: env -i PATH="$PATH" HOME=<empty-temp> PI_OFFLINE=1 ../../node_modules/.bin/tsx ../../node_modules/vitest/dist/cli.js --run test/settings-manager.test.ts test/daemon-session-summarizer-lifecycle.test.ts test/daemon-session-summarizer.test.ts test/suite/agent-session-refine-auxiliary-model.test.ts test/suite/agent-session-compaction-auxiliary-model.test.ts test/suite/agent-session-branch-summary-auxiliary-model.test.ts test/daemon-mode.test.ts test/image-model-override.test.ts. 204/204 in eight suites. Focused daemon and image tests with -t PAPI-7 --sequence.shuffle --sequence.seed=17 and then =29: 16/16 each. Scoped tests copied into git archive of 6acf63425c6ce52e5472c6984ff71090182e2100: stale-policy/glob 2 expected failures, image 1 expected failure and 1 positive passed, child 2 expected failures and 1 positive passed. npm run check, npm run check:test-policy, and git diff --check passed. Offline faux provider; no live calls or wire, retry, or extension registration change.

Prior validation remains historical evidence. The accepted next revision is limited to recursive glob matching inside brace alternatives; see the pending Implementation Plan entry.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Global daemon allowedModels blocks disallowed built-in selections without substitution and stays separate from enabledModels cycling. The v0.10.5 parity revision reads current global policy, handles recursive directory globs, and gates the final image override and RLM child model before arming/allocation, preserving worker checks. Eight offline suites passed (204 tests).
<!-- SECTION:FINAL_SUMMARY:END -->
