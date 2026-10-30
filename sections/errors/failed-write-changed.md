# A failed write says whether anything changed

### One paragraph explainer

When a write fails, the caller's next move depends on whether the write happened. A rejected request
changed nothing and is safe to fix and retry. A timeout after the request left may have changed
everything. Say which: `context.changed` is `false` when you know nothing changed, `"unknown"` after a
lost connection or an unexpected error, and `true` when the write succeeded and only showing the
result failed. Pair it with `retryable: true` on transient codes, as data rather than prose.

### Do

```json
{
  "status": "error",
  "code": "NETWORK_ERROR",
  "message": "Connection lost while creating the ticket",
  "context": { "changed": "unknown", "retryable": true },
  "hint": "Run `acme ticket list --title \"Fix login\"` to check before retrying"
}
```

### Don't

```text
Error: socket hang up
```

### What goes wrong

The agent retries the create after a timeout and files the ticket twice, or gives up and reports
failure although the ticket exists.

### How to check it

For each write operation, a test forces a failure before the request is sent, and one after it
completes but before the response is read, and asserts `changed` for each. Combine with idempotent
repeats (practice 6.3) so a retry is safe where possible.

### Source

From practice.
