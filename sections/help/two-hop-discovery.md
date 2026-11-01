# Discoverable in two hops

Practice 7.2 in the [guide](../../README.md).
Practice 7.2 in the [guide](../../README.md#72-discoverable-in-two-hops).

### One paragraph explainer

`acme search <word>` finds commands, flags, topics, error codes and config keys. `acme explore
<topic>` explains an idea. Every command has a description. An agent cannot browse a wiki or ask a
colleague; it can only run commands. If a feature is reachable only through documentation, it does
not exist for that agent. Two hops, search then explore (or search then help), must be enough to go
from a vague word to a runnable command. Search results are bounded and cut
visibly ([2.5](../output/bounded-lists.md)).

### Do

```sh
acme search merge
acme explore exit-codes
```

```json
{
  "items": [
    { "kind": "command", "name": "pr merge", "summary": "Merge a pull request" },
    { "kind": "topic", "name": "merge-strategies", "summary": "How merges are applied" },
    { "kind": "error", "name": "MERGE_CONFLICT", "summary": "Branch cannot merge cleanly" }
  ],
  "truncated": false
}
```

### Don't

```text
Error: unknown command "merge"
See the wiki for the full command list.
```

### What goes wrong

An agent wants to know why a command exited 6. The code is documented only on a wiki page. The agent
cannot open it, so it guesses: it retries the command three times, then drops the flag it believes
caused it. Neither helps, because exit 6 is a conflict. If `acme explore exit-codes` had existed
and an unknown-command error had pointed at `acme search`
([3.2](../errors/runnable-hints.md)), the agent would have read the class table in one call.

### Edge cases and trade-offs

- "Search is a second help system." It is one index over the same command tree, so it cannot drift
  ([7.4](generate-the-reference.md)). Topics are the only hand-written part, and a test checks
  that each one exists.
- Dead ends must point forward: an empty search result names `acme explore` and the topic list
  ([4.3](../success/dead-ends-point-forward.md)).
- Search needs no network and no credentials. It must work before login, when the agent is
  least sure what to do ([5.5](../input/work-where-agents-run.md)).
- A closed verb set ([1.1](../names/closed-verb-set.md)) and plural group names
  ([1.2](../names/group-names-plural.md)) make search cheaper: the word an agent guesses is
  usually the word the tool uses.
- Synonyms help (`remove` finds `delete`) but must never create a second spelling of the command.
  Search maps the word; it does not accept it as an alias.
- Large topics: keep each `explore` page short and link to the next topic by name, so a hop
  stays one command.

### How to check it

Two tests: every command is found by its own name through search, and every topic named anywhere
in help, hints or descriptions resolves.

```ts
import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

const run = (...args: string[]) => execFileSync("./dist/acme", args, { encoding: "utf8" });
const tree = JSON.parse(run("--help", "--json"));

test("every command is findable", () => {
  for (const name of tree.allCommands as string[]) {
    const hits = JSON.parse(run("search", name.split(" ").pop()!, "--json")).items;
    expect(hits.map((h: { name: string }) => h.name)).toContain(name);
  }
});

test("every referenced topic exists", () => {
  const topics = new Set(JSON.parse(run("explore", "--json")).items.map((t: any) => t.name));
  for (const ref of tree.topicReferences as string[]) expect(topics.has(ref)).toBe(true);
});
```
