---
id: PAPI-60
title: Add native Orca Chat and Bots for Prime Agent after parity
status: In Design
assignee: []
created_date: '2026-11-23T23:34:00Z'
labels: []
dependencies: []
references:
  - https://github.com/stablyai/orca/issues/34735
  - https://github.com/stablyai/orca/pull/42895
documentation:
  - docs/product-contract.md
  - packages/coding-agent/docs/acp.md
  - packages/coding-agent/docs/agent-connection.md
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Pickup gate

This is a Prime Agent Pi enhancement, not an upstream parity requirement. Pick it up only after all other parity tickets are complete and parity with the then-current stable upstream Prime Agent release is verified under the product contract. Recheck the released ACP behavior and the supported Orca build at pickup; do not freeze the November 2026 baseline or repeat work already covered by parity.

## Slice 1 — Native Chat under the existing `prime-agent` identity

Add Orca's native structured Chat to its existing Prime Agent integration; retain the existing CLI launch, resume, and hooks. Prime Agent Pi remains the engine. The Prime daemon owns execution, transcript, Python REPL, continual harness, and background work. Chat and terminal are clients of that one session. Use supported capability detection for the selected executable; ACP saved-history loading alone is not live attachment.

**Continue in chat** attaches native Chat to the existing session from a terminal; **Continue in terminal** attaches a TUI from Chat. Both views may stay open and show the same live updates. These actions do not copy, fork, replace, or restart the session. Detaching a view does not stop work; explicit Stop acts on the intended shared session. Reconnect to the exact session and recover missed output without duplicating turns. If exact attachment fails, report it; never silently substitute a session or resend a prompt with an unknown outcome.

## Slice 2 — Orca Bot Home Chat

After Slice 1 is proven, let an owner create a local Bot using Prime Agent through Orca's existing picker and Bot Home Chat. Offer it only where the host supports native Prime Chat. Bind each Bot to its own home, launch/model choices, and durable Prime conversation; deliver its instructions, including SOUL.md and bounded MEMORY.md, on first launch and reopen. Preserve native chat streaming, detach/reconnect and Stop. Separate homes are not a sandbox; do not advertise unsupported permission or tool behavior.

No OMP port, separate agent identity, terminal scraping, alternate chat UI, scheduled Bot runs, external connectors, or remote Bot deployment in these slices. Preserve existing compatibility and user state under the product contract. This task does not authorize work in Orca's upstream repository, public submissions, or live rollout.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The parity pickup gate is met before planning work begins; record the verified stable upstream version and exact Prime Agent Pi and Orca builds used for acceptance.
- [ ] #2 Orca can start Prime Agent in native Chat under the existing prime-agent identity, with prompts, streamed replies/tool output, and Stop. Existing terminal launch, resume, and hooks still work; unsupported builds are not offered native Chat.
- [ ] #3 During an active turn, Continue in chat and Continue in terminal each attach to the same daemon session, worker, worktree, and live Python kernel. Both views can stay open, send prompts, and receive shared updates. No copied transcript, replacement session, second worker, or duplicated messages.
- [ ] #4 Detach either view and break the chat transport while work is active. Reattach through a fresh Chat connection to the exact live worker, recover the missed result once without resending, and retain live Python state. Explicit Stop cancels the intended work, leaves the shared session usable, and does not stop an unrelated session. An unknown delivery outcome or failed exact attach is reported, not silently replayed or replaced.
- [ ] #5 On a supported host, create two local Prime Agent Bots and an ordinary Prime Chat. Each Bot uses its own Home Chat, launch settings, and instructions at first launch and after reopen, with no cross-session leakage or change to global defaults. Hiding the tab leaves work running; reopening shows the same session and result, and Stop acts only on its intended session.
<!-- AC:END -->
