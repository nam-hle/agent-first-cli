---
id: reads-change-nothing
category: Effects
max: 3
---
# Reads change nothing

Practice 6.7 in the [guide](../../README.md).

### One paragraph explainer

A command that is a read leaves no durable state behind. Running it twice, or ten times in parallel,
is always safe and gives the same answer for the same data. Agents retry and fan out reads freely
because a read is a free probe; a read that bumps a counter, takes a lock, writes a last-seen marker
or asks a question breaks that assumption, and the damage shows up later as a wrong answer or a
stuck run. The tool's own cache and logs are not state in this sense (see the
[entry page](../../benchmark/README.md#write-command)), provided they never change what a later
read returns beyond the data.

### Do

```sh
acme pr list --state open        # twice: same files, same output
acme pr list --state open
```

### Don't

```sh
acme pr list                     # writes ~/.acme/last-seen, so the next run hides what was seen
acme pr list                     # a different answer for the same data
```

### What goes wrong

An agent lists new notifications to summarise them. The tool records a last-seen marker on every
read, so the agent's retry after a timeout returns an empty list. The agent reports that there is
nothing new, and the real notifications are marked as seen and never summarised.

### Edge cases and trade-offs

- **Caches.** A cache that only speeds up the next call and never changes its result is fine.
  Document where it lives so a caller can clear it.
- **Telemetry.** A call to the tool's own telemetry endpoint is outside this practice. A read must
  still never change the caller's data on the service.
- **Prompts.** A read that blocks on a question is judged in [5.1](../input/missing-input-fails.md),
  not here, so a hang is not counted twice.
- **Remote state.** A scorer without a fake service cannot see state on the server. Such reads are
  scored on what is visible (local files and the second run's output) and the rest is not
  exercised.
- **Declared effect.** A command that declares a write ([6.6](declare-read-or-write.md)) is not a
  read, so it is not counted here.

### How to check it

Run each read twice against a fixture, snapshot the working tree and the tool's documented state
directories before and after, and compare the two outputs.

```ts
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";
import { snapshotTree } from "./helpers";

test.each(readCommands)("%j changes nothing", (...path) => {
  const before = snapshotTree(sandbox);
  const first = execFileSync("acme", [...path, "--json"], { encoding: "utf8", cwd: sandbox });
  const second = execFileSync("acme", [...path, "--json"], { encoding: "utf8", cwd: sandbox });
  expect(snapshotTree(sandbox)).toEqual(before);
  expect(second).toEqual(first);
});
```

### How to score

Maximum: 3 points. A read that changes state breaks retries and parallel fan-out, but only the
commands that do so are affected.

Probe the first 10 sampled leaves that are reads ([classified](../../benchmark/README.md#classify)
from help, or from their [6.6](declare-read-or-write.md) declaration). Run each twice in the
sandbox, stdin closed, under `timeout 5`, and compare:

- the file names, sizes and contents under the empty temporary working directory and under the
  tool's documented state directories, before the first run and after the second, ignoring the
  tool's documented cache and log paths;
- the first and second output, ignoring only fields the tool documents as time-dependent.

A read violates when either comparison differs for a reason other than the data. Let N be the
probed reads and V the violating reads. The
[small-samples rule](../../benchmark/README.md#small-samples) applies.

- **0:** V x 4 >= N: at least 25% of the probed reads change state or their output.
- **About half (2):** V >= 1 and V x 4 < N.
- **Maximum (3):** V = 0.
- **Not applicable when:** the CLI has no read command that runs in the sandbox (N = 0 after
  "not exercised" probes).
- **Evidence:** the two outputs and the before and after listing of the working directory and state
  directories, per probed read. Never probe a remote or shared service for state; a read that needs
  one is "not exercised".
