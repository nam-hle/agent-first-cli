# Generate the reference, do not write it

Practice 7.4 in the [guide](../../README.md).
Practice 7.4 in the [guide](../../README.md#74-generate-the-reference-do-not-write-it).

### One paragraph explainer

The command tree describes itself as data: names, descriptions, arguments, flags, examples, output
fields, exit codes. The reference docs and any agent tool definitions are generated from that data,
and a test fails when the description is incomplete. A hand-written reference is a second copy of
the truth, and a second copy is wrong within a release. An agent reads the reference as fact and
acts on it, so a stale flag name costs a failed call at best and a wrong write at worst. One source
feeds help ([7.1](help-leads-with-example.md)), search ([7.2](two-hop-discovery.md)) and the schema
([7.5](self-describing-schema.md)).

### Do

```sh
acme docs-gen          # reference pages and tool definitions, from the command tree
```

```text
docs/reference/pr-list.md      <- generated, header says "do not edit"
dist/tools.json                <- generated agent tool definitions
```

### Don't

```text
docs/reference.md      <- edited by hand next to the code
```

### What goes wrong

A maintainer renames `--state` to `--status` on `pr list` and updates the command, not the
hand-written reference. The agent's tool definitions were copied from that reference. For weeks
every agent call passes `--state open`, the tool answers with a usage error, and the agent
concludes the filter is unsupported and lists everything. The failure is silent in the sense that
no test noticed: nothing connected the docs to the code.

### Edge cases and trade-offs

- "Prose guides still need writing." Yes. Generate the reference (what exists); write the guides
  (when and why). Keep them in separate folders and link from the guide to the generated page, so
  nobody edits the wrong one.
- Hand-written text lives in the command definition: the description, the examples, the notes.
  It is reviewed with the code change that makes it true.
- Generated files are committed or rebuilt in CI, but never both ways. A stale committed copy is
  caught by a diff in the build, the same idea as [8.1](../evolving/snapshot-the-surface.md).
- A rename must still leave a hint ([8.2](../evolving/rename-leaves-a-hint.md)); regeneration
  fixes the docs, not the callers.
- Tool definitions for agents inherit the same names, so naming rules apply once
  ([8.4](../evolving/audit-naming.md)).
- Completeness is enforced, not requested: a missing description is a failing test, not a
  review comment. Aim at the rule "a doc that says never do X is a missing check".
- Generation must be deterministic. Sort keys and strip timestamps, or every run produces a diff.

### How to check it

Walk the tree, fail on gaps, then regenerate and fail on a diff.

```sh
set -e
acme docs-gen
git diff --exit-code docs/reference dist/tools.json
```

```ts
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const tree = JSON.parse(execFileSync("./dist/acme", ["--help", "--json"], { encoding: "utf8" }));

test("every command is fully described", () => {
  for (const c of tree.leaves as any[]) {
    expect(c.description, c.path).toBeTruthy();
    expect(c.examples?.length, `${c.path} needs an example`).toBeGreaterThan(0);
    expect(c.exitCodes, c.path).toBeDefined();
    for (const f of c.flags) expect(f.description, `${c.path} ${f.name}`).toBeTruthy();
  }
});
```
