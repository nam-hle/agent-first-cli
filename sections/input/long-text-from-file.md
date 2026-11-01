---
id: long-text-from-file
category: Input
max: 3
---
# Long text comes from a file or stdin

Practice 5.4 in the [guide](../../README.md).

### One paragraph explainer

Offer `--body-file <path>` beside `--body <text>`. Multi-line text passed through shell quoting gets
mangled, by shells and by agents: backticks run as command substitution, quotes end the argument
early, and newlines are eaten or doubled. An agent writes the text to a file with a tool that does
not quote, then points the command at it. The same goes for structured input: a command that takes
many items reads a JSON file or stdin (`--input <path>`, `--input -`) beside its flags, so a batch
is one call and one document, not a loop of flag strings.

### Do

```sh
acme pr comments add 42 --body-file comment.md
acme pr comments add 42 --body-file -  < comment.md
acme ticket create --input tickets.json
cat tickets.json | acme ticket create --input -
```

A structured input is validated as a whole before any item is applied, and each item is checked
against the same rules as the flags ([5.1](missing-input-fails.md), [5.3](enums-refuse-typos.md)).

### Don't

```sh
acme pr comments add 42 --body "Fix `foo()`: it said \"done\"
and broke on the second line"
```

### What goes wrong

An agent posts a review comment that quotes code. The body contains backticks, a double quote and
two lines. The shell runs `foo()` as a substitution, closes the string at the inner quote and passes
the tool a truncated body plus a stray argument. The tool posts half a comment and exits 0. The
agent
sees success and moves on, and the reviewer reads a sentence that stops mid-word. With
`--body-file` the bytes the agent wrote are the bytes the tool reads.

### Edge cases and trade-offs

- **Keep the short form.** `--body "Looks good"` is fine for one line. Do not remove it to force
  files. Define what happens when both are given: fail with a usage error naming both flags, never
  pick one.
- **Stdin as the file.** `--body-file -` reads stdin. Do not read stdin implicitly when no flag is
  given: a command that silently consumes stdin hangs when none is attached
  ([5.1](missing-input-fails.md)).
- **Encoding and newlines.** Read as UTF-8, keep the text byte for byte, do not trim the final
  newline unless the target format requires it, and say so in help. A BOM or invalid UTF-8 is a
  usage error that names the path.
- **A missing or unreadable file.** `NOT_FOUND` (exit 3) naming the path, with the working
  directory in `context`, so the agent can see a relative-path mistake.
- **Size.** Set a limit that matches the service and fail before sending, naming the limit. A
  silent truncation looks like success.
- **Why a file and not a heredoc?** A heredoc works in a shell, but agents often drive tools
  without one. A file is the lowest common denominator, and `--input -` covers the pipe case.
- **Structured input is not a second grammar.** `--input` carries the same fields as the flags,
  under the same names ([1.4](../names/one-flag-one-purpose.md)), and flags given beside it
  override or conflict by a stated rule. The JSON shape is part of the surface: declare it in
  `schema` ([7.5](../help/self-describing-schema.md)) and snapshot it
  ([8.1](../evolving/snapshot-the-surface.md)).
- **Partial failure in a batch.** Report one result per item in the single JSON result
  ([2.2](../output/json-everywhere.md)), with an index into the input, and say how many changed
  ([3.5](../errors/failed-write-changed.md)). Writes in a batch honour `--dry-run`
  ([6.1](../writes/dry-run.md)).

### How to check it

Post a body that holds every character a shell treats specially, through the file form, then read it
back and compare. Add one structured call through `--input` from a file and from stdin.

```ts
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

const body = 'Fix `foo()`: it said "done"\nand broke on $HOME\n\ttabbed \\ end\n';

test("body survives the file form", () => {
  const file = join(mkdtempSync(join(tmpdir(), "acme-")), "comment.md");
  writeFileSync(file, body);
  const run = spawnSync("acme", ["pr", "comments", "add", "42", "--body-file", file, "--json"], {
    encoding: "utf8",
  });
  expect(JSON.parse(run.stdout).body).toBe(body);
});

test("--input - reads a batch from stdin", () => {
  const items = [{ title: "A" }, { title: "B" }];
  const run = spawnSync("acme", ["ticket", "create", "--input", "-", "--dry-run", "--json"], {
    encoding: "utf8",
    input: JSON.stringify(items),
  });
  expect(JSON.parse(run.stdout).items).toHaveLength(2);
});
```

### How to score

Maximum: 3 points. Shell-mangled text posts a truncated body with exit 0; it touches the few
commands that take prose or batches.

Sample the first 30 commands by sorted path plus every write. Text commands take free text such as
`--body` or `--description`. Batch commands take many items. Four kinds of violation:

- **No file form:** a text command has no `--<name>-file <path>` (and `-` for stdin), or a batch
  command has no `--input <path>` (and `-`).
- **Altered bytes:** the file form changes the text (trimmed, re-encoded, escapes interpreted).
- **Silent pick:** the inline and file forms given together are not a usage error naming both.
- **Silent failure:** a missing file does not fail with an error naming the path.

- **0:** Fewer than 25% of the text and batch commands have a file or stdin form, or on any
  command that has the form it alters the bytes (quotes, backticks, newlines).
- **About half (2):** At least 25% of the text and batch commands have the form and none alters
  bytes, but not Maximum (for example some commands lack it, or both flags together silently
  prefer `--body`, or a missing file does not name the path).
- **Maximum (3):** Every text and batch command has the file and stdin form, it keeps the bytes,
  both forms together are a usage error naming both, and a missing file names the path.
- **Not applicable when:** no sampled command takes free text or many items.
- **Evidence:** Write a body with backticks, quotes, `$HOME`, a tab and a newline to a file, run
  `acme <text-command> --body-file <file> --json`, and compare the stored body byte for byte.
  Also pass both `--body x` and `--body-file <file>`, and a nonexistent path; for a batch command
  run `--input <file> --dry-run` and `--input - --dry-run < <file>`.
