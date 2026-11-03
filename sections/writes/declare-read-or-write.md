---
id: declare-read-or-write
category: Effects
max: 3
---
# Declare whether a command reads or writes

Practice 6.6 in the [guide](../../README.md).

### One paragraph explainer

Every command's help says whether it changes state, in one fixed, machine-findable place: a line such
as `Changes: nothing`, `Changes: local settings` or `Changes: remote state`. An agent, a sandbox and
a reviewer must decide whether a command is safe to try before running it, and a name is a poor
guide: `acme access revoke` and `acme access list` look alike, and only one is safe. With the effect
declared, the choice is a lookup in help, not a guess. Reads and writes are as defined on the
benchmark [entry page](../../benchmark/README.md#write-command): the tool's own cache and
configuration files are not state outside the process, so a read that fills a cache is still a read.

### Do

```text
$ acme access list --help
Usage: acme access list [options]
Changes: nothing

$ acme access revoke --help
Usage: acme access revoke <subject> [options]
Changes: remote state (destructive)
```

### Don't

```text
$ acme access revoke --help
Usage: acme access revoke <subject> [options]
Removes a subject's grant.            <- the effect is in prose, if it is stated at all
```

### What goes wrong

An agent is asked to check which grants a service account has. It samples `acme access` commands to
learn the surface and runs `acme access revoke` bare, because the name reads like a status check. The
tool has no dry run on it and no declared effect, and a real grant is gone. The same agent would have
skipped the command if its help had said `Changes: remote state`.

### Edge cases and trade-offs

- **A read that writes a cache.** It declares `Changes: nothing`. A cache the tool owns is not state
  the caller cares about; see [6.7](reads-change-nothing.md) for what a read must not touch.
- **Three levels are enough.** `nothing`, `local settings` and `remote state` (or the equivalent in
  the tool's own words). More levels invite disagreement and no caller needs them.
- **Destructive writes.** Add a word when a write cannot be undone. It feeds the gates in
  [6.2](confirm.md) and [6.4](no-yes-or-force.md), which stay separate practices.
- **Groups.** A group's help lists its leaves; it need not declare an effect, since it runs nothing.
- **Machine form.** If the tool serves a schema ([7.5](../help/self-describing-schema.md)), carry the
  same value there, so a sandbox can read it without parsing help text.
- **Dry runs.** A write's `--dry-run` form ([6.1](dry-run.md)) is the way to try it; the declaration
  says which commands need one.

### How to check it

Walk the command tree and require the line on every leaf, with a value from a closed list. Assert
that the commands you know are writes declare a write and that the rest declare nothing.

```ts
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const leaves: string[][] = JSON.parse(
  execFileSync("acme", ["schema", "--json"], { encoding: "utf8" }),
).commands.map((c: { path: string[] }) => c.path);

test.each(leaves)("%j declares its effect", (...path) => {
  const help = execFileSync("acme", [...path, "--help"], { encoding: "utf8" });
  expect(help).toMatch(/^Changes: (nothing|local settings|remote state)/m);
});
```

### How to score

Maximum: 3 points. The declaration lets a caller classify any command without running it, so it
touches every command and prevents the worst mistakes.

Sample as the entry page says. Read each sampled leaf's help; do not run the command. A leaf
declares when its help states read or write in one fixed place, in any consistent wording (a
labelled line, a section, a tag); judge the behaviour, not the spelling. A leaf violates when it
declares nothing, or when the declaration is contradicted by the same help text (for example it
declares nothing changes while its description says it deletes or creates something). Let N be the
sampled leaves and M the violating leaves. The
[small-samples rule](../../benchmark/README.md#small-samples) applies.

- **0:** M x 4 >= N: at least 25% of the sampled leaves have no declaration or a contradicted one.
- **About half (2):** M >= 1 and M x 4 < N: under 25% have none or a wrong one.
- **Maximum (3):** M = 0: every sampled leaf declares its effect and none is contradicted.
- **Not applicable when:** never.
- **Evidence:** `acme <leaf> --help` for each sampled leaf, quoting the declaring line or its
  absence. Never run a command to settle a declaration; a contradiction is read from its own help.
