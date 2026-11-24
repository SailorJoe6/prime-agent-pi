---
id: PAPI-8
title: Offer a rotating local log for enabled telemetry
status: In Planning
assignee: []
created_date: '2026-11-22T22:04:00Z'
updated_date: '2026-11-24T22:00:00Z'
labels: []
milestone: m-0
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-telemetry/src/sinks/file.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/telemetry.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/df22fd7deca6a02e50a86375e36c7fecff0b8e5f/docs/upstream-feature-inventory.md#what-the-release-notes-leave-out
type: feature
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow the operator to mirror already-enabled telemetry events to a local JSON-lines file. Scope: event delivery and settings, not new collection, account state, a telemetry CLI, or changes to consent. Use a fixture sink; no real data or transmission.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 With mirroring selected, a synthetic event sent to a captured transport appears as one local JSON record.
- [ ] #2 At the size limit the log rotates and recent events remain readable.
- [ ] #3 Disabling the mirror stops local event writes without changing remote settings; disabling telemetry suppresses events even when mirroring is selected.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. In coding-agent settings, accept explicit boolean `telemetry.localMirror: true` from user-owned global settings only; unset, false, legacy settings, or a project-only value must not opt into disk retention. Read the choice at client construction, as in the released v0.10.0 client; a new client picks up changes. Pi intentionally differs from upstream's default-on choice. Keep existing remote consent, disclosure, settings precedence, capture, and transport unchanged. For disk delivery, also check Pi's existing effective master telemetry gate before each nonempty batch so a live master opt-out prevents pending mirror writes. Honor existing offline, do-not-track, and telemetry override precedence without adding a new interrupt or changing remote behavior.
2. At the existing delivery boundary, mirror only already-collected events from the built-in client. Apply v0.10.0 (763094e1b6a7c17450ee8399b06cda1853847ca5) `crates/pa-telemetry/src/sinks/file.rs`: append one UTF-8 JSON object and newline per event to `<agentDir>/telemetry.jsonl`, containing `name`, the existing UTC `timestamp`, `distinct_id` from the same installation ID, and the existing `properties`; no batch envelope or extra Pi wire event ID. Leave the original remote batch and event format intact. If the current file is already at least 5 MiB (5,242,880 bytes), rotate before the next nonempty batch, replacing the single `telemetry.jsonl.1`; the batch that crosses the threshold is not split. Empty batches do nothing. Keep files Unix `0600` (use private creation and preserve privacy through rotation); on non-Unix rely on agent-directory ACLs. Local errors are best-effort and must not prevent remote delivery or fail the session. Disabling does not delete existing logs or replay missed events. No new collection, account state, CLI, or dependencies.
3. Extend `test/telemetry.test.ts` and `test/settings-manager.test.ts` in the coding-agent package. Use temporary directories, synthetic events, and a captured fetch with no network. Verify exact JSONL fields against the captured batch; unchanged remote request and disclosure behavior; unset/false/legacy/project-only choices; live master suppression with a queued batch; and no writes after constructing a client with mirroring off. Verify no empty-file creation, threshold crossing versus next-batch rotation (including exactly 5 MiB), readable retained records and replacement of `.1`, Unix private modes, and disk failure isolated from remote delivery. Run each modified package test directly, plus root `npm run check:test-policy` and `npm run check` per repository policy.
4. Document opt-in, client lifetime, paths, rotation, retained files, and the intentional default difference in coding-agent settings docs; add the coding-agent changelog fragment. Keep the package and public compatibility surface otherwise unchanged.
<!-- SECTION:PLAN:END -->
