---
id: confirm
category: Safe writes
max: 3
---
# Every write has `--confirm`, and an agent never needs it

Practice 6.2 in the [guide](../../README.md).

### One paragraph explainer

`--confirm` skips the prompt a person sees on a terminal. Without a terminal, or under
`--no-input`, there is no prompt, so an unattended caller does not need the flag, and a script or
agent never hangs on "Merge? [y/N]". Dropping the prompt is safe only when approval is enforced
outside the flag, as in [6.4](no-yes-or-force.md). A prompt alone guards nothing from an agent: the
agent can pass the flag, pipe a `y`, or run with no terminal. The prompt is a courtesy to a person
at a keyboard. The gate is something else, and the two must not be confused.

### Do

```sh
acme pr merge 42 --confirm     # a person skips the prompt
acme pr merge 42 --no-input    # an agent: runs directly, no prompt to answer
# if approval is needed, a separate process asks; the command waits or exits 5
```

### Don't

```sh
acme pr merge 42               # unattended, blocks on "Merge? [y/N]"
echo y | acme pr merge 42      # a documented trick that defeats the prompt
```

### What goes wrong

An agent runs `acme pr merge 42` from a harness with no terminal. The tool prints "Merge? [y/N]" to
stderr and waits on stdin. The harness times out after several minutes and kills it. The agent has
no way to know whether the merge happened, so it retries, then tries `--yes`, which the tool
accepts. A prompt that was meant to protect the merge ended up as one more flag. The reverse case
is worse: the tool detects no terminal and proceeds silently, with no approval anywhere. The prompt
looked like a safeguard, but no safeguard existed.

### Edge cases and trade-offs

- **"Then why keep `--confirm`?"** People type it in scripts and muscle memory. It is also the
  honest name for "I mean it", and tests can assert it exists on every write.
- **"No prompt means no safety."** Only if the prompt was your safety. If a write needs a real
  approval, enforce it as in [6.4](no-yes-or-force.md), in a process the caller cannot configure.
  Then the unattended run waits for that approval or exits with class 5 from
  [3.4](../errors/exit-code-classes.md).
- **Detection.** Decide on the terminal, not on an environment guess: prompt only when stdin and
  stderr are a terminal and `--no-input` is absent. See [2.4](../output/no-tty-decoration.md).
- **Prompt text.** Goes to stderr, per [2.1](../output/stdout-stderr.md); stdout stays one JSON
  object.
- **Missing required input** never falls back to a prompt: see
  [5.1](../input/missing-input-fails.md).
- **Previews** do not prompt: see [6.1](dry-run.md).

### How to check it

Assert the flag on every write, then run the binary with no terminal and a short timeout. A hang is
a failure.

```ts
import { execFileSync, spawnSync } from "node:child_process";
import { expect, test } from "vitest";

const schema = JSON.parse(execFileSync("acme", ["schema", "--json"], { encoding: "utf8" }));
const writes = schema.commands.filter((c: any) => c.writes);

test("every write declares --confirm", () => {
  for (const c of writes) expect(c.flags.map((f: any) => f.name)).toContain("confirm");
});

test("no terminal, no prompt", () => {
  for (const c of writes) {
    const r = spawnSync("acme", [...c.path, ...c.fixtureArgs, "--dry-run"], {
      input: "", encoding: "utf8", timeout: 5000,
    });
    expect(r.error).toBeUndefined();
    expect(r.stderr).not.toMatch(/\[y\/N\]/i);
  }
});
```

### How to score

Maximum: 3 points. A prompt that hangs an unattended caller costs time, not safety.

A confirm flag that only skips the CLI's own prompt is the flag this practice expects; it is not
a skip over a gate. Only a flag that bypasses the [approval](../../benchmark/README.md#approval)
makes `no-yes-or-force` fail.

- **0:** `no-yes-or-force` fails, or at least 25% of the sampled writes are violations (a write
  that lacks `--confirm`, or waits on a prompt such as "Merge? [y/N]" without a terminal or under
  `--no-input`; the [small-samples rule](../../benchmark/README.md#small-samples) applies).
  "Write command" is as defined in the [entry page](../../benchmark/README.md#write-command); a
  local write counts, and so can be a violation, only if the tool documents a confirm form for it.
- **About half (2):** At least one violation, but below 25% of the sampled writes; the rest
  behave as at Maximum.
- **Maximum (3):** Every write accepts `--confirm`. Without a terminal or under `--no-input`,
  every write returns at once, never prints prompt text and never reads stdin: it runs, or it
  exits 5 because approval is pending or denied. Exiting 5 earns full marks.
- **Not applicable when:** the CLI has no write commands (local writes with no documented confirm
  form do not count), or `no-yes-or-force` is N/A (no destructive write has a gate of any kind).
- **Evidence:** Only inside the entry page's "Probes and safety" sandbox, against throwaway
  items, for each write command as defined on the entry page, run `acme <write> <item> --no-input
  </dev/null` and `echo y | acme <write> <item>` for each write; check it never waits and stderr has
  no `[y/N]`. Run with `--confirm` too. Where no sandbox can be set up the probe is not exercised
  (see the entry page).
