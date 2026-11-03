---
id: empty-result-succeeds
category: Output
max: 2
---
# An empty result is a success

Practice 4.6 in the [guide](../../README.md).

### One paragraph explainer

A read that matches nothing succeeds: exit 0, the same result object as a full answer, with an empty
list in it (`"items": []`, `"total": 0`). It is not a not-found error and not a bare `null`. An agent
has to tell "there is nothing" from "I asked wrongly", and an error for an empty search sends it off
to fix a command that was fine. The way forward from an empty result belongs to
[4.3](dead-ends-point-forward.md); this page is about its status and shape.

### Do

```sh
$ acme build jobs list --state failed --json      # exit 0
{ "items": [], "total": 0, "next": ["acme build jobs list"] }
```

### Don't

```sh
$ acme build jobs list --state failed --json      # exit 3
{ "status": "error", "code": "NOT_FOUND", "message": "No jobs found" }

$ acme build jobs list --state failed --json      # exit 0
null
```

### What goes wrong

An agent searches for failed builds and gets `NOT_FOUND`, exit 3. It reads the class as "the thing I
named does not exist", checks the project key, retries with two other spellings and reports that
the tool is broken. The project was right and no build had failed.

### Edge cases and trade-offs

- **A named thing that is missing is still not found.** `acme ticket view NOPE-1` exits 3
  ([3.4](../errors/exit-code-classes.md)); a filter or query that matches no record is a
  success. The line is between one id asked for and a set asked about.
- **Bad filter values.** A typo in a closed set is a usage error ([5.3](../input/enums-refuse-typos.md)),
  not an empty result.
- **Shape.** The empty result keeps the one-object shape of [2.2](../output/json-everywhere.md): the
  list member is `[]`, not absent, so a caller can read it without a branch.
- **Human output.** A sentence such as `No jobs matched.` goes with the way forward of
  [4.3](dead-ends-point-forward.md); blank output is scored there.

### How to check it

Run each list and search command with a filter that matches nothing and assert exit 0 and an empty
list in the result object.

```ts
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";

test("a filter that matches nothing exits 0 with an empty list", () => {
  const run = spawnSync("acme", ["build", "jobs", "list", "--state", "failed", "--json"], {
    encoding: "utf8",
  });
  expect(run.status).toBe(0);
  expect(JSON.parse(run.stdout).items).toEqual([]);
});
```

### How to score

Maximum: 2 points. An error for an empty search misleads, but only on list and search commands that
take a filter.

Run the empty-list probe of [4.3](dead-ends-point-forward.md) once and score both practices from
it: each sampled list or search command with one filter flag or query (not `--limit`) set to
`zzz-no-match-0`; one that rejects the value as a usage error is not exercised. Judge the exit code
and the shape only. A probed command violates when it exits non-zero, or when its JSON mode returns
no result object with an empty list member (a `null`, a bare array or an error envelope). Let N be the probed commands and V the violating ones. The
[small-samples rule](../../benchmark/README.md#small-samples) applies.

- **0:** V x 4 >= N: at least 25% of the probed commands fail an empty result.
- **About half (1):** V >= 1 and V x 4 < N.
- **Maximum (2):** V = 0.
- **Not applicable when:** no sampled list or search command accepts a filter or query that can
  match nothing.
- **Evidence:** each probe command line, its exit code and its stdout, read as in 4.3.
