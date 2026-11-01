---
id: enums-refuse-typos
category: Input
max: 5
---
# Enum over string; refuse typos

Practice 5.3 in the [guide](../../README.md).

### One paragraph explainer

A closed set of values is a choice list in the command's definition, and the help prints it. A typo
is an error, never ignored. Numbers are parsed, and junk in a numeric flag is refused. A person who
sees an empty list notices the typo; an agent does not. It reads "no results" as a fact about the
world and moves on to a wrong conclusion. Refusing the value, and printing the allowed ones in the
[3.1](../errors/error-envelope.md) envelope, turns a silent wrong answer into a one-step fix.

### Do

```text
$ acme pr list --state opne                         (exit 2, envelope on stderr)
{ "code": "VALIDATION_ERROR",
  "context": { "field": "--state", "observed": "opne", "allowed": ["open", "merged", "declined"] } }
```

Declare the set once, so help, validation and the schema all read it:

```ts
.addOption(new Option("--state <state>").choices(["open", "merged", "declined"]))
```

### Don't

```text
$ acme pr list --state opne
No pull requests.
```

### What goes wrong

An agent is asked whether any pull request is still open. It runs `acme pr list --state opne`. The
tool treats the unknown state as "match nothing" and prints "No pull requests." with exit 0. The
agent reports that everything is merged, and the report goes into a status update. The error was
one letter
and the tool saw it. Nothing in the run was marked as wrong, so no later step had a reason to look.

### Edge cases and trade-offs

- **"Be liberal in what you accept."** Not for values. Guessing `opne` means `open` is a decision
  the tool makes for the caller; an agent cannot tell afterwards whether it happened. Offer the
  nearest match in `hint` ("Did you mean open?") but still fail, so the next call is explicit.
- **Case and aliases.** Decide once. Either accept case-insensitively everywhere and say so, or
  accept exactly the listed value everywhere. An alias is a second name for one value, and belongs
  in the list, not in a parser special case ([1.4](../names/one-flag-one-purpose.md) is the same
  rule for flags).
- **Open sets that look closed.** A project key or a branch name comes from the service, not from
  the tool. Do not freeze it into a choice list that goes stale. Validate it against the service and
  fail with `NOT_FOUND` (exit 3) and a command that lists the valid ones
  ([3.2](../errors/runnable-hints.md)).
- **Long lists.** If the set has dozens of members, print the first few in `allowed`, set
  `context.truncated`, and name the listing command in `hint`. [2.5](../output/bounded-lists.md)
  has the same bound for output.
- **Numbers.** `--limit abc`, `--limit -3` and `--limit 1e9` are all refused with the accepted
  range in `context`. Do not coerce `abc` to 0 or clamp 1e9 silently.
- **Repeated and comma lists.** Pick one form per flag, validate each element, and report the first
  bad element in `observed`, not the whole string.
- **Values with typed placeholders.** Help shows `--state <open|merged|declined>`, not
  `--state <string>` ([1.6](../names/typed-placeholders.md)), so the agent sees the set before it
  errs.

### How to check it

Walk the tree. For every flag declared with choices, pass a wrong value and assert exit 2 and an
`allowed` list that equals the declared set. For every numeric flag, pass a non-number.

```ts
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";

const schema = JSON.parse(spawnSync("acme", ["schema", "--json"], { encoding: "utf8" }).stdout);
const cases = schema.commands.flatMap((c: any) =>
  c.flags
    .filter((f: any) => f.choices || f.type === "number")
    .map((f: any) => ({ path: c.path, flag: f.name, choices: f.choices })),
);

test.each(cases)("$path $flag refuses junk", ({ path, flag, choices }) => {
  const run = spawnSync("acme", [...path, `--${flag}`, "zzz-junk", "--no-input"], {
    encoding: "utf8",
  });
  expect(run.status).toBe(2);
  const envelope = JSON.parse(run.stderr);
  expect(envelope.context.field).toBe(`--${flag}`);
  if (choices) expect(envelope.context.allowed).toEqual(choices);
});
```

### How to score

Maximum: 5 points. A silently accepted typo reads as a true empty result; it touches every choice
and numeric flag.

Sample the first 30 leaf commands by sorted path plus every write. Collect their flags that take a
closed set of values (listed in help as choices) or a number. Pass each one a junk value
(`zzz-junk`). Two kinds of violation:

- **Silent accept:** exit 0, an empty result, or a coerced value (`--limit abc` becomes 0).
- **Weak refusal:** non-zero, but not exit 2, or no envelope naming the flag, or for a choice flag
  no `allowed` list, or for a numeric flag no accepted range in `context`.

**Fixed probe list.** The probed flags are every choice or numeric flag of the sample of the entry
page (first 30 leaf commands by sorted path plus every write up to 30), in sorted command path
order, never a set the scorer picks. For each, run exactly:

- Choice flag: `<tool> <command> --<enum-flag> zzz-junk --no-input`
- Numeric flag: `<tool> <command> --<number-flag> zzz-junk --no-input`

A probe that cannot run (a write that would run for real because the junk value is not rejected at
parse time and no sandbox exists, or a command that needs unavailable context) is listed as "not
run". Not-run flags are not measurable: neither pass nor fail, and they leave the probed count N.
If N is 0 the practice is not measurable.

**Pass rule, stated as counts.** Let N be the probed flags, S the flags that silently accept junk,
and W the flags with a weak refusal. Let F = S + W, the failures. Max when F = 0. Half when F >= 1
and F x 4 < N. 0 when F x 4 >= N. The 25% boundary belongs to 0. With N < 4: 0 only if F = N, half
if 0 < F < N. Example: of 8 probed flags, 0 fail is max, 1 fails is half, 2 or more fail is 0.
One weak refusal among many never drops the score below half; only the share rule does.

- **0:** F x 4 >= N: at least 25% of the probed flags silently accept junk or refuse weakly.
- **About half (3):** F >= 1 and F x 4 < N: some flags accept junk or refuse weakly, under 25%
  (for example one `--state opne` exits 2 with a message and no `allowed` list).
- **Maximum (5):** F = 0: every probed flag refuses junk with exit 2 and an envelope naming the
  flag, with `allowed` for choices and the range for numbers.
- **Not applicable when:** no sampled command has a choice or numeric flag.
- **Evidence:** Run `acme <command> --<flag> zzz-junk --no-input` for each collected flag. Read the
  exit code and the stderr envelope; for choices compare `allowed` with the help text.
