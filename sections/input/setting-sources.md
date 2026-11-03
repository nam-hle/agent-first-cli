---
id: setting-sources
category: Input
max: 3
---
# Document where a setting comes from, and which wins

Practice 5.6 in the [guide](../../README.md).

### One paragraph explainer

For every setting that can come from a flag, an environment variable or a config file, the help or
docs state the sources and the order (an explicit flag wins over the environment, which wins over
the file, which wins over the default), and the tool can print the value it resolved and where it
came from. An agent that cannot tell why a command used one value rather than another cannot fix
it: it edits the file, the environment variable still wins, and it sees no change. People tolerate
this by trial and error; an agent has a fixed budget of calls.

### Do

```text
$ acme --help
Settings come from, in order: flag, ACME_* environment variable, ~/.config/acme.toml, default.

$ acme config view --json
{ "settings": [ { "name": "project", "value": "ACME", "source": "environment ACME_PROJECT" } ] }
```

### Don't

```text
$ acme config view
project = ACME                  <- from which source? an agent cannot tell
```

### What goes wrong

An agent is told the tool lists the wrong project. It sets `project = "WEB"` in the config file and
re-runs: the same wrong project appears. An exported `ACME_PROJECT` in the shell wins over the file,
and nothing in help or output says so. The agent edits the file three more times, then reports the
config as broken.

### Edge cases and trade-offs

- **Secrets.** Never print a secret's value. Print that it is set and where it came from; see
  [5.2](no-secrets-in-flags.md).
- **A flag always wins.** If a setting can come from a flag, the flag beats every other source.
  An order where it does not is a violation: an agent that passes a flag must be able to rely on it.
- **Tools with no settings.** A tool whose behaviour comes from flags only has nothing to document;
  the practice does not apply.
- **One page.** State the order once, centrally, and point to it from the commands that read
  settings.
- **Show, do not just tell.** The command that prints the resolved values is the check on the
  documented order.

### How to check it

Set one setting in all three places with different values and assert that the resolved view names
the winner each time.

```ts
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";

test("resolved settings name their source", () => {
  const run = spawnSync("acme", ["config", "view", "--json"], {
    encoding: "utf8",
    env: { ...process.env, ACME_PROJECT: "FROM-ENV" },
  });
  const project = JSON.parse(run.stdout).settings.find((s: any) => s.name === "project");
  expect(project.value).toBe("FROM-ENV");
  expect(project.source).toMatch(/environment/);
});
```

### How to score

Maximum: 3 points. It is a clarity practice with no direct risk, but it decides whether an agent can
fix a wrong value at all.

Read the root help, the help of any config or settings command, and the tool's reference page.
Two parts count:

- **Order:** a statement of the sources and their order that lets an explicit flag win over the
  rest.
- **Origin:** a read-only command, classified from help, that prints each effective setting with
  its source; run it once in the sandbox.

- **0:** neither the order nor the origin is present.
- **About half (2):** exactly one of the two is present.
- **Maximum (3):** both are present.
- **Not applicable when:** the tool reads no setting from an environment variable or a file (its
  help names none), so only flags set behaviour.
- **Evidence:** the quoted order sentence, and the origin command line with its output.
