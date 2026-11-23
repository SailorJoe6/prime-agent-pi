---
id: PAPI-59
title: Investigate a project-specific Backlog prefix
status: In Design
assignee: []
created_date: '2026-11-23T16:06:00Z'
updated_date: '2026-11-23T16:08:00Z'
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
- [x] #1 Rehearse several approaches on disposable copies and record which existing task lookups and new task creation work for each.
- [x] #2 Prove the chosen method preserves task contents, status, numbering, archive history, and native relationships; account for published links and verify rollback on the copy.
- [x] #3 Record the shortest safe cutover procedure and any real blocker. Do not switch the live prefix as part of the investigation.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Backlog 1.55.3 has no supported in-place prefix or ID rename command. Changing only the config hides existing TASK records, including archived ones; mixed prefixes did not work and doctor did not flag the missing records. On disposable copies, one coordinated change to the prefix, task filenames, and native IDs/relationship fields retained all 59 native task views except expected ID/path changes. New allocation was PAPI-60. Reversing the change restored all 59 original native views. A separate fixture preserved dotted subtask IDs, parent/dependency links, and archive lookup/restore; doctor passed on the migrated fixture. Published inventory links use immutable Git commit IDs and can keep pointing to the original snapshots. Prime Claw source review found native ID resolution and exact ownership checks, not a TASK-only filter; this was source inspection, not a live Prime Claw test.

Cutover: finish the existing TASK-9 Episode before changing its bound task ID/path. From the latest clean published task history, verify no active old-ID owner or concurrent writer; repeat the number-preserving migration and native checks in a disposable copy. Publish one normal Git commit on the existing task-history ref with prefix, filename and native relationship changes together. Keep historical URLs intact. Verify the remote commit, every mapped native task view, and the next allocation using a copy. If rollback is needed before further task writes, revert the migration commit without rewriting history. Do not change product main.
<!-- SECTION:NOTES:END -->
