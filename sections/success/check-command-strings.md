---
id: check-command-strings
category: Discoverable and evolving
max: 3
---
# Check every command written inside a string

Practice 4.4 in the [guide](../../README.md).

### One paragraph explainer

Examples, error hints, `next`, recipes and docs all mention commands. Build the ones in code with a
typed builder, so a renamed flag fails to compile, and scan the remaining prose in a test. A string
is the one place the compiler cannot see. An agent follows a printed command literally, so a stale
string is a wrong instruction delivered with the tool's authority.

### Do

```ts
cmd("pr list").flag("state", "open").build();    // a renamed flag fails tsc
```

```sh
# the same check for prose: every `acme ...` in docs and source resolves in the tree
acme pr list --state open --help
```

### Don't

```ts
"acme pr list --status open"                      // a plain string; nothing checks it
```

### What goes wrong

A maintainer renames `--status` to `--state` and updates the code, the help and the tests. One
error hint still says `try: acme pr list --status open`. An agent hits that error, runs the hint
as printed, gets a usage error (exit 2) from the very command the tool recommended, and then
concludes the whole subcommand is unusable.

### Edge cases and trade-offs

- "A builder is heavy." It is a few dozen lines: command and flag names come from the same tables
  that register the commands, so the types follow the tree. The cost is paid once.
- Prose cannot use the builder. The scan covers it: extract code spans and fenced blocks that start
  with `acme`, then resolve each one. Mark deliberate counter-examples (a "Don't" block) with a
  tag the scan skips, so they stay out of the check.
- Resolve means: the path of verbs exists, every flag exists, and enum values are valid, see
  [../input/enums-refuse-typos.md](../input/enums-refuse-typos.md). Typed placeholders in synopsis
  lines are fine, see [../names/typed-placeholders.md](../names/typed-placeholders.md).
- A rename should leave a hint and a snapshot diff, see
  [../evolving/rename-leaves-a-hint.md](../evolving/rename-leaves-a-hint.md) and
  [../evolving/snapshot-the-surface.md](../evolving/snapshot-the-surface.md).
- Generated docs ([../help/generate-the-reference.md](../help/generate-the-reference.md)) cannot
  go stale, but hand-written pages can; this scan is what covers them.
- Examples in help text are strings too, see
  [../help/help-leads-with-example.md](../help/help-leads-with-example.md).

### How to check it

A `command-strings` test walks the source and the docs, finds every `acme ...` line and resolves it
against the real tree with `--help`, which parses flags without running the command.

```ts
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { expect, test } from "vitest";

test("every command written in a string resolves", () => {
  const files = [...globSync("src/**/*.ts"), ...globSync("docs/**/*.md")];
  const found = files.flatMap((f) =>
    [...readFileSync(f, "utf8").matchAll(/`(acme [^`<>]+)`/g)].map((m) => m[1]!),
  );
  for (const line of found) {
    const argv = line.split(" ").slice(1);
    expect(() =>
      execFileSync("node", ["dist/acme.js", ...argv, "--help"], { stdio: "pipe" }),
    ).not.toThrow();
  }
});
```

### How to score

Maximum: 3 points. A stale command string is a wrong instruction the tool itself issued, but it
sits on a few text surfaces (hints, `next`, examples, docs), not on every command.

Sample of strings: every command line that starts with `acme`, taken in this order and stopped at
60 strings: the `hint` and `next` values of the error provocations (`acme zzz-no-such`, and
`--no-such-flag` on each of the first 10 sampled commands); the help examples of those 10 commands;
then the code spans and fenced lines of `README.md` and `docs/**/*.md`, by sorted path. Strings
holding a `<...>` placeholder, and strings inside a block marked as a deliberate counter-example
(a "Don't" block), are not counted. Text marked as history (dated plans, specs, changelogs,
investigation notes, anything under a docs folder of plans, specs or history) is not a source of
strings. A shorthand of alternates (`acme a b|c|d`) is checked per alternate, and a prefix match
on the group word alone does not resolve an alternate that does not exist. A counted string
resolves when its command path (the longest
leading run of non-flag words for which `acme <path> --help` exits 0) exists and every `--flag` in
it appears in that help text. A path exits 0 for this only if its help text names the path, as in
the entry page's "resolves" rule. A counted string violates when it does not resolve.

- **0:** At least one string is counted and at least 25% of the counted strings violate.
- **About half (2):** At least one string is counted, under 25% violate, and at least one does.
- **Maximum (3):** At least one string is counted and none violates.
- **Not applicable when:** no string is counted at all (nothing in hints, `next`, help examples
  or readable docs names a command). When the repo and docs are not readable (a closed or vendor
  CLI), skip the docs part and score the live strings only (hints, `next`, help examples).
- **Evidence:** list the strings with `grep -rhoE '`acme [^`]+`' README.md docs` (read-only) and
  add the hints and examples captured from the probes. For each, run
  `timeout 10 acme <path> --help` with stdin from `/dev/null` (a help call parses flags and never
  runs the command, so it is safe on writes) and search the output for each flag. Capture the
  string, its source file and the verdict; the violating share proves the anchor.
