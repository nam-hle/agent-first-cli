---
id: rename-leaves-a-hint
category: Discoverable and maintainable
max: 5
---
# A rename leaves a hint behind

Practice 8.2 in the [guide](../../README.md).

### One paragraph explainer

Agents and scripts copy your command lines into hooks, skill files and project instructions you
cannot grep. After a rename, those copies keep running for weeks. Keep a small table of removed
names. An unknown flag that matches it fails, so there is still no alias, but the error names the
new flag: `unknown option --text (renamed to --body)`. An agent reads a bare "unknown option" as
its own typo and tries variants. A hint turns the break into one corrected retry and points at the
stale instruction.

### Do

```json
{ "code": "UNKNOWN_OPTION", "message": "unknown option --text (renamed to --body)" }
```

### Don't

```json
{ "code": "UNKNOWN_OPTION", "message": "unknown option --text" }
```

### What goes wrong

`acme ticket comment add` drops `--text` in favour of `--body` for consistency with its siblings. A
skill file written months ago still says `acme ticket comment add ACME-1 --text "..."`. The agent
gets `unknown option --text`, assumes the flag is spelled `--message`, then `--comment`, then falls
back to piping the text on stdin. It never learns that the skill file is the problem, so the next
session starts with the same wrong line and burns the same retries.

### Edge cases and trade-offs

- "Why not keep an alias?" An alias keeps the old name alive forever and makes two names for one
  idea ([1.4](../names/one-flag-one-purpose.md)). The hint fails loudly, once, and names the fix.
- Keep the table small and dated, and drop an entry when no caller can plausibly remain. A table
  that grows without end is an alias in disguise.
- The same applies to renamed commands and enum values: `unknown command "ticket remark" (renamed to
  "ticket comment add")`. Enum refusals already list valid values
  ([5.3](../input/enums-refuse-typos.md)).
- The hint is part of the message, the code stays `UNKNOWN_OPTION` and the exit class stays 2, so
  callers that branch on codes do not break ([3.1](../errors/error-envelope.md)).
- A hint should be a fix the agent can run, not prose
  ([3.2](../errors/runnable-hints.md)). When the rename also changes meaning, say so in the message.
- Mark the change as breaking in the changelog, and search for callers before merging
  ([8.3](update-hidden-callers.md)). The hint is the safety net, not the plan.
- Parse failures of other kinds keep their own handling ([3.6](../errors/parse-failures.md)).

### How to check it

One test per entry of the removed-names table, run against the built binary.

```ts
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";
import { removedNames } from "../src/removed-names";

test.each(removedNames)("$command $old points at $new", ({ command, old, new: next }) => {
  const run = spawnSync("acme", [...command.split(" "), old, "x", "--json"], {
    encoding: "utf8",
  });
  const error = JSON.parse(run.stderr).error;
  expect(run.status).toBe(2);
  expect(error.code).toBe("UNKNOWN_OPTION");
  expect(error.message).toContain(`(renamed to ${next})`);
});
```

Also assert that each new name appears in the flag snapshot ([8.1](snapshot-the-surface.md)).

### How to score

Maximum: 5 points. A silent break after a rename repeats in every stale caller until someone finds
it, so the hint decides whether the break costs one retry or weeks.

Entries: the removed or renamed flags and commands listed in a removed-names table (a file such as
`src/removed-names.*`) or in `CHANGELOG.md` and `docs/`, newest 10, each as an old name and its new
name (or "removed" with no replacement). "Newest 10" means by date inside the changelog, newest
first, and across several changelog files by file name descending. When both a removed-names
table and a changelog exist, the table is the source of removed names and the changelog
supplements it. The 10 entries are the table's entries first, in file order, then changelog
entries newest first up to 10 in total (not per source); an undated entry sorts last. An
entry is probeable only when its command (the current path for a flag, the new path for a renamed
command) is a read command; entries on a write command are not exercised (the old name could
run the write) and renamed enum values are not exercised.
A probed entry violates when the old name is still accepted (it appears in the live
`acme <path> --help`, or the probe exits 0: an alias exists), or when the refusal text (stderr, or
the JSON `message` and `hint`) does not contain the new name, or, for a removal with no
replacement, does not say "removed".

- **0:** At least one entry is probed and at least 25% of the probed entries violate.
- **About half (3):** At least one entry is probed, under 25% violate, and at least one does.
- **Maximum (5):** At least one entry is probed and none violates.
- **Not applicable when:** the repo and docs are not readable (a closed or vendor CLI); or the
  changelog and docs show no removed or renamed name; or no listed entry is probeable (every one
  is on a write command, or none can be exercised).
- **Evidence:** read the table or `CHANGELOG.md`, classify each entry's command as read or write
  from its live help, then for each probeable entry run
  `timeout 10 acme <read path> <old-flag> x --json </dev/null` (or the old command path) with
  stderr to a sandbox file. Capture the old and new name, the exit code and the refusal text, and
  list the entries skipped as write commands.
