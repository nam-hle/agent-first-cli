---
id: help-leads-with-example
category: Discoverable
max: 3
---
# Help leads with an example

Practice 7.1 in the [guide](../../README.md#71-help-leads-with-an-example).

### One paragraph explainer

`--help` starts with an example, marks required arguments, and states the output shape and exit
codes. Flags come next, caveats last. A person skims past a long introduction; an agent pays for
every token of it and then still has to guess the syntax. The first lines of help are the part an
agent reads most often, so they carry the one thing it needs: a command it can copy and adapt.
Positionals use typed placeholders ([1.6](../names/typed-placeholders.md)), and the exit codes
listed are the classes of [3.4](../errors/exit-code-classes.md).

### Do

```text
$ acme pr list --help
EXAMPLES
  $ acme pr list --state open
  $ acme pr list --state merged --limit 5 --json
ARGUMENTS
  none
FLAGS
  --state <open|merged|declined>   filter by state (default: open)
  --limit <count>                  at most this many rows (default: 25)
OUTPUT
  --json: one object { "items": [...], "truncated": false }
EXIT CODES
  0 success  2 usage  3 not found  4 auth  7 transient
```

### Don't

```text
$ acme pr list --help
Lists pull requests. A pull request is a request to merge a branch. Pull
requests can be open, merged or declined. Depending on your setup... (three
paragraphs before any syntax)
```

### What goes wrong

An agent is asked to merge a pull request. It runs `acme pr merge --help` and receives a long
description of merge strategies. The context window now holds that prose, but the argument is only
named at the bottom as `PR`. The agent guesses `acme pr merge --pr 12`, gets a usage error, runs
help again, and repeats. Two extra round trips and a few hundred wasted tokens for one command. With
an example on the first line, `acme pr merge 12` is copied and works the first time.

### Edge cases and trade-offs

- "A description belongs first." Keep it, as one line under the title, above EXAMPLES. The rule
  is no prose before the first example, not no prose.
- Groups have no required arguments. Their help leads with the example of a leaf command, and
  lists children with one-line descriptions ([7.2](two-hop-discovery.md)).
- Two examples are enough. A help page that lists ten becomes the prose it replaced.
- Examples rot. Generate them from the command definition ([7.4](generate-the-reference.md)) and
  run them in tests ([4.4](../success/check-command-strings.md)).
- Output shape here is a summary. The full contract is the schema of
  [7.5](self-describing-schema.md) and the declared fields of
  [2.3](../output/declared-json-fields.md); help links to it, it does not copy it.
- Help goes to stdout and exits 0 ([2.1](../output/stdout-stderr.md)). A usage error that prints
  help follows the error envelope instead ([3.6](../errors/parse-failures.md)).

### How to check it

Walk the command tree, call help on each leaf, and assert the first section and the markers.

```ts
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const run = (...args: string[]) => execFileSync("./dist/acme", args, { encoding: "utf8" });

function leaves(path: string[] = []): string[][] {
  const tree = JSON.parse(run(...path, "--help", "--json"));
  if (!tree.children?.length) return [path];
  return tree.children.flatMap((c: { name: string }) => leaves([...path, c.name]));
}

test.each(leaves())("help of %s leads with an example", (...path) => {
  const text = run(...path, "--help");
  expect(text.trimStart().split("\n")[0]).toMatch(/^EXAMPLES|^[^\n]{0,100}$/);
  expect(text.indexOf("EXAMPLES")).toBeLessThan(text.indexOf("FLAGS"));
  expect(text).toMatch(/EXIT CODES/);
});
```

### How to score

Maximum: 3 points. Help is the first page an agent reads for every command, but a gap there costs
a retry, not a wrong write, so the weight is moderate.

Sample: the leaf commands of the sample (first 30 leaf commands by sorted path from walking `acme
--help`, plus every write command). Help of a command is `acme <path> --help` stdout. A command
violates when any of these holds:

- no example leads: the first section after the one-line summary and the usage line is not the
  examples (a flags table before the examples fails; a one-line `-h, --help` hint in the usage
  line is not a flags table). An example is a line starting with
  `acme <path>` or `$ acme <path>` that shows a runnable command with concrete values; a line of
  placeholders alone (`acme pr view <id>`) does not count;
- a required argument is not marked: the help names a positional or required flag but neither
  its usage line shows it in angle brackets (optional ones in square brackets) nor the word
  "required" appears next to it; commands with no arguments never violate here;
- no output shape: no line states what a successful run prints (the `--json` keys or "text");
- no exit codes: no line lists at least two exit codes by number, and none points to a command
  or page that lists them. Exit codes may be stated once centrally; per-command help then only
  needs the pointer, and a pointer to a place that lists no codes does not count.

- **0:** At least 25% of the sampled commands violate.
- **About half (2):** Under 25% violate and at least one does.
- **Maximum (3):** No sampled command violates.
- **Not applicable when:** never; a single-command CLI is sampled as `acme --help` itself.
- **Evidence:** run `timeout 10 acme <path> --help` with stdin from `/dev/null` for each sampled
  command, save stdout to a sandbox file, and check that the first section after the one-line
  summary and usage line is the examples, and read the whole text for the other three checks.
  Record one verdict per command and per check.
