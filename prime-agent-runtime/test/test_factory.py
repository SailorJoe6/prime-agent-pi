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
