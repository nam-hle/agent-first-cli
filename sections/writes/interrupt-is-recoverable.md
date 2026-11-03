---
id: interrupt-is-recoverable
category: Effects
max: 2
---
# An interrupted write leaves recoverable state

Practice 6.8 in the [guide](../../README.md).

### One paragraph explainer

When a write is killed (an interrupt, a timeout, a lost connection), it leaves state that a re-run or
a named status command can recover from, and its help says which. Agents run under timeouts and are
cancelled mid-command, so an interrupted write is routine, not rare. With no way to learn what
happened, the agent retries blind and duplicates the effect, or abandons it and leaves the work
half done. [3.5](../errors/failed-write-changed.md) covers a failure the tool reports; this covers a
process that never got to report one.

### Do

```text
$ acme export create --help
Creates the export in one step. If interrupted, nothing is created.
```

```text
$ acme import run --help
Imports in batches. If interrupted, the batches already done stay, and the rest is not started.
See what happened: acme import view <id>. Re-run to finish: acme import run --resume <id>.
```

### Don't

```text
$ acme import run --help
Imports the file.                      <- nothing about an interrupt, no way to see the outcome
```

### What goes wrong

An agent starts an import of 5,000 records with a 60 second timeout. The shell tool kills the
command at 60 seconds. The tool has no status command and says nothing about partial state. The
agent re-runs the import, and 1,200 records that already landed are created a second time.

### Edge cases and trade-offs

- **Atomic writes need less.** A write that is all or nothing only has to say so; there is no
  outcome to look up.
- **Idempotent writes.** If a re-run is safe because the write ends `unchanged`
  ([6.3](repeat-is-unchanged.md)), saying "re-run to finish" is the whole recovery.
- **Slow commands.** A job with an id and a state ([4.5](../success/slow-commands.md)) already has
  its status command; this page asks that the help point to it.
- **One place.** A tool may state the rule once for all its writes, with a pointer from each
  command's help.
- **Not probed.** The practice is judged from help and docs. Killing a real write in a scoring round
  is unsafe.

### How to check it

Against a fixture, start the write, kill it halfway, then run the documented recovery and assert it
reaches a final state.

```ts
import { spawn, spawnSync } from "node:child_process";
import { expect, test } from "vitest";

test("an interrupted import can be recovered", async () => {
  const child = spawn("acme", ["import", "run", "big.json", "--json"]);
  await new Promise((resolve) => setTimeout(resolve, 200));
  child.kill("SIGINT");
  const status = spawnSync("acme", ["import", "view", "last", "--json"], { encoding: "utf8" });
  expect(["partial", "cancelled"]).toContain(JSON.parse(status.stdout).state);
});
```

### How to score

Maximum: 2 points. It applies to every write, but the interrupted case is rare and the effect is
bounded by one write.

Sample every write as the entry page says. Read its help and the docs it points to; do not run it.
A write covers itself when its help (or a statement that its help points to) says either that an
interrupt leaves nothing behind, or both what an interrupt leaves and the command or step that
shows or finishes the outcome. Let N be the sampled writes and M the writes that do not cover
themselves. The [small-samples rule](../../benchmark/README.md#small-samples) applies.

- **0:** M x 4 >= N: at least 25% of the sampled writes say nothing about an interrupt.
- **About half (1):** M >= 1 and M x 4 < N.
- **Maximum (2):** M = 0: every sampled write covers itself.
- **Not applicable when:** the CLI has no write commands, or its help and docs are not readable.
- **Evidence:** `acme <write> --help` for each sampled write, plus the central statement it points
  to, quoting the interrupt sentence and the status or resume command.
