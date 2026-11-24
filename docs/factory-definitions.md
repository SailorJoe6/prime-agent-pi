# Factory definitions

## List, import, and export from the CLI

```sh
prime-agent factory list
prime-agent factory import ./shared-format/MACHINE.md
prime-agent factory export format-document --out ./copy/MACHINE.md
prime-agent help factory export
```

All three commands accept `--json`. Success prints one JSON object on standard
output: `list` returns `machines` (with name, description, version, author,
source, and path) and `warnings`; `import` and `export` return the name and
path. Errors go to standard error and return a nonzero exit status, including
with `--json`. The export target must not already exist.

The CLI uses Pi's kernel Python and the same validated `MACHINE.md` library
as the Python APIs below. It does not read saved harness definitions when
exporting or run machines. To share a stored definition, first use
`export_factory_spec` in Python.

## Validate a definition

The Python runtime can validate a factory definition without running it.
Pass the authored JSON object (as Python data) to `rlm.factory_spec.validate_factory_spec`.
An empty list means the definition passed validation. A non-empty list contains
errors to report before storing or sharing it. The call never modifies the
input, evaluates a guard, interprets a prompt, or starts an agent.

A document-formatting machine might have `outline` and `style` entry states,
then a `format` state that starts after both settle. The explicit form declares
`states` and `transitions`; a join uses `{"from": ["outline", "style"], "to": "format"}`.
Single-source transitions may carry a guard on a declared output. A loop is
allowed, with a positive `max_entries` bound on each state (default: one).
A `foreach` uses a declared JSON input and requires a `max` from 1 to 256.

The DAG form declares `nodes` instead. Explicit `depends_on` edges and the
sources of `inputs[].from` together define a node's predecessors.
`compile_factory_dag` returns `(machine, errors)` and represents each node's
effective predecessors as one transition, not one transition per edge. Use
`validate_factory_spec` for the full check, including validation of the
compiled graph. Keep the authored object for round trips, not the compiled
copy.

The schema follows [Prime Agent v0.10.0's released validator](https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/prime-agent-runtime/src/rlm/factory.py).

## Save a named definition

Use the existing `rlm.harness` store from the Python kernel:

```python
rlm.harness.save_factory("format-document", spec)
names = rlm.harness.list_factories()
reopened_spec = rlm.harness.get_factory("format-document")
```

Each call defaults to the session-local store; pass `global_=True` for the
shared global store. Names match exactly within the selected scope. A missing
name returns `None`. A valid save replaces the definition with the same name;
an invalid save raises `ValueError` without creating or replacing it. If the
atomic write fails, the error propagates and the previous definition (or its
absence) is preserved. A later harness write won't save the failed definition.
The store keeps the authored machine or DAG, not the compiled graph. Definitions share
Pi's existing harness file and are not included in the refinement prompt.

## Share and select a definition with `MACHINE.md`

Use `rlm.machine_library` to share definitions without running them:

```python
from rlm.machine_library import MachineLibrary, export_factory_spec, select_factory

library = MachineLibrary()
export_factory_spec(
    rlm.harness.get_factory("format-document"),
    "share/MACHINE.md",
    name="format-document",
    description="Outline and format a document",
)
library.import_machine("share/MACHINE.md")
spec = select_factory("format-document", rlm.harness, library=library)
```

The [released format](https://github.com/PrimeIntellect-ai/prime-agent/blob/763094e1b6a7c17450ee8399b06cda1853847ca5/.changes/feat-machine-library.md)
uses UTF-8, a `---` frontmatter block with `name` and `description`, optional
`version` and `author`, and exactly one fenced `machine-spec` JSON object.
Names are 1–64 lowercase ASCII letters, digits, or hyphens, starting and
ending with a letter or digit. A description is one non-empty line. Any prose
outside the spec is documentation, not instructions to the runtime.

Libraries contain `<directory>/MACHINE.md` files. The declared name determines
lookup, not the directory name. `PRIME_AGENT_MACHINES_DIR` points to the shared
library; without it, Python checks the runtime package's `machines/` directory.
No definitions are bundled. The personal library is
`machines/` under Pi's agent directory (`PRIME_AGENT_CODING_AGENT_DIR`, then
`PI_CODING_AGENT_DIR`, then `~/.prime/agent`). Set `shared_dir` and `personal_dir`
explicitly to work with other roots.

- `list_machines()` and `resolve_machine(name)` consider only valid definitions,
  with shared definitions winning name collisions. Within each library, a valid
  matching file reachable at `<name>/MACHINE.md` wins over another file declaring
  the same name. The filesystem determines whether alternate path spellings
  refer to that file. Selection and library export use the same rules.
  `MachineResolutionError.broken` distinguishes a broken file from a missing name.
- `import_machine(path)` validates before atomically installing the original
  bytes in the personal library. A valid import can replace a same-name copy,
  but cannot replace a valid definition at that path declaring a different name.
- `export_machine(name, path)` copies the selected library file byte for byte.
  It does not consult the harness. Both export APIs refuse existing targets.
- `select_factory(name, state)` checks the selected harness scope first, then
  falls back to the library without writing a harness entry.

These APIs do not evaluate prompts or guards, start agents, or run machines.
