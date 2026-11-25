"""Inert factory definition validation and DAG compilation.

Adapted from Prime Agent v0.10.0 (763094e1b6a7c17450ee8399b06cda1853847ca5),
prime-agent-runtime/src/rlm/factory.py. Copyright (c) 2025-2026 Prime Intellect
Ltd.; distributed under the repository's MIT license.
"""

from __future__ import annotations

import copy
import math
import re
from typing import Any

FAILURE_POLICIES: tuple[str, ...] = ("fail_fast", "continue", "escalate")
PORT_TYPES: tuple[str, ...] = ("text", "json")
LIFECYCLES: tuple[str, ...] = ("task", "resident")
TRANSITION_ON_KINDS: tuple[str, ...] = ("settled",)
GUARD_OPS: tuple[str, ...] = ("eq", "ne", "gt", "gte", "lt", "lte", "exists", "contains")
MAX_NODES = 1024
MAX_STATES = MAX_NODES
MAX_RETRIES = 10
MAX_PARALLEL_MIN = 1
MAX_PARALLEL_MAX = 64
FOREACH_MAX_MIN = 1
FOREACH_MAX_MAX = 256
MAX_TRANSITIONS_CAP = 10_000
MAX_CHILDREN_CAP = 1_000_000
TRANSITIONS_PER_STATE_DEFAULT = 10
RUN_FAILURE_POLICY_DEFAULT = "escalate"
RUN_MAX_PARALLEL_DEFAULT = 8
RUN_MAX_CHILDREN_DEFAULT = 10_000
NODE_LIFECYCLE_DEFAULT = "task"
NODE_RETRIES_DEFAULT = 0
STATE_ENTRY_DEFAULT = False
STATE_MAX_ENTRIES_DEFAULT = 1
SUBAGENT_NAME_MAX_LENGTH = 64

_NODE_ID_PATTERN = re.compile(r"[a-z0-9][a-z0-9-]{0,63}")


def _is_int(value: Any) -> bool:
    """True for real integers; booleans are not accepted as ints."""
    return isinstance(value, int) and not isinstance(value, bool)


def _is_number(value: Any) -> bool:
    """True for real numbers; booleans are not accepted as numbers."""
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _is_scalar(value: Any) -> bool:
    """True for JSON scalars (str, int, float, bool, None); lists and objects are not."""
    return value is None or isinstance(value, (str, int, float, bool))


def _is_positive_int(value: Any) -> bool:
    return _is_int(value) and value > 0


MAX_GUARD_VALUE_DEPTH = 256


def _value_is_finite(
    value: Any, _seen: frozenset[int] | None = None, _depth: int = 0
) -> bool:
    """Reject non-JSON shapes, non-finite numbers, cycles, and excessive nesting."""
    if _depth > MAX_GUARD_VALUE_DEPTH:
        return False
    seen = _seen or frozenset()
    if isinstance(value, (list, dict)):
        if id(value) in seen:
            return False
        seen = seen | {id(value)}
    if isinstance(value, float):
        return math.isfinite(value)
    if isinstance(value, (bool, int, str)) or value is None:
        return True
    if isinstance(value, list):
        return all(_value_is_finite(item, seen, _depth + 1) for item in value)
    if isinstance(value, dict):
        return all(
            isinstance(key, str) and _value_is_finite(item, seen, _depth + 1)
            for key, item in value.items()
        )
    return False


def _is_nonempty_str(value: Any) -> bool:
    return isinstance(value, str) and value != ""


def _valid_node_id(value: Any) -> bool:
    return _is_nonempty_str(value) and _NODE_ID_PATTERN.fullmatch(value) is not None


def _port_list(node: dict[str, Any], key: str) -> list[Any]:
    """Return the node's inputs/outputs list, or [] when absent or malformed."""
    raw = node.get(key)
    return raw if isinstance(raw, list) else []


def _declared_port_types(node: dict[str, Any], key: str) -> dict[str, str]:
    """Map port name to type for well-formed entries of the node's port list."""
    ports: dict[str, str] = {}
    for entry in _port_list(node, key):
        if isinstance(entry, dict):
            name, port_type = entry.get("name"), entry.get("type")
            if _is_nonempty_str(name) and port_type in PORT_TYPES:
                ports[name] = port_type
    return ports


def _effective_output_types(state: dict[str, Any]) -> dict[str, str]:
    """Output ports readable from a state: its declared outputs."""
    return _declared_port_types(state, "outputs")


def _input_sources(node: dict[str, Any]) -> list[str]:
    """Source node ids referenced by the node's inputs."""
    sources: list[str] = []
    for inp in _port_list(node, "inputs"):
        if not isinstance(inp, dict):
            continue
        source = inp.get("from")
        if isinstance(source, str) and "." in source:
            sources.append(source.partition(".")[0])
    return sources


def _is_machine_form(spec: Any) -> bool:
    """Machine form wins whenever a states/transitions key is present."""
    return isinstance(spec, dict) and ("states" in spec or "transitions" in spec)


def _validate_run_fields(run: Any, errors: list[str]) -> int | None:
    """Shared run-block checks. Returns the run budget when valid, else None.

    ``run`` must already be a dict or None; the caller reports "run must be
    an object" for other shapes.
    """
    if not isinstance(run, dict):
        return None
    if "budget_ms" in run and not _is_positive_int(run.get("budget_ms")):
        errors.append("run budget_ms must be a positive integer")
    run_budget = run.get("budget_ms") if _is_positive_int(run.get("budget_ms")) else None
    if "failure_policy" in run and run.get("failure_policy") not in FAILURE_POLICIES:
        errors.append(f"run failure_policy must be one of {list(FAILURE_POLICIES)}, got {run.get('failure_policy')!r}")
    max_parallel = run.get("max_parallel")
    if "max_parallel" in run and not (
        _is_int(max_parallel) and MAX_PARALLEL_MIN <= max_parallel <= MAX_PARALLEL_MAX
    ):
        errors.append(f"run max_parallel must be an integer between {MAX_PARALLEL_MIN} and {MAX_PARALLEL_MAX}")
    max_transitions = run.get("max_transitions")
    if "max_transitions" in run and not (
        _is_positive_int(max_transitions) and max_transitions <= MAX_TRANSITIONS_CAP
    ):
        errors.append(f"run max_transitions must be a positive integer no greater than {MAX_TRANSITIONS_CAP}")
    max_children = run.get("max_children")
    if "max_children" in run and not (
        _is_positive_int(max_children) and max_children <= MAX_CHILDREN_CAP
    ):
        errors.append(f"run max_children must be a positive integer no greater than {MAX_CHILDREN_CAP}")
    return run_budget


def _validate_state_fields(
    state: dict[str, Any],
    *,
    run_budget: int | None,
    states_by_id: dict[str, dict[str, Any]],
    noun: str,
    errors: list[str],
) -> None:
    """Field rules shared by dag nodes (noun="node") and machine states
    (noun="state"): subagent forms, lifecycle, budgets, retries, failure
    policies, port lists, foreach, and the resident exclusions."""
    ref = state["id"]
    lifecycle = state.get("lifecycle", NODE_LIFECYCLE_DEFAULT)
    if "lifecycle" in state and lifecycle not in LIFECYCLES:
        errors.append(f"{noun} {ref} lifecycle must be 'task' or 'resident', got {lifecycle!r}")
    is_resident = lifecycle == "resident"

    if state.get("wait") is not None:
        errors.append(
            f"{noun} {ref}: wait states require the watch host handlers (rlm.watch.*); "
            "they arrive with the communication series - remove the wait block until then"
        )

    subagent = state.get("subagent")
    if _is_nonempty_str(subagent):
        pass  # Harness subagent entry id or title; resolved at run time.
    elif isinstance(subagent, dict):
        if not isinstance(subagent.get("prompt"), str) or not subagent.get("prompt").strip():
            errors.append(f"{noun} {ref} inline subagent requires a non-empty prompt")
        for key in ("name", "model", "thinking"):
            value = subagent.get(key)
            if value is not None and (not isinstance(value, str) or not value.strip()):
                errors.append(f"{noun} {ref} inline subagent {key} must be a non-empty string when provided")
        configured_name = subagent.get("name")
        if isinstance(configured_name, str) and len(configured_name.strip()) > SUBAGENT_NAME_MAX_LENGTH:
            errors.append(
                f"{noun} {ref} inline subagent name must be at most "
                f"{SUBAGENT_NAME_MAX_LENGTH} characters, got {len(configured_name.strip())}"
            )
    else:
        errors.append(
            f"{noun} {ref} requires a subagent: a harness subagent id/title string "
            "or an inline object with a prompt"
        )

    if "budget_ms" in state:
        budget = state.get("budget_ms")
        if not _is_positive_int(budget):
            errors.append(f"{noun} {ref} budget_ms must be a positive integer")
        elif run_budget is not None and budget > run_budget:
            errors.append(f"{noun} {ref} budget_ms {budget} exceeds the run budget_ms {run_budget}")

    if "retries" in state and not (_is_int(state.get("retries")) and 0 <= state.get("retries") <= MAX_RETRIES):
        errors.append(f"{noun} {ref} retries must be an integer between 0 and {MAX_RETRIES}")

    if "failure_policy" in state and state.get("failure_policy") not in FAILURE_POLICIES:
        errors.append(
            f"{noun} {ref} failure_policy must be one of {list(FAILURE_POLICIES)}, got {state.get('failure_policy')!r}"
        )

    outputs = state.get("outputs")
    if outputs is not None and not isinstance(outputs, list):
        errors.append(f"{noun} {ref} outputs must be a list")
    elif is_resident and isinstance(outputs, list) and outputs:
        errors.append(f"resident {noun} {ref} cannot declare outputs")
    seen_output_names: set[Any] = set()
    reported_duplicate_outputs: set[Any] = set()
    for index, out in enumerate(_port_list(state, "outputs")):
        if not isinstance(out, dict):
            errors.append(f"{noun} {ref} outputs[{index}] must be an object")
            continue
        name, port_type = out.get("name"), out.get("type")
        if not _is_nonempty_str(name):
            errors.append(f"{noun} {ref} outputs[{index}] requires a non-empty name")
        elif name in seen_output_names:
            if name not in reported_duplicate_outputs:
                reported_duplicate_outputs.add(name)
                errors.append(f"{noun} {ref} declares duplicate output name {name!r}")
        else:
            seen_output_names.add(name)
        if port_type not in PORT_TYPES:
            errors.append(f"{noun} {ref} output {name!r} type must be 'text' or 'json'")

    inputs = state.get("inputs")
    if inputs is not None and not isinstance(inputs, list):
        errors.append(f"{noun} {ref} inputs must be a list")
    seen_input_names: set[Any] = set()
    reported_duplicate_inputs: set[Any] = set()
    output_types_by_source: dict[str, dict[str, str]] = {}
    for index, inp in enumerate(_port_list(state, "inputs")):
        if not isinstance(inp, dict):
            errors.append(f"{noun} {ref} inputs[{index}] must be an object")
            continue
        name, port_type, source = inp.get("name"), inp.get("type"), inp.get("from")
        optional = inp.get("optional")
        if optional is not None and not isinstance(optional, bool):
            errors.append(f"{noun} {ref} input {name!r} optional must be a boolean when provided")
        if not _is_nonempty_str(name):
            errors.append(f"{noun} {ref} inputs[{index}] requires a non-empty name")
        elif name in seen_input_names:
            if name not in reported_duplicate_inputs:
                reported_duplicate_inputs.add(name)
                errors.append(f"{noun} {ref} declares duplicate input name {name!r}")
        else:
            seen_input_names.add(name)
        if port_type not in PORT_TYPES:
            errors.append(f"{noun} {ref} input {name!r} type must be 'text' or 'json'")
        if not isinstance(source, str) or "." not in source:
            errors.append(
                f"{noun} {ref} input {name!r} requires a 'from' reference of the form '<node_id>.<output_name>'"
            )
            continue
        src_id, _, src_output = source.partition(".")
        if src_id not in states_by_id:
            errors.append(f"{noun} {ref} input {name!r} references unknown {noun} {src_id!r}")
            continue
        src = states_by_id[src_id]
        if src.get("lifecycle", NODE_LIFECYCLE_DEFAULT) == "resident":
            errors.append(f"{noun} {ref} input {name!r} cannot read from resident {noun} {src_id!r}")
            continue
        if src_id not in output_types_by_source:
            output_types_by_source[src_id] = _effective_output_types(src)
        src_output_types = output_types_by_source[src_id]
        if src_output not in src_output_types:
            errors.append(
                f"{noun} {ref} input {name!r} references output {src_output!r} "
                f"that {noun} {src_id!r} does not declare"
            )
        elif port_type in PORT_TYPES and src_output_types[src_output] != port_type:
            errors.append(
                f"{noun} {ref} input {name!r} of type {port_type!r} cannot read from "
                f"output {src_output!r} of type {src_output_types[src_output]!r}"
            )

    foreach = state.get("foreach")
    if foreach is not None:
        if is_resident:
            errors.append(f"resident {noun} {ref} cannot use foreach")
        if not isinstance(foreach, dict):
            errors.append(f"{noun} {ref} foreach must be an object")
        else:
            over = foreach.get("over")
            if not _is_nonempty_str(over):
                errors.append(f"{noun} {ref} foreach.over must be a non-empty input name")
            else:
                declared_inputs = _declared_port_types(state, "inputs")
                if over not in declared_inputs:
                    errors.append(
                        f"{noun} {ref} foreach.over must name one of this {noun}'s inputs, got {over!r}"
                    )
                elif declared_inputs[over] != "json":
                    errors.append(f"{noun} {ref} foreach.over input {over!r} must have type 'json'")
            foreach_max = foreach.get("max")
            if not (_is_int(foreach_max) and FOREACH_MAX_MIN <= foreach_max <= FOREACH_MAX_MAX):
                errors.append(
                    f"{noun} {ref} foreach.max must be an integer between {FOREACH_MAX_MIN} and {FOREACH_MAX_MAX}"
                )


def _validate_guard(
    when: Any,
    index: int,
    src_state: dict[str, Any],
    errors: list[str],
) -> None:
    if not isinstance(when, dict):
        errors.append(f"transitions[{index}] when must be an object")
        return
    output = when.get("output")
    src_types = _effective_output_types(src_state)
    if not _is_nonempty_str(output):
        errors.append(f"transitions[{index}] when requires a non-empty output")
    elif output not in src_types:
        errors.append(
            f"transitions[{index}] when.output {output!r} is not a declared "
            f"output of state {src_state.get('id')!r}"
        )
    else:
        path = when.get("path")
        if path is not None:
            if not _is_nonempty_str(path):
                errors.append(f"transitions[{index}] when.path must be a non-empty dotted path")
            elif src_types[output] != "json":
                errors.append(
                    f"transitions[{index}] when.path requires a json output, got text output {output!r}"
                )
    op = when.get("op")
    if op not in GUARD_OPS:
        errors.append(f"transitions[{index}] when.op must be one of {list(GUARD_OPS)}, got {op!r}")
        return
    if op == "exists":
        return  # existence carries no value
    value = when.get("value")
    if op in ("gt", "gte", "lt", "lte"):
        if not _is_number(value):
            errors.append(f"transitions[{index}] when.op {op!r} requires a numeric value")
    elif op == "contains":
        if not isinstance(value, list) or not value:
            errors.append(f"transitions[{index}] when.op 'contains' requires a non-empty list value")
    elif op in ("eq", "ne") and not _is_scalar(value):
        errors.append(f"transitions[{index}] when.op {op!r} requires a scalar value")
    if not _value_is_finite(value):
        errors.append(
            f"transitions[{index}] when.value must be finite JSON data "
            "(JSON carries no NaN or Infinity, and only JSON shapes "
            "serialize: lists, objects, strings, numbers, booleans, null, "
            f"and no container nests deeper than {MAX_GUARD_VALUE_DEPTH} levels)"
        )


def validate_factory_machine(machine: Any) -> list[str]:
    """Dry-run validation for a machine-form factory spec.

    Returns a list of human-readable error sentences; an empty list means
    the machine is valid. Rules: states are 1..1024 with unique slug ids and
    at least one entry state; every state requires a subagent and entry
    states declare no inputs; resident states declare no outputs, foreach,
    or outgoing transitions; wait blocks are rejected (the watch host
    handlers arrive with the communication series); transitions reference
    existing states (self-loops are legal re-entry) and may carry one guard
    over the from-state's latest settle output; a transition with a LIST of
    from-states is a join that fires once every source settled (guards are
    single-source only). There is no acyclicity requirement: arbitrary
    state machines, including cycles, validate.
    """
    if not isinstance(machine, dict):
        return ["factory machine must be a JSON object"]
    errors: list[str] = []
    run = machine.get("run")
    if run is not None and not isinstance(run, dict):
        errors.append("run must be an object")
        run = None
    run_budget = _validate_run_fields(run, errors)

    states = machine.get("states")
    if not isinstance(states, list):
        errors.append("factory machine requires a states list")
        return errors
    if not 1 <= len(states) <= MAX_STATES:
        errors.append(f"factory machine must declare between 1 and {MAX_STATES} states, got {len(states)}")
        return errors

    seen_ids: set[str] = set()
    states_by_id: dict[str, dict[str, Any]] = {}
    for index, state in enumerate(states):
        if not isinstance(state, dict):
            errors.append(f"states[{index}] must be an object")
            continue
        state_id = state.get("id")
        if not _is_nonempty_str(state_id):
            errors.append(f"states[{index}] requires a non-empty id")
        elif not _valid_node_id(state_id):
            errors.append(f"states[{index}] id must match ^[a-z0-9][a-z0-9-]{{0,63}}$, got {state_id!r}")
        elif state_id in seen_ids:
            errors.append(f"states[{index}] duplicates state id {state_id!r}")
        else:
            seen_ids.add(state_id)
            states_by_id[state_id] = state

    seen_subagent_names: dict[str, str] = {}
    for state_id, state in states_by_id.items():
        _validate_state_fields(
            state, run_budget=run_budget, states_by_id=states_by_id, noun="state", errors=errors
        )
        subagent = state.get("subagent")
        if isinstance(subagent, dict) and _is_nonempty_str(subagent.get("name")):
            configured_name = subagent["name"].strip()
            base_seen = next(
                (seen for seen in seen_subagent_names if _suffixed_spawn_form(seen, configured_name)),
                None,
            )
            base_current = (
                None
                if base_seen is not None
                else next(
                    (seen for seen in seen_subagent_names if _suffixed_spawn_form(configured_name, seen)),
                    None,
                )
            )
            if configured_name in seen_subagent_names:
                errors.append(
                    f"state {state_id} subagent name {configured_name!r} is already configured "
                    f"by state {seen_subagent_names[configured_name]!r}"
                )
            elif base_seen is not None:
                errors.append(
                    f"state {state_id} subagent name {configured_name!r} collides with the "
                    f"suffixed spawn labels of state {seen_subagent_names[base_seen]!r} "
                    f"(configured {base_seen!r}): re-entry, foreach, and retries name children "
                    f"{base_seen!r}-i<n> and {base_seen!r}-a<n>"
                )
            elif base_current is not None:
                errors.append(
                    f"state {state_id} subagent name {configured_name!r} suffixed by re-entry, "
                    f"foreach, and retries ({configured_name!r}-i<n>, {configured_name!r}-a<n>) "
                    f"collides with state {seen_subagent_names[base_current]!r} "
                    f"(configured {base_current!r})"
                )
            else:
                seen_subagent_names[configured_name] = state_id
        if "entry" in state and not isinstance(state.get("entry"), bool):
            errors.append(f"state {state_id} entry must be a boolean")
        if "max_entries" in state and not (
            _is_int(state.get("max_entries")) and state.get("max_entries") >= STATE_MAX_ENTRIES_DEFAULT
        ):
            errors.append(f"state {state_id} max_entries must be an integer >= {STATE_MAX_ENTRIES_DEFAULT}")
        if state.get("entry") is True and _port_list(state, "inputs"):
            errors.append(f"entry state {state_id} cannot declare inputs")
        for inp in _port_list(state, "inputs"):
            if not isinstance(inp, dict) or inp.get("optional"):
                continue
            source = inp.get("from")
            if isinstance(source, str) and "." in source and source.partition(".")[0] == state_id:
                errors.append(
                    f"state {state_id} input {inp.get('name')!r} cannot require itself: "
                    "mark the self-input optional - a required one can never bind on the state's first entry"
                )

    if states_by_id and not any(state.get("entry") is True for state in states_by_id.values()):
        errors.append("factory machine requires at least one entry state")

    transitions = machine.get("transitions")
    if transitions is None:
        transitions = []
    if not isinstance(transitions, list):
        errors.append("factory machine transitions must be a list")
        return errors
    for index, transition in enumerate(transitions):
        if not isinstance(transition, dict):
            errors.append(f"transitions[{index}] must be an object")
            continue
        raw_src = transition.get("from")
        dst = transition.get("to")
        if isinstance(raw_src, list):
            sources = raw_src
            if not sources:
                errors.append(f"transitions[{index}] from must name at least one state")
            elif not all(_is_nonempty_str(src) for src in sources):
                errors.append(f"transitions[{index}] from entries must be non-empty state id strings")
            elif len(set(sources)) != len(sources):
                errors.append(f"transitions[{index}] from must not repeat a state")
            elif not all(src in states_by_id for src in sources):
                missing = next(src for src in sources if src not in states_by_id)
                errors.append(f"transitions[{index}] references unknown from-state {missing!r}")
            if transition.get("when") is not None:
                errors.append(
                    f"transitions[{index}] with multiple from-states cannot carry a when guard; "
                    "use single-state transitions for guards"
                )
        elif _is_nonempty_str(raw_src):
            sources = [raw_src]
            if raw_src not in states_by_id:
                errors.append(f"transitions[{index}] references unknown from-state {raw_src!r}")
        else:
            sources = []
            errors.append(f"transitions[{index}] requires a non-empty from")
        if not _is_nonempty_str(dst):
            errors.append(f"transitions[{index}] requires a non-empty to")
        elif dst not in states_by_id:
            errors.append(f"transitions[{index}] references unknown to-state {dst!r}")
        on = transition.get("on", TRANSITION_ON_KINDS[0])
        if on not in TRANSITION_ON_KINDS:
            errors.append(f"transitions[{index}] on must be one of {list(TRANSITION_ON_KINDS)}, got {on!r}")
        for src in sources:
            if _is_nonempty_str(src) and src in states_by_id:
                src_state = states_by_id[src]
                if src_state.get("lifecycle", NODE_LIFECYCLE_DEFAULT) == "resident":
                    errors.append(f"transitions[{index}] cannot leave resident state {src!r}")
                if len(sources) == 1:
                    when = transition.get("when")
                    if when is not None:
                        _validate_guard(when, index, src_state, errors)
    return errors


def _effective_dag_edges(node: dict[str, Any]) -> list[str]:
    """Effective dependency edges: depends_on plus every inputs[].from source,
    deduplicated in first-seen order."""
    edges: list[str] = []
    for dep in _port_list(node, "depends_on"):
        if isinstance(dep, str) and dep and dep not in edges:
            edges.append(dep)
    for source in _input_sources(node):
        if source not in edges:
            edges.append(source)
    return edges


def compile_factory_dag(dag: Any) -> tuple[dict[str, Any] | None, list[str]]:
    """Compile a dag-form spec into machine form.

    Returns ``(machine, errors)``: on success the machine is a spec-shaped
    dict and the
    error list is empty; on any dag-level error the machine is ``None`` and
    the errors carry the V1 dag wording. Each node becomes a state with
    ``entry`` set when it has no effective dependencies and ``max_entries``
    1; the node's full effective dependency set becomes ONE guard-less join
    transition (a single dependency stays a plain ``from`` string; several
    become a ``from`` list). Wait blocks are rejected by the shared field
    check (they are gated until the communication series); the compiler
    itself has no wait support.
    """
    if not isinstance(dag, dict):
        return None, ["factory dag must be a JSON object"]
    errors: list[str] = []
    run = dag.get("run")
    if run is not None and not isinstance(run, dict):
        errors.append("run must be an object")
        run = None
    run_budget = _validate_run_fields(run, errors)

    nodes = dag.get("nodes")
    if not isinstance(nodes, list):
        return None, errors + ["factory dag requires a nodes list"]
    if not 1 <= len(nodes) <= MAX_NODES:
        return None, errors + [f"factory dag must declare between 1 and {MAX_NODES} nodes, got {len(nodes)}"]

    seen_ids: set[str] = set()
    nodes_by_id: dict[str, dict[str, Any]] = {}
    for index, node in enumerate(nodes):
        if not isinstance(node, dict):
            errors.append(f"nodes[{index}] must be an object")
            continue
        node_id = node.get("id")
        if not _is_nonempty_str(node_id):
            errors.append(f"nodes[{index}] requires a non-empty id")
        elif not _valid_node_id(node_id):
            errors.append(f"nodes[{index}] id must match ^[a-z0-9][a-z0-9-]{{0,63}}$, got {node_id!r}")
        elif node_id in seen_ids:
            errors.append(f"nodes[{index}] duplicates node id {node_id!r}")
        else:
            seen_ids.add(node_id)
            nodes_by_id[node_id] = node

    for node_id, node in nodes_by_id.items():
        _validate_state_fields(
            node, run_budget=run_budget, states_by_id=nodes_by_id, noun="node", errors=errors
        )
        if node_id in _input_sources(node):
            errors.append(f"node {node_id} cannot depend on itself")
        depends_on = node.get("depends_on")
        if depends_on is not None:
            if not isinstance(depends_on, list):
                errors.append(f"node {node_id} depends_on must be a list of node ids")
            else:
                for dep in depends_on:
                    if not _is_nonempty_str(dep):
                        errors.append(f"node {node_id} depends_on entries must be non-empty node id strings")
                    elif dep == node_id:
                        errors.append(f"node {node_id} cannot depend on itself")
                    elif dep not in nodes_by_id:
                        errors.append(f"node {node_id} depends on unknown node {dep!r}")
                    elif nodes_by_id[dep].get("lifecycle", NODE_LIFECYCLE_DEFAULT) == "resident":
                        errors.append(f"node {node_id} cannot depend on resident node {dep!r}")
    if errors:
        return None, errors

    machine: dict[str, Any] = {"states": [], "transitions": []}
    if run is not None:
        machine["run"] = copy.deepcopy(run)
    for node in nodes:
        edges = _effective_dag_edges(node)
        state: dict[str, Any] = {"id": node["id"], "entry": not edges, "max_entries": STATE_MAX_ENTRIES_DEFAULT}
        for key in ("subagent", "lifecycle", "budget_ms", "retries", "failure_policy", "inputs", "outputs", "foreach"):
            if key in node:
                state[key] = copy.deepcopy(node[key])
        machine["states"].append(state)
        if edges:
            machine["transitions"].append({"from": edges[0] if len(edges) == 1 else edges, "to": node["id"]})
    return machine, []


def validate_factory_spec(spec: Any) -> list[str]:
    """Dry-run validation for a factory spec in either form.

    Detects the form first: a spec carrying "states" or "transitions" is
    machine form; anything else is dag form and compiles to machine form
    first. A spec carrying both dag and machine keys is rejected outright.
    Returns a list of human-readable error sentences; an empty list means
    the specification is valid. The authored specification is not modified.
    """
    if not isinstance(spec, dict):
        return ["factory dag must be a JSON object"]
    if _is_machine_form(spec) and "nodes" in spec:
        return ["pass either dag or machine form, not both"]
    if _is_machine_form(spec):
        return validate_factory_machine(spec)
    machine, errors = compile_factory_dag(spec)
    if errors:
        return errors
    return validate_factory_machine(machine)


def _suffixed_spawn_form(base: str, candidate: str) -> bool:
    """True when ``candidate`` is a spawn label ``base`` can produce.

    A state configured as ``base`` names its later children ``base-i<n>``
    (re-entry, foreach fan-out) and ``base-a<n>`` (retries, ``n`` >= 2);
    the never-generated ``-i0`` and ``-a1`` do not count, so a candidate
    carrying them cannot collide and stays valid.
    """
    if not candidate.startswith(base + "-"):
        return False
    remainder = candidate[len(base) + 1 :]
    for part in remainder.split("-"):
        if len(part) < 2 or part[0] not in "ia" or not part[1:].isdecimal():
            return False
        if part[0] == "i" and int(part[1:]) < 1:
            return False
        if part[0] == "a" and int(part[1:]) < 2:
            return False
    return True
