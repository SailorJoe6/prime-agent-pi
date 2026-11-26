"""Python factory inspection, adapted from Prime Agent v0.10.0.

Copyright (c) 2025-2026 Prime Intellect Ltd.; distributed under the MIT license.
"""

from __future__ import annotations

import copy
import json
from typing import Any

from . import factory_spec as schema
from .harness import HarnessState, _agent_dir, _strip_scope_prefix

FACTORY_DISABLED_MESSAGE = (
    'the factory is disabled; set factory.enabled to true in your agent settings.json'
)

FACTORY_HELP = """Factory definitions describe named graphs of agent states.
Save a definition with rlm.harness.save_factory(name, spec). Use states and
transitions, or use nodes for a DAG. Mark machine entry states with entry=true.
Transitions can join multiple sources or guard a single source's output.
Declare text or JSON ports to connect outputs to inputs. Bound loops with
max_entries and set run limits in the run block.

Opt in by adding {"factory": {"enabled": true}} to your agent settings.json.
Use await rlm.factory.graph(name) to inspect a saved definition without
starting children. Library files can be validated with rlm.machine_library.
This preview does not execute machines.
"""


def require_factory_enabled() -> None:
    try:
        document = json.loads((_agent_dir() / "settings.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        document = None
    factory = document.get("factory") if isinstance(document, dict) else None
    if not isinstance(factory, dict) or factory.get("enabled") is not True:
        raise ValueError(FACTORY_DISABLED_MESSAGE)


def definition_graph(harness: HarnessState, ref: str | None) -> dict[str, Any]:
    if ref is None:
        return {"runs": []}
    spec = harness.get_factory(ref)
    if spec is None:
        raise ValueError(f"unknown factory run or spec {ref!r}")
    errors = schema.validate_factory_spec(spec)
    if errors:
        raise ValueError(f"factory spec {ref!r} does not validate: {'; '.join(errors)}")
    if "nodes" in spec:
        machine, _ = schema.compile_factory_dag(spec)
        assert machine is not None
    else:
        machine = spec

    authored = machine.get("run") or {}
    run = {
        "max_parallel": authored.get("max_parallel", schema.RUN_MAX_PARALLEL_DEFAULT),
        "max_transitions": authored.get("max_transitions", min(
            schema.TRANSITIONS_PER_STATE_DEFAULT * len(machine["states"]), schema.MAX_TRANSITIONS_CAP,
        )),
        "failure_policy": authored.get("failure_policy", schema.RUN_FAILURE_POLICY_DEFAULT),
        "max_children": authored.get("max_children", schema.RUN_MAX_CHILDREN_DEFAULT),
    }
    if "budget_ms" in authored:
        run["budget_ms"] = authored["budget_ms"]
    states = []
    for state in machine["states"]:
        row = {
            "id": state["id"],
            "entry": state.get("entry", schema.STATE_ENTRY_DEFAULT),
            "lifecycle": state.get("lifecycle", schema.NODE_LIFECYCLE_DEFAULT),
            "max_entries": state.get("max_entries", schema.STATE_MAX_ENTRIES_DEFAULT),
            "retries": state.get("retries", schema.NODE_RETRIES_DEFAULT),
        }
        subagent = state["subagent"]
        if isinstance(subagent, str):
            row["subagent"] = subagent
        else:
            if subagent.get("name"):
                row["subagent"] = subagent["name"]
            for key in ("model", "thinking"):
                if subagent.get(key) is not None:
                    row[key] = subagent[key]
        states.append(row)
    transitions = []
    for transition in machine.get("transitions") or []:
        edge = {"from": copy.deepcopy(transition["from"]), "to": transition["to"], "on": "settled"}
        if "when" in transition:
            edge["when"] = copy.deepcopy(transition["when"])
        transitions.append(edge)

    spec_id, _ = _strip_scope_prefix(ref, False)
    return {
        "run_id": None,
        "spec_id": spec_id,
        "name": None,
        "state": None,
        "pause_reason": None,
        "elapsed_ms": 0,
        "machine": {"run": run, "states": states, "transitions": transitions,
                    "order": [row["id"] for row in states]},
        "nodes": [],
        "active_nodes": [],
        "last_fired": [],
        "events": [],
        "usage": None,
        "budget": {"limit_ms": run.get("budget_ms"), "consumed_ms": 0},
    }
