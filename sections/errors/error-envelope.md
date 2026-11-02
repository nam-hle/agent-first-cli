---
id: error-envelope
category: Errors
max: 8
---
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

### How to score

Maximum: 8 points. Every recovery step branches on the error shape, so one unshaped failure
breaks the loop for every command that can hit it.

Probe set: the first 10 read commands by sorted path of the sample, plus, for the unknown-flag
provocation only, every write command of the sample (a parse failure never runs the command).
Each provocation below is one counted error:

- the root unknown command `acme zzz-no-such`;
- each probe command with `--no-such-flag`;
- each read probe command with a required input omitted, when it has one;
- bare `acme` and every group on the path to a probe command, without a verb;
- each read probe command that takes an id, given `nonexistent-0` (the
  [id probe rules](../../benchmark/README.md#id-probe)
  say what takes an id).

A counted error violates when any of these holds:

- **Exit 0:** the provocation exits 0 (the input was accepted, or an error body came with exit 0,
  or the output is empty).
- **Not one object:** stderr is not exactly one JSON object (plain text, a library help page, a
  stack trace, empty stderr).
- **Missing key:** the object lacks `status`, `code`, `message` or `hint`, or its context has no
  key that carries the failing input's name, or, when the error concerns an input value, no key
  that carries the observed value (any such key counts when the tool's own docs or help state
  it, as in [3.3](context-names-input.md); the docs need not list the key names, a documented
  statement that errors carry a field naming the failing input counts when a sampled error shows
  such a key). An error with no value (missing command, missing argument) needs the input name
  only; listing the available commands or the missing argument under any documented key names
  it. A key named after the input (for example `package`) whose value is the observed input
  counts, as in [3.3](context-names-input.md). A typed value split across two context keys (for
  example `repo` and `path` holding halves of one typed id) counts if the keys together
  reproduce the typed value. Only the context keys are relaxed; the other four
  keep their names.
- **Open code:** `code` does not match `^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$`.
- **Leak:** stderr carries any stack trace or panic output.

- **0:** At least 25% of the counted errors violate.
- **About half (4):** Under 25% violate and at least one does (for example every error is an
  envelope except `acme build` alone, which prints the parser's help page).
- **Maximum (8):** No counted error violates.
- **Not applicable when:** never; the root unknown-command provocation always runs.
- **Evidence:** run each provocation under `timeout 10` (or `gtimeout 10`) with stdin from
  `/dev/null`, stderr redirected to a file in the sandbox. Parse that file with a JSON parser
  (`jq -e .` or `node -e`): it must be one object with `status`, `code`, `message`, `hint` and a
  context carrying the documented input-name key. Check stdout separately only
  to note it; it does not affect this score.
