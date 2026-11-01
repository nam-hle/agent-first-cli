# A failed write says whether anything changed

Practice 3.5 in the [guide](../../README.md).

### One paragraph explainer

When a write fails, the caller's next move depends on one fact: did anything happen? Put it in the
envelope ([3.1](error-envelope.md)) as `context.changed`, always a string: `"no"` when the tool
knows nothing was written, `"unknown"` after a lost connection or an unexpected error, and `"yes"`
when the write landed and only showing the result failed. Transient codes also carry
`retryable: true`. An agent retries by reflex, so a retry that is safe must be told apart from one
that duplicates the work.

### Do

```json
{
  "status": "error",
  "code": "NETWORK_ERROR",
  "message": "The connection closed before a reply arrived",
  "context": { "changed": "unknown", "retryable": true },
  "hint": "Run `acme ticket list --project ACME --limit 5` to check, then repeat the create"
}
```

```json
{ "code": "VALIDATION_ERROR", "context": { "field": "--title", "changed": "no" } }
```

### Don't

```json
{ "code": "NETWORK_ERROR", "context": { "changed": false } }
```

A boolean in one code and a string in another forces per-code parsing, and `false` hides the third
state.

```text
Error: socket hang up
```

### What goes wrong

An agent runs `acme ticket create --title "Fix login"` and the connection drops after the server
accepted the request. The tool prints a bare socket error. The agent cannot tell whether the ticket
exists, so it retries and creates a duplicate; a second agent facing the same message gives up and
reports the task undone while the ticket sits there. With `changed: "unknown"` and a hint that names
a check, both do the right thing: look first, then repeat or stop.

### Edge cases and trade-offs

- **Why a string and not a boolean.** There are three answers. `unknown` must never be rounded to
  `false`, and one type across all codes means one parser.
- **Reads.** A failed read does not need `changed`; the key is for writes. Keep it off reads, so
  its presence means something.
- **Honest `no`.** Say `no` only when the tool can prove it (a refusal before the request is sent,
  validation, a permission denial). Doubt means `unknown`.
- **Partial writes.** A batch that applied some items reports `yes` and names the applied and
  failed items in `context`, so the repeat covers only the rest.
- **Retry safety.** Pair this with idempotent writes: a repeat ends `unchanged`, not duplicated
  ([6.3](../writes/repeat-is-unchanged.md)). If a write cannot be made idempotent, the hint should
  name a read that checks.
- **Preview first.** `--dry-run` finds many failures before any write
  ([6.1](../writes/dry-run.md)); its failures say `changed: "no"`.
- **Objection: "the tool cannot know".** That is exactly `unknown`; the practice asks for the
  honest answer, not an omniscient one.
- **Exit class.** Transient failures exit 7 ([3.4](exit-code-classes.md)); `retryable` and `changed`
  say whether to repeat and whether to check first.

### How to check it

For each write, force a failure before the call and after it, and assert the string.

```ts
import { expect, test } from "vitest";
import { runWrite } from "./helpers/run"; // runs the binary against a fake server

test.each([
  ["refuse before sending", { fail: "before" }, "no"],
  ["drop after the server applied it", { fail: "after-apply" }, "unknown"],
  ["write landed, rendering failed", { fail: "render" }, "yes"],
])("ticket create: %s", async (_name, fault, changed) => {
  const { status, error } = await runWrite(["ticket", "create", "--title", "t"], fault);
  expect(status).not.toBe(0);
  expect(error.context.changed).toBe(changed);
});
```
