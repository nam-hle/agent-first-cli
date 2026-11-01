# The hint is a command that runs

Practice 3.2 in the [guide](../../README.md).

### One paragraph explainer

A hint is a command the caller can run next, written for the platform it is printed on. An agent
cannot open a wiki or ask a colleague, so "see the docs" ends its run, and a stale or foreign one
sends it down the wrong path with confidence. When the caller typed a wrong word, the envelope
([3.1](error-envelope.md)) adds `suggestions` (the nearest valid words) and the available commands.
Build hints with a typed command builder so a rename fails to compile
([4.4](../success/check-command-strings.md)), and keep the same discipline for `next`
([4.2](../success/next-as-data.md)).

### Do

```json
{
  "status": "error",
  "code": "UNKNOWN_COMMAND",
  "message": "Unknown command `bild list`",
  "context": { "field": "command", "observed": "bild list", "availableCommands": ["build"] },
  "suggestions": ["build list"],
  "hint": "Run `acme build list --project ACME`"
}
```

### Don't

```json
{ "hint": "See the documentation for the list of builds." }
```

```json
{ "hint": "Run `sudo acme daemon install`" }
```

The second one is wrong on a platform without `sudo`, and may name a flag that was renamed.

### What goes wrong

A project key is missing, and the error says "Specify a project, see the docs". The agent has no
docs, so it guesses `--project-name`, then `--proj`, then gives up and reports the task impossible.
In another case a hint still says `acme pr list --status open` three releases after the flag became
`--state`. The agent follows it exactly, gets a usage error, and now believes its own call is the
mistake, so it tries variants instead of reading the error.

### Edge cases and trade-offs

- **Hints that need a value you do not know.** Prefer a command that finds it (`acme project list`)
  over a placeholder. If a placeholder is unavoidable, make it a typed one
  ([1.6](../names/typed-placeholders.md)) and never present it as runnable.
- **Several valid next steps.** Pick the one most likely; extras go in `suggestions`. One hint, not
  a menu, keeps the agent from stalling.
- **Platform commands.** A hint that depends on the OS is built per platform, not written once with
  unix syntax.
- **No command helps.** Omit specifics rather than invent one; say what is wrong in `message`. A
  dead end that names the nearest alternative is better, see
  [4.3](../success/dead-ends-point-forward.md).
- **Objection: "typed builders are heavy".** A builder is a few lines that make a flag a symbol the
  compiler tracks. The alternative is a test that parses prose, which is the fallback for text that
  cannot be built (docs, comments).
- **Renames.** A removed name keeps a pointer to its replacement
  ([8.2](../evolving/rename-leaves-a-hint.md)).

### How to check it

Collect every hint the tool can produce, then resolve it against the real command tree.

```ts
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";
import { allHints } from "./helpers/hints"; // every hint from the error table and fixtures

function help(argv: string[]) {
  return execFileSync("./dist/acme", [...argv, "--help"], { encoding: "utf8" });
}

test("every hint names a command that exists with flags that exist", () => {
  for (const hint of allHints()) {
    const [, ...argv] = hint.match(/`acme ([^`]+)`/)![1].split(" ");
    const path = ["acme", ...argv].filter((w) => !w.startsWith("-"));
    expect(() => help(path.slice(1))).not.toThrow();
    for (const flag of argv.filter((w) => w.startsWith("--"))) {
      expect(help(path.slice(1))).toContain(flag);
    }
  }
});
```
