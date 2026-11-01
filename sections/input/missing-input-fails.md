---
id: missing-input-fails
category: Input
max: 8
---
# A missing input fails naming the flag; nothing prompts without a terminal

Practice 5.1 in the [guide](../../README.md).

### One paragraph explainer

A required input that is missing fails with "Pass --title" and a non-zero exit. Without a TTY, or
under `--no-input`, nothing prompts. A prompt is a convenience for a person at a terminal and is
never the only path to a value. An agent caller has no one to type an answer: a prompt that waits is
a hang, and the run it belongs to stalls with no output to explain why. The failure is a usage error
in the [3.1](../errors/error-envelope.md) envelope, exit class 2
([3.4](../errors/exit-code-classes.md)), and `context` names the flag
([3.3](../errors/context-names-input.md)).

### Do

```text
$ acme ticket create --no-input                     (exit 2, envelope on stderr)
{ "code": "VALIDATION_ERROR", "context": { "field": "--title" }, "hint": "Pass --title" }
```

The hint is a command the agent can run, built the way [3.2](../errors/runnable-hints.md) asks:

```sh
acme ticket create --title "Fix login" --no-input
```

### Don't

```text
$ acme ticket create
Title: _                                            (waits with no TTY)
```

### What goes wrong

An agent runs `acme ticket create --project ACME` in a sandbox with stdin attached to nothing. The
tool prints `Title: ` to stdout and blocks on a read that never completes. The agent's shell tool
hits its timeout after several minutes and reports "command timed out" with no output the agent can
use. The agent cannot tell whether the tool hung, crashed or was slow, so it retries the same call
and burns the same timeout again. A usage error naming `--title` would have cost one round trip.

### Edge cases and trade-offs

- **"Prompts are friendlier for people."** Keep them, but gate them: prompt only when stdin and
  stdout are a TTY and `--no-input` is absent. A person still gets the form; an agent never meets
  it. The prompt must collect exactly the values the flags accept, so no input is prompt-only.
- **Confirmation prompts count too.** "Are you sure?" blocks as hard as "Title:". Writes use
  `--confirm` and `--dry-run` instead ([6.2](../writes/confirm.md), [6.1](../writes/dry-run.md)),
  and never a yes/force flag that skips the check ([6.4](../writes/no-yes-or-force.md)).
- **Detecting a TTY is not enough.** Some agent harnesses allocate a pseudo-terminal, so the tool
  sees a TTY and prompts. Honour `--no-input` and document it in help as the way to be sure. Where
  the tool can, also treat a closed or empty stdin as "no input".
- **Several inputs missing.** Name the first, or list them all in `context.missing`. Listing all
  saves round trips and costs nothing; do not make the agent fix them one at a time.
- **An input with a sensible default.** Then it is not required. State the default in help
  instead of prompting for it.
- **Wrong, not missing.** A value that is present but invalid is a different failure with its own
  shape: see [5.3](enums-refuse-typos.md) for choice flags and
  [3.6](../errors/parse-failures.md) for values that do not parse.

### How to check it

Walk the command tree, run every command with no arguments, a closed stdin and `--no-input`, and
assert it exits within a timeout with an envelope that names a flag or a positional.

```ts
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";

const leaves: string[][] = JSON.parse(
  spawnSync("acme", ["schema", "--json"], { encoding: "utf8" }).stdout,
).commands.map((c: { path: string[] }) => c.path);

test.each(leaves)("%j fails fast without input", (...path) => {
  const run = spawnSync("acme", [...path, "--no-input"], {
    encoding: "utf8",
    input: "",
    timeout: 5000,
  });
  expect(run.error).toBeUndefined();           // no timeout, so no prompt
  if (run.status === 0) return;                // a command with no required input
  expect(run.status).toBe(2);
  const envelope = JSON.parse(run.stderr);
  expect(envelope.context.field ?? envelope.context.missing).toBeDefined();
});
```

### How to score

Maximum: 8 points. A hang stalls a whole agent run with no output, and any command can have it.

Sample the first 30 leaf commands by sorted path plus every write. Run each read with no
arguments, stdin closed and `--no-input`. A write is probed only through its dry-run form (the
entry page's [parse-only probe](../../benchmark/README.md#parse-only)) with the required input
omitted; an invalid-flag probe is not a missing-input probe, and a write with no dry-run form is
"not exercised" for this practice (not counted, not a violation). Hangs are judged on reads only.
A command needs input when its help marks a required flag or positional, or when its
argument-less probe in the sandbox hangs or fails with a usage error. A command that succeeds
with no input and marks nothing required is not counted. A read that times out while still
producing output is a slow read: not counted, neither a hang nor a weak failure. Count the rest.

**Fixed probe list.** The probe set is the sample of the entry page (first 30 leaf commands by
sorted path plus every write up to 30), never a set the scorer picks. Run exactly:

1. Each sampled read: `<tool> <read-command> --no-input < /dev/null` under `timeout 5`, in the
   empty temporary working directory.
2. Each sampled write: `<tool> <write-command> --dry-run --no-input < /dev/null` with the required
   input omitted, under `timeout 5`. A write with no dry-run form is "not run".

A probe that cannot run (no sandbox, or it would need a real write) is listed as "not run". Not-run
commands are not measurable: they count neither as pass nor as fail, and they leave the probed
count N. If N is 0 the practice is not measurable (see the entry page's
[not measurable](../../benchmark/README.md#not-measurable) rule).

**Pass rule, stated as counts.** Let N be the probed commands that need input, and F the probed
commands that violate (hang or weak failure). Max when F = 0. Half when F >= 1 and F x 4 < N (fewer
than 25% fail). 0 when F x 4 >= N (25% or more fail). The 25% boundary belongs to 0. With N < 4,
use the small-sample rule: 0 only if F = N, half if 0 < F < N. Example: of 12 probed commands, 0
fail is max, 1 or 2 fail is half, 3 or more fail is 0.

Two kinds of violation:

- **Hang (reads):** the read prompts or blocks until the timeout. Exit by timeout counts as a
  hang only when the read waited for input (a prompt or a stdin read).
- **Weak failure:** it exits 0 with the input omitted, or exits non-zero but not with 2 (a
  write dry-run probe that times out is one; a slow read is not), or prints no envelope that
  names the missing flag or positional.

A good command exits 2 with an envelope whose context names the flag, positional or missing
list under any key that the tool's own docs or help state (for example `field`, `fields`, `input`,
`missingFields`); only that such a key exists is required, not its spelling.

- **0:** F x 4 >= N: at least 25% of the probed commands hang or fail weakly.
- **About half (4):** F >= 1 and F x 4 < N: some hang or fail weakly, under 25% (for example one
  `acme ticket create --no-input` exits 1 with "missing title" among many good commands).
- **Maximum (8):** F = 0: no probed command hangs or fails weakly.
- **Not applicable when:** no sampled command needs input (none is counted).
- **Evidence:** In the empty temporary working directory of the entry page's "Probes and safety"
  section, with a dedicated or copied data file for the CLI, run `acme <command> --no-input
  < /dev/null` under `timeout 5` for each sampled read (writes: the dry-run form with the input
  omitted). Exit 124 on a read is a hang only if it waited for input, a slow read (not
  counted) if it was still producing output; otherwise read the exit code and the stderr
  envelope. Where a real service is the only target, the probe is "not exercised".
