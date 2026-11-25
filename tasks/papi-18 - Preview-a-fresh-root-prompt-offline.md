---
id: PAPI-18
title: Preview a fresh root prompt offline
status: In Progress
assignee: []
created_date: '2026-11-22T22:18:00Z'
updated_date: '2026-11-25T19:38:00Z'
labels: []
milestone: m-0
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-cli/src/prompt_command.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/cli/command-registry.ts
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/033eea1705c5ae953fe7cd7a5e7c45317e0dfe/crates/pa-cli/src/prompt_command.rs
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#commands-installation-and-terminal-controls
  - docs/prompt-preview.md
modified_files:
  - packages/coding-agent/src/cli/command-registry.ts
  - packages/coding-agent/src/cli/public-command.ts
  - packages/coding-agent/src/core/package-manager.ts
  - packages/coding-agent/src/core/prompts/index.ts
  - packages/coding-agent/src/core/prompts/rlm.ts
  - packages/coding-agent/src/core/resource-loader.ts
  - packages/coding-agent/src/core/system-prompt.ts
  - packages/coding-agent/test/public-command.test.ts
  - docs/prompt-preview.md
  - packages/coding-agent/.changes/papi-18-prompt-preview.md
  - packages/coding-agent/src/cli/prompt-command.ts
type: feature
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose the effective fresh-root prompt in the public CLI. Keep Pi resource resolution and Python tools; do not promise to reproduce live extension or session-time changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Text and JSON identify instructions and static versus dynamic content for a fixture directory.
- [x] #2 Changing cwd or model reflects its prompt inputs without a provider call, worker or saved session.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add `prime-agent prompt [--cwd DIR] [--model MODEL] [--json]` to the existing public command registry and dispatch before session startup. Use the invocation directory by default; resolve `--cwd` for this command without changing process cwd. Use normal CLI help and errors.
2. Resolve the fresh-root inputs from Pi's existing local settings and resources: instructions, model-visible skills, custom/append prompts and the default Python tool guidance. Reuse the existing prompt builder; expose enough of its existing assembly to distinguish static instructions from runtime context without copying templates, rearranging live prompt bytes, or claiming a new cache boundary. Honor prompt inputs associated with the requested or locally configured model where Pi actually uses them; identify the model input explicitly, but do not manufacture model-specific prompt rules or require online model resolution. Exclude live extension hooks and session-time changes. Use only local resource discovery: do not execute extension code, install/fetch packages, call a provider, start a worker, or create a saved session.
3. Render that one result as readable text and machine-readable JSON, with the assembled instructions and a simple static/dynamic breakdown. Document the offline boundary and add a changelog fragment. Test the public CLI with temporary local fixtures: both output forms, cwd and model inputs, help/errors, and no session/worker/provider startup. Reuse existing test seams and run the modified focused tests plus `npm run check`. No persistent preview state, parallel prompt pipeline, task reconciliation, or iterative-plan automation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation checkpoint: use the public command dispatch and the existing resource loader with missing-package installation disabled. The prompt builder will retain live instruction order and expose a diagnostic static/dynamic breakdown. Pi does not select a base prompt by model; the preview will report the chosen model input without provider resolution.

Validation: npm run check passed. From packages/coding-agent: npx tsx ../../node_modules/vitest/dist/cli.js --run test/public-command.test.ts --sequence.shuffle --sequence.seed=18 (also seed 19), both green. Process fixtures exercise text and JSON, cwd selection, model override and default, CLI help/errors, with guards for extension execution, package installation, provider/daemon connections and session storage. Deliberate model and text-output mutation triggered four expected failures; exact source restored and validated again. Compared current and pre-change full prompt bytes in six builder variants. Upstream stable reference checked: v0.10.5, 033eea1705c5ae953fe7cd7a5e7c45317e0dfe.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added offline prime-agent prompt with text/JSON instructions and a static/dynamic breakdown. Reuses local resources and Python guidance, with model selector metadata and no live extension or session effects.
<!-- SECTION:FINAL_SUMMARY:END -->
