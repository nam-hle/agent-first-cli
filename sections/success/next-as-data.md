---
id: next-as-data
category: Errors and guidance
max: 3
---
# Offer the next step as data

Practice 4.2 in the [guide](../../README.md).

### One paragraph explainer

Add a `next` field to the JSON result object: up to three runnable commands that use real values
from this output, never placeholders. In human mode, print them dimmed on stderr, and only on a
TTY. The tool knows what usually follows a result, and it knows the current command names. The agent
only remembers, and memory goes stale after a rename. A short, exact list also keeps the agent from
wandering through the tree to find the follow-up.

### Do

```json
{ "key": "ACME-12", "next": ["acme ticket view ACME-12"] }
```

```sh
$ acme ticket create --title "Fix login" --json
{ "key": "ACME-12", "url": "https://tracker.example.com/ACME-12",
  "next": ["acme ticket view ACME-12", "acme ticket assign ACME-12 --user me"] }
```

### Don't

```json
{ "next": ["acme ticket view <ticket>", "acme see-also"] }
```

### What goes wrong

A tool prints `next: acme ticket view <ticket>`. The agent has the key in hand, but it copies the
string, sends the literal `<ticket>`, gets a not found error, and spends two more calls working out
that the placeholder was meant to be replaced. A second variant: the hint names `acme see-also`,
a command that was removed two releases ago, and the agent trusts the tool over its own doubt.

### Edge cases and trade-offs

- "Always three?" No. Offer none when nothing obvious follows. Never pad. Three is a cap.
- Every command is a complete argv line that runs as printed; see
  [../errors/runnable-hints.md](../errors/runnable-hints.md) for the same rule on errors.
- The `next` field is additive. Adding it to an existing result is a non-breaking change; consumers
  that ignore it keep working, see
  [../evolving/snapshot-the-surface.md](../evolving/snapshot-the-surface.md).
- Declare `next` in the command's JSON fields so the schema lists it, see
  [../output/declared-json-fields.md](../output/declared-json-fields.md).
- Not a tutorial. A write that has a safe preview points at it, see
  [../writes/dry-run.md](../writes/dry-run.md); a slow job points at its resume command,
  see [4.5](slow-commands.md).
- Human mode: decoration only on a TTY, see
  [../output/no-tty-decoration.md](../output/no-tty-decoration.md).
  Piped output carries no hint lines on stdout.
- Build each string with a typed builder, see [4.4](check-command-strings.md).

### How to check it

Run each command that returns `next` against a fake service. Assert the cap, the absence of
placeholders, and that every offered command parses in the real tree.

```ts
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const run = (argv: string[]) =>
  execFileSync("node", ["dist/acme.js", ...argv], { encoding: "utf8" });

test("next is short, concrete and real", () => {
  const out = JSON.parse(run(["ticket", "create", "--title", "t", "--json"]));
  const next: string[] = out.next ?? [];
  expect(next.length).toBeLessThanOrEqual(3);
  for (const line of next) {
    expect(line).not.toMatch(/<[^>]+>/);
    const [, ...argv] = line.split(" ");
    expect(() => run([...argv, "--help"])).not.toThrow();
  }
});
```

### How to score

Maximum: 3 points. `next` saves a lookup after most results, but an agent can still find the
follow-up by itself, so the weight is modest; a wrong `next` costs more than none.

Examined commands: among the sample (first 30 leaf commands by sorted path), the commands whose
result has a natural follow-up (it creates something, or lists or shows something with an id the
caller can act on), that run with no required input and print JSON (an object or an array) under
`--json`; other commands are not counted; writes only through
`--dry-run` and `--json` when `--dry-run` is listed in their help, otherwise excluded. A command
violates when any of these holds:

- **Too long:** `next` holds more than 3 entries.
- **Placeholder:** an entry contains `<` and `>` around a word, or the literal `...`.
- **Does not resolve:** an entry's command path (the longest leading run of non-flag words, after
  `acme`, for which `acme <path> --help` exits 0, longest tried first) does not exist, or a
  `--flag` in the entry is missing from that help text.
- **Foreign entry:** an entry is not a command of the tool and is not marked as a human step, or
  it is a privileged system command line (for example one using `sudo` or an administrator
  binary) that is not marked as a human step. A marker is a documented field or prefix that
  labels the entry as a step for a person (for example an actor field set to a person value, or a
  `human:` prefix). An entry marked as a human step is exempt from the resolve check.
- **Silent:** the JSON output is a bare top-level array (it cannot hold `next`), or it is an
  object with no `next` key (beside or inside the result) whose top level, an
  object nested one level deep (`{"task":{"id":"T-1"}}`), or first element of any top-level
  list-valued key, has any of `id`, `key`, `number`, `slug`, `uuid`, `name`. An empty `next: []`
  is not silent.

The [small-samples rule](../../benchmark/README.md#small-samples) applies to the examined
commands.

When the tool documents an envelope, `next` may sit beside the result object or inside it, as the
entry page's envelope rule says.

- **0:** At least 25% of the examined commands violate.
- **About half (2):** Under 25% violate and at least one does (for example `next` is concrete and
  resolves everywhere but one list result carries ids and no `next`).
- **Maximum (3):** No examined command violates.
- **Not applicable when:** no sampled command supports `--json`, or no sampled command has a
  natural follow-up, or no sampled command is examinable in the sandbox (zero examined
  commands). Never because no command prints an object.
- **Evidence:** for each examined command run `acme <command> --json 2>/dev/null` under
  `timeout 10` (or `gtimeout 10`), stdin from `/dev/null`, stdout captured alone, and parse it
  with a JSON parser. Read `next`; check its length, scan for placeholders and run
  `acme <path> --help` for each entry; a path resolves by the entry page's "resolves" rule (the
  help text names the path). Never run an entry that is a write.
