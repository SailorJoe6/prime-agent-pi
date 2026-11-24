---
id: m-6
title: "Prime Agent Pi build and release pipeline"
---

## Description

Finish a repeatable Prime Agent Pi packaging and release pipeline under docs/product-contract.md. This build track runs separately from v0.10.0 feature parity: it should be ready to package a parity candidate when one exists, but it does not implement parity or authorize a release.

Start with [PAPI-61](https://github.com/SailorJoe6/prime-agent-pi/blob/621d604f5c086c81dd84bde3732bec71d53eb5c3/tasks/papi-61%20-%20Build-and-validate-the-Prime-Agent-Pi-packaging-and-release-pipeline.md). Reuse the existing candidate and evidence instead of starting over. All eight native archives built from ce83fb61 in GitHub Actions run 45350439387. Install, update and rollback were tested end-to-end on ARM64 Linux only; nonpublishing rehearsal and fixture checks passed. Exact-build Prime Claw discovery is already assigned to the existing PAPI-61 Episode; verify its eventual report rather than launching it again.

Remaining: verify full repository CI and outstanding exact-build integration checks, document a repeatable release dry run and its limits, and separate any actual first-release checks that must wait for feature parity. Stable stays gated on the exact artifact set and verified parity. No merge, public version bump, tag, release, support-policy change or host activation is authorized by this milestone.

Ownership: PAPI-61 has an existing Episode. A new conversation should read the published checkpoint and coordinate a clean handoff or use a separate follow-up ticket. Do not start another PAPI-61 Episode or edit the same branch concurrently.
