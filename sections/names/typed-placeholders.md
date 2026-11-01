---
id: typed-placeholders
category: Command surface
max: 1
---
# Placeholders name a type; multi-value flags repeat

Practice 1.6 in the [guide](../../README.md).

### One paragraph explainer

Placeholders are `<path>`, `<count>`, `<user>`, never `<value>`. A flag that takes several values
is singular and repeats (`--label a --label b`); it never takes commas and never reads the words
after it. The placeholder in help is the only type information a caller gets before it guesses,
and an agent builds its next call from it. A greedy flag is worse: it swallows the positional that
comes next and the command still parses, with the wrong meaning.

### Do

```text
acme pr list --limit <count> --output <path> --label <name>
                                              (repeat the flag)
```

```sh
acme pr list --label bug --label ui
```

### Don't

```text
--output <value>   --labels <a> <b> <c>
```

```sh
acme pr list --labels bug ui 42     # is 42 a label or the PR?
```

### What goes wrong

Help says `--output <value>`. The agent has a directory in mind and passes `--output out/`, but
the tool wants a file path and writes a file named `out/` over nothing, or fails with a message
about a missing parent. With `--labels <a> <b>` the agent writes `--labels bug ui 42`; the parser
takes `42` as a third label, the PR argument is missing, and the tool lists every PR with those
labels. The agent reads a large unrelated result as the answer to its question.

### Edge cases and trade-offs

- Repeat only, never commas: values may contain commas (a title, a query), so a comma form
  splits them wrongly. One rule for every flag keeps the caller from guessing which ones split.
- Put the value grammar in the flag description (`--label <name>`: any text, repeat for several).
- Enum placeholders list their members, `--state <open|merged|declined>`, and a wrong member is
  refused with the valid set, see [input/enums-refuse-typos](../input/enums-refuse-typos.md).
- A type name is not a unit: `<count>` is an integer, `<duration>` states `30s` or `5m` in its
  help line. Name the unit when it is not obvious.
- The flag's own name carries the whose: [1.5](long-positive-flags.md); how many positionals a
  command may have: [1.3](two-positionals.md).
- Help leads with an example that uses real-looking values, see
  [help/help-leads-with-example](../help/help-leads-with-example.md).

### How to check it

Read each option's argument name from the tree and fail on generic placeholders, plural flag
names and variadic options.

```ts
import { expect, it } from "vitest";
import { createProgram } from "../src/program";

function leaves(cmd: any, path: string[] = []): any[] {
  if (cmd.commands.length === 0) return [{ cmd, path }];
  return cmd.commands.flatMap((k: any) => leaves(k, [...path, k.name()]));
}

it("names a type and never reads trailing words", () => {
  for (const { cmd, path } of leaves(createProgram())) {
    for (const opt of cmd.options as any[]) {
      const where = `${path.join(" ")} ${opt.long}`;
      expect(opt.flags, where).not.toMatch(/<(value|arg|val|string)>/);
      expect(opt.variadic, where).toBe(false);
      if (opt.long && opt.flags.includes("<")) {
        expect(opt.long, where).not.toMatch(/s$/); // repeat the singular flag instead
      }
    }
  }
});
```

A plural flag that is genuinely a noun (`--status`) goes on a short reviewed exception list.

### How to score

Maximum: 1 point. A vague placeholder or a greedy flag misleads one call at a time; it is narrow.

- **0:** At least one sampled flag that takes a value shows a generic placeholder (`<value>`,
  `<arg>`, `<val>`, `<string>`) or none, or takes several values in one use (`--labels a b`, or
  commas such as `--labels a,b`), or has a plural name (ends in `s`, such as `--labels <label>`;
  a singular noun that ends in `s`, such as `--status`, is not plural).
- **Maximum (1):** No sampled value flag meets a 0 condition: every one shows a placeholder that
  names a type (`<path>`, `<count>`, `<name>`) and takes one value per use, and several values
  come from repeating a singular flag (`--label a --label b`).
- **Not applicable when:** no sampled command has a flag that takes a value.
- **Evidence:** Run `acme <command> --help` for the first 30 leaf commands by sorted path from
  walking `acme --help`, plus every write command, and read each option line. Run
  `acme pr list --label bug --label ui` and check that both labels apply.
