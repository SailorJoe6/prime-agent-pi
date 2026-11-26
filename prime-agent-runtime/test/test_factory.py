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
            for key in ("max_children", "max_transitions"):
                spec = self.text_dag("limited")
                spec["nodes"].append({"id": "third", "depends_on": ["consume"], "subagent": {"prompt": "Third"}})
                spec["run"] = {key: 1}
                rlm.harness.save_factory("limited", spec)
                with self.assertRaisesRegex(ValueError, key):
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
                                 "answer_preview": answer}]}

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
