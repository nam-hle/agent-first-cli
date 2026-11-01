---
id: work-where-agents-run
category: Input
max: 1
---
# Work where agents run

Practice 5.5 in the [guide](../../README.md).

### One paragraph explainer

Provide `whoami`, so the agent need not guess a username to filter by. If an agent sandbox gives it
a scratch directory, `--output <path>` must accept it, and a refusal must name an allowed place. An
agent works in a place the tool's author did not pick: a sandbox with one writable directory, no
home directory worth trusting and no idea who "me" is on the service. A tool that assumes a person,
a home and a free filesystem sends the agent guessing, and a guess that returns nothing is
indistinguishable from the right answer on an empty account ([5.3](enums-refuse-typos.md)).

### Do

```sh
acme whoami --json
acme pr list --assignee "$(acme whoami --json | jq -r .user)"
acme pr list --output /tmp/agent-scratch/prs.json
```

A refusal says where output may go, as data and as a command:

```text
$ acme pr list --output /etc/prs.json                (exit 5, envelope on stderr)
{ "code": "PATH_NOT_ALLOWED",
  "context": { "field": "--output", "observed": "/etc/prs.json",
               "allowed": ["/tmp/agent-scratch", "./"] },
  "hint": "acme pr list --output ./prs.json" }
```

### Don't

```text
Error: output path not allowed          <- and no word on which paths are
```

### What goes wrong

An agent is asked for "my open pull requests". It has no name, so it tries the OS user, which is
`sandbox`, and runs `acme pr list --assignee sandbox`. The service has no such user, the tool
returns an empty list, and the agent says there are none. Later, asked to save a large listing, it
writes to `/var/out/prs.json`. The tool answers "output path not allowed" and nothing else, so the
agent tries four other paths one by one, then stops saving and pastes the listing into its context.

### Edge cases and trade-offs

- **`whoami` is a plain read command.** Its result is one JSON object
  ([2.2](../output/json-everywhere.md)) with declared fields
  ([2.3](../output/declared-json-fields.md)): the identifier the service filters by, the display
  name, and the service it came from. Name the field after what filters take, so it feeds straight
  into `--assignee`.
- **A shortcut value.** Accepting `--assignee me` saves a call, but it is a second way to say the
  same thing. If you add it, document it in help and keep `whoami` as the explicit form.
- **Not signed in.** `whoami` fails as an auth error (exit 4) with the runnable hint to sign in,
  not an empty object ([3.2](../errors/runnable-hints.md)).
- **Why restrict output paths at all?** A tool run by an untrusted caller that writes anywhere can
  overwrite a startup file. Keep a narrow allowlist and make the refusal informative; the caller
  needs the list to work.
- **Discovering the allowed place.** Read it from an environment variable the sandbox sets, or the
  working directory, and print it in the error. Do not require the agent to read documentation to
  find it ([7.2](../help/two-hop-discovery.md)).
- **Default to stdout.** `--output` is for results too big for a context; without it the JSON
  goes to stdout ([2.1](../output/stdout-stderr.md)).
- **Relative paths.** Resolve against the current directory and echo the absolute path.
- **No decoration.** Inside a sandbox there is no TTY; colour, spinners and progress lines are off
  ([2.4](../output/no-tty-decoration.md)), and a long run reports through
  [4.5](../success/slow-commands.md).

### How to check it

Run the suite from a scratch directory with no home directory and no TTY. Assert `whoami` returns
the declared fields, that `--output` accepts the scratch directory, and that a refusal names an
allowed location.

```ts
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

const scratch = mkdtempSync(join(tmpdir(), "agent-"));
const env = { PATH: process.env.PATH, HOME: scratch, ACME_SCRATCH: scratch };
const run = (...args: string[]) =>
  spawnSync("acme", [...args, "--no-input"], { cwd: scratch, env, encoding: "utf8" });

test("whoami has a filterable user", () => {
  expect(JSON.parse(run("whoami", "--json").stdout).user).toBeTypeOf("string");
});

test("scratch directory is accepted", () => {
  const out = join(scratch, "prs.json");
  expect(run("pr", "list", "--output", out).status).toBe(0);
  expect(JSON.parse(readFileSync(out, "utf8"))).toBeDefined();
});

test("a refusal names an allowed place", () => {
  const refused = run("pr", "list", "--output", "/etc/prs.json");
  expect(JSON.parse(refused.stderr).context.allowed.length).toBeGreaterThan(0);
});
```

### How to score

Maximum: 1 point. Without a known identity or a usable output path an agent guesses, but only in
sandboxed runs.

The practice applies when the tool offers an output-path option, or an identity lookup, or has a
remote identity (an identity on a remote service). The identity half is judged when the tool has a
remote identity or a lookup (`whoami` or an equivalent); the output half is judged when it has an
output-path option. A half that is not judged does not count against the tool. The allowed roots
are the working directory and the system temporary directory. A tool that refuses a path outside
them with a hint naming the allowed roots is fine. A scratch directory counts as an allowed path
only if it lies under the allowed roots.

- **0:** When applicable, anything but Maximum: a remote identity and no `whoami`-style lookup,
  a lookup that exits non-zero, a missing filterable user field, or, if the CLI has `--output`,
  a refusal of a path under an allowed root or a refusal that names no allowed root in
  `context.allowed` or `hint`.
- **Maximum (1):** Where the identity half is judged, `acme whoami --json` (or the equivalent)
  exits 0 with an object holding the identifier that filters take; and, if the CLI has
  `--output`, it accepts a path under an allowed root and refuses a path outside them naming the
  allowed roots. A local tool with `--output` and no lookup is judged on the output half alone.
- **Not applicable when:** the tool has no output-path option, no remote identity and no identity
  lookup.
- **Evidence:** Inside the sandbox session, signed in, run `acme whoami --json`, then
  `acme <command> --output <scratch>/out.json` (the scratch directory under an allowed root) and
  `acme <command> --output /nonexistent/dir/out.json`. Read the exit codes and the stderr envelope
  of the refusal. The second path must not exist, so the probe never writes outside the sandbox.
