---
id: TASK-9
title: Preserve the end of truncated Python cell output
status: Ready for Merge
assignee: []
created_date: '2026-11-22T22:04:00Z'
updated_date: '2026-11-23T00:23:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/8aac8692456c00c01d4e53e60e6d3347a3506559/crates/pa-core/src/kernel/manager/requests.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/core/kernel/repl-manager.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/df22fd7deca6a02e50a86375e36c7fecff0b8e5f/docs/upstream-feature-inventory.md#what-the-release-notes-leave-out
  - packages/coding-agent/docs/rlm-runtime.md
modified_files:
  - packages/coding-agent/.changes/task-9-python-output-tail.md
  - packages/coding-agent/docs/rlm-runtime.md
  - packages/coding-agent/src/core/kernel/repl-manager.ts
  - packages/coding-agent/test/repl-kernel-protocol-corruption.test.ts
type: feature
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Keep the first and last portions of long cell stdout and stderr so a final diagnostic is not lost. Scope: the Python kernel output boundary, not other tools, stored sessions or shell execution. Preserve the existing bounded output budget.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 For each overlong fixture stream, the kept text spans a three-to-one head/tail split within the configured character budget and includes the final marker.
- [x] #2 The omission marker reports the number of characters omitted, including for multibyte text.
- [x] #3 At or below the limit the cell returns the original text without an omission marker.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. At the Python cell stream boundary in `ReplKernelManager`, replace head-only stdout/stderr capture with two independent bounded accumulators. Keep the existing `maxOutputChars` default and per-stream budget: count Unicode code points, use `floor(limit / 4)` for the tail and the remainder for the head, and retain only that much payload across frames. On overflow return the prefix, an omission marker reporting total received minus retained code points, and the final suffix. At or below the limit return the original text without a marker. Do not retain the omitted middle or change live `onStream` delivery. Preserve attachment diagnostics and leave result truncation, background output, shell and sessions unchanged.
2. Add unconditional, self-contained regressions at the kernel execution boundary using deterministic protocol input. Cover stdout and stderr independently, exact fill followed by another frame, at/below-limit identity, and multibyte BMP and supplementary characters at cut points. Check exact retained lengths, valid cut boundaries, accurate omission counts, the final marker text from the stream, and unchanged live delivery. Prove the regressions fail with the old capture behavior and pass with the fix. Run the modified test file directly, use multiple shuffle seeds for process-based tests, and run `npm run check` and `npm run check:test-policy`.
3. Add a coding-agent changelog fragment. Record the executed checks and acceptance evidence in TASK-9 and publish the isolated candidate for review; do not merge, bump a version, release, or activate it.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Red: from packages/coding-agent, `npx tsx ../../node_modules/vitest/dist/cli.js --run test/repl-kernel-protocol-corruption.test.ts -t TASK-9` with the base capture failed both new tests: the final stream text was absent, and below-limit supplementary characters triggered a truncation marker.
- Green: the same file run directly without `-t` passed all 26 tests, as did runs with `--sequence.shuffle --sequence.seed 37` and `--sequence.shuffle --sequence.seed 109`. At budget 8 each overlong stream retained 6 leading and 2 trailing code points including its last marker, with exactly 4 stdout and 3 Unicode stderr code points omitted. The other fixture returned exact-fill stdout and below-limit Unicode stderr unchanged. Live event framing, content, and ordering matched the fixture.
- `npm run check`, `npm run check:test-policy`, and `git diff --check` passed on Node v25.6.0 / npm 11.19.0. No live provider was required.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Python cell stdout and stderr now retain independent bounded prefixes and rolling suffixes. The omission marker counts skipped Unicode code points. Live stream delivery and the existing per-stream budget are unchanged. Oversized-attachment diagnostics remain visible outside the captured stderr budget. Includes protocol regressions, runtime docs, and a coding-agent changelog fragment.
<!-- SECTION:FINAL_SUMMARY:END -->
