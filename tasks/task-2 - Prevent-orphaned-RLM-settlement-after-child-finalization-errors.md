---
id: TASK-2
title: Prevent orphaned RLM settlement after child finalization errors
status: Ready for Merge
assignee: []
created_date: '2026-10-30 21:41'
updated_date: '2026-11-02 21:40'
labels: []
dependencies: []
references:
  - >-
    https://github.com/SailorJoe6/prime-agent/blob/a1faacd53ac4473a75de1d434afaf50945c2f647/packages/coding-agent/src/core/agent-session.ts#L13075-L13116
  - >-
    https://github.com/SailorJoe6/prime-agent/blob/a1faacd53ac4473a75de1d434afaf50945c2f647/packages/coding-agent/src/core/agent-session.ts#L12365-L12373
  - >-
    https://github.com/SailorJoe6/prime-agent/blob/a1faacd53ac4473a75de1d434afaf50945c2f647/packages/coding-agent/src/core/agent-session.ts#L12669-L12718
  - >-
    https://github.com/SailorJoe6/prime-agent/blob/a1faacd53ac4473a75de1d434afaf50945c2f647/packages/coding-agent/src/core/agent-session.ts#L4522-L4526
  - >-
    https://github.com/SailorJoe6/prime-agent/blob/a1faacd53ac4473a75de1d434afaf50945c2f647/packages/coding-agent/src/core/session-manager.ts#L2152-L2175
  - >-
    https://github.com/SailorJoe6/prime-agent/blob/a1faacd53ac4473a75de1d434afaf50945c2f647/packages/coding-agent/test/agent-session-recursion.test.ts
  - 'https://github.com/PrimeIntellect-ai/prime-agent/pull/3195'
  - 'https://github.com/PrimeIntellect-ai/prime-agent/pull/3209'
  - 'https://github.com/PrimeIntellect-ai/prime-agent/pull/3244'
  - 'https://github.com/PrimeIntellect-ai/prime-agent/pull/3386'
  - 'https://github.com/PrimeIntellect-ai/prime-agent/pull/3754'
documentation:
  - 'https://github.com/PrimeIntellect-ai/prime-agent/releases/tag/v0.10.0'
  - 'https://github.com/PrimeIntellect-ai/prime-agent/releases/tag/v0.10.1'
  - 'https://github.com/PrimeIntellect-ai/prime-agent/releases/tag/v0.10.2'
modified_files:
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/docs/rlm.md
  - packages/coding-agent/.changes/task-2-rlm-finalization-settlement.md
  - packages/coding-agent/test/agent-session-recursion.test.ts
type: bug
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Outcome and scope
Prevent RLM quiescence from hanging indefinitely when unexpected non-deletion child-run finalization errors leave settlement unresolved. Preserve the October 27–28, 2026 daily-sweep wedge investigation as evidence, without claiming its historical cause is proven. This is one coding-agent bug specification, not authorization to implement or plan.

## Evidence and uncertainty
The recovered read-only investigation examined TypeScript baseline a1faacd53ac4473a75de1d434afaf50945c2f647. Its relevant source seams were checked against that unchanged baseline during specification recovery; no reproduction or tests were run during recovery.

Source-identified latent defect: in packages/coding-agent/src/core/agent-session.ts:13075–13116, finalization calls flushPendingChildUsageAttribution() and performs tracking cleanup before run.settled = true and run.settlement.resolve() at 13109–13111. An unexpected exception before that settlement skips it, and the detached IIFE catch at 13116 silently discards the error. A terminal run can therefore remain in _unsettledRlmChildRuns with unresolved settlement. waitForRlmQuiescence() waits on those settlement promises at 12365–12373 and can remain pending indefinitely unless cancelled. This is a source-identified failure path, not a fault-injection result from this recovery.

Historical observations: daily-sweep sessions stalled on October 27–28. Their saved evidence was consistent with this latent failure path, including a final durable child_usage_attributed row, but contained no exception or stack establishing that this path actually occurred. Normal attribution persistence errors are already caught at 12697–12702. A trailing attribution row also occurs in healthy sessions and is not a causal signature. Fixing this latent defect, or adding a finally block alone, must not be represented as proof that the historical wedges are resolved.

Rejected hypothesis: child_usage_attributed and an inbound steered message do not by themselves form a deadlock at this baseline. The attribution flush at 12669–12718 is synchronous, with no await. If the parent assistant is not yet indexed, it queues a retry on the parent event drain and returns at 12675–12688; child settlement does not wait for that retry. The parent event queue is promise-serialized at 4522–4526, and JavaScript cannot interleave steer delivery inside the synchronous attribution append. SessionManager.appendChildUsageAttribution() in packages/coding-agent/src/core/session-manager.ts:2152–2175 is also synchronous. No promise dependency cycle between attribution, _agentEventQueue, and steer delivery was identified. Do not introduce waits or locking around that queue to address the rejected hypothesis.

## Recovered engineering findings, not an approved implementation plan
The worker proposed focused deterministic coverage in the existing packages/coding-agent/test/agent-session-recursion.test.ts: create a child with pending usage; hold the parent event drain so attribution remains pending; inject a one-shot finalization fault after the attribution boundary (for example an appropriate throwing usage lookup or unsubscribe); then let the child reach terminal status. The reported old-path expectations were terminal run.status, run.settled still false, retention in _unsettledRlmChildRuns, and a quiescence wait that never resolves. The desired result is no orphaned settlement and removal from unsettled work, observable through quiescence completion or explicit failure reporting. Internal state observations are explanatory evidence, not sufficient acceptance by themselves.

The worker also proposed a separate gated fake-provider case that injects a steer exactly at child agent_end. It should complete on the baseline, showing that the suspected attribution/steer interleaving alone is not the deadlock. Preserve this negative control alongside the failure-path regression. Use explicit events/deferred promises or gates, not polling sleeps, paid providers, or larger timeouts as readiness signals; a timer may only bound failure. The failure-path regression must expose the old behavior when hardening is removed, rather than merely asserting a mock's return value.

The suggested minimal TypeScript hardening was an inner finally covering attribution flush and non-deletion tracking cleanup, with non-deletion settlement guaranteed even if those operations throw: mark settled, resolve settlement, remove from _unsettledRlmChildRuns, and retain the normal goal/autonomous continuation notifications. This is a candidate direction for later planning, not a prescribed patch or historical causal proof. The report also recommended replacing the silent terminal catch with observable diagnostics. A cleanup fault may leave stale tracking; hardening must not conceal that failure or falsely report cleanup success. Do not expand this task into wholesale cleanup redesign.

Detached deletion is deliberately excluded from unconditional non-deletion settlement: its stronger cleanup/settlement guarantees must remain intact. Preserve terminal result delivery, own/child usage accounting, ordinary steer and attribution behavior, goal/autonomous continuation, Orca integration, and extension behavior. No daemon wire/capability change or protocol-version bump was identified as necessary by the worker; this is not authorization for a wire change.

## Upstream context: adjacent Rust evidence, not a TypeScript patch
The original upstream researcher reported that PRs #3195, #3209, and #3244 entered Rust v0.10.0 and were inherited by v0.10.1 and v0.10.2. #3195 covered idle-passivation/stop races: adjacent race coverage, not attribution settlement. #3209 concerned whole-worker idle-passivation eligibility and was not relevant. #3244 woke passivated children for agent messages and explicitly did not solve parent usage accounting.

Later reported Rust behavior: v0.10.1 #3386 persisted child usage attribution rows; v0.10.2 #3754 corrected failed-child settlement; v0.10.2 also fixed late grandchild attribution and idle-parent spawn timing. These are preserved findings from the original upstream research, not independently revalidated release claims during this recovery. None is a directly applicable TypeScript patch or proof of the rejected attribution/steer deadlock. Do not require wholesale adoption of these Rust changes.

## Provenance
Original owner Conversation: 01a0e47b-77dd-755e-9f2b-883d4053c4d3 (Prime Agent Expert). Former read-only worker: wedge-root-cause; RLM child sub-27a10a1a; saved session 01a1842f-85d5-77ce-9f39-baed217e07b0. The worker completed at 2026-10-28 20:33:58 UTC and was deleted after findings retrieval at 20:34:25 UTC. Its complete final report was recovered from the original owner's retrieval record and supplied for this task. Foreign agent transcripts were not inspected during this recovery.

Original worker transcript: /Users/jlanders/.prime/agent/session-artifacts/01a0e47b-77dd-755e-9f2b-883d4053c4d3/sub-27a10a1a/01a1842f-85d5-77ce-9f39-baed217e07b0.jsonl. Nested upstream researcher transcript (reported relative artifact location): sub-7c80d5b2/01a1842f-eec2-75b1-be1b-e429fe210407.jsonl. These are provenance references only, not required runtime inputs or permission to inspect unrelated agents. Essential findings are preserved above so this task does not depend on transcript or chat survival.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 An unexpected non-deletion child finalization fault after terminal status cannot leave RLM quiescence waiting indefinitely on an orphaned settlement. The wait completes or reports an explicit failure, and later quiescence is not blocked by that orphaned run.
- [x] #2 Unexpected finalization failures are observable through the supported error/diagnostic surface rather than silently discarded; reporting does not mask the original failure, falsely claim cleanup success, or introduce a new quiescence hang.
- [x] #3 Deterministic failure-path coverage in the existing agent-session recursion suite injects a one-shot finalization fault with child usage pending and a controlled parent event drain. It exercises observable quiescence behavior, fails against the unhardened path, and does not rely only on private-state or mock-return assertions.
- [x] #4 A gated fake-provider control delivers a steer at child agent_end and verifies normal completion and ordinary steer/usage attribution behavior. It distinguishes the rejected interleaving hypothesis from the injected finalization failure.
- [x] #5 Detached-deletion settlement still requires its stronger cleanup guarantees, including failure handling; non-deletion hardening must not settle deletion early or report incomplete deletion as successful.
- [x] #6 Terminal result delivery, child/parent usage accounting, goal/autonomous continuation, and Orca/extension behavior remain intact on ordinary and relevant failure paths; no wait or lock is added around the parent event queue to address the rejected hypothesis.
- [x] #7 Coverage uses explicit completion events or deferred gates and self-contained fake providers, with no polling sleeps, paid provider calls, or readiness-by-timeout. Results retain the distinction between the source-identified latent defect and the unproven historical October 27–28 wedge cause; a finally change alone is not evidence of historical resolution.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Keep the change local to child finalization in `packages/coding-agent/src/core/agent-session.ts` (`_startRlmChildRun`).
   Separately attempt attribution flush and existing tracking cleanup despite either failure. Guarantee the non-deletion settlement triplet in `finally`: set `run.settled`, resolve `run.settlement`, remove from `_unsettledRlmChildRuns`. Then independently attempt both existing goal/autonomous continuation notifications once; neither failure may skip the other or re-orphan settlement. Preserve same-run identity checks, retained-session subscription transfer, error retention, usage invalidation, and existing terminal result/error/cancellation delivery. Settlement is not a claim of successful cleanup. Leave ordinary recoverable attribution persistence handling, synchronous parent event-drain attribution retry, and `waitForRlmQuiescence()` unchanged; add no queue waits or locks.

2. Make unexpected failures observable without expanding recovery.
   Use the existing `coding-agent.rlm` logger with literal operation context, original error details, and relevant parent/child identity, terminal status and deletion flag. Report incomplete cleanup truthfully and secondary failures separately, without masking the original failure. Diagnostic formatting/delivery cannot control settlement; reuse the supported logger fallback. A small local no-throw reporting helper is optional only if it removes duplication. Use local, linear guarded attempts: no error accumulator, stage registry, generic cleanup runner, serialization subsystem or new fault-injection API. Add no extra model-facing notice or wire event.
   Keep deletion outside unconditional settlement. Attribution failure must still enter the existing detached-deletion cleanup/observer/retry path. Preserve unwind plus successful cleanup before settlement/notice, cleanup-failure reservation and explicit retry; no generic catch/finally may settle deletion early. Leave deletion logic unchanged where possible.

3. Add only distinct changed-boundary cases in `test/agent-session-recursion.test.ts`.
   First inspect existing accounting, terminal-delivery, continuation and deletion coverage; reuse valid assertions and add missing observable checks only where needed. Avoid redundant tests and unnecessary scaffolding; judge coverage by behavior and risk, not line count. Joe approved this replacement in AGENTS.md and cleared the former numerical test/source growth blocker. Add the necessary focused deterministic coverage without padding production, deleting useful tests, weakening any acceptance criterion or adding redundant scaffolding. Avoid a fault-by-continuation-by-deletion matrix.
   Use explicit deferred/gated faux-provider boundaries, pending child usage and a controlled parent drain. Inject real one-shot attribution and tracking-cleanup faults at finalization using the simplest existing test-local seam. Retention-callback arming of `_findAssistantEntryForMessage` and a disposer wrapper are candidates, not obligations; release real listeners even when injecting failure. Observe quiescence completion and a later call, terminal delivery, durable usage attribution/parent-own versus child totals, and diagnostics retaining original failure details—not merely private state or mock returns.
   Keep the required separate no-fault steer-at-child-`agent_end` control: baseline completion, steer consumption and ordinary terminal/usage outcomes must pass. Check that diagnostic failure cannot re-orphan settlement and an unaffected real continuation path still works; reuse supported logger behavior and valid tests, without multiplying scenarios.
   Run existing deletion safety coverage. Only if touching a deletion test/fixture is necessary, replace its affected sleep/poll readiness with concrete signals while preserving unwind/cleanup ordering, no premature settlement/notice, failed-cleanup reservation and successful explicit retry assertions. No suite-wide readiness cleanup. Use no real providers/tokens, polling, sleeps, readiness-by-timeout or retries. Release gates and restore listeners, sinks, spies and all fixture resources in `finally`.

4. Validate during implementation only.
   From `packages/coding-agent`, run every modified test file directly with `npx tsx ../../node_modules/vitest/dist/cli.js --run <exact-test.ts>`; include `test/agent-session-recursion.test.ts`, `test/goal-continuation-quiescence.test.ts` and `test/autonomous-continuation-subagent-gate.test.ts`. Temporarily remove the hardening: the observable fault regression must fail while the steer control passes baseline. Restore, then run green. Run focused suites with shuffle seeds 17 and 73, stopping at the first unexpected failure. At root run full `npm run check` and `npm run check:test-policy`; fix all errors, warnings and infos. Never run `npm test`, build or dev.

5. Finish with actual evidence, not historical claims.
   Add the genuine user-visible fragment `packages/coding-agent/.changes/task-2-rlm-finalization-settlement.md`. Record changed files, source/test growth, negative-control/restoration, direct/shuffled test and check results in TASK-2 native notes/criteria during implementation. Preserve all seven criteria, TypeScript extension and Orca contracts; no compatibility redesign. This fixes a source-identified latent defect, not a proven cause of the October 27–28 wedges. Non-goals: task reconciliation, automatic plan editing, semantic decision machinery, new persistent state/retry/state frameworks or dependencies.

TASK-2 implementation is authorized in this same active Episode and remains In Progress. Resume the preserved source-only checkpoint with all seven acceptance criteria unchanged. Historical admission/planning-only wording and numerical allowance notes are superseded by the recorded operator implementation authority and policy clearance; no new Episode, merge, abandonment or cleanup is authorized.

Execution result: completed the approved bounded finalization-fault/control slice and validation. See acceptance evidence in Implementation Notes. No implementation remains identified in this slice; next action is owning Conversation review of the separately published task and code candidate, not another execute slice or lifecycle mutation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Episode admission blocked after durable or uncertain mutation at 2026-11-01T02:54:35.582Z.
Recovery condition: inspect .prime-claw/ownership.json and reconcile every recorded task, worktree, and session identity to TASK-2 before continuing; do not retry it as fresh creation.
Cause: Episode worktree is missing .agents/skills/execute/SKILL.md

Operator explicitly cancelled failed admission 7cd387bb-7278-4dd2-b770-ba051f919859. Its unlaunched Orca worktree, local branch, clean published nested task clone, and exact ownership entry were removed. No implementation code was discarded. The previous admission blocker is retired; TASK-2 and its specification, acceptance criteria, and implementation plan are preserved for a fresh admission. The project-skill tracking fix is committed on main at 58c7a4e9320abe15e761cdb29ebf0c4d87829223.

Execution started in Episode 01a19de1-b1f5-70af-8429-44fb6499a02a at code base 58c7a4e9320abe15e761cdb29ebf0c4d87829223. One bounded slice: non-deletion child finalization settlement, truthful diagnostics, focused deterministic regression and steer control; detached deletion unchanged. Native task status remains In Progress. Validation will include negative-control removal/restoration, direct recursion/continuation tests, shuffle seeds 17/73, npm run check and npm run check:test-policy. No historical wedge causality claim.

## Resumable checkpoint — test/source growth conflict
Code checkpoint: a3eadae403320eaa13e91ec2295bd58ad005e32d, branch JLanders/prime-agent-task-2-episode-be707607, pushed without force. This is NOT a completed candidate; all seven acceptance criteria remain unchecked. No test file was changed.

Changed files:
- packages/coding-agent/src/core/agent-session.ts (+56/-20): separately guarded attribution and tracking cleanup, non-deletion settlement in finally, independent goal/autonomous notifications, no-throw coding-agent.rlm diagnostics. Detached deletion retains observer/retry cleanup before settlement.
- packages/coding-agent/docs/rlm.md (+6): behavior and historical uncertainty.
- packages/coding-agent/.changes/task-2-rlm-finalization-settlement.md (+1): user-visible fragment.

Exact blocker: smallest shared fault/control draft is 84 test lines before formatter/imports and remaining required durable accounting/real continuation assertions, versus 56 added source lines (net +36). Required attribution-fault, real-disposer tracking-fault and separate steer-at-agent_end coverage cannot honestly fit the current no-more-test-than-source rule. Draft is not executable evidence. We did not pad source, delete valid tests, weaken policy, or add excess tests.
Unblock condition: operator explicitly authorizes a narrow TASK-2 test/source growth exception sufficient for required focused coverage, or explicitly approves another resolution preserving acceptance behavior. Recommended: narrow exception, retain all seven criteria and no broad policy exclusion. Same Episode/worktree/branch must resume; no new admission.

Validation from packages/coding-agent:
1. npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-session-recursion.test.ts — first attempt FAILED 88/89: worker inherited RLM_DEPTH=1 and existing root-session test:2843 expected 0. Preserved failure; no test changed.
2. env -u RLM_DEPTH npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-session-recursion.test.ts — PASSED 89/89 after explicit environment correction; inherited RLM_MAX_DEPTH=2 retained. Existing deletion cleanup/unwind/retry coverage passed.
3. env -u RLM_DEPTH npx tsx ../../node_modules/vitest/dist/cli.js --run test/goal-continuation-quiescence.test.ts test/autonomous-continuation-subagent-gate.test.ts — PASSED 36/36 (goal 8, autonomous 28).
At root: npm run check PASSED (full output inspected; no fixes/warnings); npm run check:test-policy PASSED. Pre-commit reran full check successfully.
NOT RUN: new injected-fault regression, separate steer control, hardening-removal sensitivity/restoration, shuffle seeds 17 and 73. Existing-suite success does not satisfy those missing acceptance requirements. No historical October 27–28 wedge causality or resolution claim.

Reproducible local artifacts: /var/folders/4_/twy0wz3s1mq650wnqzn1b8rr0000gq/T/task-2-episode-29v8w3wo/worker-evidence.json, draft-tests.txt, recursion-existing.log, recursion-root-environment.log, continuation-root-environment.log, npm-check.log, test-policy.log. npm ci succeeded; reported existing dependency audit findings (28 vulnerabilities) are outside this bounded fix. No dependencies/lockfile changed. Native task remains In Progress; only owning Conversation may publish Blocked or another lifecycle decision.

Owning Conversation accepted the reported TASK-2 test/source growth blocker after reviewing pushed checkpoint a3eadae403320eaa13e91ec2295bd58ad005e32d, compatible current native task evidence at 7601f71aea4adc3f5361865d7b1b2fa5897e9007, and the 84-line shared draft. Production adds 56 lines and removes 20; no test lines changed. Required focused regression/control coverage exceeds the current test/source growth allowance. This checkpoint is not merge-ready; new fault/control, sensitivity/restoration and shuffle validation remain outstanding. Unblock condition: Joe explicitly approves a TASK-2-only exception permitting necessary focused regression test additions to exceed source additions, preserving all seven acceptance criteria and all other testing policies, or approves another resolution preserving those behaviors. Preserve the same Episode, worktree and branch; do not create a new admission, merge or clean up.

Joe explicitly approved replacing the inherited test/source line-count rule in AGENTS.md with: "Avoid redundant tests and unnecessary scaffolding; judge coverage by behavior and risk, not line count." The replacement is published on canonical main at fdbeff3a5d0664eb9f617a8e1ae8b8a66c4e7864 and integrated into this same Episode at 9956c3485547f57942c97cab3b8cb454b4844c7b. This clears the recorded test/source growth blocker and supersedes the old numerical allowance language in the existing Implementation Plan and historical blocker notes. Necessary focused regression coverage may exceed production line additions; preserve all seven acceptance criteria, useful existing coverage, and every other testing policy. Do not pad source or add redundant tests/scaffolding. Joe requested continuation of the same retained Episode; no new admission, merge of TASK-2 implementation into main, abandonment or cleanup is authorized by this clearance.

Handoff preparation after operator clearance: updated the living Implementation Plan to the approved behavior/risk-based test policy; retired numerical test/source limits without weakening any of the seven acceptance criteria. Continue from preserved checkpoint a3eadae403320eaa13e91ec2295bd58ad005e32d with AGENTS-only main change integrated at 9956c3485547f57942c97cab3b8cb454b4844c7b. Complete focused fault/control, observable accounting/diagnostic/continuation and deletion evidence, unhardened RED/control baseline then restored GREEN, exact focused files, shuffle seeds 17/73 and full checks. Preserve the initial inherited-RLM_DEPTH failure; use env -u RLM_DEPTH explicitly. The 84-line draft is untested starting material, not acceptance evidence or a line mandate. No historical wedge causality claim.

## Completed bounded regression/control slice — acceptance evidence
The approved behavior/risk policy cleared the numerical blocker. Source-only checkpoint a3eadae403320eaa13e91ec2295bd58ad005e32d is preserved at current integrated code base 9956c3485547f57942c97cab3b8cb454b4844c7b. The only additional code change is packages/coding-agent/test/agent-session-recursion.test.ts (+209/-0): two real one-shot finalization faults in a shared fixture and one separate no-fault steer-at-child-agent_end control. Production remains +56/-20 from the source checkpoint; no source padding or useful-test deletion. No dependencies, wire contracts, task lifecycle or runtime resources changed.

Acceptance evidence (all seven criteria retained verbatim):
1. Attribution lookup and real-disposer cleanup faults both complete first and later public quiescence with released parent drain. On the exact unhardened source both fail from cancelled orphaned quiescence; steer control passes. Hardened source restored byte-for-byte (SHA-256 08929739a7b7523a7d081b61187525911addd69ce61ef455ad8a96c68c32ae29).
2. Supported coding-agent.rlm diagnostics retain operation, original error/message/stack, parent/child identity, terminal done and detachedDeletion=false. Cleanup failure truthfully says incomplete. A separate injected goal-notification failure is retained independently. Throwing log sink and console fallback do not re-orphan settlement.
3. Explicit deferred child completion and parent event drain leave live pending child spend with no durable attribution yet. Real lookup/disposer fault seams signal readiness independently of diagnostics. Observable quiescence, not private state or mocked return values, is the regression boundary.
4. Separate gated fake-provider control actually sends root.steer at child agent_end, verifies provider consumption, terminal result and ordinary accounting. It passes the unhardened baseline beside both RED faults.
5. Full unchanged recursion coverage passes deletion unwind/cleanup ordering, no premature settlement, failed-cleanup reservation and explicit retry, late startup and parent disposal cases. No unconditional deletion settlement was added.
6. All three boundary cases assert terminal notice child identity, child result and actual parent consumption, reopened durable attribution, parent-own 2/1 versus aggregate 9/4 and child-own/total 7/3 input/output plus exact costs. One actual autonomous continuation is consumed in each case; injected goal-notification error cannot skip it. Existing goal/autonomous, hosted-runtime and extension compaction/deletion coverage passes. No queue wait/lock added.
7. Readiness is deferred/event-driven and fake-provider-only; gates, real listeners, spies, sink and sessions are released in finally. One exact-expression wall-clock-timer annotation permits only failure cancellation; expiry always fails, never supplies readiness. No broad exclusion, sleep/polling, live provider, paid token or daemon startup. This demonstrates the latent defect, not historical October 27–28 wedge causality or resolution.

Reproducible final validation (package root packages/coding-agent; all commands explicitly use env -u RLM_DEPTH):
- npx tsx ../../node_modules/vitest/dist/cli.js --run test/agent-session-recursion.test.ts: 92/92 PASS.
- Same direct command for test/goal-continuation-quiescence.test.ts: 8/8 PASS; test/autonomous-continuation-subagent-gate.test.ts: 28/28 PASS.
- Same CLI with all three exact files and --sequence.shuffle --sequence.seed=17, then seed=73: 128/128 PASS each; no unexpected shuffle failure or retry.
- At repository root env -u RLM_DEPTH npm run check: PASS (full output reviewed, no remaining warnings/infos); separate env -u RLM_DEPTH npm run check:test-policy: PASS.
- Sensitivity uses exact pre-hardening source a3eadae403320eaa13e91ec2295bd58ad005e32d^ temporarily: two expected RED faults, steer-control GREEN. Restored hardened direct/full shuffled GREEN.

Failed/superseded attempts are retained, not retried to green: initial new assertion confused aggregate context totalTokens with billable child spend (corrected to input/output/cost); first RED gated on diagnostics (superseded by real throwing-seam signal and released drain); first static-policy check rejected failure-only timer (single exact-expression rationale added). Initial sensitivity log filename reuse was corrected by verbatim recovery from worker tool output. The historical initial recursion 88/89 failure from inherited RLM_DEPTH=1 remains recorded; tests were not altered to match worker depth.

Full local artifacts: /var/folders/4_/twy0wz3s1mq650wnqzn1b8rr0000gq/T/task-2-regression-oxrn3a1o/ contains evidence.json (every command, exit, correction), behavioral-coverage-map.json, README.md, final-test.patch and full logs. Original checkpoint artifacts remain at /var/folders/4_/twy0wz3s1mq650wnqzn1b8rr0000gq/T/task-2-episode-29v8w3wo/. Only owning Conversation may decide candidate status/merge; TASK-2 remains In Progress pending review.

Owning Conversation reviewed the complete TASK-2 native contract, the published candidate f80340d93dc3b1c6de3459b54a82f351e136f75e, test sensitivity/restoration evidence, direct and shuffled validation, docs and checks. Independent read-only review by openai-codex/gpt-6-astra found no material defects. The approved behavior/risk testing policy and all seven acceptance texts remain intact. Fresh native session observations prove the same Episode idle with no queued work, tools, bash or running RLM children; its explicitly bound former workers are deleted and absent. Canonical main remains fdbeff3a5d0664eb9f617a8e1ae8b8a66c4e7864. Publishing Ready for Merge only; no merge, abandonment, runtime update or Episode cleanup is authorized. Await Joe’s explicit decision for this exact TASK-2 candidate.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented local non-deletion RLM child finalization hardening with truthful supported diagnostics and independent continuation attempts. Added two deterministic real-fault cases and separate steer-at-child-agent_end control in the existing recursion suite. Both faults expose orphaned settlement on the unhardened baseline; control passes, exact source restoration and hardened validation pass. Direct recursion 92/92, goal 8/8, autonomous 28/28; shuffle seeds 17/73 each 128/128; repository check and test-policy pass. Existing detached-deletion guarantees preserved. No historical wedge cause/resolution claim. Candidate awaits owning Conversation review; task status remains In Progress.
<!-- SECTION:FINAL_SUMMARY:END -->
