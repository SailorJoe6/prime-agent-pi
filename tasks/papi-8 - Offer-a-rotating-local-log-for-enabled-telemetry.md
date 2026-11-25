---
id: PAPI-8
title: Offer a rotating local log for enabled telemetry
status: In Planning
assignee: []
created_date: '2026-11-22T22:04:00Z'
updated_date: '2026-11-25T01:18:00Z'
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
1. Read `telemetry.localMirror` from existing global settings at construction of each built-in client. Only literal `true` opts in; unset, false, legacy settings, and project-only values leave logging off. This intentionally differs from v0.10.0's default-on mirror. Reuse Pi's existing effective telemetry check before each local batch so a live master opt-out also blocks queued local writes. Do not change remote capture, consent, disclosure, precedence, or transport. No new setting watcher; a new client picks up changes to the mirror choice.
2. Use a small filesystem helper in the existing telemetry batch drain, not a second delivery pipeline. Follow the pinned v0.10.0 file sink: append one UTF-8 JSON line per already-collected event to `<agentDir>/telemetry.jsonl`, with only `name`, UTC `timestamp`, `distinct_id` (the existing installation ID), and `properties`. Before a nonempty batch, if the current file is at least 5 MiB (5,242,880 bytes), replace `telemetry.jsonl.1` with it and append the whole batch to a fresh current file. Do nothing for empty batches. Create and keep both files private (`0600` on Unix; agent-directory ACLs elsewhere). Local errors must not fail the session or block remote delivery. Turning the mirror off does not delete or replay logs. The two log files are the only new persistent state; no separate queue, worker, retry, journal, or rotation state machine. No new collection, account state, CLI, or dependencies. Do not add deterministic machinery for task reconciliation, iterative plan changes, or other judgment the Episode or Conversation can make.
3. Extend the existing coding-agent telemetry and settings-manager tests. Reuse their fixtures with temporary paths, synthetic events, and captured fetch; no network or new harness. Group equivalent settings cases in one table. In the same delivery fixture compare the JSONL record to the unchanged remote batch and cover queued master opt-out, empty batches, exact cap and crossing-batch rotation, backup replacement and readable retained records, Unix private modes, and local failure isolation. Preserve existing disclosure coverage rather than duplicating it. Run each modified package test directly, plus root `npm run check:test-policy` and `npm run check`.
4. Update the coding-agent settings docs and add its changelog fragment. Document opt-in, when settings take effect, paths, rotation, retained files, and the intentional default difference.
<!-- SECTION:PLAN:END -->
