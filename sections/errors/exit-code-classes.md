---
id: exit-code-classes
category: Errors and guidance
max: 3
---
# The exit code is the class of failure

Practice 3.4 in the [guide](../../README.md).

### One paragraph explainer

One table maps every error code to an exit class: 0 success, 1 unexpected, 2 usage, 3 not found,
4 auth, 5 denied, 6 conflict, 7 transient, 8 cancelled. A caller that cannot parse JSON (a shell
hook, a CI step, a wrapper) still learns whether to retry, fix its input or stop. Each code in
the envelope ([3.1](error-envelope.md)) must declare its class or the build fails, and the tool
prints the table so nobody guesses it ([7.2](../help/two-hop-discovery.md)).

### Do

```sh
acme ticket view NOPE-1; echo $?     # 3 (not found)
acme pr list --state opne; echo $?   # 2 (usage)
acme pr merge 42; echo $?            # 6 (conflict), or 7 when the service was unreachable
acme exit-codes --json               # the table: class, number, codes in it
```

### Don't

```sh
acme ticket view NOPE-1; echo $?     # 1, same as every other failure
```

### What goes wrong

A wrapper script runs `acme build trigger` and retries on any non-zero exit. A typo in the branch
name exits 1, so the wrapper retries it five times, then reports a flaky service. In the other
direction, a transient timeout also exits 1, and a careful agent that has learned "exit 1 means my
input is wrong" stops and rewrites a correct command. With classes, 2 and 3 end the loop and 7
retries it, without anyone reading a message.

### Edge cases and trade-offs

- **Counterpoint: coarse exits.** Some CLIs exit 1 for every error and put the detail in
  `error.code`. That works when every caller parses JSON, and parsing is richer than nine numbers.
  This guide keeps classes anyway: shell hooks, `set -e` scripts and CI conditions cannot parse JSON
  without extra tools, and a permission or hook layer that sees only the exit status still has to
  separate "retry" from "stop". The class is a coarse summary; `code` stays the precise answer.
- **Too many classes.** Nine is a ceiling. A new failure joins an existing class, not a
  number; if it fits none, that is a design discussion and a snapshot diff
  ([8.1](../evolving/snapshot-the-surface.md)).
- **Why 2 for usage.** It matches the long-standing shell convention for misuse, and it keeps a bad
  flag distinct from a missing resource.
- **Denied versus auth.** 4 means "who are you" (log in); 5 means "you are known and refused" (ask
  for access). Merging them tells the agent to log in again forever.
- **A timeout on `--wait`.** It exits 7 with the job still running
  ([4.5](../success/slow-commands.md)); the job did not fail.
- **Cancelled.** 8 is for a person or approval that said no, not for a timeout.
- **Writes.** The class says retry or not; whether the write already landed is in
  `context.changed` ([3.5](failed-write-changed.md)). Do not collapse them.

### How to check it

The table is code, so test that it is complete and that the binary honours it.

```ts
import { execFileSync, spawnSync } from "node:child_process";
import { expect, test } from "vitest";

const out = execFileSync("./dist/acme", ["exit-codes", "--json"], { encoding: "utf8" });
const table = JSON.parse(out);

test("every error code declares a class in 1..8", () => {
  for (const [code, cls] of Object.entries<number>(table.codes)) {
    expect(cls, code).toBeGreaterThanOrEqual(1);
    expect(cls, code).toBeLessThanOrEqual(8);
  }
});

test.each([
  [["ticket", "view", "NOPE-1"], 3],
  [["pr", "list", "--state", "opne"], 2],
])("%j exits %i", (args, status) => {
  expect(spawnSync("./dist/acme", args).status).toBe(status);
});

test("the table is pinned", () => {
  expect(table).toMatchSnapshot();
});
```

### How to score

Maximum: 3 points. A wrong exit status misleads every caller that cannot parse JSON (hooks, CI,
wrappers), but the JSON `code` still holds the precise answer, so the weight is modest.

Probe set: the first 10 read commands by sorted path of the sample, plus, for the unknown-flag
provocation only, every write command of the sample (a parse failure never runs the command).
Each provocation below is one counted run, with its expected exit status:

- the root unknown command `acme zzz-no-such`: 2;
- each probe command with `--no-such-flag`: 2;
- each read probe command with a required input omitted, when it has one: 2;
- bare `acme` and every group on the path to a probe command, without a verb: 2;
- each read probe command that takes an id, given `nonexistent-0`: 3 (the
  [id probe rules](../../benchmark/README.md#id-probe) say what takes an id and how a denied
  answer is handled).

A counted run violates when its exit status differs from the expected one (including 0, even
with an error body or empty output, and a timeout).

- **0:** At least 25% of the counted runs violate.
- **About half (2):** Under 25% violate and at least one does (for example usage errors exit 2
  and a missing id exits 1 on a few commands).
- **Maximum (3):** No counted run violates.
- **Not applicable when:** never; the root unknown-command provocation always runs.
- **Evidence:** run each provocation under `timeout 10` (or `gtimeout 10`) with stdin from
  `/dev/null` and capture the exit status alone, one run per call. A status of 124 means the
  timeout fired and is a violation.
