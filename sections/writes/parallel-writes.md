---
id: parallel-writes
category: Writes
max: 2
---
# Plan for parallel writes

Practice 6.5 in the [guide](../../README.md).

### One paragraph explainer

Agents fire several writes at once: five tickets to transition, three pull requests to approve. If
each write needs an approval, the approval path has to cope: batch the requests into one decision,
or queue them so each gets its own outcome. Declining all but one is a defect they will hit. A
person approving writes one at a time never sees it; an agent that starts five processes in
parallel does, and it gets one result and four failures it cannot explain. Every request ends with
its own outcome, and every outcome says why.

### Do

```text
5 writes -> 5 queued approvals, 5 distinct outcomes

acme ticket transition ACME-1 --to done   # approved   exit 0
acme ticket transition ACME-2 --to done   # approved   exit 0
acme ticket transition ACME-3 --to done   # denied     exit 5, "denied by approver"
acme ticket transition ACME-4 --to done   # timed out  exit 8, "approval not given in 120s"
acme ticket transition ACME-5 --to done   # approved   exit 0
```

### Don't

```text
5 writes -> 1 approved, 4 "declined" with no reason
```

### What goes wrong

An agent transitions five tickets in parallel to save time. The approval service shows one dialog
at a time and treats a request that arrives while one is open as busy. One write is approved. The
other four exit with "declined", the same word used when a person says no. The agent concludes a
person refused four of them and reports that. The person never saw them. Retrying all five again
in parallel gives the same result, and the agent starts looking for a flag to get around it, which
[6.4](no-yes-or-force.md) forbids.

### Edge cases and trade-offs

- **Queue or batch?** A batch gives the person one decision over a list, which is quicker, but the
  list must show every item exactly. A queue is simpler and keeps each decision separate. Either
  is fine; silently dropping requests is not.
- **Outcomes are distinct.** Denied by a person, expired, busy and cancelled map to different exit
  classes in [3.4](../errors/exit-code-classes.md) (5 denied, 7 transient, 8 cancelled) and carry
  different `code` values in the [3.1](../errors/error-envelope.md) envelope. "Declined" alone is
  not enough.
- **Transient is retryable.** If the service was busy, say so, give a hint that is a runnable
  command ([3.2](../errors/runnable-hints.md)) and say whether anything changed
  ([3.5](../errors/failed-write-changed.md)).
- **A long wait** for approval is a slow command; follow [4.5](../success/slow-commands.md) and
  tell the caller what it is waiting for.
- **Fan-out.** Tell the caller in help that parallel calls are supported and how many wait at
  once. Bound the queue and refuse over the limit with a clear code.
- **Order.** Do not promise an order unless you keep one; if writes depend on each other, the
  agent should run them in sequence.
- **Idempotence helps.** A retried request that was approved the first time ends `unchanged`
  per [6.3](repeat-is-unchanged.md).

### How to check it

An integration test starts N writes at once against a fixture approver and asserts one distinct,
explained outcome per write.

```ts
import { spawn } from "node:child_process";
import { expect, test } from "vitest";

const run = (key: string) =>
  new Promise<{ status: number | null; out: string }>((resolve) => {
    const p = spawn("acme", ["ticket", "transition", key, "--to", "done", "--no-input", "--json"]);
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("close", (status) => resolve({ status, out }));
  });

test("five parallel writes get five explained outcomes", async () => {
  const keys = ["ACME-1", "ACME-2", "ACME-3", "ACME-4", "ACME-5"];
  const results = await Promise.all(keys.map(run));
  for (const r of results) {
    const body = JSON.parse(r.out);
    expect(r.status === 0 ? body.result.outcome : body.error.message).toBeTruthy();
  }
  const declined = results.filter((r) => JSON.parse(r.out).error?.code === "declined");
  expect(declined).toEqual([]);
});
```

### How to score

Maximum: 2 points. Rare to hit but misleads the agent; affects only gated writes.

- **0:** Several parallel gated writes yield one approval and the rest fail with "declined" or
  "busy" and no reason.
- **About half (1):** Parallel writes each get an outcome, but a reason is missing or reused, for
  example a timeout reported with the same word as a person's denial.
- **Maximum (2):** Five parallel gated writes end with five distinct outcomes (approved exit 0,
  denied exit 5, timed out exit 8), each with its reason.
- **Not applicable when:** no write has a gate of any kind (no prompt, no
  confirm flag and no approval).
- **Evidence:** Only inside the entry page's "Probes and safety" sandbox, start five gated writes
  on throwaway items with `--json` in parallel, deny one and let one time out; compare each exit
  code and `error.message`. Where a real service is the only target, the probe is "not
  exercised" (defined on the entry page, Probes and safety).
