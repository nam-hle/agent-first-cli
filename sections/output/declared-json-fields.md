# Declare the JSON fields and show them in help

Practice 2.3 in the [guide](../../README.md).

### One paragraph explainer

`--json=a,b` selects fields. Each command declares its fields in code; the type checker refuses a
declared field the result type lacks, and refuses a result key that is neither declared nor
explicitly omitted. `--help` lists the fields. Agents cannot read your source and will not guess
well: without a declared list they discover fields by trial, spending calls and context on
`--json=foo` attempts. A selection also keeps output small, which matters because everything an
agent receives is paid for in its context window. The declaration is the single place that field
selection, help text and the schema of [7.5](../help/self-describing-schema.md) read from.

### Do

```ts
type PullRequest = { id: number; title: string; state: string; author: { name: string } };

const PR_FIELDS = jsonFieldsOf<PullRequest>()(["id", "title", "state", "author.name"]);
```

```sh
acme pr list --json=id,title        # only the chosen fields
acme pr list --help                 # ends with: JSON fields: id, title, state, author.name
```

### Don't

```ts
const PR_FIELDS = ["id", "title", "state"];   // an untyped list that drifts from PullRequest
```

Here `author.name` exists in the result but nowhere in help, and renaming `state` to `status`
in the type leaves the list pointing at nothing until a user hits it.

### What goes wrong

A maintainer renames `state` to `status` in the result type but not in the list. The command still
compiles. An agent that read the help text asks for `--json=id,state`, gets objects with no `state`
key, treats the missing value as "unknown" and moves on. The pull requests it was meant to filter by
state are all treated as open, and it reports the wrong set to the user.

### Edge cases and trade-offs

- **"The type check is enough."** It is not. `author.name` passes whenever `author` exists, even if
  every `author` is null at runtime, and a presenter that reshapes data after the type was taken can
  diverge from it. Pair the compile-time check with a test over real output.
- **Unknown field requested.** Refuse with a usage error that lists the valid fields, never ignore
  it ([3.5](../errors/parse-failures.md), [6.3](../input/enums-refuse-typos.md)).
- **Fields that are expensive.** Declare them, but leave them out of the default selection, so a
  plain `--json` stays cheap.
- **Default selection.** State it in help. An agent that asks for nothing should get a stable,
  documented set, not whatever the service returned this week.
- **Omitted on purpose.** Some keys, such as raw service payloads, stay out of the contract. Mark
  them as explicitly omitted so the checker can tell deliberate from forgotten.
- **Nested paths.** Keep to one level ([2.2](json-everywhere.md)); a dotted path is still a
  plain string in the selection.
- **Evolving.** Adding a declared field is non-breaking; removing or renaming one follows
  [8.2](../evolving/rename-leaves-a-hint.md).

### How to check it

Compile-time, plus a test that runs real output through field selection and fails on a declared
field that is always null. The type check alone does not catch a stale nested path or a presenter
that reshapes data after the type was taken.

```ts
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("every declared field is populated in real output", () => {
  const fields = JSON.parse(execFileSync("acme", ["pr", "list", "--fields"]).toString()).items;
  const args = ["pr", "list", "--json=" + fields.join(",")];
  const out = JSON.parse(execFileSync("acme", args).toString());
  const pick = (row: any, path: string) =>
    path.split(".").reduce((v: any, k: string) => v?.[k], row);
  for (const field of fields) {
    const seen = out.items.some((row: any) => pick(row, field) != null);
    expect(seen, field).toBe(true);
  }
});
```
