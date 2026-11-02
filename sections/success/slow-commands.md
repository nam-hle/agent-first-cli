---
id: slow-commands
category: Effects
max: 5
---
# A slow command returns an id and a state

Practice 4.5 in the [guide](../../README.md).

### One paragraph explainer

A command that can take minutes returns at once with an `id`, a `state` (`queued`, `running`,
`succeeded`, `failed`, `cancelled`) and a `next` that resumes it. `--wait` blocks until a final
state. `--wait --timeout <duration>` that runs out exits as transient (7) with `state: running`: the
job continues, and that is not a failure. An agent has a call budget and no patience to spend, so
it needs a handle it can come back to, and an exit code that says "still going", not "broken".

### Do

```sh
$ acme build start main --json
{ "id": 7, "state": "queued", "next": ["acme build view 7 --wait --timeout 10m"] }

$ acme build view 7 --wait --timeout 10m --json      # exit 7 after ten minutes
{ "id": 7, "state": "running", "next": ["acme build view 7 --wait --timeout 10m"] }

$ acme build view 7 --wait --json                    # exit 0
{ "id": 7, "state": "succeeded", "next": ["acme build log 7"] }
```

### Don't

```text
(no output for eleven minutes, then exit 1 "timed out", the job still running)
```

### What goes wrong

An agent starts a build, and the tool blocks with no output. The harness kills the call at ten
minutes. The agent sees a failure, assumes nothing started, and runs the start command again. Now
two builds run against the same branch, and the first one's result is never read. Had the first call
returned an id at once, the agent would have waited on the id, not repeated the work.

### Edge cases and trade-offs

- Exit codes follow [../errors/exit-code-classes.md](../errors/exit-code-classes.md): a timeout is
  7,
  a final `failed` state is 1 or the class of its cause, `cancelled` is 8. A running job at timeout
  must never exit 1.
- The timeout ends the wait, never the job. Say so in the help text. Stopping the job is a separate
  verb from the closed set, see [../names/closed-verb-set.md](../names/closed-verb-set.md).
- Blocking by default is simpler, so why not? Because the caller's limit is unknown to the tool.
  Returning the handle at once is always safe; `--wait` is the opt-in.
- Starting twice: where a repeat could start a second job, make it return the existing one or
  refuse, see [../writes/repeat-is-unchanged.md](../writes/repeat-is-unchanged.md) and
  [../writes/parallel-writes.md](../writes/parallel-writes.md).
- Progress lines while waiting go to stderr only, see
  [../output/stdout-stderr.md](../output/stdout-stderr.md); stdout stays one JSON object at the end.
- The resume command in `next` follows [4.2](next-as-data.md).
- The `state` values are an enum; list them in the declared fields,
  [../output/declared-json-fields.md](../output/declared-json-fields.md).

### How to check it

A test starts a job against a fake service that takes longer than the timeout, asserts exit 7 with
`state: running`, then waits again on the same id and expects a final state.

```ts
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";

const run = (...argv: string[]) =>
  spawnSync("node", ["dist/acme.js", ...argv, "--json"], { encoding: "utf8" });

test("a timeout is transient and the job continues", () => {
  const started = JSON.parse(run("build", "start", "main").stdout);
  const waited = run("build", "view", String(started.id), "--wait", "--timeout", "1s");
  expect(waited.status).toBe(7);
  expect(JSON.parse(waited.stdout).state).toBe("running");

  const again = run("build", "view", String(started.id), "--wait", "--timeout", "1m");
  expect(again.status).toBe(0);
  expect(["succeeded", "failed", "cancelled"]).toContain(JSON.parse(again.stdout).state);
});
```

### How to score

Maximum: 5 points. A blocked call is killed and repeated, which duplicates the job.

A slow command is a starter: one that starts or waits on work that can outlive the call (job
starters, triggers, deploys, long-running operations) or whose docs describe an asynchronous
result. A command is a starter only if its help says it starts or queues work that outlives the
call; a flag that merely asks the server to merge or act later (an auto flag) is not a starter
unless help says it returns before completion. A read that is merely slow while it returns its
result is not a starter and never has
violation A (bounded output is [2.5](../output/bounded-lists.md)). Without a fixture, judge a
documented starter from its help and a dry-run result: a handle (id, state) is promised or it is
not. Pairing: the waiter of a starter is the command that views or waits on
its handle, and the starter itself when it accepts `--wait` or another flag that waits. A command
that blocks until a timeout or a final state is a waiter whether or not it has `--wait`; a
`--timeout` flag stands in for `--wait`. Two kinds of violation, kept exclusive by what they
judge:

- **No handle (A), judged on the starter:** without `--wait` it does not return within 10
  seconds, or its `--json` result lacks `id` or a `state` of `queued`, `running`, `succeeded`,
  `failed` or `cancelled`; where it cannot be run, its help and dry-run result promise no handle.
- **Broken wait (B), judged on the waiter:** it has no `--timeout` (with `--wait` where it has
  that flag), or `--timeout 1s` (with `--wait` where it has it) on a still-running job exits other
  than 7 or prints a `state` other than `running`. A job that finished within the second is good if
  its exit matches its final state: 0 for `succeeded`, 8 for `cancelled`, and for `failed` the exit
  class of its cause (table in 3.4), 1 only if the cause is unknown. A starter with violation A is
  not also judged on B.

The handle counts if it is any field named `id` or ending in `Id`, plus a state field; judge it
by behaviour (can the next command take it), not by the literal name. `--timeout` accepts the
tool's documented unit.

The exit codes named above (7, 8 and the class codes in 3.4) are the documented code for the
class, with the guide's table as the reference. A different number for the same class is
acceptable if the tool's own help or docs map it and it is used consistently.

The two tiers are deliberate: a CLI where every wait is broken (B only) scores half, the same as
one where a single wait in a thousand is broken.

- **0:** At least 25% of the slow commands have violation A.
- **About half (3):** Under 25% have A and at least one slow command has A or B (for example the
  start command returns `{"id":7,"state":"queued"}` but a timed-out wait exits 1).
- **Maximum (5):** No slow command has A or B.
- **Not applicable when:** the tool has no starter (no command as defined above).
- **Evidence:** `timeout 15 acme <start command> --json 2>/dev/null` (sandbox only) and read `id`
  and `state`; then `acme <view command> <id> --wait --timeout 1s --json 2>/dev/null` (without
  `--wait` when the waiter has only `--timeout`) and read the exit code and `state`.
