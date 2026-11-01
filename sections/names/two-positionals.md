# At most two positionals

Practice 1.3 in the [guide](../../README.md).

### One paragraph explainer

A positional is the thing acted on, then its child or value. Everything else is a flag. Name each
positional for what it accepts, in kebab-case. Position carries meaning only by order, and order is
the thing an agent gets wrong silently: swap two values of the same shape and the call still
parses. Two positionals are a parent and a child (`<pr> <comment-id>`) and can be told apart by
their names; a third has no natural order, so it becomes a named flag.

### Do

```sh
acme ticket view <ticket>
acme pr comments get <pr> <comment-id>
acme pr comments add <pr> --body-file note.md --anchor-line 12
```

### Don't

```sh
acme comments get <id> <id> <number>
acme pr comments add <pr> <file> <line> <text>
```

### What goes wrong

The agent calls `acme comments get 42 7 3` and means PR 42, comment 7, version 3. The tool reads
the first number as the comment, the second as the PR and ignores the third. It returns a comment
from a different PR and the agent summarises it as the answer. Nothing failed, so nothing warned.
The only defence is a signature in which the second positional is a child of the first and every
other input is a named flag the agent must spell out.

### Edge cases and trade-offs

- "Flags are verbose." Yes, and unambiguous; the agent pays characters, not mistakes. See
  [1.5](long-positive-flags.md).
- Variadic input (many files, many ids) is the one place a positional repeats. Prefer a repeated
  flag, see [1.6](typed-placeholders.md); if the command truly acts on a list, make it the only
  positional.
- A tool whose inputs are long multi-part addresses may go flags-only. It must say so in its docs
  and hold to it on every command, so a caller never has to guess which commands take positionals.
- Name the placeholder for the type and owner: `<pr>`, `<comment-id>`, never `<id>`. A bare `<id>`
  does not say whose id.
- A missing positional must fail with the usage, not prompt, see
  [input/missing-input-fails](../input/missing-input-fails.md).
- Long text is never a positional, see [input/long-text-from-file](../input/long-text-from-file.md).
- Secrets are never positional or flag values, see
  [input/no-secrets-in-flags](../input/no-secrets-in-flags.md).

### How to check it

Count and name positionals in a test, then snapshot them so a change shows as a diff.

```ts
import { expect, it } from "vitest";
import { createProgram } from "../src/program";

function leaves(cmd: any, path: string[] = []): any[] {
  if (cmd.commands.length === 0) return [{ cmd, path }];
  return cmd.commands.flatMap((k: any) => leaves(k, [...path, k.name()]));
}

it("has at most two named positionals per command", () => {
  const rows: string[] = [];
  for (const { cmd, path } of leaves(createProgram())) {
    const args = cmd.registeredArguments as { name(): string }[];
    expect(args.length, path.join(" ")).toBeLessThanOrEqual(2);
    for (const arg of args) expect(arg.name(), path.join(" ")).toMatch(/^[a-z]+(-[a-z]+)*$/);
    expect(args.map((a) => a.name())).not.toContain("id");
    rows.push(`${path.join(" ")} ${args.map((a) => `<${a.name()}>`).join(" ")}`);
  }
  expect(rows.join("\n")).toMatchSnapshot();
});
```
