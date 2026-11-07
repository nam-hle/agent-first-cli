---
id: guides-in-the-cli
category: Discoverability
max: 3
---
# Ship the guides in the CLI

Practice 7.6 in the [guide](../../README.md#76-ship-the-guides-in-the-cli).

### One paragraph explainer

The prose that says when and why (setup, authentication, conventions, how-to pages) ships inside
the tool and is read through it: `acme docs list`, `acme docs view <page>`, and a search that
covers the pages as well as the commands ([7.2](two-hop-discovery.md)). The pages are versioned
with the binary, so they describe the tool that is running, not the latest website or a branch of
the source. An agent that has only the binary can still learn how to log in or which convention
applies. Sending it to a website costs a fetch it may not be allowed to make. Sending it to the
source costs a large read of code it should not depend on. Both can describe a different version
from the one it runs. [7.4](generate-the-reference.md) generates the reference (what exists); this
practice serves the guides (how to use it).

### Do

```sh
acme docs list --json                              # { "pages": [ { "page": "setup/auth", "title": "...", "summary": "..." } ] }
acme docs view setup/auth --section token-scopes   # one section, not the whole page
acme docs view setup/auth --json                   # { "page", "title", "summary", "text" }
```

### Don't

```text
For setup see https://acme.example/docs/setup     <- network, and maybe another version
See src/auth/README.md                            <- the agent reads source to use the tool
```

### What goes wrong

The tool's error says "authenticate first, see the docs". The agent runs in a sandbox with no
network, so it cannot open the website. It greps the installed package, finds an outdated README
that names an environment variable renamed two releases ago, sets it, and fails again. It then
concludes the token is wrong and asks the user for a new one.

### Edge cases and trade-offs

- **Sections.** A page read whole can be long. `--section <heading>` returns one section, and an
  unknown section fails and lists the valid ones, as a runnable hint
  ([3.2](../errors/runnable-hints.md)).
- **Same source.** The site can be built from the same pages. Serving them in the CLI does not
  require a second copy; it requires the pages to ship in the package.
- **Size.** Ship text, not images. A guide that only works as a diagram needs a text form.
- **Links.** Pages link to other pages by their `docs view` name and to commands by their path,
  so a link is something the agent can run, not a URL.
- **Not the reference.** Generated per-command help stays in `--help` and 7.4. A docs page that
  repeats flags is a second copy that drifts.
- **Errors point here.** An error or hint that needs prose names the page: `acme docs view
  setup/auth`, not a URL ([4.3](../success/dead-ends-point-forward.md)).

### How to check it

List the pages, view each one and each heading, and fail on a dead link.

```ts
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const run = (...a: string[]) =>
  JSON.parse(execFileSync("./dist/acme", [...a, "--json"], { encoding: "utf8" }));

test("every page and section is servable offline", () => {
  const { pages } = run("docs", "list");
  expect(pages.length).toBeGreaterThan(0);
  for (const p of pages) {
    const page = run("docs", "view", p.page);
    expect(page.text, p.page).toBeTruthy();
    for (const link of page.text.matchAll(/acme docs view ([\w/-]+)/g)) {
      expect(() => run("docs", "view", link[1]), `${p.page} -> ${link[1]}`).not.toThrow();
    }
  }
});
```

### How to score

Maximum: 3 points. The guides decide whether an agent can set up and use the tool without leaving
it, but they sit beside the commands, not in them.

Guides: prose beyond per-command help that explains setup, authentication, configuration or a
convention of the tool. Served: a command of the tool prints a guide's text (not a URL to it).
Setup question: how to authenticate or configure the tool for first use, taken from the README.

- **0:** The tool has guides (README, site or docs folder) and no command serves any of them; or
  help and errors point only to URLs or source paths for setup.
- **About half (2):** A command serves guides and the setup question is answered from it, but one
  of: no list of pages, no way to read a part of a long page (sections or search with excerpts),
  or no `--json`.
- **Maximum (3):** A command lists the pages and serves each one, the setup question is answered
  from it, a page or a section of one can be read with `--json`, and the pages ship with the
  binary (the answer does not need network).
- **Not applicable when:** the tool has no guides beyond per-command help (nothing to serve).
- **Evidence:** run the listing and view commands (reads) with `timeout 10` and stdin from
  `/dev/null`, and with network blocked when the sandbox allows it; capture the setup answer and
  one `--json` page or section. Note any help or error text that sends the reader to a URL or a
  source path for setup.
