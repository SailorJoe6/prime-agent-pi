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
source, and path) and `warnings` (one per broken file path). The CLI labels
shared sources `repo` and personal sources `user`. `import` returns the name,
path, and `created` (`true` for a first install, `false` for a replacement).
`export` returns the name and path with `source: "library"`. In text mode, list
warnings go to standard error. Errors go to standard error and return a nonzero
exit status, including with `--json`. The export target must not already exist.

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

## Preview a saved machine from Python

`rlm.factory.help()` works without opting in. To preview a saved definition,
merge `{"factory": {"enabled": true}}` into your agent directory's
`settings.json`. Use the JSON boolean `true`; missing, invalid, or unreadable
settings leave previews disabled. This setting does not gate the existing
save, list, import, or export commands.

```python
rlm.harness.save_factory("format-document", {
    "nodes": [{"id": "format", "subagent": {"prompt": "Format the example text."}}],
})
snapshot = await rlm.factory.graph("format-document")
print(snapshot["machine"]["order"])
```

The preview includes the declared state order, transitions, and run limits.
It does not start children or edit the definition. Like the released v0.10.0
static graph, it looks up saved harness definitions; a library file must first
be saved as a harness definition to preview it here. `await rlm.factory.graph()`
returns an empty run list. Pass a run ID to `graph` to inspect that run instead.

## Run a named machine from Python

With `factory.enabled` set to `true`, `run` first checks the harness and then
looks in the machine library. It does not edit either definition. This run path
accepts one-shot DAGs and explicit task machines with text and JSON ports.
Independent task entries can run together. `run.max_parallel` bounds active
children per run (default `8`; set `1` to run serially). A DAG with more nodes than `max_children`
is rejected before launch. An explicit machine counts actual child admissions,
including re-entries, against `max_children`.

```python
rlm.harness.save_factory("color-label", {"nodes": [
    {"id": "pick", "subagent": {"prompt": "Reply with a single color word."},
     "outputs": [{"name": "color", "type": "text"}]},
    {"id": "label", "subagent": {"prompt": "Write a short label for {color}."},
     "inputs": [{"name": "color", "type": "text", "from": "pick.color"}]},
]})
started = await rlm.factory.run("color-label")
# In a later Python cell, inspect this run without waiting for it:
snapshot = await rlm.factory.status(started["run_id"])
print(snapshot["state"], snapshot["children"])
```

`run` returns before the children finish. Each text output receives the full
text of the exact child's final assistant message, including line breaks.
For JSON outputs, tell the child to return an object keyed by the declared port
names. Each port uses the last fenced `json` object containing its key, or
falls back to an object returned as the whole answer. A JSON `null` is a value.
A missing required output or child failure ends the run with an error and
cancels remaining active work in that run. Answers
larger than 256 KiB are unavailable for binding; they are never truncated.
In an explicit machine, mark starting states with `entry: true`. A
single-source transition can test settled output, for example:

```json
{"from":"review","to":"format","when":{"output":"report","path":"accepted","op":"eq","value":true}}
```

A missing port or path does not pass a guard. A joined transition such as
`{"from":["outline","style"],"to":"format"}` waits for every source to settle
and can fire again when a source settles a new entry. Each state can be entered
up to its `max_entries` (default `1`), including its initial entry. Transitions
to a state at its limit do not queue another child. Each entry binds from the
latest settled outputs of its input sources. If that settle omitted a port,
an earlier value is not reused. `status` shows the latest child ID per state;
`graph` and `watch` show recent fired edges in `last_fired`, newest first.

To index several chapters, have one state emit a JSON array and bind that
output to an input named `chapter`. On the indexing state, set
`"foreach": {"over": "chapter", "max": 8}` and use `{chapter}` in its prompt.
The runner starts one child per item, up to the first eight in this example.
Each child counts toward `run.max_children` and shares the run's parallel
limit. An empty array settles with no children or outputs. A non-array value
fails the run. When all items finish, their available answers are joined with
blank lines in input order before declared text and JSON ports are captured.
Use fenced JSON objects for named JSON outputs from multiple item answers.

Resident states, retries, time budgets, and non-fail-fast failure policies
are not supported. Run records are kernel-local
and do not survive a restart.
Children are ordinary RLM children and remain visible through the existing
child APIs until deleted.

### Watch, resume, or stop one run

```python
run_id = started["run_id"]
update = await rlm.factory.watch(run_id, timeout=5)
print(update["changed"], update["state"], update["active_nodes"])
# If you decide to interrupt this run:
result = await rlm.factory.stop(run_id)
print(result["state"], result["cancelled"])
```

`watch` returns the same live graph as `graph(run_id)`, plus `changed`. It wakes
for a change to the selected run, not for another run's progress. `timeout`
is in seconds, defaults to zero (snapshot without waiting), and is capped at
60. If nothing changes before the timeout, `changed` is false.

`stop` prevents new states from starting in the selected run and asks the
existing child API to delete its active children by exact ID. It does not delete
children already observed to be settled or touch another run. A stop requested
while child admission is in flight waits for that admission before acting. Stop
accounts for observed settlements before deleting any remaining children. Look for
`stopped` in the result. If the stop fails, `status` reports the error.

If firing the next transition would exceed `run.max_transitions`, the run
pauses before starting the next child. `status`, `graph`, and `watch` report
`state: "paused"` and `pause_reason: "max_transitions exceeded"`. Call
`await rlm.factory.resume(run_id)` to authorize that run to continue past the
limit. It keeps settled outputs and does not restart completed states. This
transition limit pauses a run at most once. A run can also pause
once before exceeding `run.max_children`, with `pause_reason: "max_children exceeded"`.
Children already in flight may finish while the run is paused. Resume
authorizes that run to continue past the reported limit; it does not
raise a state's `max_entries`. You can also stop a paused run. Stopping is
terminal, and `resume` rejects any run that is not paused.
