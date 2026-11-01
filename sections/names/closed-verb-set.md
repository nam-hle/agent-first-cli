---
id: closed-verb-set
category: Command surface
max: 5
---
# Use one shape and a closed verb set

Practice 1.1 in the [guide](../../README.md).

### One paragraph explainer

Commands are `acme <noun> <verb>`. The last segment is always a verb from a short list (`list`,
`view`, `create`, `edit`, `delete`, `search`, plus domain verbs such as `merge`), and a verb means
the same on every noun. No synonyms, no aliases, no abbreviations. A person learns a vocabulary by
reading help once; an agent learns it from the few commands it has seen and extrapolates. A closed
set makes the extrapolation right: once `view` works on one noun, it works on all of them. A domain
verb is allowed only when it composes several primitives or a core verb would mislead, and a
compound one still starts with a core verb: `add-column`, not `insert-column`. `create` makes a new
top-level thing; `add` attaches something under an existing one.

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
  list in one reviewed edit, and keep it single-meaning on every noun that has it. It must
  compose several primitives or replace a core verb that would mislead, and a compound one must
  start with a core verb (`add-column`, not `insert-column`). `create` is a new top-level thing
  (`acme table create`); `add` attaches under an existing one (`acme table add-column`).
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
synonym, no command may register an alias, and every compound domain verb starts with a core
verb.

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

### How to score

Maximum: 5 points. A guessed verb that fails costs a turn on every noun; it touches every command.

A single-word domain verb (`merge`, `approve`) is allowed when it names a distinct action that
no core verb fits. Single-word domain verbs (for example `watch`, `set`, `bypass`, `setup`) are
judged by the closed list on this page: a word not in the list is a violation only when a listed
verb has the same meaning. The prefix rule covers only compound (hyphenated) domain verbs. A
single-word
leaf that is a noun view (a log or diff view) is an allowed domain leaf, not a synonym of a core
verb; a compound state name used as a verb (`needs-work`) violates unless it starts with a core
verb.

A violation is a sampled leaf that ends in a banned synonym of a core verb (`show`, `get`, `ls`,
`rm`, `remove`, `fetch`, `describe`), an abbreviation, or a verb-noun shape such as
`acme add-comment`; or that has an alias (for example `acme pr show` also resolves to `view`); or
whose compound domain verb does not start with a core verb (`insert-column`, not `add-column`).

When no sampled leaf has a noun (every command is `acme <verb>`), judge the verbs only against
the closed set and the synonym rules; a missing `acme <noun> <verb>` shape is then not a violation.

- **0:** At least 25% of the sampled leaves are violations, or some sampled leaf has a noun and
  the tree has no common `acme <noun> <verb>` shape.
- **About half (3):** At least one violation, but below 25% of the sampled leaves.
- **Maximum (5):** No sampled leaf is a violation.
- **Not applicable when:** the CLI has no subcommands, only flags on a single command.
- **Evidence:** Sample the first 30 leaf commands by sorted path from walking `acme --help` down,
  plus every write command. Read the last segment of each path. Run `acme pr show --help` and
  `acme pr ls --help` and check whether they resolve or fail as unknown.
