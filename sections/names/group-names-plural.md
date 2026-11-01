---
id: group-names-plural
category: Command surface
max: 2
---
# One group name, plural for collections

Practice 1.2 in the [guide](../../README.md).

### One paragraph explainer

The top-level group for an entity is singular (`pr`, `ticket`); a group for a collection inside it
is plural (`comments`, `pods`). No group has a singular twin. In a group with one verb, a plural
noun takes `list` and a singular noun takes `view`. The rule lets an agent derive the spelling of a
group from what it holds: many things, plural; one thing, singular. Without it every group name is
a fact to memorise, and a twin such as `comment` beside `comments` splits the help in two.

### Do

```sh
acme deploy pods list
acme pr status view
acme pr comments list 42
```

### Don't

```sh
acme deploy pod list     # singular twin of pods
acme pr status list      # a singleton asked to list
acme pr comment add 42   # singular group for a collection
```

### What goes wrong

The tool ships `acme pr comments list` first and, a month later, `acme pr comment add` because the
author thought of one comment. The agent lists comments with the plural group, then tries to add
one under the same group and gets "unknown command". It guesses `comments create`, which does not
exist either. It finally greps the help, finds both groups, and from then on writes every comment
command twice in its notes. Help output now shows two groups for one concept, and each new verb
leaves a coin toss about which group gets it.

### Edge cases and trade-offs

- "English plurals are irregular." Pick a plain noun and add `s` or `es`. If the plural is awkward
  (`status`, `metadata`), the noun is probably a singleton: use the singular with `view`.
- A group holding a singleton has no `list`. `acme pr status view` is right;
  `acme pr status list` should not exist, since a list of one thing invites a limit and a cursor
  nobody needs, see [output/bounded-lists](../output/bounded-lists.md).
- A top-level group may itself be a collection when the entity has no singular use. Keep one name,
  and apply the same test: no twin.
- Verb choice inside the group stays the closed set, see [1.1](closed-verb-set.md).
- A rename that fixes a twin must leave a hint, see
  [evolving/rename-leaves-a-hint](../evolving/rename-leaves-a-hint.md).

### How to check it

Use the same tree walk as [1.1](closed-verb-set.md). Collect every group name and fail when one is
the singular or plural of another; fail when a singular group offers `list`.

```ts
import { expect, it } from "vitest";
import { createProgram } from "../src/program";

function groups(cmd: any): any[] {
  return cmd.commands.filter((kid: any) => kid.commands.length > 0)
    .flatMap((kid: any) => [kid, ...groups(kid)]);
}

it("has no singular twin and no plural singleton", () => {
  const all = groups(createProgram());
  const names = new Set(all.map((g) => g.name()));
  for (const group of all) {
    const name = group.name();
    expect(names.has(name + "s"), `${name} has a plural twin`).toBe(false);
    const verbs = group.commands.map((c: any) => c.name());
    if (!name.endsWith("s")) expect(verbs, name).not.toContain("list");
  }
});
```

A new group that trips the test is either renamed or added to a reviewed exception list.

### How to score

Maximum: 2 points. A twin group splits help and costs a guess per new verb; it touches groups only.

A violation is a group with a singular or plural twin (`pod` beside `pods`), or a group nested
inside another group that has a singular name and offers `list`, or has a plural name and offers
`view` without `list`, or has a singular name and offers no `view`. The last three clauses judge
nested groups only; a top-level group is judged by the twin clause alone.

A word ending in `s` is plural only when it is a plural noun. A singular noun ending in `s` is
singular, for example `status`, `access`, `process`, `class`, `address`, `alias`, `series`,
`analysis`, `bus`, `focus`, `canvas`. Judge any other such word by its meaning.

The sample is the one on the entry page's Sampling (the first 30 leaf commands by sorted path,
plus every write and slow command). The groups counted are those that appear as ancestors of the
sampled leaves; that is the denominator. Each distinct group name counts once, in the denominator
and in the violation share, however many parents it appears under; a name violates when any of
its occurrences violates.

- **0:** At least 25% of the distinct group names in the sample are violations.
- **About half (1):** At least one violation, but below 25% of the distinct group names.
- **Maximum (2):** No group name in the sample is a violation.
- **Not applicable when:** the CLI has no group that contains subcommands, or it has groups but
  no sampled leaf has an ancestor group (the denominator is zero).
- **Evidence:** Walk `acme --help` and each group's help for the first 30 leaf commands by sorted
  path, plus every write command, and list the group names. Run `acme pr comments --help` and
  `acme pr comment --help` and check that only one of them resolves.
