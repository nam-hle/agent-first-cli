---
id: long-positive-flags
category: Command surface
max: 3
---
# Long, unambiguous flags with positive booleans

Practice 1.5 in the [guide](../../README.md).

### One paragraph explainer

Use long flags, kebab-case. `--user-id` over `--user`. A boolean is positive (`--dry-run`); `--no-`
only negates a default-on behaviour. A short letter exists only for the few flags people type
daily. Characters are cheap for an agent and mistakes are not. A flag that names its type
(`--user-id`) cannot be confused with its neighbours, and a positive boolean cannot be misread
under pressure the way a double negative can.

### Do

```sh
acme pr list --user-id 42 --dry-run
acme pr list --user-email dev@example.com
acme ticket search --no-color
```

### Don't

```sh
acme pr list --user 42 --no-dry-run --skip-prompts
acme pr list -u 42 -n -s
```

### What goes wrong

The agent calls `acme pr list --user alice` and gets nothing, because `--user` takes a numeric id.
It retries with `--user 17`, copied from another output, and now lists someone else's PRs without
any error. In a write, `--no-dry-run` is worse: the agent wants the preview and reads the flag as
"do not run dry", flips the sense, and performs the write. A bare `--skip-prompts` (or `--yes`)
hides a decision the tool should have refused to make, see
[writes/no-yes-or-force](../writes/no-yes-or-force.md).

### Edge cases and trade-offs

- "Short flags are handy." Keep a few for interactive use (`-h`, `-v`, `-n` for a limit) and
  never make one the only spelling. An agent should never need to decode a letter.
- `--no-color` is fine: colour is on by default, so the flag negates a default. A new
  `--no-prompt` is not, since [input/missing-input-fails](../input/missing-input-fails.md) means
  there is no prompt to turn off.
- `--dry-run` is the positive form of the preview; its behaviour is in
  [writes/dry-run](../writes/dry-run.md). A write confirmation is a positive flag too, see
  [writes/confirm](../writes/confirm.md).
- Pick the name by its type: `--user-id`, `--user-email`, `--user-name` are three flags, not one
  overloaded `--user`; a placeholder then names the same type, see [1.6](typed-placeholders.md).
- Banning bare `--name`, `--id`, `--key` needs a flag that says whose: `--ticket-key`.
- The purpose table is in [1.4](one-flag-one-purpose.md).

### How to check it

A lint test over the tree bans bare ambiguous names, `--skip-*`, double negatives and short-only
flags.

```ts
import { expect, it } from "vitest";
import { createProgram } from "../src/program";

function leaves(cmd: any, path: string[] = []): any[] {
  if (cmd.commands.length === 0) return [{ cmd, path }];
  return cmd.commands.flatMap((k: any) => leaves(k, [...path, k.name()]));
}

const BARE = ["--user", "--name", "--id", "--key", "--type", "--file"];
const NEGATED_DEFAULT_ALLOWED = ["--no-color"];

it("uses long, positive flags", () => {
  for (const { cmd, path } of leaves(createProgram())) {
    for (const opt of cmd.options as { long?: string; negate: boolean }[]) {
      const where = path.join(" ");
      expect(opt.long, `${where} has a short-only flag`).toBeDefined();
      expect(BARE, where).not.toContain(opt.long);
      expect(opt.long, where).not.toMatch(/^--skip-/);
      expect(opt.long, where).toMatch(/^--[a-z]+(-[a-z]+)*$/);
      if (opt.long!.startsWith("--no-")) {
        expect(NEGATED_DEFAULT_ALLOWED, where).toContain(opt.long);
      }
    }
  }
});
```

### How to score

Maximum: 3 points. A misread flag runs the wrong write without an error; it touches every flag.

A violation is a flag with no long spelling, a bare ambiguous name (`--user`, `--name`, `--id`,
`--key`, `--type`, `--file`), a `--skip-*` flag, a name that is not kebab-case, or a `--no-` flag
that negates a behaviour that is not on by default (`--no-dry-run`; `--no-color` is allowed).

- **0:** At least 25% of the distinct flags in the sample are violations.
- **About half (2):** At least one violation, but below 25% of the distinct flags.
- **Maximum (3):** No violation: every flag has a long kebab-case spelling, none is a bare
  ambiguous name, booleans are positive, and `--no-` appears only on default-on behaviour.
- **Not applicable when:** no sampled command declares a flag.
- **Evidence:** Run `acme <command> --help` for the first 30 commands by sorted path from walking
  `acme --help`, plus every write command, and list the flags. Run `acme pr list --help` and look
  for `--user-id` against a bare `--user`.
