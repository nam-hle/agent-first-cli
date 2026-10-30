# One envelope for every failure

### One paragraph explainer

An agent acts on error text, so the error must be data with a fixed shape. Use one envelope on stderr
for every failure: a stable `code` from a closed table, a `message`, a `context` that names the failing
input, and a `hint` that is a command to run. The same envelope applies to failures your code did not
expect: map them to a general code with a hint to re-run with `--verbose`, and never let a library's
internal message or a stack trace stand in for the error.

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

### Don't

```text
Error: ECONNRESET at TLSSocket.onConnectEnd (node:_tls_wrap:1594:19)
```

### What goes wrong

The agent sees a stack trace, treats the network library's name as the problem, and tries to fix its
environment. The real cause was a retryable transient failure that the tool could have named.

### How to check it

A test per error code asserts the envelope fields. A second test provokes an unexpected error and
asserts the general code, a hint and no stack. A third runs each group with a bad option and asserts
the same shape at any depth.

### Source

From practice.
