# Factory definition validation

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
This validation layer does not provide harness storage, a library CLI, or a
run API.
