---
id: snapshot-the-surface
category: Discoverable and maintainable
max: 8
---
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

### How to score

Maximum: 8 points. The surface is everything an agent depends on and cannot ask about, so a
committed record of all of it is the largest single maintenance safeguard.

Scored by what is committed and whether it covers and matches the live CLI. Tests, snapshot
runners and CI never raise or lower the score. Six parts: (1) every flag with its help, (2) JSON
keys per command, (3) the list of write commands, (4) error codes with exit class and hint,
(5) environment variables, (6) the full `--help` of each command. Committed artifacts are files
from `git ls-files` (under `tests/`, `snapshots/`, `docs/` or similar; any name).

Sampled live entries: the first 30 leaf commands by sorted path of the sample, plus every write
not already in them (up to 30 more, as on the entry page). Part 1: every flag in their help.
Part 2: the key set of the `--json` output of each sampled read command. Part 3: each sampled
write command, listed as a write; a snapshot "lists a write" when the
write's command path appears in the snapshot file, and a write with no dry-run form still counts
as a write. Part 4: each error
code the live CLI lists (`acme explore` or the error output), first 10 by sorted code. Part 5:
each environment variable named in live help, first 10 by sorted name; a name that a committed
help snapshot contains counts as present in the snapshot set. Part 6: each sampled
command. A tool with no write command has part 3 not exercised. A part with no sampled live
entry, or none the sandbox can exercise (for example JSON keys behind credentials it lacks), is
not exercised: leave it out of the parts below and out of the share.
Let E be the number of exercised parts and P how many of them have at least one entry in a
committed artifact. A sampled entry is missing when no committed artifact has an entry for it, and
stale when its committed entry differs from the live output (flag set or help line, key set,
listed as a write, code, class or hint, description, or the text of `acme <path> --help` after
whitespace normalisation: runs of whitespace and line breaks collapse to one space, so a
difference in words, flags or ordering is stale and a difference only in wrapping is not). V is
the share of the V sample that is missing or stale; the 25% boundary belongs to 0, as everywhere.
The V sample is drawn across the exercised
parts: take the first ceil(20/E) entries of each exercised part in sorted order; a part's
unused share is not redistributed, and a part with fewer entries gives all of them. When the
total exceeds 20, drop entries from the last exercised parts first (in the order the parts are
listed above), one per part from the end, until exactly 20 remain.

- **0:** P is 0 (no artifact for any exercised part), or V is at least 25%.
- **About half (4):** P is at least 1, V is under 25%, and either P is under E or V is above 0.
- **Maximum (8):** P equals E and V is 0.
- **Not applicable when:** the repo and docs are not readable (a closed or vendor CLI); or E is 0
  (no part can be exercised).
- **Evidence:** read `git -C <repo> ls-files` and open the candidate files to decide which parts
  are present. For the sample, run the live comparison with `timeout 10` and stdin from
  `/dev/null`, using reads and `--help` only, never a write. Compare help after whitespace
  normalisation, not byte for byte. Record per part: file path, entries sampled, missing, stale,
  or "not exercised" with the reason; the totals give E, P and V.
