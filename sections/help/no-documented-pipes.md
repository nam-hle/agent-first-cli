# No documented pipe, redirect or `cd ... &&`

Practice 7.3 in the [guide](../../README.md).
Practice 7.3 in the [guide](../../README.md#73-no-documented-pipe-redirect-or-cd--).

### One paragraph explainer

If a workflow needs a pipe, a flag is missing: `--output`, `--cwd`, `--jq`. A documented
`acme ... | jq ... > file` is three programs and a shell in one string. A permission layer that
allows `acme` and `jq` separately still cannot approve the pair, and an audit log records one opaque
line instead of one step. Agents that run one atomic command per call cannot even issue it. Put the
filter and the destination inside the tool, so each step is one command with one exit code
([3.4](../errors/exit-code-classes.md)).

### Do

```sh
acme pr list --jq '.[].title' --output titles.txt
acme pr list --cwd ./service-a --state open
```

### Don't

```sh
acme pr list --json | jq '.[].title' > titles.txt
cd ./service-a && acme pr list --state open
```

### What goes wrong

A guide tells the agent to run `acme pr list --json | jq '.[].title' > titles.txt`. The sandbox
allows `acme` and allows `jq`, but matches commands by their first word and refuses anything with a
pipe. The agent splits it: it runs `acme pr list --json`, gets forty kilobytes in its context,
then writes the titles by hand into a file, dropping two. A single flag would have produced the file
and a one-line result.

### Edge cases and trade-offs

- This disagrees with sources that recommend piping to `jq`. Those assume an interactive shell,
  where a pipe is free and familiar. The guide assumes one atomic command per call, where it is
  the most expensive thing you can ask for. If your agents run a full shell, piping is fine and
  this practice costs you little; the flags are still cheaper in tokens.
- "`--jq` duplicates `jq`." It is a small embedded filter, not a second query language to
  maintain. If you cannot ship one, a declared field list ([2.3](../output/declared-json-fields.md))
  plus `--fields` covers most cases.
- `--output <path>` must still print the one JSON result on stdout, naming the file and the byte
  count ([4.1](../success/name-what-happened.md)). A write to a file is a write: it gets
  `--dry-run` and repeat semantics ([6.1](../writes/dry-run.md),
  [6.3](../writes/repeat-is-unchanged.md)).
- `--cwd` replaces `cd dir && acme`. It also keeps the working directory out of the agent's shell
  state, which does not persist between calls ([5.5](../input/work-where-agents-run.md)).
- Exemption: the test commands in this guide are checks, not workflows. `2>/dev/null` in
  [2.1](../output/stdout-stderr.md) and `| cat` in [2.4](../output/no-tty-decoration.md) prove
  stream and terminal behaviour, and need a pipe by definition. The docs test skips fenced blocks
  marked as checks.
- Untrusted text still passes through the tool's sanitising
  ([2.6](../output/sanitise-service-text.md)) before `--jq` sees it.

### How to check it

Scan every documented command for shell operators, outside the blocks marked as checks.

```ts
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const docs = ["README.md", "docs/guide.md"];
const fence = /```sh\n([\s\S]*?)```/g;

test("no documented workflow uses a pipe, redirect or cd chain", () => {
  for (const file of docs) {
    for (const [, block] of readFileSync(file, "utf8").matchAll(fence)) {
      if (block.includes("# check")) continue;
      for (const line of block.split("\n").filter((l) => l.startsWith("acme")))
        expect(line, `${file}: ${line}`).not.toMatch(/\s(\|\||\||&&|;|>>?|2>)\s|\$\(|`/);
    }
  }
});
```
