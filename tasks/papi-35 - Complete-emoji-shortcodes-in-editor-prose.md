---
id: PAPI-35
title: Complete emoji shortcodes in editor prose
status: In Design
assignee: []
created_date: '2026-11-22T22:18:00Z'
updated_date: '2026-11-22T23:24:00Z'
labels: []
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/commit/aa13637d7d684a241d9c4e46d7c533661a0d74dd
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/tui/src/autocomplete.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#commands-installation-and-terminal-controls
type: feature
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
v0.10.4 emoji completer. Prompt editor/completion settings. Preserve extension completions, raw text when disabled, configurable controls.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A word-start two-character prefix offers matching suggestions.
- [ ] #2 Fenced code and disabled setting leave text literal.
- [ ] #3 Only explicit menu acceptance replaces the shortcode with the selected emoji.
- [ ] #4 Typing a closing colon or a space dismisses the menu and preserves the typed text, including the delimiter.
<!-- AC:END -->
