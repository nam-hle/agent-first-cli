# Use one shape and a closed verb set

Practice 1.1 in the [guide](../../README.md).

### One paragraph explainer

Commands are `acme <noun> <verb>`. The last segment is always a verb from a short list (`list`,
`view`, `create`, `edit`, `delete`, `search`, plus domain verbs such as `merge`), and a verb means
the same on every noun. No synonyms, no aliases, no abbreviations. A person learns a vocabulary by
reading help once; an agent learns it from the few commands it has seen and extrapolates. A closed
set makes the extrapolation right: once `view` works on one noun, it works on all of them.

### Do

```sh
acme ticket comments add ...
acme pr list
acme pr view 42
```

### Don't

```sh
acme add-comment ...     # verb-noun shape, a second grammar
acme pr ls               # abbreviation of list
acme pr show 42          # synonym of view
```

### What goes wrong

An agent reads `acme pr view 42` in one example and later needs a ticket. It tries `acme ticket
show`, gets "unknown command", then `get`, then `fetch`. Each miss costs a turn and prints a usage
screen the agent must read. Worse, the tool then adds `show` as an alias to be friendly. The agent
now has two spellings in its context, mixes them in the scripts it writes, and a later rename of
either breaks callers nobody can find.

### Edge cases and trade-offs

- "A domain verb is clearer than `edit`." Allowed: `merge`, `approve`, `transition`. Add it to the
  list in one reviewed edit, and keep it single-meaning on every noun that has it.
- "Aliases are harmless." They are not: they double the surface that help, snapshots and docs must
  cover, and they hide a typo that should fail. See [1.4](one-flag-one-purpose.md) for the same
  rule on flags and [evolving/rename-leaves-a-hint](../evolving/rename-leaves-a-hint.md) for how a
  retired name should fail with a hint instead of working.
- "Humans type `ls`." Humans have shell completion and history; the agent has neither. Optimise
  for the caller that guesses.
- A group with a single action still ends in a verb, see [1.2](group-names-plural.md).
- The unknown-command error should name the closest real command, see
  [errors/runnable-hints](../errors/runnable-hints.md).

### How to check it

Walk the command tree in a test. Every leaf name must be in the verb list, none may be a banned
synonym, and no command may register an alias.

```ts
import { expect, it } from "vitest";
import { createProgram } from "../src/program";

const VERBS = new Set(["list", "view", "create", "edit", "delete", "search", "merge"]);
const BANNED = new Set(["show", "get", "ls", "rm", "remove", "fetch", "describe"]);

function leaves(cmd: any, path: string[] = []): any[] {
  const kids = cmd.commands as any[];
  if (kids.length === 0) return [{ cmd, path }];
  return kids.flatMap((kid) => leaves(kid, [...path, kid.name()]));
}

it("uses the closed verb set", () => {
  for (const { cmd, path } of leaves(createProgram())) {
    const verb = path[path.length - 1];
    expect(BANNED.has(verb), path.join(" ")).toBe(false);
    expect(VERBS.has(verb), path.join(" ")).toBe(true);
    expect(cmd.aliases(), path.join(" ")).toEqual([]);
  }
});
```

Adding a verb means editing `VERBS`, which makes the change visible in review.
