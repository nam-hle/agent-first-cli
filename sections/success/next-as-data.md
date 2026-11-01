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
