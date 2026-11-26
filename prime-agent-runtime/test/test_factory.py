import asyncio
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from rlm import rlm
from rlm.factory import FactoryRuns


class FactoryTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.enterContext(patch.object(rlm.factory, "_runs", FactoryRuns()))
        self.directory = Path(self.enterContext(tempfile.TemporaryDirectory()))
        self.settings = self.directory / "settings.json"
        self.enterContext(patch.dict(os.environ, {
            "PRIME_AGENT_CODING_AGENT_DIR": str(self.directory),
            "RLM_HARNESS_STATE_DIR": str(self.directory / "harness"),
        }))

    async def test_help_and_opt_in(self):
        self.assertIn("rlm.factory.graph", rlm.factory.help())
        with self.assertRaisesRegex(ValueError, "factory is disabled"):
            await rlm.factory.graph("unknown")
        with self.assertRaisesRegex(ValueError, "factory is disabled"):
            await rlm.factory.resume("unknown")
        for content in (b"{", b"\xff", b"null", b"[]", b'{"factory":true}',
                        b'{"factory.enabled":true}', b'{"factory":{"enabled":1}}',
                        b'{"factory":{"enabled":"true"},"factory.enabled":true}'):
            with self.subTest(content=content):
                self.settings.write_bytes(content)
                with self.assertRaisesRegex(ValueError, "factory is disabled"):
                    await rlm.factory.graph("unknown")
        self.settings.write_text('{"factory":{"enabled":true}}')
        self.assertEqual(await rlm.factory.graph(), {"runs": []})
        with self.assertRaisesRegex(ValueError, "unknown factory run or spec"):
            await rlm.factory.graph("unknown")
        self.settings.write_text('{"factory":{"enabled":false}}')
        with self.assertRaisesRegex(ValueError, "factory is disabled"):
            await rlm.factory.graph()

    async def test_saved_dag_preview_compiles_join_without_starting_work(self):
        spec = {
            "run": {"max_parallel": 2, "budget_ms": 1000},
            "nodes": [
                {"id": "outline", "subagent": {"name": "editor", "prompt": "Outline the text."}},
                {"id": "style", "subagent": "style-guide"},
                {"id": "format", "depends_on": ["outline", "style"], "subagent": "formatter"},
            ],
        }
        rlm.harness.save_factory("format-document", spec)
        self.settings.write_text('{"factory":{"enabled":true}}')
        with patch("rlm.host_request", side_effect=AssertionError("preview called the host")):
            graph = await rlm.factory.graph("format-document")
            graph["machine"]["transitions"][0]["from"].append("other")
            graph = await rlm.factory.graph("format-document")
        self.assertEqual(graph["spec_id"], "format-document")
        self.assertIsNone(graph["run_id"])
        self.assertEqual(graph["active_nodes"], [])
        self.assertEqual(graph["budget"], {"limit_ms": 1000, "consumed_ms": 0})
        machine = graph["machine"]
        self.assertEqual(machine["order"], ["outline", "style", "format"])
        self.assertEqual(machine["transitions"], [{"from": ["outline", "style"], "to": "format", "on": "settled"}])
        self.assertEqual(machine["run"], {
            "max_parallel": 2, "max_transitions": 30, "failure_policy": "escalate",
            "max_children": 10000, "budget_ms": 1000,
        })
        self.assertEqual([state["entry"] for state in machine["states"]], [True, True, False])
        self.assertEqual(machine["states"][0]["subagent"], "editor")
        self.assertNotIn("prompt", machine["states"][0])
        self.assertEqual(rlm.harness.get_factory("format-document"), spec)

    @staticmethod
    def text_dag(label):
        return {"nodes": [
            {"id": "consume", "subagent": {"prompt": f"{label}: use {{word}}"},
             "inputs": [{"name": "word", "type": "text", "from": "produce.word"}]},
            {"id": "produce", "subagent": {"prompt": f"{label}: produce one short word"},
             "outputs": [{"name": "word", "type": "text"}]},
        ]}

    async def test_named_run_preflight_starts_nothing_on_refusal(self):
        with patch("rlm.host_request") as host:
            with self.assertRaisesRegex(ValueError, "factory is disabled"):
                await rlm.factory.run("unknown")
            self.settings.write_text('{"factory":{"enabled":true}}')
            with self.assertRaises(ValueError):
                await rlm.factory.run("unknown")
            spec = self.text_dag("unresolved")
            spec["nodes"][0]["subagent"] = "unknown-subagent"
            rlm.harness.save_factory("unresolved", spec)
            with self.assertRaisesRegex(ValueError, "no usable subagent"):
                await rlm.factory.run("unresolved")
            host.assert_not_called()

    async def test_overlapping_named_runs_pass_only_their_own_declared_text(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        self.enterContext(patch.dict(os.environ, {"PRIME_AGENT_MACHINES_DIR": str(self.directory / "empty")}))
        rlm.harness.save_factory("from-harness", self.text_dag("harness"))
        library = self.directory / "machines"
        for name, label in (("from-library", "library"), ("from-harness", "shadow")):
            file = library / name / "MACHINE.md"
            file.parent.mkdir(parents=True)
            file.write_text(f"---\nname: {name}\ndescription: Fixture\n---\n"
                            f"```machine-spec\n{json.dumps(self.text_dag(label))}\n```\n")
        imports_before = {file: file.read_bytes() for file in library.glob("*/MACHINE.md")}
        admissions = asyncio.Queue()
        settling = asyncio.Queue()
        gates = {}
        names = set()

        async def host(kind, data):
            if kind == "rlm.run":
                name = data["kwargs"]["name"]
                self.assertNotIn(name, names)
                names.add(name)
                child = f"child-{len(names)}"
                gates[child] = asyncio.get_running_loop().create_future()
                admissions.put_nowait((child, data["prompt"]))
                return {"rlm_child_id": child, "name": name, "session_dir": str(self.directory), "model": "fake"}
            self.assertEqual(kind, "rlm.collect")
            (child,) = data["targets"]
            answer = await gates[child]
            settling.put_nowait(child)
            return {"results": [{"rlm_child_id": child, "status": "done", "settled": True,
                                 "factory_answer_preview": answer}]}

        with patch("rlm.host_request", side_effect=host), self.assertRaisesRegex(ValueError, "unknown factory run"):
            await rlm.factory.status("from-harness")
        with patch("rlm.host_request", side_effect=host):
            async with asyncio.timeout(3):
                first = (await rlm.factory.run("from-harness"))["run_id"]
                child_a, prompt_a = await admissions.get()
                second = (await rlm.factory.run("from-library"))["run_id"]
                child_b, prompt_b = await admissions.get()
                self.assertNotEqual(first, second)
                self.assertNotEqual(child_a, child_b)
                self.assertIn("harness: produce", prompt_a)
                self.assertIn("library: produce", prompt_b)
                gates[child_b].set_result("blue")
                self.assertEqual(await settling.get(), child_b)
                next_b, prompt_b = await admissions.get()
                self.assertEqual(prompt_b, "library: use blue")
                gates[next_b].set_result("finished")
                self.assertEqual(await settling.get(), next_b)
                self.assertEqual((await rlm.factory.status(second))["state"], "done")
                status_a = await rlm.factory.status(first)
                self.assertEqual(status_a["state"], "running")
                self.assertEqual(status_a["children"], {"produce": child_a})
                gates[child_a].set_result("green")
                self.assertEqual(await settling.get(), child_a)
                next_a, prompt_a = await admissions.get()
                self.assertEqual(prompt_a, "harness: use green")
                gates[next_a].set_result("finished")
                self.assertEqual(await settling.get(), next_a)
                status_a = await rlm.factory.status(first)
                self.assertEqual(status_a["state"], "done")
                self.assertEqual(status_a["children"], {"produce": child_a, "consume": next_a})
                self.assertEqual((await rlm.factory.status(second))["children"], {"produce": child_b, "consume": next_b})
        self.assertEqual({file: file.read_bytes() for file in library.glob("*/MACHINE.md")}, imports_before)
        self.assertEqual(rlm.harness.get_factory("from-harness"), self.text_dag("harness"))
        self.assertIsNone(rlm.harness.get_factory("from-library"))

    async def test_papi_13_watch_and_stop_are_scoped_to_the_selected_run(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        rlm.harness.save_factory("color", self.text_dag("color"))
        collecting = asyncio.Queue()
        requested = []
        deletions = []
        results = {}
        names = {}
        reset = asyncio.Event()

        async def host(kind, data):
            if kind == "rlm.run":
                child = f"child-{len(requested) + 1}"
                requested.append((child, data["prompt"]))
                names[child] = data["kwargs"]["name"]
                return {"rlm_child_id": child, "name": names[child],
                        "session_dir": str(self.directory), "model": "fake"}
            if kind == "rlm.collect":
                (child,) = data["targets"]
                results[child] = asyncio.get_running_loop().create_future()
                collecting.put_nowait(child)
                result = await results[child]
                return {"results": [{"rlm_child_id": child, **result}]}
            self.assertEqual(kind, "rlm.delete_subagent")
            child = data["target"]
            deletions.append(child)
            return {"subagent": {"rlm_child_id": child, "session_name": names[child],
                                 "session_dir": str(self.directory), "status": "running"}}

        async def watch(run_id, ready):
            ready.set()
            return await rlm.factory.watch(run_id, timeout=30)

        async with asyncio.timeout(3):
            self.enterContext(patch("rlm.host_request", side_effect=host))
            a = (await rlm.factory.run("color"))["run_id"]
            first = await collecting.get()
            b = (await rlm.factory.run("color"))["run_id"]
            other = await collecting.get()
            self.assertFalse((await rlm.factory.watch(a))["changed"])
            for invalid in (-1, float("nan"), "one", True):
                with self.assertRaisesRegex(ValueError, "timeout"):
                    await rlm.factory.watch(a, invalid)
            with self.assertRaisesRegex(ValueError, "unknown factory run"):
                await rlm.factory.stop("color")
            a_watch = asyncio.create_task(watch(a, reset))
            try:
                await reset.wait()
                results[other].set_result({"status": "done", "settled": True, "factory_answer_preview": "blue"})
                successor = await collecting.get()
                self.assertEqual(requested[-1], (successor, "color: use blue"))
                self.assertFalse(a_watch.done(), "another run woke the selected run's watcher")
                stop = asyncio.create_task(rlm.factory.stop(a))
                try:
                    during = await a_watch
                    self.assertTrue(during["changed"])
                    self.assertEqual((during["run_id"], during["state"]), (a, "stopping"))
                    self.assertEqual(during["active_nodes"], ["produce"])
                    self.assertEqual((await rlm.factory.stop(a))["state"], "stopping")
                    results[first].set_result({"status": "running", "settled": False})
                    self.assertEqual(await stop, {"run_id": a, "state": "stopped", "cancelled": ["produce"]})
                finally:
                    stop.cancel()
                    await asyncio.gather(stop, return_exceptions=True)
            finally:
                a_watch.cancel()
                await asyncio.gather(a_watch, return_exceptions=True)
            self.assertEqual(deletions, [first])
            self.assertEqual((await rlm.factory.stop(a))["cancelled"], [])
            self.assertEqual((await rlm.factory.status(b))["state"], "running")
            self.assertEqual(len(requested), 3)
            snap = await rlm.factory.watch(a)
            self.assertEqual({row["state_id"]: (row["status"], row["rlm_child_id"]) for row in snap["nodes"]},
                             {"produce": ("cancelled", first), "consume": ("pending", None)})
            graph = await rlm.factory.graph(a)
            self.assertEqual(snap["machine"], graph["machine"])
            graph["machine"]["order"].clear()
            self.assertEqual((await rlm.factory.graph(a))["machine"]["order"], ["consume", "produce"])
            reset.clear()
            b_watch = asyncio.create_task(watch(b, reset))
            try:
                await reset.wait()
                results[successor].set_result({"status": "done", "settled": True})
                self.assertEqual((await b_watch)["state"], "done")
            finally:
                b_watch.cancel()
                await asyncio.gather(b_watch, return_exceptions=True)
            self.assertEqual((await rlm.factory.stop(b))["state"], "done")
            self.assertEqual(deletions, [first])

    async def test_papi_13_stop_waits_for_the_exact_inflight_admission(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        rlm.harness.save_factory("color", self.text_dag("color"))
        admitting = asyncio.Event()
        release = asyncio.Event()
        watching = asyncio.Event()
        calls = []

        async def host(kind, data):
            calls.append((kind, data))
            if kind == "rlm.run":
                admitting.set()
                await release.wait()
                return {"rlm_child_id": "late-child", "name": data["kwargs"]["name"],
                        "session_dir": str(self.directory), "model": "fake"}
            self.assertEqual(kind, "rlm.delete_subagent")
            return {"subagent": {"rlm_child_id": data["target"], "session_name": "color",
                                 "session_dir": str(self.directory), "status": "running"}}

        async def watch(run_id):
            watching.set()
            return await rlm.factory.watch(run_id, timeout=30)

        async with asyncio.timeout(3):
            self.enterContext(patch("rlm.host_request", side_effect=host))
            run_id = (await rlm.factory.run("color"))["run_id"]
            await admitting.wait()
            waiter = asyncio.create_task(watch(run_id))
            stop = None
            try:
                await watching.wait()
                stop = asyncio.create_task(rlm.factory.stop(run_id))
                self.assertEqual((await waiter)["state"], "stopping")
                self.assertFalse(stop.done())
                release.set()
                self.assertEqual((await stop)["state"], "stopped")
            finally:
                release.set()
                for task in (waiter, stop):
                    if task is not None:
                        task.cancel()
                        await asyncio.gather(task, return_exceptions=True)
            self.assertEqual(len(calls), 2)
            self.assertEqual(calls[-1], ("rlm.delete_subagent", {"target": "late-child"}))

    async def test_papi_13_watch_timeout_returns_the_current_graph(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        rlm.harness.save_factory("color", self.text_dag("color"))
        with patch("rlm.host_request", side_effect=AssertionError("stop before admission")) as host:
            run_id = (await rlm.factory.run("color"))["run_id"]
            self.assertEqual((await rlm.factory.stop(run_id))["state"], "stopped")
            with patch("rlm.factory.WATCH_TIMEOUT_CAP_SECONDS", 0):
                async with asyncio.timeout(3):
                    snap = await rlm.factory.watch(run_id, timeout=1000, compact=True)
            self.assertFalse(snap.pop("changed"))
            graph = await rlm.factory.graph(run_id)
            self.assertEqual(snap.keys(), graph.keys())
            self.assertEqual((snap["run_id"], snap["state"]), (run_id, "stopped"))
            self.assertEqual({node["state_id"]: node["status"] for node in snap["nodes"]},
                             {"produce": "pending", "consume": "pending"})
            host.assert_not_called()

    async def test_papi_13_transition_pause_resume_and_stop_are_scoped(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        for label in ("A", "B"):
            spec = self.text_dag(label)
            spec["run"] = {"max_transitions": 1}
            spec["nodes"].extend([
                {"id": "label", "depends_on": ["consume"], "subagent": {"prompt": f"{label}: label {{word}}"},
                 "inputs": [{"name": "word", "type": "text", "from": "produce.word"}]},
                {"id": "finish", "depends_on": ["label"], "subagent": {"prompt": f"{label}: finish"}},
            ])
            rlm.harness.save_factory(label, spec)

        for resume_before_stop in (False, True):
            with self.subTest(resume_before_stop=resume_before_stop):
                requests = []
                collecting = asyncio.Queue()
                replies = {}
                run_ids = []

                async def host(kind, data):
                    if kind == "rlm.run":
                        child = f"child-{len(requests) + 1}"
                        requests.append(data["prompt"])
                        return {"rlm_child_id": child, "name": data["kwargs"]["name"],
                                "session_dir": str(self.directory), "model": "fake"}
                    self.assertEqual(kind, "rlm.collect", "no settled child should be deleted")
                    (child,) = data["targets"]
                    replies[child] = asyncio.get_running_loop().create_future()
                    collecting.put_nowait(child)
                    return {"results": [{"rlm_child_id": child, **await replies[child]}]}

                def settle(child, answer=None):
                    replies[child].set_result({"status": "done", "settled": True, "factory_answer_preview": answer})

                with patch("rlm.host_request", side_effect=host):
                    try:
                        async with asyncio.timeout(3):
                            for label, word in (("A", "red"), ("B", "blue")):
                                run_id = (await rlm.factory.run(label))["run_id"]
                                run_ids.append(run_id)
                                produce = await collecting.get()
                                settle(produce, word)
                                consume = await collecting.get()
                                self.assertEqual(requests[-2:], [f"{label}: produce one short word", f"{label}: use {word}"])
                                settle(consume)
                                snapshot = await rlm.factory.watch(run_id, timeout=30)
                                self.assertTrue(snapshot["changed"])
                                self.assertEqual((snapshot["state"], snapshot["pause_reason"]),
                                                 ("paused", "max_transitions exceeded"))
                                self.assertEqual(snapshot["children"], {"produce": produce, "consume": consume})
                                self.assertEqual(snapshot["active_nodes"], [])
                                self.assertEqual((await rlm.factory.status(run_id))["pause_reason"], snapshot["pause_reason"])
                            a, b = run_ids
                            self.assertEqual((await rlm.factory.resume(a))["state"], "running")
                            self.assertEqual((await rlm.factory.graph(b))["state"], "paused")
                            if resume_before_stop:
                                # Same turn of the event loop: stop wins before the resumed worker starts a child.
                                await rlm.factory.resume(b)
                            self.assertEqual(await rlm.factory.stop(b), {"run_id": b, "state": "stopped", "cancelled": []})
                            with self.assertRaisesRegex(ValueError, "not paused"):
                                await rlm.factory.resume(b)
                            settle(await collecting.get())
                            settle(await collecting.get())
                            final = await rlm.factory.watch(a, timeout=30)
                            self.assertEqual((final["state"], final["pause_reason"]), ("done", None))
                            self.assertEqual(requests, ["A: produce one short word", "A: use red",
                                                        "B: produce one short word", "B: use blue",
                                                        "A: label red", "A: finish"])
                    finally:
                        for child, reply in replies.items():
                            if not reply.done():
                                settle(child)
                        async with asyncio.timeout(3):
                            for run_id in run_ids:
                                await rlm.factory.stop(run_id)

    async def test_papi_13_declared_ports_bind_released_preview_and_named_json(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        spec = self.text_dag("fixture")
        spec["run"] = {"failure_policy": "fail_fast"}
        producer, consumer = spec["nodes"][1], spec["nodes"][0]
        for name in ("shape", "shade"):
            producer["outputs"].append({"name": name, "type": "json"})
            consumer["inputs"].append({"name": name, "type": "json", "from": f"produce.{name}"})
        consumer["subagent"]["prompt"] = "Text: {word}\nShape: {shape}"
        rlm.harness.save_factory("fixture", spec)
        answer = ('Line one. ```json {"shape":"old"} ``` '
                  '```json {"shape":{"color":"red","count":2}} ``` ```json {"shade":null} ```')
        cut = '{"shape":[1,2],"shade":"' + 'x' * 130 + '...'
        for full, expected in (
            (answer, f'Text: {answer}\nShape: {{"color": "red", "count": 2}}\n\n## Inputs\n- shade: null\n'),
            (cut, None),
            ('{"shape":[1,2],"shade":false}', 'Text: {"shape":[1,2],"shade":false}\nShape: [1, 2]\n\n## Inputs\n- shade: false\n'),
            ('```json\n{"shape":[]}\n```', None),
            (None, None),
        ):
            with self.subTest(full=full):
                prompts = []

                async def host(kind, data):
                    if kind == "rlm.run":
                        prompts.append(data["prompt"])
                        return {"rlm_child_id": f"child-{len(prompts)}", "name": data["kwargs"]["name"],
                                "session_dir": str(self.directory), "model": "fake"}
                    self.assertEqual(kind, "rlm.collect")
                    child = f"child-{len(prompts)}"
                    self.assertEqual(data["targets"], [child])
                    self.assertEqual(data.get("include_factory_preview", False), True)
                    return {"results": [{"rlm_child_id": child, "status": "done", "settled": True,
                                         "answer_preview": '{"shape":99,"shade":99}',
                                         "factory_answer_preview": full if len(prompts) == 1 else None}]}

                with patch("rlm.host_request", side_effect=host):
                    run_id = (await rlm.factory.run("fixture"))["run_id"]
                    async with asyncio.timeout(3):
                        snapshot = await rlm.factory.watch(run_id, timeout=2)
                producer_node = next(row for row in snapshot["nodes"] if row["state_id"] == "produce")
                self.assertEqual(producer_node.get("answer_preview"), full)
                compact = await rlm.factory.watch(run_id, compact=True)
                self.assertTrue(all("answer_preview" not in row for row in compact["nodes"]))
                if expected is None:
                    self.assertEqual(len(prompts), 1)
                    self.assertEqual(snapshot["state"], "error")
                    self.assertIn(("produce.shape" if full == cut else "produce.shade") if full else "produce.word", snapshot["error"])
                else:
                    self.assertEqual(snapshot["state"], "done")
                    self.assertEqual(prompts[1:], [expected])

    async def test_papi_13_explicit_guard_and_join_resume_without_replay(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        accept = {"output": "report", "path": "review.accept", "op": "eq", "value": True}
        join = {"from": ["approved", "style"], "to": "format"}
        spec = {
            "states": [
                {"id": "review", "entry": True, "subagent": {"prompt": "review"},
                 "outputs": [{"name": "report", "type": "json"}]},
                {"id": "style", "entry": True, "subagent": {"prompt": "style"},
                 "outputs": [{"name": "tone", "type": "text"}]},
                {"id": "approved", "subagent": {"prompt": "approved"},
                 "outputs": [{"name": "word", "type": "text"}]},
                {"id": "reject", "subagent": {"prompt": "reject"}},
                {"id": "format", "subagent": {"prompt": "Format {word} in {tone} style"},
                 "inputs": [{"name": "word", "type": "text", "from": "approved.word"},
                            {"name": "tone", "type": "text", "from": "style.tone"}]},
            ],
            "transitions": [
                {"from": "review", "to": "reject", "when": {**accept, "value": 1}},
                {"from": "review", "to": "reject",
                 "when": {**accept, "path": "review.nope", "op": "ne"}},
                {"from": "review", "to": "approved", "when": accept},
                join,
            ],
            "run": {"max_transitions": 1, "max_parallel": 1},
        }
        rlm.harness.save_factory("format", spec)
        prompts = []
        answers = ('{"report":{"review":{"accept":true}}}', 'plain', 'title', None)

        async def host(kind, data):
            if kind == "rlm.run":
                prompts.append(data["prompt"])
                return {"rlm_child_id": f"child-{len(prompts)}", "name": data["kwargs"]["name"],
                        "session_dir": str(self.directory), "model": "fake"}
            self.assertEqual(kind, "rlm.collect")
            child = f"child-{len(prompts)}"
            self.assertEqual(data["targets"], [child])
            return {"results": [{"rlm_child_id": child, "status": "done", "settled": True,
                                 "answer_preview": '{"report":{"review":{"accept":1}}}',
                                 "factory_answer_preview": answers[len(prompts) - 1]}]}

        with patch("rlm.host_request", side_effect=host), self.subTest("pause before join"):
            run_id = (await rlm.factory.run("format"))["run_id"]
            paused = await rlm.factory.watch(run_id, timeout=2)
            self.assertEqual(paused["state"], "paused")
            self.assertEqual(prompts, ["review", "style", "approved"])
            approved = {"from": "review", "to": "approved", "seq": 1, "when": accept}
            self.assertEqual(paused["last_fired"], [approved])
            await rlm.factory.resume(run_id)
            done = await rlm.factory.watch(run_id, timeout=2)
            self.assertEqual(done["state"], "done")
            self.assertEqual(prompts, ["review", "style", "approved", "Format title in plain style"])
            self.assertEqual(done["last_fired"], [{**join, "seq": 2, "when": None}, approved])
        self.assertEqual(rlm.harness.get_factory("format"), spec)

    async def test_papi_13_bounded_document_reentry_uses_latest_settle(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        spec = {
            "states": [
                {"id": "style", "entry": True, "subagent": {"prompt": "Style for atlas"},
                 "outputs": [{"name": "tone", "type": "text"}]},
                {"id": "review", "max_entries": 2,
                 "subagent": {"prompt": "Review {revision}"},
                 "inputs": [{"name": "revision", "type": "text", "from": "edit.revision", "optional": True}],
                 "outputs": [{"name": "edit", "type": "json"}, {"name": "note", "type": "json"}]},
                {"id": "edit", "max_entries": 2, "subagent": {"prompt": "Edit document"},
                 "outputs": [{"name": "revision", "type": "text"}]},
                {"id": "label", "max_entries": 3, "subagent": {"prompt": "Label in {tone} style: {note}"},
                 "inputs": [{"name": "tone", "type": "text", "from": "style.tone"},
                            {"name": "note", "type": "json", "from": "review.note", "optional": True}]},
            ],
            "transitions": [
                {"from": "style", "to": "review"},
                {"from": "review", "to": "edit", "when": {"output": "edit", "op": "eq", "value": True}},
                {"from": ["review", "style"], "to": "label"},
                {"from": "edit", "to": "review"},
            ],
            "run": {"max_transitions": 3, "max_children": 3, "max_parallel": 1},
        }
        for label in ("atlas", "garden"):
            spec["states"][0]["subagent"] = {"prompt": f"Style for {label}"}
            rlm.harness.save_factory(label, spec)
        scripts = {
            label: [(f"Style for {label}", label), ("Review None", '{"edit":true,"note":"draft"}'),
                    ("Edit document", f"revised {label}"), (f'Label in {label} style: "draft"', None),
                    (f"Review revised {label}", '{"edit":true}'), ("Edit document", f"final {label}"),
                    (f"Label in {label} style: null", None)]
            for label in ("atlas", "garden")
        }
        labels = {}
        spawns = {label: [] for label in scripts}
        answers = {}

        async def host(kind, data):
            if kind == "rlm.run":
                name = data["kwargs"]["name"]
                _, run_id, _ = name.split("-")
                label = labels[run_id]
                offset = len(spawns[label])
                self.assertLess(offset, len(scripts[label]), "unexpected child admission")
                prompt, answer = scripts[label][offset]
                self.assertEqual(data["prompt"], prompt)
                child = f"child-{label}-{offset}"
                answers[child] = answer
                spawns[label].append(child)
                return {"rlm_child_id": child, "name": name, "session_dir": str(self.directory), "model": "fake"}
            self.assertEqual(kind, "rlm.collect")
            child, = data["targets"]
            self.assertIn(child, answers)
            return {"results": [{"rlm_child_id": child, "status": "done", "settled": True,
                                 "answer_preview": "not the settled output", "factory_answer_preview": answers.pop(child)}]}

        with patch("rlm.host_request", side_effect=host):
            atlas = (await rlm.factory.run("atlas"))["run_id"]
            labels[atlas] = "atlas"
            garden = (await rlm.factory.run("garden"))["run_id"]
            labels[garden] = "garden"
            self.assertNotEqual(atlas, garden)
            await rlm.factory.watch(atlas, timeout=2)
            for run_id in (atlas, garden):
                self.assertEqual((await rlm.factory.status(run_id))["pause_reason"], "max_transitions exceeded")
            await rlm.factory.resume(atlas)
            self.assertEqual((await rlm.factory.watch(atlas, timeout=2))["pause_reason"], "max_children exceeded")
            self.assertEqual([len(spawns[label]) for label in scripts], [3, 3])
            self.assertEqual((await rlm.factory.status(garden))["pause_reason"], "max_transitions exceeded")
            self.assertEqual((await rlm.factory.stop(garden))["state"], "stopped")
            with self.assertRaisesRegex(ValueError, "not paused"):
                await rlm.factory.resume(garden)
            await rlm.factory.resume(atlas)
            done = await rlm.factory.watch(atlas, timeout=2)
            self.assertEqual((done["state"], done["error"]), ("done", None))
            self.assertEqual(done["children"]["review"], "child-atlas-4")
            self.assertEqual([edge["to"] for edge in reversed(done["last_fired"])],
                             ["review", "edit", "label", "review", "edit", "label"])
            self.assertEqual([len(spawns[label]) for label in scripts], [7, 3])
            self.assertFalse(answers)

    async def test_papi_13_parallel_documents_settle_join_and_stop_exact_children(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        for label in ("atlas", "garden"):
            rlm.harness.save_factory(label, {
                "states": [
                    {"id": key, "entry": True, "subagent": {"prompt": f"{label} {key}"},
                     "outputs": [{"name": "value", "type": kind}]}
                    for key, kind in (("title", "text"), ("style", "json"), ("summary", "text"))
                ] + [{"id": "format", "subagent": {"prompt": "{title}|{style}|{summary}"},
                      "inputs": [{"name": key, "type": kind, "from": f"{key}.value"}
                                 for key, kind in (("title", "text"), ("style", "json"), ("summary", "text"))]}],
                "transitions": [{"from": ["title", "style", "summary"], "to": "format"}],
                "run": {"max_parallel": 2, "max_children": 3, "failure_policy": "fail_fast"},
            })
        requests = {}
        collecting = asyncio.Queue()
        gates = {}
        deleted = []

        async def host(kind, data):
            if kind == "rlm.run":
                name = data["kwargs"]["name"]
                child = f"id-{name}"
                self.assertNotIn(child, requests)
                requests[child] = (name, data["prompt"])
                return {"rlm_child_id": child, "name": name, "session_dir": str(self.directory), "model": "fake"}
            if kind == "rlm.collect":
                child, = data["targets"]
                name, prompt = requests[child]
                self.assertEqual(data.get("include_factory_preview", False), True)
                gates[child] = asyncio.get_running_loop().create_future()
                collecting.put_nowait(child)
                return {"results": [{"rlm_child_id": child, "answer_preview": "preview", **await gates[child]}]}
            self.assertEqual(kind, "rlm.delete_subagent")
            child = data["target"]
            deleted.append(child)
            return {"subagent": {"rlm_child_id": child, "session_name": requests[child][0],
                                 "session_dir": str(self.directory), "status": "running"}}

        def settle(child, answer=None):
            gates[child].set_result({"settled": True, "status": "done", "factory_answer_preview": answer})

        async def until(run_id, state, *, drained=False):
            snapshot = await rlm.factory.graph(run_id)
            while snapshot["state"] != state or (drained and snapshot["active_nodes"]):
                if snapshot["state"] != state:
                    self.assertNotIn(snapshot["state"], ("error", "done", "stopped"), snapshot)
                snapshot = await rlm.factory.watch(run_id, timeout=30)
            return snapshot

        run_ids = []
        with patch("rlm.host_request", side_effect=host):
            try:
                async with asyncio.timeout(3):
                    first = await rlm.factory.run("atlas")
                    a = first["run_id"]
                    run_ids.append(a)
                    self.assertEqual(first["max_parallel"], 2)
                    title, style = await collecting.get(), await collecting.get()
                    self.assertEqual([prompt for _, prompt in requests.values()], ["atlas title", "atlas style"])
                    snapshot = await rlm.factory.graph(a)
                    self.assertEqual(snapshot["active_nodes"], ["title", "style"])
                    self.assertEqual(snapshot["machine"]["run"]["max_parallel"], 2)
                    b = (await rlm.factory.run("garden"))["run_id"]
                    run_ids.append(b)
                    other_title, other_style = await collecting.get(), await collecting.get()
                    self.assertEqual([requests[k][1] for k in (other_title, other_style)], ["garden title", "garden style"])
                    self.assertNotEqual(a, b)
                    runs = (await rlm.factory.graph())["runs"]
                    self.assertEqual([row["run_id"] for row in runs], [a, b])
                    for row, pair in zip(runs, ((title, style), (other_title, other_style)), strict=True):
                        self.assertEqual(row["active_children"], {"title": [pair[0]], "style": [pair[1]]})
                        self.assertEqual(row["queued"], {"summary": 1})
                    gates[style].set_result({"settled": False, "status": "done", "factory_answer_preview": '{"value":"early"}'})
                    self.assertEqual(await collecting.get(), style)
                    self.assertEqual(len(requests), 4)
                    settle(style, '{"value":{"font":"plain"}}')
                    summary = await collecting.get()
                    self.assertEqual(requests[summary][1], "atlas summary")
                    self.assertEqual((await rlm.factory.graph(a))["active_nodes"], ["title", "summary"])

                    stop = asyncio.create_task(rlm.factory.stop(b))
                    try:
                        await until(b, "stopping")
                        gates[other_title].set_result({"settled": False, "status": "running"})
                        self.assertEqual(await stop, {"run_id": b, "state": "stopped", "cancelled": ["title", "style"]})
                    finally:
                        stop.cancel()
                        await asyncio.gather(stop, return_exceptions=True)
                    self.assertCountEqual(deleted, [other_title, other_style])
                    self.assertEqual((await rlm.factory.graph(a))["active_nodes"], ["title", "summary"])
                    settle(summary, "Two paragraphs")
                    settle(title, "Atlas Title")
                    paused = await until(a, "paused")
                    self.assertEqual(paused["pause_reason"], "max_children exceeded")
                    self.assertEqual(paused["active_nodes"], [])
                    self.assertEqual(paused["queued"], {"format": 1})
                    self.assertEqual([edge["to"] for edge in paused["last_fired"]], ["format"])
                    self.assertEqual(len(requests), 5)
                    await rlm.factory.resume(a)
                    formatted = await collecting.get()
                    self.assertEqual(requests[formatted][1], 'Atlas Title|{"font": "plain"}|Two paragraphs')
                    settle(formatted)
                    self.assertIsNone((await until(a, "done"))["error"])
                    self.assertEqual(len(requests), 6)
                    self.assertCountEqual(deleted, [other_title, other_style])

                    c = (await rlm.factory.run("garden"))["run_id"]
                    run_ids.append(c)
                    failed, sibling = await collecting.get(), await collecting.get()
                    gates[failed].set_result({"settled": True, "status": "error", "error": "draft unavailable"})
                    failed_run = await until(c, "error", drained=True)
                    self.assertIn("draft unavailable", failed_run["error"])
                    self.assertEqual(failed_run["active_nodes"], [])
                    self.assertCountEqual(deleted, [other_title, other_style, sibling])
                    self.assertEqual(len(requests), 8)
            finally:
                stops = [asyncio.create_task(rlm.factory.stop(run_id)) for run_id in run_ids]
                for gate in gates.values():
                    if not gate.done():
                        gate.set_result({"settled": False, "status": "running"})
                async with asyncio.timeout(3):
                    await asyncio.gather(*stops)

    async def test_papi_13_foreach_documents_keep_item_order_and_exact_stop(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        rlm.harness.save_factory("chapter-index", {
            "nodes": [
                {"id": "list", "subagent": {"prompt": "List chapters"},
                 "outputs": [{"name": "chapters", "type": "json"}]},
                {"id": "index", "subagent": {"prompt": "Index {chapter}"},
                 "inputs": [{"name": "chapter", "type": "json", "from": "list.chapters"}],
                 "foreach": {"over": "chapter", "max": 3},
                 "outputs": [{"name": "index", "type": "text"}, {"name": "tag", "type": "json"}]},
                {"id": "publish", "subagent": {"prompt": "Publish {index}|{tag}"},
                 "inputs": [{"name": "index", "type": "text", "from": "index.index", "optional": True},
                            {"name": "tag", "type": "json", "from": "index.tag", "optional": True}],
                 "depends_on": ["index"]},
            ],
            "run": {"max_parallel": 2, "max_children": 3, "failure_policy": "fail_fast"},
        })
        requests = {}
        waiting = asyncio.Queue()
        gates = {}
        deleted = []
        run_ids = []

        async def host(kind, data):
            if kind == "rlm.run":
                name = data["kwargs"]["name"]
                child = f"id-{name}"
                self.assertNotIn(child, requests)
                requests[child] = (name, data["prompt"])
                return {"rlm_child_id": child, "name": name, "session_dir": str(self.directory), "model": "fake"}
            if kind == "rlm.collect":
                child, = data["targets"]
                gates[child] = asyncio.get_running_loop().create_future()
                waiting.put_nowait(child)
                return {"results": [{"rlm_child_id": child, "answer_preview": "preview", **await gates[child]}]}
            self.assertEqual(kind, "rlm.delete_subagent")
            child = data["target"]
            deleted.append(child)
            return {"subagent": {"rlm_child_id": child, "session_name": requests[child][0],
                                 "session_dir": str(self.directory), "status": "running"}}

        def settle(child, answer=""):
            gates[child].set_result({"settled": True, "status": "done", "factory_answer_preview": answer})

        async def next_child(run, prompt):
            child = await waiting.get()
            name, actual = requests[child]
            self.assertTrue(name.startswith(f"factory-{run}-"))
            self.assertEqual(actual, prompt)
            return child

        async def until(run, state):
            while (snapshot := await rlm.factory.graph(run))["state"] != state:
                self.assertNotIn(snapshot["state"], ("done", "error", "stopped"), snapshot)
                await rlm.factory.watch(run, timeout=30)
            return snapshot

        async def start(chapters):
            run = (await rlm.factory.run("chapter-index"))["run_id"]
            run_ids.append(run)
            settle(await next_child(run, "List chapters"), chapters)
            return run

        with patch("rlm.host_request", side_effect=host):
            try:
                async with asyncio.timeout(3):
                    a = await start('{"chapters":["Preface",{"section":2},"Appendix","Discarded"]}')
                    a1 = await next_child(a, "Index Preface")
                    a2 = await next_child(a, 'Index {"section": 2}')
                    b = await start('{"chapters":["Garden","Pond","Paths"]}')
                    b1 = await next_child(b, "Index Garden")
                    b2 = await next_child(b, "Index Pond")
                    self.assertEqual(len(requests), 6)
                    for run, children in ((a, [a1, a2]), (b, [b1, b2])):
                        for view in (rlm.factory.status, rlm.factory.graph, rlm.factory.watch):
                            snapshot = await view(run)
                            self.assertEqual(snapshot["active_children"], {"index": children})
                            self.assertEqual(snapshot["queued"], {"index": 1})
                    # Editing a returned view cannot change the running machine.
                    snapshot["active_children"]["index"].clear()
                    snapshot["queued"].clear()
                    self.assertEqual((await rlm.factory.status(b))["active_children"], {"index": [b1, b2]})
                    second = '```json\n{"tag": "section"}\n```'
                    settle(a2, second)
                    paused = await until(a, "paused")
                    self.assertEqual(paused["pause_reason"], "max_children exceeded")
                    self.assertEqual(paused["active_nodes"], ["index"])
                    self.assertEqual(paused["active_children"], {"index": [a1]})
                    self.assertEqual(paused["queued"], {"index": 1})
                    self.assertEqual([edge["to"] for edge in paused["last_fired"]], ["index"])
                    self.assertEqual(len(requests), 6)
                    stopping = asyncio.create_task(rlm.factory.stop(b))
                    try:
                        await until(b, "stopping")
                        gates[b1].set_result({"settled": False, "status": "running"})
                        self.assertEqual((await stopping)["state"], "stopped")
                    finally:
                        stopping.cancel()
                        await asyncio.gather(stopping, return_exceptions=True)
                    self.assertCountEqual(deleted, [b1, b2])
                    stopped = await rlm.factory.status(b)
                    self.assertEqual((stopped["active_children"], stopped["queued"]), ({}, {}))
                    self.assertEqual((await rlm.factory.status(a))["state"], "paused")
                    await rlm.factory.resume(a)
                    a3 = await next_child(a, "Index Appendix")
                    third = '```json\n{"tag": "appendix"}\n```'
                    settle(a3, third)
                    partial = await rlm.factory.watch(a, timeout=30)
                    self.assertTrue(partial["changed"])
                    self.assertEqual(partial["active_nodes"], ["index"])
                    self.assertEqual(partial["active_children"], {"index": [a1]})
                    self.assertEqual(partial["queued"], {})
                    self.assertEqual([edge["to"] for edge in partial["last_fired"]], ["index"])
                    settle(a1, "Opening notes")
                    publish = await next_child(a, f'Publish Opening notes\n\n{second}\n\n{third}|"appendix"')
                    settle(publish)
                    await until(a, "done")
                    self.assertEqual(len(requests), 8)
                    self.assertCountEqual(deleted, [b1, b2])
                    empty = await start('{"chapters":[]}')
                    settle(await next_child(empty, "Publish None|null"))
                    snapshot = await until(empty, "done")
                    self.assertNotIn("index", snapshot["children"])
                    invalid = await start('{"chapters":"not a list"}')
                    self.assertIn("not a JSON list", (await until(invalid, "error"))["error"])
                    self.assertEqual(len(requests), 11)
            finally:
                stops = [asyncio.create_task(rlm.factory.stop(run)) for run in run_ids]
                for gate in gates.values():
                    if not gate.done():
                        gate.set_result({"settled": False, "status": "running"})
                async with asyncio.timeout(3):
                    await asyncio.gather(*stops)

    async def test_papi_13_late_review_guards_cannot_regress_bindings_or_joins(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        label = "editor" + "é" * 10 + "😀" * 20
        rlm.harness.save_factory("review-manuscript", {
            "states": [
                {"id": "draft", "entry": True, "subagent": {"prompt": "Open draft"}},
                {"id": "revision", "entry": True, "subagent": {"prompt": "Open revision"}},
                {"id": "review", "max_entries": 2, "subagent": {"name": label, "prompt": "Review manuscript"},
                 "outputs": [{"name": "note", "type": "json"}, {"name": "flag", "type": "json"}]},
                {"id": "index", "max_entries": 2, "subagent": {"prompt": "Index {note}"},
                 "inputs": [{"name": "note", "type": "json", "from": "review.note"}]},
                {"id": "audit", "subagent": {"prompt": "Audit current {note}"},
                 "inputs": [{"name": "note", "type": "json", "from": "review.note"}]},
            ],
            "transitions": [
                {"from": "draft", "to": "review"}, {"from": "revision", "to": "review"},
                {"from": ["draft", "review"], "to": "index"},
                {"from": "review", "to": "audit", "when": {"output": "flag", "op": "eq", "value": True}},
            ],
            "run": {"max_parallel": 3},
        })
        admitted = asyncio.Queue()
        children = {}
        names = set()
        deleted = []

        async def host(kind, data):
            if kind == "rlm.run":
                name = data["kwargs"]["name"]
                self.assertNotIn(name, names)
                self.assertLessEqual(len(name.encode("utf-16-le")) // 2, 64)
                names.add(name)
                child = f"opaque-{len(names)}"
                children[child] = (name, asyncio.get_running_loop().create_future())
                admitted.put_nowait((child, data["prompt"]))
                return {"rlm_child_id": child, "name": name, "session_dir": str(self.directory), "model": "fake"}
            if kind == "rlm.collect":
                child, = data["targets"]
                answer = await children[child][1]
                return {"results": [{"rlm_child_id": child, "settled": answer is not None,
                                     "status": "running" if answer is None else "done", "factory_answer_preview": answer}]}
            self.assertEqual(kind, "rlm.delete_subagent")
            child = data["target"]
            deleted.append(child)
            return {"subagent": {"rlm_child_id": child, "session_name": children[child][0],
                                 "session_dir": str(self.directory), "status": "running"}}

        async def next_child(run, prompt, *, authored=False):
            child, actual = await admitted.get()
            self.assertEqual(actual, prompt)
            name = children[child][0]
            self.assertIn(f"-{run}-", name)
            if authored:
                prefix = name.split(f"-{run}-")[0]
                self.assertTrue(prefix.startswith("editoré"))
                self.assertTrue(label.startswith(prefix))
            return child

        def release(child, answer=""):
            children[child][1].set_result(answer)

        runs = []
        with patch("rlm.host_request", side_effect=host):
            try:
                async with asyncio.timeout(3):
                    async def start():
                        run = (await rlm.factory.run("review-manuscript"))["run_id"]
                        runs.append(run)
                        draft = await next_child(run, "Open draft")
                        revision = await next_child(run, "Open revision")
                        release(draft)
                        older = await next_child(run, "Review manuscript", authored=True)
                        release(revision)
                        newer = await next_child(run, "Review manuscript", authored=True)
                        return run, older, newer

                    a, older, newer = await start()
                    b, b_older, b_newer = await start()
                    release(newer, '{"note":"final","flag":false}')
                    index = await next_child(a, 'Index "final"')
                    release(older, '{"note":"draft","flag":true}')
                    audit = await next_child(a, 'Audit current "final"')
                    self.assertEqual([edge["to"] for edge in (await rlm.factory.graph(a))["last_fired"]],
                                     ["audit", "index", "review", "review"])
                    stop = asyncio.create_task(rlm.factory.stop(b))
                    try:
                        self.assertEqual((await rlm.factory.watch(b, timeout=2))["state"], "stopping")
                        release(b_newer, None)
                        self.assertEqual((await stop)["state"], "stopped")
                    finally:
                        stop.cancel()
                        await asyncio.gather(stop, return_exceptions=True)
                    self.assertCountEqual(deleted, [b_older, b_newer])
                    self.assertEqual((await rlm.factory.status(a))["children"]["review"], newer)
                    self.assertEqual((await rlm.factory.status(a))["state"], "running")
                    release(index)
                    indexed = await rlm.factory.watch(a, timeout=2)
                    self.assertEqual(indexed["active_nodes"], ["audit"])
                    release(audit)
                    self.assertEqual((await rlm.factory.watch(a, timeout=2))["state"], "done")
                    self.assertTrue(admitted.empty())
            finally:
                for _, gate in children.values():
                    if not gate.done():
                        gate.set_result(None)
                async with asyncio.timeout(3):
                    await asyncio.gather(*(rlm.factory.stop(run) for run in runs))

    async def test_papi_13_dag_counts_admissions_and_resumes_selected_run(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        spec = self.text_dag("archive")
        spec["run"] = {"max_children": 1}
        rlm.harness.save_factory("archive-draft", spec)
        started = asyncio.Queue()
        answers = {}

        async def host(kind, data):
            if kind == "rlm.run":
                child = f"document-{len(answers)}"
                answers[child] = asyncio.get_running_loop().create_future()
                started.put_nowait((child, data["prompt"]))
                return {"rlm_child_id": child, "name": data["kwargs"]["name"],
                        "session_dir": str(self.directory), "model": "fake"}
            self.assertEqual(kind, "rlm.collect")
            child, = data["targets"]
            return {"results": [{"rlm_child_id": child, "status": "done", "settled": True,
                                 "factory_answer_preview": await answers[child]}]}

        with patch("rlm.host_request", side_effect=host):
            a = (await rlm.factory.run("archive-draft"))["run_id"]
            try:
                async with asyncio.timeout(3):
                    child, prompt = await started.get()
                    self.assertEqual(prompt, "archive: produce one short word")
                    answers[child].set_result("preface")
                    paused = await rlm.factory.watch(a, timeout=2)
                    self.assertEqual((paused["state"], paused["pause_reason"]), ("paused", "max_children exceeded"))
                    self.assertEqual(paused["children"], {"produce": child})
                    self.assertTrue(started.empty())
                    await rlm.factory.resume(a)
                    consumer, prompt = await started.get()
                    self.assertEqual(prompt, "archive: use preface")
                    self.assertNotEqual(consumer, child)
                    answers[consumer].set_result("")
                    self.assertEqual((await rlm.factory.watch(a, timeout=2))["state"], "done")
                    self.assertEqual(len(answers), 2)
            finally:
                for answer in answers.values():
                    if not answer.done():
                        answer.set_result("")
                async with asyncio.timeout(3):
                    await rlm.factory.stop(a)

    async def test_papi_13_conditional_required_source_pending_vs_settled_without_value(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        rlm.harness.save_factory("conditional-index", {
            "states": [
                {"id": "review", "entry": True, "subagent": {"prompt": "Review document"},
                 "outputs": [{"name": "decision", "type": "text"}]},
                {"id": "extract", "subagent": {"prompt": "Extract heading"},
                 "outputs": [{"name": "heading", "type": "text"}]},
                {"id": "index", "subagent": {"prompt": "Index {heading}"},
                 "inputs": [{"name": "heading", "type": "text", "from": "extract.heading"}]},
                {"id": "audit", "subagent": {"prompt": "Audit index"}},
            ],
            "transitions": [
                {"from": "review", "to": "index"},
                {"from": "review", "to": "extract", "when": {"output": "decision", "op": "eq", "value": "approve"}},
                {"from": "index", "to": "audit"},
            ],
            "run": {"failure_policy": "continue"},
        })
        for decision in ("skip", "approve"):
            with self.subTest(decision=decision):
                prompts = []
                release = asyncio.Event()

                async def host(kind, data):
                    if kind == "rlm.run":
                        prompts.append(data["prompt"])
                        return {"rlm_child_id": str(len(prompts)), "name": data["kwargs"]["name"],
                                "session_dir": str(self.directory), "model": "fake"}
                    self.assertEqual(kind, "rlm.collect")
                    child, = data["targets"]
                    await release.wait()
                    return {"results": [{"rlm_child_id": child, "status": "done", "settled": True,
                                         "factory_answer_preview": decision if child == "1" else ""}]}

                with patch("rlm.host_request", side_effect=host):
                    run_id = (await rlm.factory.run("conditional-index"))["run_id"]
                    initial = await rlm.factory.status(run_id)
                    self.assertEqual([node["status"] for node in initial["nodes"]], ["pending"] * 4)
                    release.set()
                    finished = await rlm.factory.watch(run_id, timeout=2)
                    selected = await rlm.factory.status(run_id)
                    self.assertEqual(selected["nodes"], finished["nodes"])
                    states = {node["state_id"]: node["status"] for node in selected["nodes"]}
                    if decision == "skip":
                        self.assertEqual(prompts, ["Review document"])
                        self.assertEqual(finished["state"], "done")
                        self.assertIsNone(finished["error"])
                        self.assertEqual(states, {"review": "done", "extract": "pending", "index": "pending", "audit": "pending"})
                        self.assertEqual([edge["to"] for edge in finished["last_fired"]], ["index"])
                    else:
                        self.assertEqual(prompts, ["Review document", "Extract heading", "Audit index"])
                        self.assertEqual(finished["state"], "error")
                        self.assertIn("extract.heading", finished["error"])
                        self.assertEqual(states, {"review": "done", "extract": "done", "index": "error", "audit": "done"})

    async def test_papi_13_refused_spawns_do_not_consume_document_admission_budget(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        rlm.harness.save_factory("proofread", {
            "nodes": [{"id": key, "subagent": {"prompt": key}} for key in ("appendix", "draft", "style")],
            "run": {"max_parallel": 1, "max_children": 1, "failure_policy": "continue"},
        })
        attempts = []

        async def host(kind, data):
            if kind == "rlm.run":
                prompt, name = data["prompt"], data["kwargs"]["name"]
                attempts.append((prompt, name))
                if prompt == "appendix":
                    raise RuntimeError("appendix admission refused")
                return {"rlm_child_id": prompt, "name": name, "session_dir": str(self.directory), "model": "fake"}
            self.assertEqual(kind, "rlm.collect")
            child, = data["targets"]
            return {"results": [{"rlm_child_id": child, "status": "done", "settled": True}]}

        with patch("rlm.host_request", side_effect=host):
            run_id = (await rlm.factory.run("proofread"))["run_id"]
            try:
                paused = await rlm.factory.watch(run_id, timeout=2)
                self.assertEqual(paused["pause_reason"], "max_children exceeded")
                self.assertEqual(paused["children"], {"draft": "draft"})
                self.assertEqual([prompt for prompt, _ in attempts], ["appendix", "draft"])
                await rlm.factory.resume(run_id)
                finished = await rlm.factory.watch(run_id, timeout=2)
                self.assertEqual(finished["state"], "error")
                self.assertIn("appendix admission refused", finished["error"])
                self.assertEqual(finished["children"], {"draft": "draft", "style": "style"})
                self.assertEqual([prompt for prompt, _ in attempts], ["appendix", "draft", "style"])
                self.assertEqual(len({name for _, name in attempts}), 3)
            finally:
                await rlm.factory.stop(run_id)

    async def test_papi_13_document_failure_policies_scope_resume_and_cancellation(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        for mode in ("escalate", "continue", "fail_fast", "stop_during_fail_fast", "override"):
            with self.subTest(mode=mode):
                spec = {
                    "states": [
                        {"id": "draft", "entry": True, "subagent": {"prompt": "Read draft"},
                         "outputs": [{"name": "title", "type": "text"}]},
                        {"id": "style", "entry": True, "subagent": {"prompt": "Read style"}},
                        {"id": "catalog", "subagent": {"prompt": "Catalog {title}"},
                         "inputs": [{"name": "title", "type": "text", "from": "draft.title"}]},
                        {"id": "note", "subagent": {"prompt": "Note missing draft {title}"},
                         "inputs": [{"name": "title", "type": "text", "from": "draft.title", "optional": True}]},
                        {"id": "approved", "subagent": {"prompt": "Use approved draft"}},
                    ],
                    "transitions": [
                        {"from": "draft", "to": "catalog"},
                        {"from": ["draft", "style"], "to": "note"},
                        {"from": "draft", "to": "approved", "when": {"output": "title", "op": "exists"}},
                    ],
                    "run": {"max_parallel": 2},
                }
                if mode in ("continue", "fail_fast"):
                    spec["run"]["failure_policy"] = mode
                if mode == "override":
                    spec["run"]["failure_policy"] = "fail_fast"
                    for state in spec["states"][:1] + spec["states"][2:3]:
                        state["failure_policy"] = "continue"
                if mode == "stop_during_fail_fast":
                    spec["run"]["failure_policy"] = "fail_fast"
                rlm.harness.save_factory("document-review", spec)
                started = asyncio.Queue()
                children = {}
                deleted = []
                deleting = asyncio.Event()
                release_delete = asyncio.Event()
                runs = []

                async def host(kind, data):
                    if kind == "rlm.run":
                        name = data["kwargs"]["name"]
                        child = f"document-{len(children)}"
                        children[child] = (name, asyncio.get_running_loop().create_future())
                        started.put_nowait((child, data["prompt"]))
                        return {"rlm_child_id": child, "name": name, "session_dir": str(self.directory), "model": "fake"}
                    if kind == "rlm.collect":
                        child, = data["targets"]
                        return {"results": [{"rlm_child_id": child, **await asyncio.shield(children[child][1])}]}
                    self.assertEqual(kind, "rlm.delete_subagent")
                    child = data["target"]
                    deleted.append(child)
                    if mode == "stop_during_fail_fast" and child == style:
                        deleting.set()
                        await release_delete.wait()
                    return {"subagent": {"rlm_child_id": child, "session_name": children[child][0],
                                         "session_dir": str(self.directory), "status": "running"}}

                async def next_child(run, prompt):
                    child, actual = await started.get()
                    self.assertEqual(actual, prompt)
                    self.assertIn(f"-{run}-", children[child][0])
                    return child

                async def start():
                    run = (await rlm.factory.run("document-review"))["run_id"]
                    runs.append(run)
                    return run, await next_child(run, "Read draft"), await next_child(run, "Read style")

                def release(child, **fields):
                    children[child][1].set_result({"settled": True, "status": "done", **fields})

                with patch("rlm.host_request", side_effect=host):
                    try:
                        async with asyncio.timeout(3):
                            a, draft, style = await start()
                            b, other_draft, other_style = await start()
                            release(draft, status="error", error="draft unavailable", factory_answer_preview="not a valid title")
                            initial = await rlm.factory.watch(a, timeout=2)
                            self.assertIn("draft unavailable", initial["error"])
                            if mode == "stop_during_fail_fast":
                                await deleting.wait()
                                stop_entered = asyncio.Event()

                                async def selected_stop():
                                    stop_entered.set()
                                    return await rlm.factory.stop(a)

                                stop = asyncio.create_task(selected_stop())
                                await stop_entered.wait()
                                try:
                                    self.assertEqual(deleted, [style])
                                    self.assertEqual((await rlm.factory.status(a))["state"], "stopping")
                                finally:
                                    release_delete.set()
                                    stopped_a = await stop
                                self.assertEqual(stopped_a, {"run_id": a, "state": "stopped", "cancelled": ["style"]})
                                self.assertEqual((await rlm.factory.status(a))["error"], "draft: draft unavailable")
                            elif mode == "fail_fast":
                                self.assertEqual(initial["state"], "error")
                                drained = await rlm.factory.watch(a, timeout=2) if initial["active_nodes"] else initial
                                self.assertEqual(drained["active_nodes"], [])
                                self.assertEqual(deleted, [style])
                                self.assertEqual(drained["last_fired"], [])
                            else:
                                if mode == "escalate":
                                    self.assertEqual(initial["state"], "paused")
                                    self.assertEqual(initial["active_nodes"], ["style"])
                                    self.assertIn("draft unavailable", initial["pause_reason"])
                                    self.assertEqual(initial["last_fired"], [])
                                    self.assertEqual(deleted, [])
                                    self.assertTrue(started.empty())
                                    with self.assertRaisesRegex(ValueError, "not paused"):
                                        await rlm.factory.resume(b)
                                    await rlm.factory.resume(a)
                                    bind_failure = await rlm.factory.watch(a, timeout=2)
                                    self.assertEqual(bind_failure["state"], "paused")
                                    self.assertIn("draft.title", bind_failure["pause_reason"])
                                    await rlm.factory.resume(a)
                                else:
                                    self.assertEqual(initial["state"], "running")
                                self.assertEqual(deleted, [])
                                self.assertTrue(started.empty())
                                release(style)
                                note = await next_child(a, "Note missing draft None")
                                release(note)
                                finished = await rlm.factory.watch(a, timeout=2)
                                self.assertEqual(finished["state"], "error")
                                self.assertEqual([edge["to"] for edge in finished["last_fired"]], ["note", "catalog"])
                                self.assertEqual({node["state_id"]: node["status"] for node in finished["nodes"]},
                                                 {"draft": "error", "catalog": "error", "style": "done",
                                                  "note": "done", "approved": "pending"})
                            with self.assertRaisesRegex(ValueError, "not paused"):
                                await rlm.factory.resume(a)
                            self.assertEqual((await rlm.factory.status(b))["children"],
                                             {"draft": other_draft, "style": other_style})
                            self.assertEqual((await rlm.factory.status(b))["state"], "running")
                            stopped = asyncio.create_task(rlm.factory.stop(b))
                            try:
                                self.assertEqual((await rlm.factory.watch(b, timeout=2))["state"], "stopping")
                                children[other_draft][1].set_result({"settled": False, "status": "running"})
                                self.assertEqual((await stopped)["state"], "stopped")
                            finally:
                                stopped.cancel()
                                await asyncio.gather(stopped, return_exceptions=True)
                            self.assertCountEqual(deleted, [other_draft, other_style] + ([style] if mode in ("fail_fast", "stop_during_fail_fast") else []))
                            self.assertEqual(len(children), 4 if mode in ("fail_fast", "stop_during_fail_fast") else 5)
                            self.assertTrue(started.empty())
                    finally:
                        release_delete.set()
                        for _, response in children.values():
                            if not response.done():
                                response.set_result({"settled": False, "status": "running"})
                        async with asyncio.timeout(3):
                            await asyncio.gather(*(rlm.factory.stop(run) for run in runs))

    async def test_papi_13_failed_foreach_admission_drops_pending_items_and_partial_outputs(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        rlm.harness.save_factory("chapter-index", {
            "nodes": [
                {"id": "list", "subagent": {"prompt": "List chapters"},
                 "outputs": [{"name": "chapters", "type": "json"}]},
                {"id": "index", "subagent": {"prompt": "Index {chapter}"},
                 "inputs": [{"name": "chapter", "type": "json", "from": "list.chapters"}],
                 "foreach": {"over": "chapter", "max": 3},
                 "outputs": [{"name": "index", "type": "text"}]},
                {"id": "publish", "subagent": {"prompt": "Publish {index}"}, "depends_on": ["index"],
                 "inputs": [{"name": "index", "type": "text", "from": "index.index", "optional": True}]},
            ],
            "run": {"max_parallel": 1, "failure_policy": "continue"},
        })
        prompts = []
        answers = {}

        async def host(kind, data):
            if kind == "rlm.run":
                prompt = data["prompt"]
                prompts.append(prompt)
                if prompt == "Index appendix":
                    raise RuntimeError("appendix admission refused")
                child = f"chapter-{len(prompts)}"
                answers[child] = {
                    "List chapters": '{"chapters":["intro","appendix","glossary"]}',
                    "Index intro": "partial index",
                }.get(prompt)
                return {"rlm_child_id": child, "name": data["kwargs"]["name"],
                        "session_dir": str(self.directory), "model": "fake"}
            self.assertEqual(kind, "rlm.collect")
            child, = data["targets"]
            return {"results": [{"rlm_child_id": child, "status": "done", "settled": True,
                                 "factory_answer_preview": answers[child]}]}

        with patch("rlm.host_request", side_effect=host):
            run = (await rlm.factory.run("chapter-index"))["run_id"]
            result = await rlm.factory.watch(run, timeout=2)
        self.assertEqual((result["state"], result["active_nodes"]), ("error", []))
        self.assertIn("appendix admission refused", result["error"])
        self.assertEqual(prompts, ["List chapters", "Index intro", "Index appendix", "Publish None"])

    async def test_papi_13_retry_keeps_item_and_entry_and_counts_child_admissions(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        rlm.harness.save_factory("retry-index", {
            "run": {"max_children": 3, "max_parallel": 1},
            "nodes": [
                {"id": "list", "subagent": {"prompt": "List chapters"},
                 "outputs": [{"name": "chapters", "type": "json"}]},
                {"id": "index", "retries": 1, "subagent": {"prompt": "Index {chapter}"},
                 "inputs": [{"name": "chapter", "type": "json", "from": "list.chapters"}],
                 "foreach": {"over": "chapter", "max": 2}, "outputs": [{"name": "index", "type": "text"}]},
                {"id": "publish", "subagent": {"prompt": "Publish {index}"},
                 "inputs": [{"name": "index", "type": "text", "from": "index.index"}]},
            ],
        })
        for exhausted in (False, True):
            with self.subTest(exhausted=exhausted):
                prompts, collected, labels = [], [], []

                async def host(kind, data):
                    if kind == "rlm.run":
                        prompts.append(data["prompt"])
                        labels.append(data["kwargs"]["name"])
                        return {"rlm_child_id": f"chapter-{len(prompts)}", "name": labels[-1],
                                "session_dir": str(self.directory), "model": "fake"}
                    self.assertEqual(kind, "rlm.collect")
                    child, = data["targets"]
                    collected.append(child)
                    attempt = int(child.split("-")[1])
                    failed = attempt == 3 or (attempt == 4 and exhausted)
                    return {"results": [{"rlm_child_id": child, "status": "error" if failed else "done",
                                         "settled": True, "error": "index failed" if failed else None,
                                         "factory_answer_preview": {1: '{"chapters":["intro","appendix"]}',
                                                         2: "intro index", 4: "appendix index"}.get(attempt)}]}

                with patch("rlm.host_request", side_effect=host):
                    run = (await rlm.factory.run("retry-index"))["run_id"]
                    paused = await rlm.factory.watch(run, timeout=2)
                    self.assertEqual((paused["state"], paused["pause_reason"], paused["error"]),
                                     ("paused", "max_children exceeded", None))
                    self.assertEqual(prompts, ["List chapters", "Index intro", "Index appendix"])
                    await rlm.factory.resume(run)
                    result = await rlm.factory.watch(run, timeout=2)
                    expected = ["List chapters", "Index intro", "Index appendix", "Index appendix"]
                    if exhausted:
                        self.assertEqual(result["state"], "paused")
                        self.assertIn("index failed", result["error"])
                        self.assertEqual((await rlm.factory.stop(run))["state"], "stopped")
                    else:
                        self.assertEqual((result["state"], result["error"]), ("done", None))
                        expected.append("Publish intro index\n\nappendix index")
                    self.assertEqual(prompts, expected)
                    self.assertEqual(collected, [f"chapter-{n}" for n in range(1, len(expected) + 1)])
                    self.assertEqual(len(set(labels)), len(expected))

    async def test_papi_13_state_budget_fails_late_success_without_retry(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        rlm.harness.save_factory("timed-review", {
            "run": {"failure_policy": "continue"},
            "nodes": [
                {"id": "review", "budget_ms": 125, "retries": 2, "subagent": {"prompt": "Review manuscript"},
                 "outputs": [{"name": "review", "type": "text"}]},
                {"id": "publish", "subagent": {"prompt": "Publish {review}"},
                 "inputs": [{"name": "review", "type": "text", "from": "review.review", "optional": True}]},
            ],
        })
        for elapsed, expected_state, expected_input in ((0.125, "done", "review text"), (0.25, "error", "None")):
            with self.subTest(elapsed=elapsed):
                clock = 0.0
                prompts = []

                async def host(kind, data):
                    nonlocal clock
                    if kind == "rlm.run":
                        prompts.append(data["prompt"])
                        clock += 0.5  # Admission itself is not part of the state budget.
                        return {"rlm_child_id": f"review-{len(prompts)}", "name": data["kwargs"]["name"],
                                "session_dir": str(self.directory), "model": "fake"}
                    self.assertEqual(kind, "rlm.collect")
                    child, = data["targets"]
                    if child == "review-1":
                        clock += elapsed
                    return {"results": [{"rlm_child_id": child, "status": "done", "settled": True,
                                         "factory_answer_preview": "review text"}]}

                with patch("rlm.factory.monotonic", side_effect=lambda: clock), patch("rlm.host_request", side_effect=host):
                    run = (await rlm.factory.run("timed-review"))["run_id"]
                    result = await rlm.factory.watch(run, timeout=2)
                self.assertEqual(result["state"], expected_state)
                self.assertEqual(prompts, ["Review manuscript", f"Publish {expected_input}"])
                if expected_state == "error":
                    self.assertIn("state budget_ms 125 exceeded", result["error"])

    async def test_papi_13_run_budget_resume_and_terminal_stop_are_isolated(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        for name in ("manuscript", "appendix"):
            spec = self.text_dag(name)
            spec["run"] = {"budget_ms": 125}
            rlm.harness.save_factory(name, spec)
        clock = 0.0
        spawned, deleted = {}, []
        collecting = asyncio.Queue()
        release = {}

        async def host(kind, data):
            if kind == "rlm.run":
                child = f"doc-{len(spawned) + 1}"
                spawned[child] = data["prompt"]
                return {"rlm_child_id": child, "name": data["kwargs"]["name"],
                        "session_dir": str(self.directory), "model": "fake"}
            if kind == "rlm.collect":
                child, = data["targets"]
                if child not in release and len(release) < 2:
                    release[child] = asyncio.Event()
                    collecting.put_nowait(child)
                    await release[child].wait()
                    return {"results": [{"rlm_child_id": child, "status": "running", "settled": False}]}
                return {"results": [{"rlm_child_id": child, "status": "done", "settled": True,
                                     "factory_answer_preview": "settled chapter"}]}
            self.assertEqual(kind, "rlm.delete_subagent")
            child = data["target"]
            deleted.append(child)
            return {"subagent": {"rlm_child_id": child, "session_name": "document",
                                 "session_dir": str(self.directory), "status": "running"}}

        with patch("rlm.factory.monotonic", side_effect=lambda: clock), patch("rlm.host_request", side_effect=host):
            a = (await rlm.factory.run("manuscript"))["run_id"]
            b = (await rlm.factory.run("appendix"))["run_id"]
            for _ in range(2):
                await asyncio.wait_for(collecting.get(), 2)
            a_child, = (await rlm.factory.status(a))["children"].values()
            b_child, = (await rlm.factory.status(b))["children"].values()
            clock = 0.25
            for event in release.values():
                event.set()
            for run in (a, b):
                paused = await rlm.factory.watch(run, timeout=0)
                if paused["state"] == "running":
                    paused = await rlm.factory.watch(run, timeout=2)
                self.assertEqual((paused["state"], paused["pause_reason"]), ("paused", "run budget exceeded"))
                self.assertTrue(paused["active_nodes"])
            self.assertEqual(len(spawned), 2)
            self.assertEqual(deleted, [])
            await rlm.factory.resume(a)
            self.assertEqual((await rlm.factory.watch(a, timeout=2))["state"], "done")
            self.assertEqual((await rlm.factory.status(b))["state"], "paused")
            stopped = await rlm.factory.stop(b)
            self.assertEqual(stopped["state"], "stopped")
            with self.assertRaisesRegex(ValueError, "not paused"):
                await rlm.factory.resume(b)
        self.assertNotEqual(a_child, b_child)
        self.assertEqual(deleted, [b_child])
        self.assertEqual(len(spawned), 3)
        self.assertIn("settled chapter", list(spawned.values())[-1])

    async def test_papi_13_run_budget_checks_between_parallel_admissions(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        rlm.harness.save_factory("timed-checks", {
            "run": {"budget_ms": 125, "max_parallel": 2},
            "nodes": [
                {"id": "copy", "subagent": {"prompt": "Check copy"}},
                {"id": "sources", "subagent": {"prompt": "Check sources"}},
            ],
        })
        clock = 0.0
        prompts = []

        async def host(kind, data):
            nonlocal clock
            if kind == "rlm.run":
                prompts.append(data["prompt"])
                clock += 0.25
                return {"rlm_child_id": f"check-{len(prompts)}", "name": data["kwargs"]["name"],
                        "session_dir": str(self.directory), "model": "fake"}
            self.assertEqual(kind, "rlm.collect")
            child, = data["targets"]
            return {"results": [{"rlm_child_id": child, "status": "done", "settled": True}]}

        with patch("rlm.factory.monotonic", side_effect=lambda: clock), patch("rlm.host_request", side_effect=host):
            run = (await rlm.factory.run("timed-checks"))["run_id"]
            paused = await rlm.factory.watch(run, timeout=2)
            self.assertEqual((paused["state"], paused["pause_reason"]), ("paused", "run budget exceeded"))
            self.assertEqual(prompts, ["Check copy"])
            await rlm.factory.resume(run)
            # Parallel polls may notify before the run completes.
            async with asyncio.timeout(2):
                status = await rlm.factory.status(run)
                while status["state"] == "running":
                    status = await rlm.factory.watch(run, timeout=1)
            self.assertEqual(status["state"], "done")
            self.assertEqual(prompts, ["Check copy", "Check sources"])

    async def test_papi_13_graph_lists_live_residents_beyond_terminal_window(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        for name, lifecycle in (("watch-manuscript", "resident"), ("scan-page", "task")):
            rlm.harness.save_factory(name, {"nodes": [
                {"id": "page", "lifecycle": lifecycle, "subagent": {"prompt": name}},
            ]})

        async def host(kind, data):
            if kind == "rlm.run":
                name = data["kwargs"]["name"]
                return {"rlm_child_id": f"id-{name}", "name": name,
                        "session_dir": str(self.directory), "model": "fake"}
            if kind == "rlm.collect":
                child, = data["targets"]
                return {"results": [{"rlm_child_id": child, "status": "done", "settled": True}]}
            self.assertEqual(kind, "rlm.delete_subagent")
            return {"subagent": {"rlm_child_id": data["target"], "session_name": "watch",
                                 "session_dir": str(self.directory), "status": "running"}}

        with patch("rlm.host_request", side_effect=host):
            resident = (await rlm.factory.run("watch-manuscript"))["run_id"]
            try:
                watcher = await rlm.factory.watch(resident, timeout=1)
                self.assertEqual(watcher["state"], "done")
                scans = []
                for _ in range(21):
                    run = (await rlm.factory.run("scan-page"))["run_id"]
                    scans.append(run)
                    self.assertEqual((await rlm.factory.watch(run, timeout=1))["state"], "done")
                listed = (await rlm.factory.graph())["runs"]
                self.assertEqual([row["run_id"] for row in listed], [resident, *scans[1:]])
                self.assertEqual(listed[0]["active_children"], {"page": [f"id-factory-{resident}-1"]})
                self.assertEqual((await rlm.factory.graph(scans[0]))["state"], "done")
            finally:
                await rlm.factory.stop(resident)
            self.assertEqual([row["run_id"] for row in (await rlm.factory.graph())["runs"]], scans[1:])

    async def test_papi_13_residents_survive_graph_completion_and_stop_by_run(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        for doc in ("manuscript", "appendix"):
            rlm.harness.save_factory(doc, {
                "run": {"max_parallel": 1, "max_children": 1},
                "nodes": [
                    {"id": "scan", "subagent": {"prompt": f"Scan {doc}"}},
                    {"id": "watch", "depends_on": ["scan"], "lifecycle": "resident",
                     "subagent": {"prompt": f"Watch {doc}"}},
                ],
            })
        active = {}
        deleted = []

        async def host(kind, data):
            if kind == "rlm.run":
                child = data["prompt"]
                self.assertNotIn(child, active)
                active[child] = data["kwargs"]["name"]
                return {"rlm_child_id": child, "name": active[child],
                        "session_dir": str(self.directory), "model": "fake"}
            if kind == "rlm.collect":
                child, = data["targets"]
                self.assertTrue(child.startswith("Scan "))
                return {"results": [{"rlm_child_id": child, "status": "done", "settled": True}]}
            self.assertEqual(kind, "rlm.delete_subagent")
            child = data["target"]
            deleted.append(child)
            return {"subagent": {"rlm_child_id": child, "session_name": active.pop(child),
                                 "session_dir": str(self.directory), "status": "running"}}

        with patch("rlm.host_request", side_effect=host):
            runs = [(await rlm.factory.run(doc))["run_id"] for doc in ("manuscript", "appendix")]
            await rlm.factory.watch(runs[0], timeout=1)
            for run, doc in zip(runs, ("manuscript", "appendix"), strict=True):
                paused = await rlm.factory.graph(run)
                self.assertEqual((paused["state"], paused["pause_reason"], paused["active_nodes"]),
                                 ("paused", "max_children exceeded", []))
                self.assertNotIn(f"Watch {doc}", active)
                await rlm.factory.resume(run)
                finished = await rlm.factory.watch(run, timeout=1)
                self.assertEqual((finished["state"], finished["active_nodes"]), ("done", ["watch"]))
                self.assertEqual(finished["children"]["watch"], f"Watch {doc}")
            self.assertEqual(deleted, [])
            stopped = await rlm.factory.stop(runs[0])
            self.assertEqual((stopped["state"], stopped["cancelled"]), ("stopped", ["watch"]))
            self.assertEqual((await rlm.factory.stop(runs[0]))["cancelled"], [])
            self.assertEqual((await rlm.factory.graph(runs[0]))["active_nodes"], [])
            unaffected = await rlm.factory.graph(runs[1])
            self.assertEqual((unaffected["state"], unaffected["active_nodes"]), ("done", ["watch"]))
            self.assertIn("Watch appendix", active)
            self.assertEqual(deleted, ["Watch manuscript"])
            self.assertEqual((await rlm.factory.stop(runs[1]))["state"], "stopped")
        self.assertEqual(deleted, ["Watch manuscript", "Watch appendix"])

    async def test_papi_13_resident_saturation_reports_error_and_retains_handle(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        rlm.harness.save_factory("saturated-manuscript", {
            "run": {"max_parallel": 1},
            "nodes": [
                {"id": "watch", "lifecycle": "resident", "subagent": {"prompt": "Watch manuscript"}},
                {"id": "index", "subagent": {"prompt": "Index manuscript"}},
            ],
        })
        admitted, deleted = [], []

        async def host(kind, data):
            if kind == "rlm.run":
                admitted.append(data["prompt"])
                return {"rlm_child_id": data["prompt"], "name": data["kwargs"]["name"],
                        "session_dir": str(self.directory), "model": "fake"}
            self.assertEqual(kind, "rlm.delete_subagent")
            deleted.append(data["target"])
            return {"subagent": {"rlm_child_id": data["target"], "session_name": "watch",
                                 "session_dir": str(self.directory), "status": "running"}}

        with patch("rlm.host_request", side_effect=host):
            run = (await rlm.factory.run("saturated-manuscript"))["run_id"]
            failed = await rlm.factory.watch(run, timeout=1)
            self.assertEqual((failed["state"], failed["active_nodes"]), ("error", ["watch"]))
            self.assertIn("max_parallel 1", failed["error"])
            self.assertEqual(admitted, ["Watch manuscript"])
            self.assertEqual(deleted, [])
            self.assertEqual((await rlm.factory.stop(run))["state"], "stopped")
        self.assertEqual(deleted, ["Watch manuscript"])

    async def test_papi_13_resident_sibling_obeys_failure_policy(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        for policy in ("continue", "fail_fast"):
            with self.subTest(policy=policy):
                rlm.harness.save_factory(f"manuscript-{policy}", {
                    "run": {"failure_policy": policy, "max_parallel": 2},
                    "states": [
                        {"id": "watch", "entry": True, "lifecycle": "resident",
                         "subagent": {"prompt": "Watch manuscript"}},
                        {"id": "index", "entry": True, "subagent": {"prompt": "Index manuscript"}},
                    ],
                    "transitions": [],
                })
                resident_poll = asyncio.Event()
                retired_poll = asyncio.Event()
                deleted = []

                async def host(kind, data):
                    if kind == "rlm.run":
                        return {"rlm_child_id": data["prompt"], "name": data["kwargs"]["name"],
                                "session_dir": str(self.directory), "model": "fake"}
                    if kind == "rlm.collect":
                        child, = data["targets"]
                        if child == "Watch manuscript":
                            resident_poll.set()
                            try:
                                await asyncio.Future()
                            finally:
                                retired_poll.set()
                        await resident_poll.wait()
                        return {"results": [{"rlm_child_id": child, "status": "error", "settled": True,
                                             "error": "index failed"}]}
                    self.assertEqual(kind, "rlm.delete_subagent")
                    deleted.append(data["target"])
                    return {"subagent": {"rlm_child_id": data["target"], "session_name": "watch",
                                         "session_dir": str(self.directory), "status": "running"}}

                with patch("rlm.host_request", side_effect=host):
                    run = (await rlm.factory.run(f"manuscript-{policy}"))["run_id"]
                    await asyncio.wait_for(retired_poll.wait(), 1)
                    failed = await rlm.factory.graph(run)
                    if failed["state"] == "running" or (policy == "fail_fast" and failed["active_nodes"]):
                        failed = await rlm.factory.watch(run, timeout=1)
                        self.assertTrue(failed["changed"])
                    self.assertEqual(failed["state"], "error")
                    self.assertIn("index failed", failed["error"])
                    if policy == "fail_fast":
                        self.assertEqual(failed["active_nodes"], [])
                        self.assertEqual(deleted, ["Watch manuscript"])
                    else:
                        self.assertEqual(failed["active_nodes"], ["watch"])
                        self.assertEqual(deleted, [])
                        self.assertEqual((await rlm.factory.stop(run))["state"], "stopped")
                        self.assertEqual(deleted, ["Watch manuscript"])
