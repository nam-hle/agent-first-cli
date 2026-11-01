---
id: dead-ends-point-forward
category: Errors and guidance
max: 2
---
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

### How to score

Maximum: 2 points. A dead end costs retries only at three specific outputs, so the weight is
small.

Fixture: the sandbox must hold at least two rows for each list probed. A list that cannot be
seeded to two rows is "not exercised" for the cut-list probe only.

Exercised dead ends, from the sample (first 30 leaf commands by sorted path):

- **Dry run:** each write that lists `--dry-run` in its help, run with `--dry-run` and inputs
  taken from read output of the sandbox; one that errors is not exercised.
- **Empty list:** each list command run with one filter flag (not `--limit`) set to
  `zzz-no-match-0`; one that rejects the value as a usage error is not exercised.
- **Cut list:** each list command run with `--limit 1` over a list seeded to at least two rows.

A dead end violates when it lacks a resolving way forward. Resolving means the entry's command
path (the longest leading run of non-flag words, after `acme`, for which `acme <path> --help`
exits 0, longest tried first) exists and each `--flag` in it appears in that help:

- **Dry run:** no `next` (or printed line) holds the same command with the same arguments minus
  `--dry-run`.
- **Empty list:** the output is blank, or says nothing matched but offers no resolving command.
- **Cut list:** it gives no count of omitted rows (`total`, "N more", "1 of N") or no resolving
  command that returns more.

- **0:** At least 25% of the exercised dead ends violate.
- **About half (1):** Under 25% violate and at least one does (for example a dry run and a cut
  list point forward but an empty list prints nothing).
- **Maximum (2):** No exercised dead end violates.
- **Not applicable when:** no dead end is exercised: no sampled write has `--dry-run`, no sampled
  list accepts a filter value that matches nothing, and no sampled list can be seeded to two rows.
- **Evidence:** run each dead end under `timeout 10` (or `gtimeout 10`), stdin from `/dev/null`,
  with `--json` when listed. Capture stdout alone and stderr alone; read `items`, `total` and
  `next` from the JSON, or the text lines when no `--json`. Never run a write without its
  `--dry-run`; a write without one is excluded.
