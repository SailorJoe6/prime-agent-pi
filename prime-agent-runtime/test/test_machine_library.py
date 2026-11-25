import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from rlm.harness import HarnessState
from rlm.machine_library import MachineLibrary, MachineResolutionError, export_factory_spec, select_factory


NAME = "format-document"


def formatting(prompt="Apply the document style."):
    return {
        "states": [
            {"id": "outline", "entry": True, "subagent": {"prompt": "Outline the document."}},
            {"id": "format", "subagent": {"prompt": prompt}},
        ],
        "transitions": [{"from": "outline", "to": "format"}],
    }


def document(spec, name=NAME):
    text = (
        f"---\nname: {name}\ndescription: \"Format: résumé\"\nversion: 1\nauthor: 'Editor''s desk'\n---\n"
        "\n# Formatting guide\n\n```text\nAn unrelated example.\n```\n\n"
        f"```machine-spec\n{json.dumps(spec)}\n```\n"
    )
    return b"\xef\xbb\xbf" + text.replace("\n", "\r\n").encode("utf-8")


class MachineLibraryTest(unittest.TestCase):
    def setUp(self):
        temp = self.enterContext(tempfile.TemporaryDirectory())
        self.root = Path(temp).resolve()
        self.shared = self.root / "shared"
        self.personal = self.root / "personal"
        self.library = MachineLibrary(shared_dir=self.shared, personal_dir=self.personal)
        self.state_path = self.root / "harness.json"

    def file(self, path, content):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def test_papi_12_formatting_round_trip_preserves_graph_and_library_bytes(self):
        state = HarnessState(self.state_path)
        state.save_factory(NAME, formatting())
        stored = HarnessState(self.state_path).get_factory(NAME)
        out = export_factory_spec(stored, self.root / "share.md", name=NAME, description="Format: résumé")
        dest = self.library.import_machine(out)
        self.assertEqual(dest, self.personal / NAME / "MACHINE.md")
        self.assertEqual(dest.read_bytes(), out.read_bytes())
        self.assertEqual(self.library.resolve_machine(NAME).machine.spec, formatting())

        raw = document(formatting("Format as a memo."))
        hand_authored = self.file(self.root / "hand-authored.md", raw)
        self.assertEqual(self.library.import_machine(hand_authored), dest)
        self.assertEqual(dest.read_bytes(), raw)
        self.assertEqual(self.library.resolve_machine(NAME).machine.author, "Editor's desk")
        exported = self.library.export_machine(NAME, self.root / "exported.md")
        self.assertEqual(exported.read_bytes(), raw)
        for export in (
            lambda: self.library.export_machine(NAME, out),
            lambda: export_factory_spec(stored, out, name=NAME, description="Another description"),
        ):
            with self.subTest(export=export):
                before = out.read_bytes()
                with self.assertRaises(FileExistsError):
                    export()
                self.assertEqual(out.read_bytes(), before)

    def test_papi_12_rejects_machine_and_dag_reference_before_writing(self):
        invalid_machine = formatting()
        invalid_machine["transitions"][0]["to"] = "missing"
        invalid_dag = {"nodes": [{"id": "format", "subagent": {"prompt": "Format."}, "depends_on": ["missing"]}]}
        out = self.root / "exports" / "bad.md"
        for spec in (invalid_machine, invalid_dag):
            with self.subTest(spec=spec):
                source = self.file(self.root / "bad.md", document(spec))
                with self.assertRaisesRegex(ValueError, "missing"):
                    self.library.import_machine(source)
                self.assertFalse(self.personal.exists())
                with self.assertRaisesRegex(ValueError, "missing"):
                    export_factory_spec(spec, out, name=NAME, description="Format documents")
                self.assertFalse(out.parent.exists())
        initial = document(formatting())
        dest = self.library.import_machine(self.file(self.root / "valid.md", initial))
        for spec in (invalid_machine, invalid_dag):
            with self.subTest(replacement=spec):
                source = self.file(self.root / "bad.md", document(spec))
                with self.assertRaisesRegex(ValueError, "missing"):
                    self.library.import_machine(source)
                self.assertEqual(dest.read_bytes(), initial)
        self.assertFalse(self.state_path.exists())

    def test_papi_12_strict_file_format(self):
        valid = document(formatting())
        start = valid.index(b"```machine-spec")
        for raw, error in (
            (valid[start:], "frontmatter"),
            (valid.replace(b"version: 1", b"name: another"), "frontmatter"),
            (valid.replace(b"version: 1", b"unknown: field"), "frontmatter"),
            (valid.replace(NAME.encode(), b"../format"), "invalid machine name"),
            (valid[:start], "found none"),
            (valid + valid[start:], "more than one"),
            (valid[:-5], "not closed"),
            (valid[:start] + b"```machine-spec\r\n[]\r\n```\r\n", "JSON object"),
            (valid[:start] + b"```machine-spec\r\nNaN\r\n```\r\n", "JSON object"),
        ):
            with self.subTest(error=error, raw=raw):
                with self.assertRaisesRegex(ValueError, error):
                    self.library.import_machine(self.file(self.root / "bad.md", raw))
                self.assertFalse(self.personal.exists())

    def test_papi_12_declared_name_shared_precedence_and_broken_diagnostics(self):
        shared_doc = document(formatting("Use the shared style."))
        shared_path = self.file(self.shared / "other-directory" / "MACHINE.md", shared_doc)
        personal_path = self.file(self.personal / NAME / "MACHINE.md", document(formatting()))
        self.assertEqual([entry.path for entry in self.library.list_machines()], [shared_path])
        self.assertEqual(self.library.resolve_machine(NAME).path, shared_path)
        with self.assertRaises(MachineResolutionError) as missing:
            self.library.resolve_machine("other-directory")
        self.assertFalse(missing.exception.broken)

        invalid = formatting()
        invalid["transitions"][0]["to"] = "missing"
        shared_path.write_bytes(document(invalid))
        self.assertEqual([entry.path for entry in self.library.list_machines()], [personal_path])
        self.assertEqual(self.library.resolve_machine(NAME).path, personal_path)
        personal_path.unlink()
        self.assertEqual(self.library.list_machines(), [])
        with self.assertRaises(MachineResolutionError) as broken:
            self.library.resolve_machine(NAME)
        self.assertTrue(broken.exception.broken)
        self.assertIn(str(shared_path), str(broken.exception))
        self.assertIn("missing", str(broken.exception))

    def test_papi_12_canonical_update_wins_within_each_library(self):
        state = HarnessState(self.state_path)
        draft_spec = formatting("Use the draft style.")
        draft = document(draft_spec)
        update = formatting("Format as a memo.")
        updated_bytes = document(update)
        source = self.file(self.root / "update.md", updated_bytes)
        personal_draft = self.file(self.personal / "a-draft" / "MACHINE.md", draft)
        personal_path = self.file(self.personal / NAME / "MACHINE.md", document(formatting()))
        self.assertEqual(self.library.import_machine(source), personal_path)

        def assert_winner(path, spec, raw, output):
            self.assertEqual([entry.path for entry in self.library.list_machines()], [path])
            self.assertEqual(select_factory(NAME, state, library=self.library), spec)
            self.assertEqual(self.library.export_machine(NAME, self.root / output).read_bytes(), raw)

        assert_winner(personal_path, update, updated_bytes, "personal.md")
        self.assertEqual(personal_draft.read_bytes(), draft)

        shared_spec = formatting("Use the shared style.")
        shared_bytes = document(shared_spec)
        shared_draft = self.file(self.shared / "a-draft" / "MACHINE.md", draft)
        shared_path = self.file(self.shared / NAME / "MACHINE.md", shared_bytes)
        assert_winner(shared_path, shared_spec, shared_bytes, "shared.md")

        invalid = formatting()
        invalid["transitions"][0]["to"] = "missing"
        shared_path.write_bytes(document(invalid))
        assert_winner(shared_draft, draft_spec, draft, "fallback.md")
        self.assertFalse(self.state_path.exists())

    def test_papi_12_import_uses_filesystem_canonical_lookup(self):
        draft_bytes = document(formatting("Use the draft style."))
        draft = self.file(self.personal / "a-draft" / "MACHINE.md", draft_bytes)
        old_bytes = document(formatting("Use the old style."))
        mixed = self.file(self.personal / "format-Document" / "MACHINE.md", old_bytes)
        canonical = self.personal / NAME / "MACHINE.md"
        aliases_canonical = canonical.is_file()
        spec = formatting("Format as a memo.")
        raw = document(spec)
        source = self.file(self.root / "update.md", raw)
        state = HarnessState(self.state_path)

        self.assertEqual(self.library.import_machine(source), canonical)
        self.assertEqual(canonical.read_bytes(), raw)
        [entry] = self.library.list_machines()
        self.assertTrue(entry.path.samefile(canonical))
        self.assertEqual(entry.machine.spec, spec)
        self.assertEqual(select_factory(NAME, state, library=self.library), spec)
        self.assertEqual(self.library.export_machine(NAME, self.root / "copy.md").read_bytes(), raw)
        self.assertEqual(draft.read_bytes(), draft_bytes)
        self.assertEqual(mixed.read_bytes(), raw if aliases_canonical else old_bytes)
        self.assertFalse(self.state_path.exists())

        # With no valid canonical file, a distinct mixed-case directory is an ordinary fallback.
        canonical.write_bytes(b"not a machine")
        self.assertEqual(self.library.resolve_machine(NAME).path, draft)

    def test_papi_12_import_preserves_valid_different_name_at_destination(self):
        other_name = "format-letter"
        original = document(formatting("Format as a letter."), name=other_name)
        destination = self.file(self.personal / NAME / "MACHINE.md", original)
        source = self.file(self.root / "incoming.md", document(formatting("Format as a memo.")))

        with self.assertRaisesRegex(ValueError, other_name):
            self.library.import_machine(source)
        self.assertEqual(destination.read_bytes(), original)
        self.assertEqual(self.library.resolve_machine(other_name).path, destination)

    def test_papi_12_stored_selection_wins_but_export_is_library_only(self):
        state = HarnessState(self.state_path)
        self.file(self.shared / NAME / "MACHINE.md", document(formatting()))
        fallback = select_factory(NAME, state, library=self.library)
        self.assertEqual(fallback, formatting())
        self.assertEqual(state.list_factories(), [])
        self.assertFalse(self.state_path.exists())

        state.save_factory(NAME, formatting("Format as a memo."))
        state.save_factory("format-only-stored", formatting("Format as a letter."))
        before = self.state_path.read_bytes()
        self.assertEqual(select_factory(NAME, state, library=self.library), formatting("Format as a memo."))
        export = self.library.export_machine(NAME, self.root / "exported.md")
        self.assertEqual(export.read_bytes(), document(formatting()))
        with self.assertRaises(MachineResolutionError):
            self.library.export_machine("format-only-stored", self.root / "absent.md")
        self.assertFalse((self.root / "absent.md").exists())
        self.assertEqual(self.state_path.read_bytes(), before)

    def test_papi_12_default_roots_honor_shared_and_pi_agent_dir_overrides(self):
        for prime_agent_dir in ("", str(self.root / "prime")):
            with self.subTest(prime_agent_dir=prime_agent_dir), patch.dict(os.environ, {
                "PRIME_AGENT_MACHINES_DIR": str(self.shared),
                "PRIME_AGENT_CODING_AGENT_DIR": prime_agent_dir,
                "PI_CODING_AGENT_DIR": str(self.root / "pi"),
            }):
                lib = MachineLibrary()
                expected = self.root / ("prime" if prime_agent_dir else "pi") / "machines"
                self.assertEqual(lib.shared_dir, self.shared)
                self.assertEqual(lib.personal_dir, expected)
                source = self.file(self.root / "source.md", document(formatting()))
                self.assertEqual(lib.import_machine(source), expected / NAME / "MACHINE.md")
