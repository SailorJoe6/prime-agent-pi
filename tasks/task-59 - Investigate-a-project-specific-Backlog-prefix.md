---
id: TASK-59
title: Investigate a project-specific Backlog prefix
status: In Design
assignee: []
created_date: '2026-11-23T16:06:00Z'
labels: []
dependencies: []
type: spike
ordinal: 59000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Find the simplest safe way to move this project’s Backlog IDs from TASK to PAPI. On disposable copies, compare a config-only change, a number-preserving migration, and any simpler supported alternative. The live tracker is not a test environment. Record the winning procedure and how to reverse it in this ticket; no separate proposal or PR is required for the investigation. Joe authorized applying the proven low-risk method after rehearsal, provided existing task data and links are accounted for and no live Episode still depends on the old IDs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Rehearse several approaches on disposable copies and record which existing task lookups and new task creation work for each.
- [ ] #2 Prove the chosen method preserves task contents, status, numbering, archive history, and native relationships; account for published links and verify rollback on the copy.
- [ ] #3 Record the shortest safe cutover procedure and any real blocker. Do not switch the live prefix as part of the investigation.
<!-- AC:END -->
