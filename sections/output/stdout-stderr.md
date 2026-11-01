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
