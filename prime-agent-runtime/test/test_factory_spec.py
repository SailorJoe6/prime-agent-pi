import copy
import unittest

from rlm.factory_spec import compile_factory_dag, validate_factory_machine, validate_factory_spec


def formatting_dag():
    return {"nodes": [
        {"id": "outline", "subagent": {"prompt": "Outline the document."},
         "outputs": [{"name": "sections", "type": "json"}]},
        {"id": "style", "subagent": {"prompt": "Summarize the style guide."}},
        {"id": "format", "subagent": {"prompt": "Format each section."}, "depends_on": ["style"],
         "inputs": [{"name": "sections", "type": "json", "from": "outline.sections"}],
         "foreach": {"over": "sections", "max": 16}},
    ]}


def formatting_machine():
    dag = formatting_dag()
    states = [dict(node, entry=i < 2) for i, node in enumerate(dag["nodes"])]
    states[2].pop("depends_on")
    states[2]["max_entries"] = 2
    states[2]["outputs"] = [{"name": "review", "type": "json"}]
    return {"states": states, "transitions": [
        {"from": ["style", "outline"], "to": "format"},
        {"from": "format", "to": "format",
         "when": {"output": "review", "path": "needs_revision", "op": "eq", "value": True}},
    ]}


class FactorySpecTests(unittest.TestCase):
    def test_papi_12_validation_preserves_authored_machine(self):
        spec = formatting_machine()
        snapshot = copy.deepcopy(spec)
        self.assertEqual(validate_factory_spec(spec), [])
        self.assertEqual(spec, snapshot)

    def test_papi_12_dag_compiles_effective_predecessors_into_one_join(self):
        dag = formatting_dag()
        snapshot = copy.deepcopy(dag)
        machine, errors = compile_factory_dag(dag)
        self.assertEqual(errors, [])
        self.assertEqual(machine["transitions"], [{"from": ["style", "outline"], "to": "format"}])
        self.assertEqual([state["entry"] for state in machine["states"]], [True, True, False])
        self.assertEqual([state["max_entries"] for state in machine["states"]], [1, 1, 1])
        self.assertEqual(validate_factory_machine(machine), [])
        machine["states"][0]["subagent"]["prompt"] = "Revised outline."
        self.assertEqual(dag, snapshot)
        self.assertEqual(validate_factory_spec(dag), [])

    def test_papi_12_rejects_bad_machine_fields(self):
        cases = [
            ("state slug", "states", 1, {"id": "Bad ID"}, "id must match"),
            ("duplicate state", "states", 1, {"id": "outline"}, "duplicates state id"),
            ("bad bound", "states", 2, {"max_entries": True}, "max_entries"),
            ("unbounded fan-out", "states", 2, {"foreach": {"over": "sections", "max": 257}}, "foreach.max"),
            ("wait", "states", 2, {"wait": {}}, "wait states require"),
            ("unknown destination", "transitions", 0, {"to": "missing"}, "unknown to-state"),
            ("unknown source", "transitions", 0, {"from": ["style", "missing"]}, "unknown from-state"),
            ("malformed source", "transitions", 0, {"from": ["style", {}]}, "state id strings"),
            ("guard on join", "transitions", 0, {"when": {}}, "cannot carry a when guard"),
            ("unknown output", "transitions", 1, {"when": {"output": "missing", "op": "exists"}},
             "not a declared output"),
            ("nonfinite guard", "transitions", 1,
             {"when": {"output": "review", "op": "contains", "value": [{"score": float("nan")}]}},
             "finite JSON data"),
        ]
        for case, key, index, changes, diagnostic in cases:
            with self.subTest(case=case):
                spec = formatting_machine()
                spec[key][index].update(changes)
                self.assertIn(diagnostic, "\n".join(validate_factory_spec(spec)))

    def test_papi_12_rejects_bad_dag_references(self):
        cases = [
            ({"depends_on": ["missing"]}, "unknown node"),
            ({"inputs": [{"name": "sections", "type": "json", "from": "missing.sections"}]}, "unknown node"),
            ({"inputs": [{"name": "sections", "type": "json", "from": "outline.missing"}]}, "does not declare"),
            ({"depends_on": ["format"]}, "cannot depend on itself"),
        ]
        for changes, diagnostic in cases:
            with self.subTest(changes=changes):
                dag = formatting_dag()
                dag["nodes"][2].update(changes)
                machine, errors = compile_factory_dag(dag)
                self.assertIsNone(machine)
                self.assertIn(diagnostic, "\n".join(errors))
                self.assertIn(diagnostic, "\n".join(validate_factory_spec(dag)))

    def test_papi_12_rejects_mixed_forms_and_invalid_compiled_machine(self):
        self.assertTrue(validate_factory_spec({**formatting_machine(), **formatting_dag()}))
        dag = formatting_dag()
        # Both roots now depend on the format node, leaving no entry state.
        for node in dag["nodes"][:2]:
            node["depends_on"] = ["format"]
        self.assertIn("at least one entry state", "\n".join(validate_factory_spec(dag)))
