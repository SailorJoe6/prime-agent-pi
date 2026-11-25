---
id: PAPI-62
title: Fix Orca mail delivery and reply identity in Prime Agent Pi
status: In Design
assignee: []
created_date: '2026-11-25T02:32:00Z'
labels: []
dependencies: []
documentation:
  - docs/product-contract.md
type: bug
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On Orca 1.4.269, an incoming bot question and a bot answer to a question sent from an Orca-hosted Prime Agent Pi terminal both reached the correct mailbox but did not appear automatically in the active Pi conversation. Manual inbox retrieval is a workaround, not successful delivery. The original send reported that readiness could not be verified. The installed Orca build's terminal-mail path requires observed-live status; when that evidence is absent, the retry path can fail to arm. The bot answer uses the same path, but the exact decision for that answer was not captured. No independent pending-mail signal was observed.

Separately, an implicit reply to the manually retrieved question was rejected as not belonging to the caller. A subsequent explicitly addressed send from the correct terminal worked. The local investigator observed a different terminal identity in the tool process launch environment after compaction; this is a lead, not proof of the original call's environment or of a shared root cause.

Investigate the loaded Orca and Pi integration, then fix the confirmed delivery and caller-identity defects in the owning component(s). Keep the ownership check and safe input protections intact. Use disposable conversations and benign test content; keep packaging/release work (PAPI-61) and broader native Orca Chat/Bots feature work (PAPI-60) separate. No production install, restart or release is authorized by filing this ticket.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On identified Orca and Prime Agent Pi builds, a benign incoming bot question and a bot answer to a terminal question each enter the intended live Pi conversation automatically and exactly once, without a manual inbox check. Verify receipt at the conversation, not just mailbox routing or a send receipt.
- [ ] #2 Mail waiting for safe input readiness is not silently stranded: confirm recovery when the intended terminal becomes ready and a visible pending state if it cannot be delivered. Do not interrupt a draft or dialog or deliver into a stale terminal.
- [ ] #3 Implicit reply from the intended Pi conversation uses its own recipient identity and succeeds; a foreign caller is still refused. Record the confirmed causes and component boundaries separately from any remaining hypotheses.
<!-- AC:END -->
