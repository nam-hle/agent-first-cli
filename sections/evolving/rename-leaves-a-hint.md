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
