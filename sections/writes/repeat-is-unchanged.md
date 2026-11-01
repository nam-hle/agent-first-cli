# A repeated write ends `unchanged`

Practice 6.3 in the [guide](../../README.md).

### One paragraph explainer

Doing the same write twice reports `unchanged`, exits 0, and changes nothing: not a duplicate, and
not an error. Agents retry after a timeout, a dropped connection or a lost result, and they often
cannot tell whether the first attempt landed. If the second run doubles the effect, every retry is
a gamble. If the second run errors with "already exists", the agent reads a failure where the goal
state was reached. The outcome word comes from [4.1](../success/name-what-happened.md): `linked`
the first time, `unchanged` the second.

### Do

```sh
acme ticket link ACME-1 ACME-2   # {"outcome":"linked", ...}
acme ticket link ACME-1 ACME-2   # {"outcome":"unchanged", ...}   exit 0
```

### Don't

```sh
acme ticket link ACME-1 ACME-2   # linked
acme ticket link ACME-1 ACME-2   # linked again, a duplicate link
acme ticket comment add ACME-1 --body "ok"   # a second identical comment on every retry
```

### What goes wrong

An agent adds a label to forty tickets. On ticket 23 the connection drops after the request was
sent but before the reply. The agent reruns the whole batch from the top. The tool has no notion of
"already done", so each of the first 22 tickets gets a second, identical entry in its history, and
ticket 23 gets one or two depending on the server. The agent finishes, reports success, and leaves
behind forty-odd stray changes that nobody asked for. Had the second pass reported `unchanged`, the
rerun would have been free.

### Edge cases and trade-offs

- **Not every write can be idempotent.** Creating a new record, or appending a comment, makes a new
  thing each time. Say so in help, return the new id, and give callers a way to ask first, such as
  `acme ticket list --json` filtered on the title, shown in `next` per
  [4.2](../success/next-as-data.md). A client-supplied key such as `--key` for creates is better
  still.
- **"Unchanged" must be true.** Compare the real state, not a local cache. Report `unchanged` only
  when the target already equals what was asked.
- **Partly the same.** If the write changes some fields and not others, name the ones that changed.
  Do not collapse to `unchanged` or to `updated` without detail.
- **It is not an error.** Exit 0, not the conflict class 6 from
  [3.4](../errors/exit-code-classes.md). Class 6 is for a state that blocks the request, such as a
  different value already set.
- **After a failure.** [3.5](../errors/failed-write-changed.md) says whether the failed write
  changed anything; together the two make a retry safe.
- **Previews** report the same word with `would-`: see [6.1](dry-run.md).

### How to check it

For each write you claim is idempotent, run it twice against a fixture and compare. Keep a list of
the writes that are not, and assert it does not grow by accident.

```ts
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";

const idempotent = [
  ["ticket", "link", "ACME-1", "ACME-2"],
  ["ticket", "label", "add", "ACME-1", "--label", "triage"],
];

test.each(idempotent)("a repeated write ends unchanged: %s", (...args) => {
  const run = () => spawnSync("acme", [...args, "--json"], { encoding: "utf8" });
  const first = run();
  const second = run();
  expect(first.status).toBe(0);
  expect(second.status).toBe(0);
  expect(JSON.parse(second.stdout).result.outcome).toBe("unchanged");
});
```
