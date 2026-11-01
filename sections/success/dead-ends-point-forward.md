# Dry runs, empty results and cut-offs all point forward

Practice 4.3 in the [guide](../../README.md).

### One paragraph explainer

Three outputs tend to stop dead: a dry run, an empty list and a cut-off list. Give each a way
forward. A dry run's `next` is the same command without `--dry-run`. An empty result says so in a
sentence and offers a way to widen the search. A cut result says how many were left out and offers
a bigger `--limit`. A person reads a blank screen and knows what happened. An agent reads it as
either success or a broken tool, and has to guess which.

### Do

```text
$ acme pr merge 42 --dry-run
Would merge PR 42.          next: acme pr merge 42

$ acme build jobs list --state failed
No jobs matched.            try: acme build jobs list

$ acme pr list --limit 2
(2 rows)                    showing 2 of 31, next: acme pr list --limit 31
```

```json
{ "items": [], "total": 0, "next": ["acme build jobs list"] }
```

### Don't

```text
$ acme pr merge 42 --dry-run
Would merge PR 42.          (no next step)

$ acme build jobs list --state failed
                            (blank output for an empty list)
```

### What goes wrong

An agent filters builds with `--state failed` and the tool prints nothing and exits 0. The agent
cannot tell whether no build failed, the filter was misspelled, or the service dropped the request.
It retries with different filters four times. With a line like
`No jobs matched. try: acme build jobs list` it would have seen the filter was fine and moved on.

### Edge cases and trade-offs

- Empty is not an error: exit 0, and the JSON stays a valid object with an empty `items` array.
  Do not switch to exit 3, which is for a named thing that does not exist, see
  [../errors/exit-code-classes.md](../errors/exit-code-classes.md).
- The dry run's `next` must be exactly what runs, flags and all. It is the preview contract of
  [../writes/dry-run.md](../writes/dry-run.md); a writing command still needs
  [../writes/confirm.md](../writes/confirm.md) where that applies.
- A cut list names how many remain. The cap itself is
  [../output/bounded-lists.md](../output/bounded-lists.md); this page is only about the way on.
- "Won't `next` for an empty result clutter piped output?" The line goes to stderr on a TTY, and the
  JSON field is present always, see [4.2](next-as-data.md).
- A widening hint may drop a filter; it must name the filter it dropped, so the agent can judge.

### How to check it

Snapshot the empty-list and cut-off lines, and assert each offered command resolves in the tree.

```ts
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const run = (...argv: string[]) =>
  execFileSync("node", ["dist/acme.js", ...argv], { encoding: "utf8" });

test("empty list says so and offers a way", () => {
  const out = JSON.parse(run("build", "jobs", "list", "--state", "none", "--json"));
  expect(out.items).toEqual([]);
  expect(out.next.length).toBeGreaterThan(0);
});

test("dry run next is the real command", () => {
  const out = JSON.parse(run("pr", "merge", "42", "--dry-run", "--json"));
  expect(out.next).toContain("acme pr merge 42");
});
```
