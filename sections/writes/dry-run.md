# Every write has `--dry-run`

Practice 6.1 in the [guide](../../README.md).

### One paragraph explainer

Every command that changes something accepts `--dry-run`. The preview runs the same selection logic
as the real run and the same refusals (duplicate, locked, forbidden, conflict), and it returns
structured output in the same shape as the real result, with `result` naming what would happen. An
agent cannot see the future, so it uses the preview to decide. A preview that is a stub tells it
"fine" and the real write then fails with an error the preview should have shown. A person eyeballs
a plan and spots the gap; an agent trusts it.

### Do

```sh
acme pr merge 42 --dry-run
# exit 6, error envelope: code "conflict", hint "acme pr rebase 42"
# the real merge would refuse for the same reason, so the preview refuses

acme ticket link ACME-1 ACME-2 --dry-run
# {"result":{"outcome":"would-link","dry_run":true},"next":[...]}
```

### Don't

```sh
acme pr merge 42 --dry-run
# prints "would merge" without checking for conflicts, exit 0
```

### What goes wrong

An agent is asked to merge ten pull requests. It previews each one, sees ten "would merge" lines and
proceeds. The preview only printed the arguments back; it never loaded the pull requests. Three of
them have conflicts and one is locked. The real runs fail one by one, each with an error the agent
has not seen before, after the first six merges have already landed in an order nobody planned. The
agent cannot tell whether to stop or continue, because the preview promised a clean run.

### Edge cases and trade-offs

- **Cost of reads.** A faithful preview needs the same reads as the real run. That is the point.
  If a refusal depends on state that changes between preview and run, say so in the output, and do
  not hide it by skipping the check.
- **"The preview can never be exact."** True: another writer can act in between. The promise is
  that a refusal the tool could know about is shown. Races are the business of
  [6.3](repeat-is-unchanged.md) and [3.5](../errors/failed-write-changed.md).
- **Writes with no useful preview** (an append to a log) still accept the flag and return what
  would be written, so callers need no special case.
- **Shape.** The preview uses the one-object result of [2.2](../output/json-everywhere.md) and
  declares its fields as in [2.3](../output/declared-json-fields.md). Mark it with a field such as
  `dry_run`, and use the same outcome words as [4.1](../success/name-what-happened.md) with a
  `would-` prefix.
- **Exit code.** A refused preview exits with the same class as the real refusal, per
  [3.4](../errors/exit-code-classes.md), not 0.
- **Previews never prompt.** See [6.2](confirm.md).

### How to check it

Walk the command tree, find every write, and require the flag. Then run one preview against a
known-bad state and compare it with the real refusal.

```ts
import { execFileSync, spawnSync } from "node:child_process";
import { expect, test } from "vitest";

const schema = JSON.parse(execFileSync("acme", ["schema", "--json"], { encoding: "utf8" }));

test("every write declares --dry-run", () => {
  const writes = schema.commands.filter((c: any) => c.writes);
  expect(writes.length).toBeGreaterThan(0);
  for (const c of writes) expect(c.flags.map((f: any) => f.name)).toContain("dry-run");
});

test("preview refuses like the real run", () => {
  const args = ["pr", "merge", "conflicted-fixture", "--json"];
  const preview = spawnSync("acme", [...args, "--dry-run"], { encoding: "utf8" });
  const real = spawnSync("acme", args, { encoding: "utf8" });
  expect(preview.status).toBe(real.status);
  expect(JSON.parse(preview.stdout).error.code).toBe(JSON.parse(real.stdout).error.code);
});
```
