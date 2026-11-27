"""Python factory inspection and named machine execution, adapted from Prime Agent v0.10.0.

Copyright (c) 2025-2026 Prime Intellect Ltd.; distributed under the MIT license.
"""

from __future__ import annotations

import asyncio
import copy
import json
import re
from collections import Counter, deque
from dataclasses import dataclass, field
from time import monotonic
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
        self, target: RLMSpawnHandle, /, *, timeout_ms: int, include_factory_preview: bool,
    ) -> list[RLMChildResult]: ...


class _DeleteChild(Protocol):
    async def __call__(self, target: RLMSpawnHandle, /) -> RLMSubagent: ...


WATCH_TIMEOUT_CAP_SECONDS = 60.0
GRAPH_RUNS_WINDOW = 20

FACTORY_DISABLED_MESSAGE = (
    'the factory is disabled; set factory.enabled to true in your agent settings.json'
)

FACTORY_HELP = """Factory definitions describe named graphs of agent states.
Save a definition with rlm.harness.save_factory(name, spec). Use states and
transitions, or use nodes for a DAG. Mark machine entry states with entry=true.
Transitions can join multiple sources or guard a single source's output.
Declare text or JSON ports to connect outputs to inputs. Bound loops with
max_entries and set run limits in the run block. Use foreach to run one
child per item of a bounded JSON list.

Opt in by adding {"factory": {"enabled": true}} to your agent settings.json.
Use await rlm.factory.graph(name) to inspect a saved definition without
starting children. Call graph() without a reference to list live runs and
recent terminal runs. Library files can be validated with rlm.machine_library.
Run a machine or DAG with await rlm.factory.run(name) and inspect its
returned run_id with await rlm.factory.status(run_id). Use
await rlm.factory.watch(run_id, timeout=5) to wait for its graph to change,
await rlm.factory.resume(run_id) to continue a paused run, and
await rlm.factory.stop(run_id) to stop it permanently. Resident children can
outlive graph completion; stop the run to retire them.
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
            "failure_policy": state.get("failure_policy", run["failure_policy"]),
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
        if "foreach" in state:
            row["foreach"] = copy.deepcopy(state["foreach"])
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
class _Entry:
    sequence: int
    key: str
    prompts: list[str]
    answers: list[str] = field(init=False)
    remaining: int = field(init=False)
    failed: bool = False

    def __post_init__(self) -> None:
        self.remaining = len(self.prompts)
        self.answers = [""] * self.remaining


@dataclass
class _Run:
    run_id: str
    spec_id: str
    name: str | None
    machine: dict[str, Any]
    started_at: float
    delete: _DeleteChild
    state: str = "running"
    children: dict[str, str] = field(default_factory=dict)
    nodes: dict[str, str] = field(default_factory=dict)
    answer_previews: dict[str, str] = field(default_factory=dict)
    last_fired: deque[dict[str, Any]] = field(default_factory=lambda: deque(maxlen=10))
    active: dict[int, tuple[str, RLMSpawnHandle]] = field(default_factory=dict)
    ready: deque[str] = field(default_factory=deque)
    pending: deque[tuple[_Entry, int, int]] = field(default_factory=deque)
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


def _entry_prompts(state: dict[str, Any], outputs: dict[str, dict[str, str]]) -> list[str]:
    bindings: dict[str, str] = {}
    foreach = state.get("foreach")
    over = foreach["over"] if foreach is not None else None
    items: list[Any] = []
    for port in state.get("inputs") or []:
        source, _, output = port["from"].partition(".")
        name = port["name"]
        value = outputs.get(source, {}).get(output)
        if value is None and not port.get("optional"):
            raise ValueError(f"missing {port['type']} output {port['from']!r}")
        if name == over:
            parsed = json.loads(value) if value is not None else []
            if not isinstance(parsed, list):
                raise ValueError(f"foreach.over input {over!r} is not a JSON list")
            items = parsed[:foreach["max"]]
        else:
            bindings[name] = value if value is not None else ("null" if port["type"] == "json" else "None")
    template = state["subagent"]["prompt"]
    if over is None:
        return [_render_prompt(template, bindings)]
    return [_render_prompt(template, {**bindings, over: item if isinstance(item, str) else json.dumps(item)})
            for item in items]


def _child_label(configured: str | None, run_id: str, admission: int) -> str:
    suffix = f"-{run_id}-{admission}"
    base = configured.strip() if configured is not None else "factory"
    # The Pi host counts UTF-16 code units; leave room for the full unique suffix.
    room = schema.SUBAGENT_NAME_MAX_LENGTH - len(suffix)
    prefix = base.encode("utf-16-le")[:2 * room].decode("utf-16-le", errors="ignore")
    return prefix + suffix


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
    states = machine["states"]

    for state in states:
        key = state["id"]
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
        run = _Run(uuid4().hex, spec_id, name, machine, monotonic(), delete)
        run.nodes.update((state["id"], "pending") for state in states)
        run.ready.extend(state["id"] for state in states if state.get("entry"))
        self._runs[run.run_id] = run
        run.worker = asyncio.create_task(self._execute(run, states, spawn, collect))
        return {"run_id": run.run_id, "spec_id": spec_id, "name": name,
                "nodes": len(states), "max_parallel": machine["run"]["max_parallel"]}

    def contains(self, run_id: str) -> bool:
        return run_id in self._runs

    def _require_run(self, run_id: str) -> _Run:
        run = self._runs.get(run_id)
        if run is None:
            raise ValueError(f"unknown factory run {run_id!r}")
        return run

    def status(self, run_id: str, *, compact: bool = False) -> dict[str, Any]:
        run = self._require_run(run_id)
        active_children: dict[str, list[str]] = {}
        for key, handle in run.active.values():
            active_children.setdefault(key, []).append(handle.rlm_child_id)
        queued: Counter[str] = Counter()
        if run.state in ("running", "paused"):
            queued.update(run.ready)
            queued.update(entry.key for entry, _, _ in run.pending if not entry.failed)
        nodes = [{"state_id": key, "status": status, "rlm_child_id": run.children.get(key),
                  **({"answer_preview": run.answer_previews[key]}
                     if not compact and key in run.answer_previews else {})}
                 for key, status in run.nodes.items()]
        return {"run_id": run.run_id, "spec_id": run.spec_id, "name": run.name,
                "nodes": nodes, "active_children": active_children, "queued": dict(queued),
                "state": run.state, "children": dict(run.children), "error": run.error,
                "pause_reason": run.pause_reason}

    @staticmethod
    def _is_live(run: _Run) -> bool:
        return run.state in ("running", "paused", "stopping") or bool(run.active)

    def live_graphs(self) -> list[dict[str, Any]]:
        return [self.graph(run.run_id, compact=True) for run in self._runs.values() if self._is_live(run)]

    def graphs(self) -> dict[str, Any]:
        terminal = deque(maxlen=GRAPH_RUNS_WINDOW)
        for run in self._runs.values():
            if not self._is_live(run):
                terminal.append(run.run_id)
        recent = set(terminal)
        return {"runs": [self.graph(run.run_id) for run in self._runs.values()
                         if self._is_live(run) or run.run_id in recent]}

    def graph(self, run_id: str, *, compact: bool = False) -> dict[str, Any]:
        run = self._require_run(run_id)
        return {**self.status(run_id, compact=compact), "machine": copy.deepcopy(run.machine),
                "active_nodes": list(dict.fromkeys(key for key, _ in run.active.values())),
                "last_fired": copy.deepcopy(list(run.last_fired)),
                "elapsed_ms": int(1000 * (monotonic() - run.started_at))}

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
        return {"changed": changed, **self.graph(run_id, compact=compact)}

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
        if run.state in ("running", "paused") or (
            run.state == "error" and run.worker is not None and not run.worker.done()
        ):
            run.state = "stopping"
            run.pause_reason = None
            run.pause_released.set()
            run.notify()
            assert run.worker is not None
            # The worker owns in-flight admission and fail-fast retirement.
            # Join it rather than deleting any of its exact handles again.
            cancelled = await asyncio.shield(run.worker)
        elif run.state in ("done", "error") and run.active:
            run.state = "stopping"
            run.notify()
            run.worker = asyncio.create_task(self._retire_children(run))
            cancelled = await asyncio.shield(run.worker)
        return {"run_id": run_id, "state": run.state, "cancelled": cancelled}

    async def _retire_children(self, run: _Run) -> list[str]:
        cancelled: list[str] = []
        failures = []
        for admission, (key, handle) in list(run.active.items()):
            try:
                deleted = await run.delete(handle)
                if deleted.rlm_child_id != handle.rlm_child_id:
                    raise RuntimeError("delete did not return the exact factory child")
                del run.active[admission]
                if run.nodes.get(key) != "error" and run.children.get(key) == handle.rlm_child_id:
                    run.nodes[key] = "cancelled"
                if key not in cancelled:
                    cancelled.append(key)
            except Exception as exc:
                failures.append(f"{key}: {exc}")
        if failures:
            detail = "; ".join(failures)
            run.error = f"{run.error}; cleanup failed: {detail}" if run.error else f"stop failed: {detail}"
            run.state = "error"
        elif run.state == "stopping":
            run.state = "stopped"
        run.notify()
        return cancelled

    async def _pause(self, run: _Run, reason: str) -> None:
        run.pause_released.clear()
        run.state = "paused"
        run.pause_reason = reason
        run.notify()
        await run.pause_released.wait()

    @staticmethod
    async def _poll_child(
        collect: _Collect, handle: RLMSpawnHandle, include_factory_preview: bool,
    ) -> tuple[RLMChildResult, float]:
        results = await collect(handle, timeout_ms=1000, include_factory_preview=include_factory_preview)
        if len(results) != 1 or results[0].rlm_child_id != handle.rlm_child_id:
            raise RuntimeError("collect did not return the exact factory child")
        return results[0], monotonic()

    @staticmethod
    def _record_settlement(
        run: _Run, admission: int, result: RLMChildResult, *, update_node: bool = True,
    ) -> None:
        key, handle = run.active.pop(admission)
        if update_node and run.nodes.get(key) != "error" and run.children.get(key) == handle.rlm_child_id:
            run.nodes[key] = result.status
        run.notify()

    async def _execute(
        self, run: _Run, states: list[dict[str, Any]], spawn: _Spawn, collect: _Collect,
    ) -> list[str]:
        outputs: dict[str, dict[str, str]] = {}
        transitions = 0
        transition_limit = run.machine["run"]["max_transitions"]
        child_limit = run.machine["run"]["max_children"]
        child_limit_reported = False
        parallel_limit = run.machine["run"]["max_parallel"]
        run_budget_ms = run.machine["run"].get("budget_ms")
        budget_reported = False
        by_id = {state["id"]: state for state in states}
        residents = {key for key, state in by_id.items() if state.get("lifecycle") == "resident"}

        def tasks_in_flight() -> bool:
            return any(key not in residents for key, _ in run.active.values())

        ready, pending = run.ready, run.pending
        entries = dict.fromkeys(ready, 1)
        max_entries = {row["id"]: row["max_entries"] for row in run.machine["states"]}
        settled: dict[str, int] = {}
        outgoing: dict[str, list[tuple[int, dict[str, Any]]]] = {}
        joined: dict[int, tuple[int, ...]] = {}
        for edge_index, edge in enumerate(run.machine["transitions"]):
            source = edge["from"]
            for key in dict.fromkeys([source] if isinstance(source, str) else source):
                outgoing.setdefault(key, []).append((edge_index, edge))
        required_sources = {
            key: {port["from"].partition(".")[0] for port in state.get("inputs") or []
                  if not port.get("optional")}
            for key, state in by_id.items()
        }
        current = ""
        attempt_index = 0
        admitted = 0
        sequence = 0
        instances: dict[int, tuple[_Entry, int, int, float]] = {}
        latest: dict[str, int] = {}
        retire = False
        polls: dict[int, asyncio.Task[tuple[RLMChildResult, float]]] = {}

        async def check_run_budget() -> None:
            nonlocal budget_reported
            if (run_budget_ms is not None and not budget_reported
                    and (monotonic() - run.started_at) * 1000 > run_budget_ms):
                budget_reported = True
                await self._pause(run, "run budget exceeded")

        async def settle(entry: _Entry) -> None:
            nonlocal transitions
            key = entry.key
            ports = by_id[key].get("outputs") or []
            answer = "\n\n".join(answer for answer in entry.answers if answer)
            captured = {} if entry.failed else _capture_outputs(answer, ports)
            # Bind by entry order, not completion order. Guards still see this settle.
            if entry.sequence > settled.get(key, 0):
                outputs[key] = captured
                settled[key] = entry.sequence
                if answer and not entry.failed:
                    run.answer_previews[key] = answer
                else:
                    run.answer_previews.pop(key, None)
            guard_values = {
                name: json.loads(captured[name]) if port["type"] == "json" else captured[name]
                for port in ports if (name := port["name"]) in captured
            }
            if latest[key] == entry.sequence:
                run.nodes[key] = "error" if entry.failed else "done"
            run.notify()
            for edge_index, edge in outgoing.get(key, []):
                target = edge["to"]
                when = edge.get("when")
                source = edge["from"]
                signature = None
                if isinstance(source, list):
                    if any(key not in settled for key in source):
                        continue
                    signature = tuple(settled[key] for key in source)
                    if joined.get(edge_index) == signature:
                        continue
                if when is not None and not _guard_passes(when, guard_values):
                    continue
                if entries.get(target, 0) >= max_entries[target]:
                    continue
                if transitions == transition_limit:
                    await self._pause(run, "max_transitions exceeded")
                    if run.state != "running":
                        break
                if signature is not None:
                    joined[edge_index] = signature
                transitions += 1
                run.last_fired.appendleft({"from": edge["from"], "to": target,
                                           "seq": transitions, "when": when})
                entries[target] = entries.get(target, 0) + 1
                ready.append(target)
                run.notify()

        async def fail(entry: _Entry, reason: str) -> None:
            nonlocal retire
            if entry.failed or run.state != "running":
                return
            entry.failed = True
            if latest[entry.key] == entry.sequence:
                run.nodes[entry.key] = "error"
            detail = f"{entry.key}: {reason}"
            run.error = run.error or detail
            policy = by_id[entry.key].get("failure_policy", run.machine["run"]["failure_policy"])
            if policy == "fail_fast":
                retire = True
                run.state = "error"
                return
            if policy == "escalate":
                await self._pause(run, detail)
            if run.state == "running":
                await settle(entry)

        try:
            while (ready or pending or run.active) and run.state == "running":
                while (ready or pending) and len(run.active) < parallel_limit and run.state == "running":
                    if not pending:
                        # Never bind until every required source has settled.
                        candidate = next((key for key in ready if required_sources[key] <= settled.keys()), None)
                        if candidate is None:
                            break
                        current = candidate
                        ready.remove(current)
                        state = by_id[current]
                        sequence += 1
                        latest[current] = sequence
                        try:
                            entry = _Entry(sequence, current, _entry_prompts(state, outputs))
                        except ValueError as exc:
                            await fail(_Entry(sequence, current, []), str(exc))
                            continue
                        if not entry.prompts:
                            run.children.pop(current, None)
                            await settle(entry)
                            continue
                        pending.extend((entry, item, 1) for item in range(len(entry.prompts)))
                    entry, item, attempt = pending[0]
                    if entry.failed:
                        pending.popleft()
                        continue
                    current = entry.key
                    subagent = by_id[current]["subagent"]
                    if not child_limit_reported and admitted >= child_limit:
                        child_limit_reported = True
                        await self._pause(run, "max_children exceeded")
                        if run.state != "running":
                            break
                    await check_run_budget()
                    if run.state != "running":
                        break
                    attempt_index += 1
                    try:
                        handle = await spawn(entry.prompts[item], name=_child_label(subagent.get("name"), run.run_id, attempt_index),
                                             model=subagent.get("model"), thinking=subagent.get("thinking"))
                    except Exception as exc:
                        pending.popleft()
                        await fail(entry, str(exc))
                        continue
                    pending.popleft()
                    admitted += 1
                    run.active[attempt_index] = (current, handle)
                    instances[attempt_index] = (entry, item, attempt, monotonic())
                    run.children[current] = handle.rlm_child_id
                    run.nodes[current] = "running"
                    run.notify()
                if run.state != "running" or not run.active:
                    break

                has_tasks = tasks_in_flight()
                completed_poll = next((number for number, poll in polls.items() if poll.done()), None)
                if not has_tasks and completed_poll is None:
                    if any(not entry.failed for entry, _, _ in pending) or any(
                        required_sources[key] <= settled.keys() for key in ready
                    ):
                        await check_run_budget()
                        if run.state != "running":
                            break
                        # Only residents hold slots; queued work cannot be admitted.
                        run.error = f"resident children hold every max_parallel {parallel_limit} slot"
                        run.state = "error"
                    break

                await check_run_budget()
                if run.state != "running":
                    break

                # Factory previews are requested by exact child ID.
                if len(run.active) == 1 and not polls:
                    admission, (current, handle) = next(iter(run.active.items()))
                    result, observed_at = await self._poll_child(collect, handle, current not in residents)
                else:
                    if completed_poll is None:
                        for admission, (key, handle) in run.active.items():
                            if admission not in polls:
                                polls[admission] = asyncio.create_task(
                                    self._poll_child(collect, handle, key not in residents)
                                )
                        await asyncio.wait(polls.values(), return_when=asyncio.FIRST_COMPLETED)
                        completed_poll = next(number for number, poll in polls.items() if poll.done())
                    admission = completed_poll
                    current, _ = run.active[admission]
                    result, observed_at = polls.pop(admission).result()
                if not result.settled:
                    continue
                entry, item, attempt, admitted_at = instances.pop(admission)
                self._record_settlement(run, admission, result, update_node=run.state == "stopping")
                if run.state != "running":
                    break
                if entry.failed:
                    continue
                if result.status != "done":
                    if attempt <= by_id[current].get("retries", schema.NODE_RETRIES_DEFAULT):
                        # Retry this rendered item, not its graph entry or its siblings.
                        pending.appendleft((entry, item, attempt + 1))
                    else:
                        await fail(entry, result.error or f"child settled with status {result.status!r}")
                    continue
                state_budget_ms = by_id[current].get("budget_ms")
                elapsed_ms = (observed_at - admitted_at) * 1000
                if state_budget_ms is not None and elapsed_ms > state_budget_ms:
                    await fail(entry, f"state budget_ms {state_budget_ms} exceeded ({int(elapsed_ms)}ms)")
                    continue
                entry.answers[item] = result.answer_preview or ""
                entry.remaining -= 1
                if not entry.remaining:
                    await settle(entry)
        except Exception as exc:
            if run.state != "stopping" or not run.active:
                run.state = "error"
                run.error = f"{current}: {exc}"
                retire = True
        finally:
            ready.clear()
            pending.clear()
            for admission, poll in polls.items():
                if not poll.done():
                    poll.cancel()
                elif not poll.cancelled() and poll.exception() is None and poll.result()[0].settled:
                    self._record_settlement(run, admission, poll.result()[0])
            if polls:
                await asyncio.gather(*polls.values(), return_exceptions=True)

        if run.state == "stopping" or retire:
            return await self._retire_children(run)
        if run.state == "running":
            run.state = "error" if run.error else "done"
        run.notify()
        return []
