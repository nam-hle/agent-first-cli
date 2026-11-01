---
id: stdout-stderr
category: Output
max: 8
---
# Data on stdout, everything else on stderr

Practice 2.1 in the [guide](../../README.md).

### One paragraph explainer

A caller that parses your output reads stdout as one document. Anything else you want to say
(progress, warnings, a next-step hint, a deprecation notice) goes to stderr, where it cannot corrupt
the data. A person on a terminal still sees both streams interleaved, while a script sees only the
result. An agent matters here because it never reads the output by eye: it hands stdout to a parser
and acts on whatever comes back. The test is simple: discard stderr and the result must still be
complete and valid. Errors follow the same rule and go to stderr in the envelope of
[3.1](../errors/error-envelope.md).

### Do

```sh
acme pr list --json 2>/dev/null     # exactly one JSON document
acme pr list --json 1>/dev/null     # messages only: progress, hints
```

```text
stdout: {"items":[{"id":1}],"next":["acme pr list --limit 50"]}
stderr: Fetching page 1 of 3...
```

### Don't

```text
Fetching page 1 of 3...
Fetching page 2 of 3...
[{"id": 1, ...}]
```

```sh
acme pr list --json | jq .      # works only when nothing but JSON is on stdout
echo "Done." ; acme pr list     # a status banner printed before the data, on stdout
```

### What goes wrong

The agent pipes stdout into a JSON parser. The progress lines make it fail with
`Unexpected token F in JSON at position 0`. The agent assumes the tool returned plain text,
retries with `--plain`, then with `--format csv`, and finally scrapes the output with a regex. Each
guess costs a call, and the real defect, a progress line on the wrong stream, is never named
because the error points at the parser, not at the tool.

### Edge cases and trade-offs

- **"Hints are part of the answer."** Then they are data: put them in the JSON as `next`
  ([4.2](../success/next-as-data.md)). Prose on stderr is for a person; the agent must not need it.
- **Interactive prompts.** A prompt is neither result nor progress. Print it to stderr and, when
  stdin is not a terminal, fail with a missing-input error instead
  ([6.1](../input/missing-input-fails.md)).
- **Long jobs.** Progress belongs on stderr, and a job that runs long enough to need it should also
  follow [4.5](../success/slow-commands.md) so the caller is not left guessing.
- **"Merging the streams (`2>&1`) is common."** Some harnesses do exactly that. Keep stderr quiet
  by default off a terminal, so a merged stream still parses; see [2.4](no-tty-decoration.md).
- **Errors.** One failure, one envelope, on stderr, with a non-zero exit class
  ([3.3](../errors/exit-code-classes.md)). Never print an error object on stdout.
- **Warnings that change meaning.** A warning that alters the result (a skipped item, a fallback)
  also needs a field in the result, or the agent will not know the data is partial.

### How to check it

Run the built binary, not the source, for every command, with stderr redirected away. Assert stdout
parses as exactly one document. Run it once more with stdout discarded to confirm messages land on
stderr.

```ts
import { execFileSync, spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const commands = JSON.parse(execFileSync("acme", ["--commands", "--json"]).toString());

describe.each(commands.items)("%s", (name: string) => {
  it("stdout is exactly one JSON document", () => {
    const args = [...name.split(" "), "--json"];
    const run = spawnSync("acme", args, { stdio: ["ignore", "pipe", "ignore"] });
    expect(() => JSON.parse(run.stdout.toString())).not.toThrow();
  });
});
```

### How to score

Maximum: 8 points. A polluted stdout breaks the parse of every call that hits it, in any command.

Sample the first 30 leaf commands by sorted path plus every write command. Run each with valid
arguments (writes only against a sandbox service) and once more with `--no-such-flag` appended.
Two kinds of violation:

- **Polluted stdout:** a run that exits 0 prints more than the result on stdout: a progress line,
  banner, warning or hint sentence. Probe both the default text mode and the JSON mode: in text
  mode a hint, progress line or warning on stdout is pollution; in JSON mode stdout is not one
  JSON document.
- **Error on stdout:** a run that exits non-zero prints anything on stdout.

A good command has neither. A command that cannot be run safely is judged on the second kind only.
`--help`, `--version` and a bare confirmation line such as `OK` are not "more than the result". A
CLI that ignores `--no-such-flag` and exits 0 violates the second kind.

- **0:** At least 25% of the sampled commands violate.
- **About half (4):** Under 25% of the sampled commands violate and at least one does (for example
  `acme pr list --json` prints "Fetching page 1 of 3..." on stdout before the JSON).
- **Maximum (8):** No sampled command violates.
- **Not applicable when:** never.
- **Evidence:** For each sampled command run `acme <command> 2>/dev/null` and, where it has a JSON
  switch, `acme <command> --json 2>/dev/null`; parse stdout as one document or read it line by
  line. Run
  `acme <command> --no-such-flag 2>/dev/null` and check stdout is empty and the exit is non-zero.
  Run it once with `1>/dev/null` to see that the messages are on stderr.
