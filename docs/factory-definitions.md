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
returns `{"runs": [...]}` in start order: all running, paused, or stopping runs,
any run with attached active children, and up to 20 recent terminal runs.
Pass a run ID to inspect that run, even if it has aged out of the list.

## Run a named machine from Python

With `factory.enabled` set to `true`, `run` first checks the harness and then
looks in the machine library. It does not edit either definition. This run path
accepts one-shot DAGs and explicit task machines with text and JSON ports.
Independent task entries can run together. `run.max_parallel` bounds active
children per run (default `8`; set `1` to run serially). Both DAGs and explicit
machines pause before exceeding `max_children`. Only successful admissions count,
including retries and re-entries.

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

`run` returns before the children finish. Factory outputs bind from the exact
child's settled answer preview, not its full reply or the public `rlm.collect`
preview. The factory separates text blocks, collapses whitespace to single spaces,
and limits each child's preview to 160 Unicode characters, including `...` when
truncated.
Keep structured replies short: truncation can remove a JSON port or make the
preview invalid JSON. Each JSON port uses the last fenced `json` object with
its key, or falls back to parsing the whole preview as an object. A JSON
`null` is a value. Text ports receive the preview itself. Live graph nodes
show their latest settled `answer_preview` when available; `watch(...,
compact=True)` omits it.
In an explicit machine, mark starting states with `entry: true`. A
single-source transition can test settled output, for example:

```json
{"from":"review","to":"format","when":{"output":"report","path":"accepted","op":"eq","value":true}}
```

A missing port or path does not pass a guard. A joined transition such as
`{"from":["outline","style"],"to":"format"}` waits for every source to settle
and can fire again when a source's newest settled entry changes. If an older
parallel entry finishes late, it still evaluates its own guards, but does not
replace the newer binding or cause the same join to fire again. Each state can be entered
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
fails the entry. When all items finish successfully, their available previews are joined with
blank lines in input order before declared text and JSON ports are captured.
Use fenced JSON objects for named JSON outputs from multiple item answers.

An entry can fail during input binding, child admission, or child execution.
Set `run.failure_policy` to choose what happens, or set `failure_policy` on
an individual state to override it:

- `escalate` (default): pause the run without cancelling admitted siblings.
  Resume that run by ID to process the failure and continue without replay.
- `continue`: keep processing eligible work without pausing or cancelling
  siblings. The run finishes with `state: "error"` if any entry failed.
- `fail_fast`: end the run with `state: "error"`, without starting downstream
  work, and cancel only its remaining active children.

A failed entry has no outputs. Unguarded transitions and joins can use its
settlement after `continue` or resume, but a required input from that failure
fails the dependent before admission. Optional inputs use the usual missing
value. Failed `foreach` entries do not admit more items or publish partial outputs.

Set `retries` on a state to allow extra attempts after a child settles with
an error or is cancelled. Each retry uses a fresh child and counts toward
`run.max_children`, but it uses the same rendered prompt and graph entry.
For `foreach`, only the failed item is retried. Input binding and admission
errors are not retried. Once attempts are exhausted, the entry’s failure
policy applies.

A state’s `budget_ms` measures each attempt from successful admission to
observed settlement. A successful child observed after this budget fails the
entry without publishing its answer or retrying. This is a settlement check,
not a timer that cancels the child.

A named run may use `"lifecycle": "resident"` for a state or DAG node, for
example a document watcher started after an indexing task. Residents cannot
export outputs, use `foreach`, or trigger successors. A resident counts toward
`run.max_children` and occupies a `run.max_parallel` slot while in flight.
Queued residents must be admitted before the graph can finish. If residents
hold every slot and more work is queued, the run reports an error instead of
waiting indefinitely; use `stop(run_id)` to retire those residents.

An admitted resident does not keep a graph from finishing. A finished run can
still list its residents in `graph(run_id)["active_nodes"]`. Stop that exact
run to delete them without touching another run's children. Fail-fast also
retires resident siblings. Pi uses an ordinary parent-scoped RLM child, not a
new service: it can finish its initial turn, and factory snapshots stop
tracking its turn progress when the graph finishes. This does not keep a
provider turn running, automatically restart a watcher, or persist a factory
run ID across kernel restarts.
Children are ordinary RLM children and remain visible through the existing
child APIs until deleted. An inline subagent's optional `name` is used as a
child label prefix, shortened if needed to fit the host limit. The runner adds
run and admission suffixes so repeated or overlapping runs have distinct names;
run controls still target exact child IDs.

### Inspect and control the current session in Pi

The factory is off by default. Enter `/factory on` in terminal chat to enable
it, and `/factory status` to check. Pi and Python use the same `factory.enabled`
flag in the agent's `settings.json`. On a supported client and runtime, the
setting takes effect without a restart. A relative SDK `agentDir` resolves
against the host working directory, not the kernel’s session directory.

When enabled, enter `/factory` to open the page. It shows the selected live run,
its state, and its diagram, with active states marked `*`. An unnamed run
uses the factory spec ID as its label. The selection follows
the run ID as runs update. With the default picker bindings, Up/Down changes the
selection, Page Up/Page Down scrolls the diagram, Enter opens the run actions
or confirms one, and Esc backs out of actions or returns to chat. The page
shows the configured keys if you remapped them.

Choose Stop to stop the selected live run, or Resume to continue the selected
paused run. If the run changes before confirmation, Pi rechecks the selected
action instead of applying it to another run. The page uses the current
session’s already-running Python kernel and does not start a kernel just to
inspect it. It distinguishes no live runs from no kernel, an older runtime,
and an unavailable read. Ordinary session navigation is unchanged.

Enter `/factory off` to disable it. Pi leaves the setting unchanged if the
current session reports any live run (including a paused run or one with active
children), or if its liveness cannot be verified. Stop live runs first and
wait for them to settle. A session known to have no kernel can disable the
factory without starting one.

### Watch, resume, or stop one run

```python
run_id = started["run_id"]
update = await rlm.factory.watch(run_id, timeout=5)
print(update["changed"], update["state"], update["active_nodes"])
# If you decide to interrupt this run:
result = await rlm.factory.stop(run_id)
print(result["state"], result["cancelled"])
```

`status(run_id)`, `graph(run_id)`, and `watch(run_id)` show per-state nodes,
including pending states whose required sources never settled. They also include
`active_children` (exact child IDs grouped by state) and `queued` (counts by
state). A ready entry counts as one until expanded; after `foreach` expands,
each waiting item counts separately. An admission in flight remains queued
until its handle is known. Successors that have not been scheduled do not
count. `children` still reports only the latest admitted ID per state and may
include a settled child; use `active_children` for current ownership.

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
This counts actual child admissions in both DAGs and explicit machines, not the
number of states in a definition. After resume, a refused admission does not
trigger another child-limit pause. `run.budget_ms` measures wall time from run
start. If the executor observes that the budget has been exceeded while work
remains, it pauses that run once with `pause_reason: "run budget exceeded"`.
Budget checks happen before admissions and between collect waits; they do not
interrupt an in-flight host call.
Children already in flight may finish while the run is paused. Resume
authorizes that run to continue past the reported limit; it does not
raise a state's `max_entries`. You can also stop a paused run. Stopping is
terminal, and `resume` rejects any run that is not paused.
