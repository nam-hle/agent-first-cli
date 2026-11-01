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

Sample the first 30 leaf commands by sorted path plus every write. Run each with no arguments, stdin
closed and `--no-input`. A command needs input when its help lists a required flag or positional.
Commands with none are not counted. Count the rest. Two kinds of violation:

- **Hang:** the command prompts or blocks until the timeout.
- **Weak failure:** it exits 0 with the input omitted, or exits non-zero but not with 2, or
  prints no envelope that names the missing flag or positional.

A good command exits 2 with an envelope whose context names the flag, positional or missing
list under any key that the tool's own docs or help state (for example `field`, `fields`, `input`,
`missingFields`); only that such a key exists is required, not its spelling.

- **0:** At least 25% of the counted commands hang, or fewer than 25% of them are good.
- **About half (4):** Not 0 and not Maximum: under 25% hang and at least 25% are good, but some
  hang or fail weakly (for example `acme ticket create --no-input` exits 1 with "missing title").
- **Maximum (8):** No counted command hangs and every one is good.
- **Not applicable when:** no sampled command's help lists a required flag or positional.
- **Evidence:** In the empty temporary working directory of the entry page's "Probes and safety"
  section, with a dedicated or copied data file for the CLI, run `acme <command> --no-input
  < /dev/null` under `timeout 5` for each sampled command. Exit 124 is a hang; otherwise read the
  exit code and the stderr envelope. Where a real service is the only target, the probe is "not
  exercised".
