# One envelope for every failure

Practice 3.1 in the [guide](../../README.md).

### One paragraph explainer

An agent acts on error text, so the error must be data with a fixed shape. Every failure is one JSON
object on stderr with five keys: `status`, `code`, `message`, `context` and `hint`. The `code` comes
from a closed table, UPPER_SNAKE and stable. Failures your code did not expect use the same envelope
under a general code, with a hint to re-run with `--verbose`; a library's own message or a stack
trace never stands in for the error. A person reads the same facts rendered as text, but the object
is the interface (see [2.2](../output/json-everywhere.md)), and it goes to stderr
([2.1](../output/stdout-stderr.md)).

### Do

```json
{
  "status": "error",
  "code": "NOT_FOUND",
  "message": "No ticket ACME-9",
  "context": { "field": "ticket", "observed": "ACME-9" },
  "hint": "Run `acme ticket list --project ACME`"
}
```

```json
{
  "status": "error",
  "code": "UNEXPECTED_ERROR",
  "message": "The request failed for an unexpected reason",
  "context": { "changed": "unknown" },
  "hint": "Run the same command again with `--verbose`"
}
```

### Don't

```text
Error: ECONNRESET at TLSSocket.onConnectEnd (node:_tls_wrap:1594:19)
```

### What goes wrong

An agent runs `acme ticket view ACME-9` while the network drops. The tool prints the networking
library's stack trace. The agent has no code to branch on, so it reads the library name as the
problem and spends several calls reinstalling certificates and checking proxy variables. The real
cause was a transient failure the tool could have named and marked retryable. A second agent, on a
different command, receives a plain sentence with no shape at all and must guess whether it is an
error.

### Edge cases and trade-offs

- **"Our errors are already readable."** Readable to a person. An agent needs a key to switch on;
  free text invites regexes that break when someone rewords a message.
- **Open versus closed code table.** A closed table costs a line per new failure, and that cost is
  the point: a snapshot ([8.1](../evolving/snapshot-the-surface.md)) shows each new code as a diff.
- **Third-party failures.** A service's own error body is data to wrap, not to forward. Put the
  service status in `context` and clean the text first
  ([2.6](../output/sanitise-service-text.md)).
- **Verbose mode.** `--verbose` may add a `cause` key to `context`. It adds detail and never changes
  the keys of the envelope.
- **Exit code.** The envelope is not enough alone; the process also exits with the class of the code
  ([3.4](exit-code-classes.md)).
- **Parser errors.** They belong in the same envelope, even though they happen before any command
  code runs ([3.6](parse-failures.md)).
- **Hint and context.** Both are required keys, but `context` may be small and `hint` may be absent
  only when no command can help; see [3.2](runnable-hints.md) and [3.3](context-names-input.md).

### How to check it

One test per code, plus one that forces an unexpected throw and asserts no stack leaks.

```ts
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const KEYS = ["code", "context", "hint", "message", "status"];

function fail(args: string[]) {
  try {
    execFileSync("./dist/acme", args, { stdio: ["ignore", "pipe", "pipe"] });
  } catch (e: any) {
    return JSON.parse(e.stderr.toString());
  }
  throw new Error("expected a failure");
}

test("not found uses the envelope", () => {
  const err = fail(["ticket", "view", "NOPE-1"]);
  expect(Object.keys(err).sort()).toEqual(KEYS);
  expect(err.code).toBe("NOT_FOUND");
});

test("unexpected error has no stack", () => {
  const err = fail(["debug", "throw"]);
  expect(err.code).toBe("UNEXPECTED_ERROR");
  expect(JSON.stringify(err)).not.toMatch(/\bat .*\(.*:\d+:\d+\)/);
});
```
