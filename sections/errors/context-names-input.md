# `context` names the failing input

Practice 3.3 in the [guide](../../README.md).

### One paragraph explainer

The `context` object of the envelope ([3.1](error-envelope.md)) says which input failed and what the
tool saw: a `field` (the flag or positional, as the caller typed it) and the `observed` value. For a
closed set it also lists `allowed`, and for an unknown command `availableCommands`. An empty
`context` makes an agent with five flags guess which one was wrong, and a guess is another failed
call. Never echo secrets into `observed` ([5.2](../input/no-secrets-in-flags.md)); mask them or
omit the key.

### Do

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "--limit must be a whole number",
  "context": { "field": "--limit", "observed": "abc" },
  "hint": "Run `acme pr list --limit 20`"
}
```

### Don't

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Invalid value",
  "context": {},
  "hint": "Check your input"
}
```

### What goes wrong

An agent calls `acme pr list --state open --limit abc --user-id 42 --since yesterday`. The tool
answers "Invalid value". Four inputs could be wrong, so the agent changes `--since` first (a good
guess, since dates are fiddly), reruns, and gets the same message. It then drops flags one by one,
and ends up with a command that runs but no longer asks what it was asked to ask: the `--limit`
problem is gone because the flag is gone, and the answer is silently wider than intended.

### Edge cases and trade-offs

- **Two inputs wrong at once.** Report the first and say so, or return a list under `context.fields`
  consistently for every code. Pick one rule and apply it everywhere; a code that sometimes has
  `field` and sometimes `fields` forces per-code parsing.
- **Positionals.** Use the placeholder name from help (`ticket`, not `arg1`), so the name is
  searchable in the usage text ([1.3](../names/two-positionals.md),
  [1.6](../names/typed-placeholders.md)).
- **Missing input.** `field` names the flag and there is no `observed`; the hint says which flag to
  pass ([5.1](../input/missing-input-fails.md)).
- **Typos in a set.** Add `allowed`, so one error carries the fix
  ([5.3](../input/enums-refuse-typos.md)).
- **Long or sensitive values.** Truncate `observed` to a fixed length and sanitise it
  ([2.6](../output/sanitise-service-text.md)); it came from outside.
- **Objection: "the message already says it".** Prose may change between releases; `field` is a
  stable key an agent can use to repair the call without parsing a sentence.
- **Non-input failures.** A network error has no failing input. Its context has other facts, such
  as `changed` ([3.5](failed-write-changed.md)).

### How to check it

Drive each validation and not-found path with a bad value and assert the context names it.

```ts
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

function failure(args: string[]) {
  try {
    execFileSync("./dist/acme", args, { stdio: ["ignore", "pipe", "pipe"] });
  } catch (e: any) {
    return JSON.parse(e.stderr.toString());
  }
  throw new Error("expected a failure");
}

test.each([
  [["pr", "list", "--limit", "abc"], "--limit", "abc"],
  [["pr", "list", "--state", "opne"], "--state", "opne"],
  [["ticket", "view", "NOPE-1"], "ticket", "NOPE-1"],
])("%j names its input", (args, field, observed) => {
  const { context } = failure(args);
  expect(context.field).toBe(field);
  expect(context.observed).toBe(observed);
});
```
