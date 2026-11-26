"""Python factory inspection and named machine execution, adapted from Prime Agent v0.10.0.

Copyright (c) 2025-2026 Prime Intellect Ltd.; distributed under the MIT license.
"""

from __future__ import annotations

import asyncio
import copy
import json
import re
from collections import deque
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Protocol
from uuid import uuid4

from . import factory_spec as schema
from .harness import HarnessState, _agent_dir, _strip_scope_prefix
from .machine_library import select_factory

if TYPE_CHECKING:
    from . import RLMChildResult, RLMSpawnHandle, RLMSubagent


class _Spawn(Protocol):
    async def __call__(
        self, prompt: str, *, name: str, model: str | None, thinking: str | None,
    ) -> RLMSpawnHandle: ...


class _Collect(Protocol):
    async def __call__(
        self, target: RLMSpawnHandle, /, *, timeout_ms: int, include_answer: bool,
    ) -> list[RLMChildResult]: ...


class _DeleteChild(Protocol):
    async def __call__(self, target: RLMSpawnHandle, /) -> RLMSubagent: ...


WATCH_TIMEOUT_CAP_SECONDS = 60.0

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
Run a one-shot machine or DAG with await rlm.factory.run(name) and inspect its
returned run_id with await rlm.factory.status(run_id). Use
await rlm.factory.watch(run_id, timeout=5) to wait for its graph to change,
await rlm.factory.resume(run_id) to continue a paused run, and
await rlm.factory.stop(run_id) to stop it permanently.
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

    structure = _machine_structure(machine)
    spec_id, _ = _strip_scope_prefix(ref, False)
    return {
        "run_id": None,
        "spec_id": spec_id,
        "name": None,
        "state": None,
        "pause_reason": None,
        "elapsed_ms": 0,
        "machine": structure,
        "nodes": [],
        "active_nodes": [],
        "last_fired": [],
        "events": [],
        "usage": None,
        "budget": {"limit_ms": structure["run"].get("budget_ms"), "consumed_ms": 0},
    }


def _machine_structure(machine: dict[str, Any]) -> dict[str, Any]:
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

    return {"run": run, "states": states, "transitions": transitions,
            "order": [row["id"] for row in states]}


@dataclass
class _Run:
    run_id: str
    spec_id: str
    name: str | None
    machine: dict[str, Any]
    started_at: float
    state: str = "running"
    children: dict[str, str] = field(default_factory=dict)
    nodes: dict[str, str] = field(default_factory=dict)
    last_fired: deque[dict[str, Any]] = field(default_factory=lambda: deque(maxlen=10))
    active: RLMSpawnHandle | None = None
    worker: asyncio.Task[list[str]] | None = None
    changed: asyncio.Event = field(default_factory=asyncio.Event)
    error: str | None = None
    pause_reason: str | None = None
    pause_released: asyncio.Event = field(default_factory=asyncio.Event)

    def notify(self) -> None:
        event, self.changed = self.changed, asyncio.Event()
        event.set()


_FENCED_JSON_RE = re.compile(r"```json\s*(.*?)\s*```", re.DOTALL)


def _capture_outputs(answer: str, ports: list[dict[str, Any]]) -> dict[str, str]:
    outputs = {port["name"]: answer for port in ports if port["type"] == "text" and answer}
    remaining = {port["name"] for port in ports if port["type"] == "json"}
    if not remaining:
        return outputs
    candidates = [*reversed(_FENCED_JSON_RE.findall(answer)), answer.strip()]
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except (ValueError, RecursionError):
            continue
        if isinstance(parsed, dict):
            for name in remaining.intersection(parsed):
                try:
                    outputs[name] = json.dumps(parsed[name], allow_nan=False)
                except (ValueError, RecursionError):
                    continue
                remaining.remove(name)
        if not remaining:
            break
    return outputs


def _json_equal(actual: Any, expected: Any) -> bool:
    """JSON-strict equality for eq/ne guards: a boolean never equals a
    number (true != 1, false != 0), numbers compare numerically (1 == 1.0),
    and everything else compares within its own type."""
    if isinstance(actual, bool) or isinstance(expected, bool):
        return isinstance(actual, bool) and isinstance(expected, bool) and actual is expected
    if actual is None or expected is None:
        return actual is None and expected is None
    if schema._is_number(actual) and schema._is_number(expected):
        # Exact: Python compares int/int, int/float, and float/float
        # mathematically (no lossy float conversion), so distinct large
        # JSON integers never compare equal (9007199254740993 != 9007199254740992).
        return actual == expected
    if isinstance(actual, str) and isinstance(expected, str):
        return actual == expected
    return False


def _guard_passes(when: dict[str, Any], outputs: dict[str, Any]) -> bool:
    """Evaluate one transition guard over a settle's captured outputs.

    A missing or unparseable port fails every op except ``exists`` (which is
    explicitly false then); ``ne`` needs a found value to compare against.
    ``eq``/``ne`` compare JSON-strictly (bools never equal numbers); an
    empty ``contains`` needle is defensively false.
    """
    port = when.get("output")
    value: Any = None
    found = False
    path = when.get("path")
    if path:
        current = outputs.get(port)
        if isinstance(current, dict):
            found = True
            for part in path.split("."):
                if isinstance(current, dict) and part in current:
                    current = current[part]
                else:
                    found = False
                    break
            value = current
    elif port in outputs:
        found = True
        value = outputs[port]
    op = when.get("op")
    if op == "exists":
        return found
    if not found:
        return False
    if op == "eq":
        return _json_equal(value, when.get("value"))
    if op == "ne":
        return not _json_equal(value, when.get("value"))
    if op in ("gt", "gte", "lt", "lte"):
        bound = when.get("value")
        if not schema._is_number(value) or not schema._is_number(bound):
            return False
        if op == "gt":
            return value > bound
        if op == "gte":
            return value >= bound
        if op == "lt":
            return value < bound
        return value <= bound
    if op == "contains":
        needle = when.get("value")
        if not isinstance(needle, list) or not needle:
            return False
        if isinstance(value, list):
            return all(item in value for item in needle)
        if isinstance(value, str):
            return all(isinstance(item, str) and item in value for item in needle)
        return False
    return False


def _render_prompt(template: str, values: dict[str, str]) -> str:
    if not values:
        return template
    pattern = re.compile("|".join(re.escape("{" + key + "}") for key in values))
    used: set[str] = set()

    def substitute(match: re.Match[str]) -> str:
        key = match[0][1:-1]
        used.add(key)
        return values[key]

    prompt = pattern.sub(substitute, template)
    extra = [f"- {key}: {value}\n" for key, value in values.items() if key not in used]
    return prompt + ("\n\n## Inputs\n" + "".join(extra) if extra else "")


def _prepare_machine(spec: dict[str, Any], harness: HarnessState) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    errors = schema.validate_factory_spec(spec)
    if errors:
        raise ValueError("invalid factory definition: " + "; ".join(errors))
    if "nodes" in spec:
        machine, _ = schema.compile_factory_dag(spec)
        assert machine is not None
    else:
        machine = copy.deepcopy(spec)

    structure = _machine_structure(machine)
    structure["run"]["max_parallel"] = 1
    states = machine["states"]
    limits = machine.get("run") or {}
    if "budget_ms" in limits or limits.get("failure_policy", "fail_fast") != "fail_fast":
        raise ValueError("one-shot execution does not support time budgets or custom failure handling")
    if len(states) > limits.get("max_children", schema.RUN_MAX_CHILDREN_DEFAULT):
        raise ValueError("machine exceeds run.max_children")

    for state in states:
        key = state["id"]
        if (state.get("lifecycle", "task") != "task" or state.get("foreach") is not None
                or state.get("max_entries", 1) != 1 or state.get("retries", 0) or "budget_ms" in state
                or state.get("failure_policy", "fail_fast") != "fail_fast"):
            raise ValueError(f"state {key!r}: this run path only supports one-shot task states")
        subagent = state["subagent"]
        if isinstance(subagent, str):
            entry = harness.get("subagent", subagent)
            if entry is None:
                entry = next((row for row in harness.list("subagent") if row.title == subagent), None)
            if entry is None or not entry.content.strip():
                raise ValueError(f"state {key!r} has no usable subagent {subagent!r}")
            metadata = entry.metadata if isinstance(entry.metadata, dict) else {}
            subagent = {"prompt": entry.content, "model": metadata.get("model"),
                        "thinking": metadata.get("thinking")}
        for setting in ("model", "thinking"):
            value = subagent.get(setting)
            if value is not None and (not isinstance(value, str) or not value.strip()):
                raise ValueError(f"state {key!r} subagent {setting} must be a non-empty string")
        state["subagent"] = subagent
    return states, structure


class FactoryRuns:
    def __init__(self) -> None:
        self._runs: dict[str, _Run] = {}

    def start(
        self, harness: HarnessState, spec_id: str, name: str | None, *,
        spawn: _Spawn, collect: _Collect, delete: _DeleteChild,
    ) -> dict[str, Any]:
        states, machine = _prepare_machine(select_factory(spec_id, harness), harness)
        run = _Run(uuid4().hex, spec_id, name, machine, asyncio.get_running_loop().time())
        self._runs[run.run_id] = run
        run.worker = asyncio.create_task(self._execute(run, states, spawn, collect, delete))
        return {"run_id": run.run_id, "spec_id": spec_id, "name": name,
                "nodes": len(states), "max_parallel": 1}

    def contains(self, run_id: str) -> bool:
        return run_id in self._runs

    def _require_run(self, run_id: str) -> _Run:
        run = self._runs.get(run_id)
        if run is None:
            raise ValueError(f"unknown factory run {run_id!r}")
        return run

    def status(self, run_id: str) -> dict[str, Any]:
        run = self._require_run(run_id)
        return {"run_id": run.run_id, "spec_id": run.spec_id, "name": run.name,
                "state": run.state, "children": dict(run.children), "error": run.error,
                "pause_reason": run.pause_reason}

    def graph(self, run_id: str) -> dict[str, Any]:
        run = self._require_run(run_id)
        nodes = [{"state_id": key, "status": status, "rlm_child_id": run.children[key]}
                 for key, status in run.nodes.items()]
        return {**self.status(run_id), "machine": copy.deepcopy(run.machine), "nodes": nodes,
                "active_nodes": [row["state_id"] for row in nodes if row["status"] == "running"],
                "last_fired": copy.deepcopy(list(run.last_fired)),
                "elapsed_ms": int(1000 * (asyncio.get_running_loop().time() - run.started_at))}

    async def watch(self, run_id: str, timeout: float = 0.0, *, compact: bool = False) -> dict[str, Any]:
        run = self._require_run(run_id)
        if (isinstance(timeout, bool) or not isinstance(timeout, (int, float))
                or timeout < 0 or timeout != timeout):
            raise ValueError("timeout must be a non-negative number of seconds")
        changed = False
        if timeout:
            try:
                async with asyncio.timeout(min(timeout, WATCH_TIMEOUT_CAP_SECONDS)):
                    await run.changed.wait()
                changed = True
            except TimeoutError:
                pass
        # The snapshot omits answers and retains only recent fired edges.
        return {"changed": changed, **self.graph(run_id)}

    def resume(self, run_id: str) -> dict[str, Any]:
        run = self._require_run(run_id)
        if run.state != "paused":
            raise ValueError(f"factory run {run_id!r} is {run.state!r}, not paused")
        run.state = "running"
        run.pause_reason = None
        run.pause_released.set()
        run.notify()
        return {"run_id": run_id, "state": run.state}

    async def stop(self, run_id: str) -> dict[str, Any]:
        run = self._require_run(run_id)
        cancelled: list[str] = []
        if run.state in ("running", "paused"):
            run.state = "stopping"
            run.pause_reason = None
            run.pause_released.set()
            run.notify()
            assert run.worker is not None
            # The worker owns admission and remembers the exact handle even if
            # stop was requested while spawn was returning it. Do not cancel it.
            cancelled = await asyncio.shield(run.worker)
        return {"run_id": run_id, "state": run.state, "cancelled": cancelled}

    async def _execute(
        self, run: _Run, states: list[dict[str, Any]], spawn: _Spawn, collect: _Collect,
        delete: _DeleteChild,
    ) -> list[str]:
        outputs: dict[str, str] = {}
        transitions = 0
        transition_limit = run.machine["run"]["max_transitions"]
        by_id = {state["id"]: state for state in states}
        ready = deque(state["id"] for state in states if state.get("entry"))
        entered = set(ready)
        settled: set[str] = set()
        outgoing: dict[str, list[tuple[dict[str, Any], set[str]]]] = {}
        for edge in run.machine["transitions"]:
            source = edge["from"]
            sources = {source} if isinstance(source, str) else set(source)
            for key in sources:
                outgoing.setdefault(key, []).append((edge, sources))
        current = ""
        index = 0
        cancelled: list[str] = []
        try:
            while ready and run.state == "running":
                current = ready.popleft()
                state = by_id[current]
                index += 1
                bindings = {}
                for port in state.get("inputs") or []:
                    value = outputs.get(port["from"])
                    if value is not None:
                        bindings[port["name"]] = value
                    elif port.get("optional"):
                        bindings[port["name"]] = "null" if port["type"] == "json" else "None"
                    else:
                        raise ValueError(f"missing {port['type']} output {port['from']!r}")
                subagent = state["subagent"]
                prompt = _render_prompt(subagent["prompt"], bindings)
                handle = await spawn(prompt, name=f"factory-{run.run_id}-{index}",
                                     model=subagent.get("model"), thinking=subagent.get("thinking"))
                run.active = handle
                run.children[current] = handle.rlm_child_id
                run.nodes[current] = "running"
                run.notify()
                ports = state.get("outputs") or []
                while run.state == "running":
                    results = await collect(handle, timeout_ms=1000, include_answer=bool(ports))
                    if len(results) != 1 or results[0].rlm_child_id != handle.rlm_child_id:
                        raise RuntimeError("collect did not return the exact factory child")
                    result = results[0]
                    if not result.settled:
                        continue
                    run.active = None
                    run.nodes[current] = result.status
                    run.notify()
                    if result.status != "done" and run.state == "running":
                        raise RuntimeError(result.error or f"child settled with status {result.status!r}")
                    break
                if run.state != "running":
                    break

                captured = _capture_outputs(result.answer_text or "", ports)
                outputs.update({f"{current}.{name}": value for name, value in captured.items()})
                guard_values = {
                    name: json.loads(captured[name]) if port["type"] == "json" else captured[name]
                    for port in ports if (name := port["name"]) in captured
                }
                settled.add(current)
                for edge, sources in outgoing.get(current, []):
                    target = edge["to"]
                    when = edge.get("when")
                    if target in entered or not sources <= settled:
                        continue
                    if when is not None and not _guard_passes(when, guard_values):
                        continue
                    if transitions == transition_limit:
                        run.state = "paused"
                        run.pause_reason = "max_transitions exceeded"
                        run.notify()
                        await run.pause_released.wait()
                        if run.state != "running":
                            break
                    transitions += 1
                    run.last_fired.appendleft({"from": edge["from"], "to": target,
                                               "seq": transitions, "when": when})
                    entered.add(target)
                    ready.append(target)
                    run.notify()
        except Exception as exc:
            if run.state != "stopping" or run.active is None:
                run.state = "error"
                run.error = f"{current}: {exc}"
        if run.state == "stopping":
            try:
                if run.active is not None:
                    deleted = await delete(run.active)
                    if deleted.rlm_child_id != run.active.rlm_child_id:
                        raise RuntimeError("delete did not return the exact factory child")
                    run.active = None
                    run.nodes[current] = "cancelled"
                    cancelled.append(current)
            except Exception as exc:
                run.state = "error"
                run.error = f"{current}: stop failed: {exc}"
            else:
                run.state = "stopped"
        elif run.state == "running":
            run.state = "done"
        run.notify()
        return cancelled
