# One concept, one flag name; one name, one purpose

Practice 1.4 in the [guide](../../README.md). Strategic: this is the practice that decays fastest.

### One paragraph explainer

`--since` is the start of a window everywhere, never `--from` in one command and `--after` in
another. Keep a committed table of flag name to purpose so a clash shows as a diff. Both halves
matter: one concept has one name, and one name has one purpose. An agent that learned `--since` on
the first command applies it to the tenth; every exception is a call that fails or, worse,
succeeds with a different meaning. The inconsistency compounds with each command added, so the
guard has to be automatic.

### Do

```sh
acme pr stats view --since 2026-01-01 --until 2026-02-01
acme audit view --since 2026-01-01
```

### Don't

```sh
acme pr stats view --from 2026-01-01 --to 2026-02-01
acme audit view --since 2026-01-01
```

### What goes wrong

The agent runs `acme audit view --since 2026-01-01`, then reuses the pattern on a command that
spells it `--after`. It gets "unknown option --since", retries with `--from`, and fails again. In
another command `--limit` means rows while a third uses `--limit` for a byte budget, so the agent
asks for 50 and receives 50 bytes of truncated JSON, parses it, and reports an empty result. The
agent never learned the two meanings because nothing in the tool ever said they differ.

### Edge cases and trade-offs

- "Two commands really do mean different things." Then they need different names (`--max-rows`,
  `--max-bytes`), not one name with two meanings. The table forces that decision at review.
- "Renaming breaks callers." Rename once, in the open, leave a hint, and update known callers; see
  [evolving/rename-leaves-a-hint](../evolving/rename-leaves-a-hint.md) and
  [evolving/update-hidden-callers](../evolving/update-hidden-callers.md). The cost grows with
  every command, so pay it early.
- Do not add the old spelling as an alias; see [1.1](closed-verb-set.md).
- A committed snapshot is the guard:
  [evolving/snapshot-the-surface](../evolving/snapshot-the-surface.md). A periodic review of the
  whole table is [evolving/audit-naming](../evolving/audit-naming.md).
- Value shapes follow the same rule: a window bound takes one date format everywhere, and enums
  refuse typos, see [input/enums-refuse-typos](../input/enums-refuse-typos.md).

### How to check it

Dump every flag with its help text and its purpose into a committed file and review the diff. Ban
the synonyms in a test.

```ts
import { expect, it } from "vitest";
import { createProgram } from "../src/program";

function leaves(cmd: any, path: string[] = []): any[] {
  if (cmd.commands.length === 0) return [{ cmd, path }];
  return cmd.commands.flatMap((k: any) => leaves(k, [...path, k.name()]));
}

const SYNONYMS = ["--from", "--to", "--after", "--before", "--max", "--count", "--num"];

it("keeps one purpose per flag name", () => {
  const purposes = new Map<string, Set<string>>();
  for (const { cmd, path } of leaves(createProgram())) {
    for (const opt of cmd.options as { long: string; description: string }[]) {
      expect(SYNONYMS, path.join(" ")).not.toContain(opt.long);
      const set = purposes.get(opt.long) ?? new Set();
      set.add(opt.description);
      purposes.set(opt.long, set);
    }
  }
  const table = [...purposes].sort().map(([flag, d]) => `${flag}\t${[...d].join(" | ")}`);
  expect(table.join("\n")).toMatchSnapshot();
});
```

A flag with two descriptions appears as two entries on one line, which is the diff to question.
