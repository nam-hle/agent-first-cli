---
id: name-what-happened
category: Output
max: 2
---
# Say what happened and name the thing

Practice 4.1 in the [guide](../../README.md).

### One paragraph explainer

After a write, print one line that says what happened and carries the id or key of the thing, then
its URL: `Created ACME-12`. An agent's next command almost always needs that id. If the tool only
says "Done.", the agent has to list, search and guess which item is the new one. With `--json` the
same facts are fields of the one result object ([3.1](../errors/error-envelope.md) covers the
failure side, [../output/json-everywhere.md](../output/json-everywhere.md) the shape).

### Do

```sh
$ acme ticket create --title "Fix login"
Created ACME-12
https://tracker.example.com/ACME-12

$ acme ticket create --title "Fix login" --json
{ "key": "ACME-12", "url": "https://tracker.example.com/ACME-12" }
```

### Don't

```sh
$ acme ticket create --title "Fix login"
Done.
```

### What goes wrong

An agent creates a ticket and the tool prints "Done." The agent now needs the key to link the
ticket to a pull request. It runs `acme ticket list --sort created`, takes the first row and links
that. Another person created a ticket a second earlier, so the agent links the wrong one. Nothing
failed; the tool simply never named the thing it made.

### Edge cases and trade-offs

- Updates and deletes name the thing too: `Updated ACME-12`, `Deleted ACME-12`. A repeat that
  changes nothing says `Unchanged ACME-12`, see
  [../writes/repeat-is-unchanged.md](../writes/repeat-is-unchanged.md).
- "Too chatty?" It is one line plus a URL. The URL goes second so a script can take line 2.
- Bulk writes: print one line per item plus a count, `Created 3 tickets`, and list the keys in the
  JSON array. Keep the list bounded, see [../output/bounded-lists.md](../output/bounded-lists.md).
- A write with nothing to name (a config change) names what was set: `Set editor to vim`.
- The line goes on stdout, since it is the result; see
  [../output/stdout-stderr.md](../output/stdout-stderr.md). A dry run says `Would create` and
  follows [4.3](dead-ends-point-forward.md).
- Service text inside the line (a title) must be sanitised first, see
  [../output/sanitise-service-text.md](../output/sanitise-service-text.md).

### How to check it

One test per write command runs it against a fake service and asserts that the first line carries
the new id, and that it is not a bare "Done".

```ts
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const acme = (...args: string[]) =>
  execFileSync("node", ["dist/acme.js", ...args], { encoding: "utf8" });

test("ticket create names the thing", () => {
  const [first, second] = acme("ticket", "create", "--title", "t").split("\n");
  expect(first).toMatch(/^Created [A-Z]+-\d+$/);
  expect(second).toMatch(/^https?:\/\//);
});

test("json result carries the key", () => {
  const out = JSON.parse(acme("ticket", "create", "--title", "t", "--json"));
  expect(out.key).toMatch(/^[A-Z]+-\d+$/);
});
```

### How to score

Maximum: 2 points. An unnamed result costs a lookup and risks the wrong item, but only after writes.

Count every write command that has an item to name; a write with none (such as `config set`)
has no id or key and is excluded, as is a write that cannot be run in a sandbox. Run each counted
write against a sandbox service with valid arguments. A write violates when its successful run
does not name the thing; failing both checks below counts once:

- **Unnamed text:** the first stdout line has no id or key of the item, or is a bare "Done" or "OK".
- **Unnamed JSON:** `--json` stdout has no `id` or `key` field, at the top level or nested one
  level deep (`{"task":{"id":"T-1"}}` counts as the identifier). A bulk write lists them in any
  top-level list-valued key.

- **0:** At least 25% of the counted writes violate.
- **About half (1):** Under 25% violate and at least one does (for example `acme ticket delete T-1`
  prints "Done." while the other writes print "Deleted T-1").
- **Maximum (2):** No counted write violates.
- **Not applicable when:** no write command exists, or none can be run against a sandbox.
- **Evidence:** `acme <write command> <valid args>` and read the first line; then the same with
  `--json 2>/dev/null` and look for `id` or `key` in the parsed result.
