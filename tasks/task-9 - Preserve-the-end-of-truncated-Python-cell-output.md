---
id: TASK-9
title: Preserve the end of truncated Python cell output
status: In Planning
assignee: []
created_date: '2026-11-22T22:04:00Z'
updated_date: '2026-11-23T00:12:00Z'
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
type: feature
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Keep the first and last portions of long cell stdout and stderr so a final diagnostic is not lost. Scope: the Python kernel output boundary, not other tools, stored sessions or shell execution. Preserve the existing bounded output budget.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 For each overlong fixture stream, the kept text spans a three-to-one head/tail split within the configured character budget and includes the final marker.
- [ ] #2 The omission marker reports the number of characters omitted, including for multibyte text.
- [ ] #3 At or below the limit the cell returns the original text without an omission marker.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. At the Python cell stream boundary in `ReplKernelManager`, replace head-only stdout/stderr capture with two independent bounded accumulators. Keep the existing `maxOutputChars` default and per-stream budget: count Unicode code points, use `floor(limit / 4)` for the tail and the remainder for the head, and retain only that much payload across frames. On overflow return the prefix, an omission marker reporting total received minus retained code points, and the final suffix. At or below the limit return the original text without a marker. Do not retain the omitted middle or change live `onStream` delivery. Preserve attachment diagnostics and leave result truncation, background output, shell and sessions unchanged.
2. Add unconditional, self-contained regressions at the kernel execution boundary using deterministic protocol input. Cover stdout and stderr independently, exact fill followed by another frame, at/below-limit identity, and multibyte BMP and supplementary characters at cut points. Check exact retained lengths, valid cut boundaries, accurate omission counts, the final marker text from the stream, and unchanged live delivery. Prove the regressions fail with the old capture behavior and pass with the fix. Run the modified test file directly, use multiple shuffle seeds for process-based tests, and run `npm run check` and `npm run check:test-policy`.
3. Add a coding-agent changelog fragment. Record the executed checks and acceptance evidence in TASK-9 and publish the isolated candidate for review; do not merge, bump a version, release, or activate it.
<!-- SECTION:PLAN:END -->
