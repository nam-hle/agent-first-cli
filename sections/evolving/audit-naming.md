# Audit naming and record the decisions

Practice 8.4 in the [guide](../../README.md).

### One paragraph explainer

Names drift. Each command is reviewed alone and looks fine, while across the tree one idea gets two
flag names, a placeholder changes spelling, and a verb is borrowed from another set. An agent learns
the surface by pattern, so every inconsistency teaches it a wrong pattern. Compare flags,
placeholders and verbs across commands now and then. Write down what was decided, including "no
change, because ...", so a dismissed finding does not look like an unexamined one a year later.

### Do

```text
docs/investigations/2026-10-naming.md: 14 findings, each with a decision or "no change, because ..."
```

### Don't

```text
a decision recorded only in a commit message
```

### What goes wrong

An audit notices that `acme build trigger` takes `--branch` while `acme deploy start` takes `--ref`
for the same thing. The maintainer decides to leave it, because the deploy flag also accepts tags,
and mentions this in a commit message. A year later another maintainer finds the clash, sees no
record, and renames `--ref` to `--branch`, breaking tag deploys. Meanwhile an agent that learned
`--branch` from the first command keeps trying it on the second. A one-line "no change, because it
takes tags" in a dated file would have stopped both.

### Edge cases and trade-offs

- "Every difference is a defect." Mostly, but not always. Two flags with different meanings may
  deserve different names ([1.4](../names/one-flag-one-purpose.md)). Record that as a decision.
- Audit with the snapshots ([8.1](snapshot-the-surface.md)): the flag list and the flag-purpose file
  are the input, so the audit is a read of two files and not a hunt.
- What to compare: verbs against the closed set ([1.1](../names/closed-verb-set.md)), group names
  ([1.2](../names/group-names-plural.md)), positionals ([1.3](../names/two-positionals.md)),
  flag polarity ([1.5](../names/long-positive-flags.md)) and placeholders
  ([1.6](../names/typed-placeholders.md)).
- A renamed finding follows the rename path ([8.2](rename-leaves-a-hint.md),
  [8.3](update-hidden-callers.md)); it is not a free cleanup.
- Cadence: after a batch of new commands, and before a release that is allowed to break. A fixed
  yearly date is fine for a small tool.
- Keep the file short: finding, decision, reason, one line each. A long essay will not be read.
- Dated files, not a wiki page that is edited in place. The date shows when the reasoning was true.

### How to check it

The flag-purpose snapshot shows drift as a diff, and the audit lives in a dated file. A test can
also fail on a flag name that carries two purposes with no recorded decision.

```ts
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("every flag with several purposes has a recorded decision", () => {
  const purposes = readFileSync("tests/__snapshots__/flag-purposes.txt", "utf8")
    .split("\n")
    .filter((line) => line.split("->")[1]?.includes(","));
  const decisions = readFileSync("docs/investigations/naming.md", "utf8");
  for (const line of purposes) {
    const flag = line.split("->")[0].trim();
    expect(decisions, `no decision for ${flag}`).toContain(flag);
  }
});
```
