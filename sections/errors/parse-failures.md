# Parse failures look the same at any depth

Practice 3.6 in the [guide](../../README.md).

### One paragraph explainer

An unknown command, an unknown option and a group typed without its verb are failures like others,
so they return the envelope ([3.1](error-envelope.md)) with exit 2 ([3.4](exit-code-classes.md)).
A group alone (`acme build`) is `MISSING_COMMAND`, with the verbs in `context.availableCommands`.
Argument parsing libraries print their own help page for these cases, often with exit 0; that text
is not data and has no next step. Intercept the parser's errors at the root and every group so the
shape is the same at depth one and at depth four.

### Do

```json
{
  "status": "error",
  "code": "MISSING_COMMAND",
  "message": "`acme build` needs a command",
  "context": { "field": "command", "availableCommands": ["jobs", "list", "view"] },
  "hint": "Run `acme build list`"
}
```

```json
{
  "status": "error",
  "code": "UNKNOWN_OPTION",
  "message": "unknown option --stat",
  "context": { "field": "--stat", "observed": "--stat" },
  "suggestions": ["--state"],
  "hint": "Run `acme pr list --state open`"
}
```

### Don't

```text
Usage: acme build [options] [command]        <- the library's help page, exit 0
```

### What goes wrong

An agent types `acme build` to see what exists. The library prints its help page to stdout and exits
0. The agent's wrapper counts that as success, parses the text as the result, and moves on with an
empty answer. Another agent, three levels deep in `acme deploy pods logs --tail=x --follow`, hits an
unknown flag and gets a one-line library string, while the same mistake at the top level returned
the envelope. The agent now has two error formats to handle and no rule for when each applies.

### Edge cases and trade-offs

- **Help is a different request.** `acme build --help` is a request and exits 0 with help text
  ([7.1](../help/help-leads-with-example.md)). Only the bare group is a failure.
- **Bare root.** `acme` alone behaves like a group without its verb; list the top-level groups.
- **A person at a terminal.** They see the envelope rendered as text with the same fields; do not
  keep the library's help as the human path, because the two would drift.
- **Suggestions.** Use edit distance against the real tree, and keep it to a few entries
  ([3.2](runnable-hints.md)). If a removed name matches, say what replaced it
  ([8.2](../evolving/rename-leaves-a-hint.md)).
- **Verb confusion.** `acme pr show` suggests `view`, which supports a closed verb set
  ([1.1](../names/closed-verb-set.md)) without registering an alias.
- **Objection: "the library already handles it".** It handles it for a person. Override its error
  hook once at the root and set the same hook on every group, or nested commands bypass it.
- **Output on failure.** The envelope goes to stderr; stdout stays empty
  ([2.1](../output/stdout-stderr.md)).

### How to check it

Walk the tree: run every group without its verb, and every leaf with a bogus option.

```ts
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";
import { groups, leaves } from "./helpers/tree"; // paths from `acme search --json`

const run = (argv: string[]) => spawnSync("./dist/acme", argv, { encoding: "utf8" });

test.each(groups())("group %j without a verb", (...path) => {
  const r = run(path);
  expect(r.status).toBe(2);
  expect(r.stdout).toBe("");
  const err = JSON.parse(r.stderr);
  expect(err.code).toBe("MISSING_COMMAND");
  expect(err.context.availableCommands.length).toBeGreaterThan(0);
});

test.each(leaves())("leaf %j with a bad option", (...path) => {
  const r = run([...path, "--no-such-flag"]);
  expect(r.status).toBe(2);
  expect(JSON.parse(r.stderr).code).toBe("UNKNOWN_OPTION");
});
```
