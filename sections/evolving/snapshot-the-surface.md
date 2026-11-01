# Snapshot the whole surface

Practice 8.1 in the [guide](../../README.md).

### One paragraph explainer

The surface of a CLI is more than its commands: flags and their help, JSON keys, the list of write
operations, error codes with their exit class and hint, environment variables and each command's
full `--help`. An agent depends on all of it, and it cannot ask what changed. Write each part to a
committed snapshot, and make any change fail the test until someone accepts a diff they have read.
Then no rename, new flag or reshaped key reaches callers without a person having looked at it.

### Do

```text
tests/__snapshots__/
  flags.txt            # every flag, its placeholder and help
  flag-purposes.txt    # flag name -> the purposes it carries
  json-keys.txt        # every command's output keys, see 2.3
  writes.txt           # the commands that change state
  error-codes.txt      # code, exit class, hint
  env-vars.txt
  help/<command>.txt   # full --help, one file per command
```

### Don't

```text
review a flag rename by reading the source diff of the file that declares it
```

### What goes wrong

A refactor changes `--since` to `--from` in one command while a neighbour keeps `--since`. The
source diff is two lines in a command file and reads like a cleanup, so it is approved. A week later
an agent runs the neighbour's form on the changed command, gets `UNKNOWN_OPTION`, and guesses a
third spelling. A snapshot diff would have shown the flag list of both commands side by side, plus a
changed help line the author never meant to touch.

### Edge cases and trade-offs

- "Snapshots are noisy, people will update them blindly." Keep each file one fact per line and
  sorted, so a diff is short. Blind acceptance is a review problem, and a snapshot at least makes
  the change visible to the reviewer. Put the update in the same commit as the change.
- "Help text changes often." Snapshot it anyway: help is the contract an agent reads first
  ([7.1](../help/help-leads-with-example.md)). A wording fix is a one-line diff.
- Generated files are fine. Produce the snapshots from the command tree, never by hand, in line
  with [7.4](../help/generate-the-reference.md).
- Pin the JSON schema version in the same place, so a reshaped key is also a version change
  ([2.3](../output/declared-json-fields.md)).
- The flag-purposes file is what exposes a clash between commands
  ([1.4](../names/one-flag-one-purpose.md)).
- The snapshot says a change happened, not that it was wise. A rename still needs a hint
  ([8.2](rename-leaves-a-hint.md)) and a search for callers ([8.3](update-hidden-callers.md)).

### How to check it

The snapshot test is the check. Walk the tree, write the text, compare with the committed file.

```ts
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const run = (...args: string[]) =>
  execFileSync("acme", args, { encoding: "utf8" });

test("flag list matches the snapshot", async () => {
  const commands: string[] = JSON.parse(run("commands", "--json")).result.paths;
  const lines = commands.flatMap((path) => {
    const help = run(...path.split(" "), "--help");
    return help.match(/--[a-z][a-z-]*/g) ?? [];
  });
  await expect([...new Set(lines)].sort().join("\n")).toMatchFileSnapshot(
    "__snapshots__/flags.txt",
  );
});
```

Update with one command (`vitest -u`) and review the diff before committing it.
