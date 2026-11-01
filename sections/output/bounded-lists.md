---
id: bounded-lists
category: Output
max: 5
---
# Bound every list and say when you cut

Practice 2.5 in the [guide](../../README.md).

### One paragraph explainer

Every list or search takes `--limit` with a declared default and a stated, deterministic order: a
sort key plus the id, so pages never overlap and a rerun over the same data returns the same rows.
A cut result says so and how to continue: "20 of 134, narrow with `--state`". When narrowing is
not enough, the JSON carries `total` and an opaque `nextCursor`, and `next` holds the runnable
command that uses it ([4.2](../success/next-as-data.md)). An agent has a finite context and cannot
tell a complete answer from a truncated one unless you say so: an unbounded dump fills the window,
and a silent cut-off is read as the whole truth.

### Do

```text
20 of 134 shown. Narrow with --state open, or raise --limit.
```

```json
{
  "items": [{ "id": 101, "title": "Fix login" }],
  "total": 134,
  "nextCursor": "c2VlayAyMA",
  "next": ["acme pr list --state open --limit 20 --cursor c2VlayAyMA"]
}
```

Order is stated in help: "newest first, ties broken by id".

### Don't

```text
(134 rows, unpaged)        or        (20 rows, no mention that 114 more exist)
```

```json
{ "items": [ ...20 rows... ] }
```

An exactly-full page with no `total`, `nextCursor` or note looks identical to a complete one.

### What goes wrong

The agent runs `acme pr list` to find whether a branch already has a pull request. The tool returns
the first 20 rows, with no sign of more. The branch's pull request is row 57, so the agent
concludes none exists and opens a duplicate. A second variant: the order is by update time only, so
two pages fetched a minute apart overlap and skip a row that changed between them.

### Edge cases and trade-offs

- **"Narrowing is better than paging."** Usually, which is why the cut note names the narrowing flag
  first. Cursors exist for the cases where the set stays large after every sensible filter.
- **Cursors are opaque.** Do not document their content, so you can change it freely. Reject a
  stale or malformed one with a usage error ([3.5](../errors/parse-failures.md)).
- **Default size.** Pick a number that fits comfortably in context, state it in help, and keep it
  the same across commands ([1.4](../names/one-flag-one-purpose.md)).
- **Small by nature.** A list that cannot grow (the verbs of one tool, the states of a workflow)
  needs no limit. Say so by test, not by omission.
- **Total can be expensive.** If the service cannot count cheaply, omit `total` and set a boolean
  such as `hasMore`; never report a made-up count.
- **Deterministic order.** A sort key alone is not enough when keys tie. Add the id as the last
  key. Without it, offset or cursor paging duplicates or drops rows.
- **Search relevance.** Ranked results are fine if the rank is stable for identical input;
  say it in help.
- **Bulk reads.** An agent that truly needs everything should be able to ask: raise `--limit`, or
  follow `next` in a loop. Do not offer an unbounded flag by default.
- **Fixed-size output elsewhere.** Long text fields follow [6.4](../input/long-text-from-file.md)
  and its counterpart on output: truncate visibly, never silently.

### How to check it

A test finds every list and search command and asserts it takes `--limit` or is small by nature; a
full page offers a bigger `--limit` or a cursor; two runs over the same data return the same order.

```ts
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

const run = (args: string[]) => JSON.parse(execFileSync("acme", [...args, "--json"]).toString());

it("a cut page says so and continues", () => {
  const page = run(["pr", "list", "--limit", "2"]);
  expect(page.items).toHaveLength(2);
  expect(page.total).toBeGreaterThan(2);
  expect(page.next[0]).toContain("--cursor");
});

it("order is stable", () => {
  expect(run(["pr", "list"]).items.map((r: any) => r.id)).toEqual(
    run(["pr", "list"]).items.map((r: any) => r.id),
  );
});
```

### How to score

Maximum: 5 points. A silent cut or an unbounded dump makes an agent decide on partial data.

Count the list and search commands in the sample (first 30 leaf commands by sorted path): those that
return a collection of items. A list command is any command whose result is an array of records
that can grow with the data (build failure lists and audit views included).
A set fixed by the tool itself (its verbs, workflow states) is small by nature and is not
counted. A counted command violates when any of these holds:

- **Unbounded:** `--help` lists no `--limit` (or equivalent) and no default page size.
- **Silent cut:** with `--limit 1` over data of at least two rows, it returns one row and no
  `total`, `hasMore`, `nextCursor`, sentence saying more exist, or `next` entry that offers a
  larger limit or the next page. Any one of these is the "cut" signal. Not tested when the sandbox
  data has fewer than two rows.
- **Unstable order:** help states no order, or two identical runs return different row orders.
  Help "states an order" when it names a sort key, a default order, or offers a sort flag; a
  statement that the order is the server's or unspecified is not stating an order. A command
  with no stated order violates only if it returns more than one row. For the order sub-check, a
  command that states no order counts as unbounded.

- **0:** At least 25% of the counted commands violate.
- **About half (3):** Under 25% violate and at least one does (for example `acme pr list --limit 2`
  returns two rows with no sign that 132 more exist).
- **Maximum (5):** No counted command violates.
- **Not applicable when:** no sampled command lists or searches.
- **Evidence:** `acme <command> --help` for the limit flag (`--limit` or the equivalent it names)
  and the order. Run `acme <command> <limit flag> 1 --json 2>/dev/null` twice, only when the
  command lists both that flag and `--json`; read the keys beside `items` and compare the row
  order of the two runs.
