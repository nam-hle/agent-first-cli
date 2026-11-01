# Placeholders name a type; multi-value flags repeat

Practice 1.6 in the [guide](../../README.md).

### One paragraph explainer

Placeholders are `<path>`, `<count>`, `<user>`, never `<value>`. A flag that takes several values
is singular and repeats or takes commas (`--label a --label b,c`); it never reads the words after
it. The placeholder in help is the only type information a caller gets before it guesses, and an
agent builds its next call from it. A greedy flag is worse: it swallows the positional that comes
next and the command still parses, with the wrong meaning.

### Do

```text
acme pr list --limit <count> --output <path> --label <name>
                                              (repeat, or --label a,b)
```

```sh
acme pr list --label bug --label ui,urgent
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

- "Comma and repeat are two ways to do one thing." They are one rule, the two spellings are
  equal, and neither is a synonym of a flag. Document both once in the placeholder line.
- Values that contain commas (a title, a query) cannot use the comma form. Accept repeats there
  only, and say so in help.
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
