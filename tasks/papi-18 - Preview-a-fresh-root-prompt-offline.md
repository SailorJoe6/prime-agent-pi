---
id: PAPI-18
title: Preview a fresh root prompt offline
status: In Progress
assignee: []
created_date: '2026-11-22T22:18:00Z'
updated_date: '2026-11-25T18:33:00Z'
labels: []
milestone: m-0
dependencies: []
references:
  - >-
    https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/crates/pa-cli/src/prompt_command.rs
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/6cd28f90e2391441850485c94b3ff099f579ef7a/packages/coding-agent/src/cli/command-registry.ts
documentation:
  - >-
    https://github.com/SailorJoe6/prime-agent-pi/blob/dfba53a40c277c8341930024b014ffbdaf7e1e68/docs/upstream-feature-inventory.md#commands-installation-and-terminal-controls
type: feature
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Expose the effective fresh-root prompt in the public CLI. Keep Pi resource resolution and Python tools; do not promise to reproduce live extension or session-time changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Text and JSON identify instructions and static versus dynamic content for a fixture directory.
- [ ] #2 Changing cwd or model reflects its prompt inputs without a provider call, worker or saved session.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add `prime-agent prompt [--cwd DIR] [--model MODEL] [--json]` to the existing public command registry and dispatch before session startup. Use the invocation directory by default; resolve `--cwd` for this command without changing process cwd. Use normal CLI help and errors.
2. Resolve the fresh-root inputs from Pi's existing local settings and resources: instructions, model-visible skills, custom/append prompts and the default Python tool guidance. Reuse the existing prompt builder; expose enough of its existing assembly to distinguish static instructions from runtime context without copying templates, rearranging live prompt bytes, or claiming a new cache boundary. Honor prompt inputs associated with the requested or locally configured model where Pi actually uses them; identify the model input explicitly, but do not manufacture model-specific prompt rules or require online model resolution. Exclude live extension hooks and session-time changes. Use only local resource discovery: do not execute extension code, install/fetch packages, call a provider, start a worker, or create a saved session.
3. Render that one result as readable text and machine-readable JSON, with the assembled instructions and a simple static/dynamic breakdown. Document the offline boundary and add a changelog fragment. Test the public CLI with temporary local fixtures: both output forms, cwd and model inputs, help/errors, and no session/worker/provider startup. Reuse existing test seams and run the modified focused tests plus `npm run check`. No persistent preview state, parallel prompt pipeline, task reconciliation, or iterative-plan automation.
<!-- SECTION:PLAN:END -->
