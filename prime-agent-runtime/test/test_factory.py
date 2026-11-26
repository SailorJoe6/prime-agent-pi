import asyncio
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from rlm import rlm


class FactoryTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
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
            spec = self.text_dag("limited")
            spec["run"] = {"max_children": 1}
            rlm.harness.save_factory("limited", spec)
            with self.assertRaisesRegex(ValueError, "max_children"):
                await rlm.factory.run("limited")
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
                                 "answer_text": answer}]}

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
                results[other].set_result({"status": "done", "settled": True, "answer_text": "blue"})
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
            self.assertEqual(snap["nodes"], [{"state_id": "produce", "status": "cancelled", "rlm_child_id": first}])
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
            self.assertEqual((snap["run_id"], snap["state"], snap["nodes"]), (run_id, "stopped", []))
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
                    replies[child].set_result({"status": "done", "settled": True, "answer_text": answer})

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

    async def test_papi_13_declared_ports_bind_exact_final_text_and_named_json(self):
        self.settings.write_text('{"factory":{"enabled":true}}')
        spec = self.text_dag("fixture")
        producer, consumer = spec["nodes"][1], spec["nodes"][0]
        for name in ("shape", "shade"):
            producer["outputs"].append({"name": name, "type": "json"})
            consumer["inputs"].append({"name": name, "type": "json", "from": f"produce.{name}"})
        consumer["subagent"]["prompt"] = "Text: {word}\nShape: {shape}"
        rlm.harness.save_factory("fixture", spec)
        answer = ("Line one.\n  " + "notes " * 40 + '\n```json\n{"shape":"old"}\n```\n'
                  '```json\n{"shape":{"color":"red","count":2}}\n```\n'
                  '```json\n{"shade":null}\n```\n')
        for full, expected in (
            (answer, f'Text: {answer}\nShape: {{"color": "red", "count": 2}}\n\n## Inputs\n- shade: null\n'),
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
                    self.assertEqual(data.get("include_answer", False), len(prompts) == 1)
                    return {"results": [{"rlm_child_id": child, "status": "done", "settled": True,
                                         "answer_preview": '{"shape":99,"shade":99}',
                                         "answer_text": full if len(prompts) == 1 else None}]}

                with patch("rlm.host_request", side_effect=host):
                    run_id = (await rlm.factory.run("fixture"))["run_id"]
                    async with asyncio.timeout(3):
                        snapshot = await rlm.factory.watch(run_id, timeout=2)
                if expected is None:
                    self.assertEqual(len(prompts), 1)
                    self.assertEqual(snapshot["state"], "error")
                    self.assertIn("produce.shade" if full else "produce.word", snapshot["error"])
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
            "run": {"max_transitions": 1},
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
                                 "answer_text": answers[len(prompts) - 1]}]}

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
            "run": {"max_transitions": 3, "max_children": 3},
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
                                 "answer_preview": "not the settled output", "answer_text": answers.pop(child)}]}

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
