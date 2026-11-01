---
id: json-everywhere
category: Output
max: 5
---
# `--json` on every command, shallow and stable

Practice 2.2 in the [guide](../../README.md).

### One paragraph explainer

Every command takes `--json`, and its result is always one object, never a bare array, so there is
room for `next` ([4.2](../success/next-as-data.md)) and a cut-off note ([2.5](bounded-lists.md))
without a breaking change later. Keys are shallow (one level of nesting, such as `author.name`),
with one name and one type per concept, one key style (camelCase) and timestamps in ISO 8601.
`--json` carries the same content as the human output, machine formatted, so the two never
disagree. An agent writes its parsing code once from the first command it sees and expects every
other command to match; any inconsistency becomes per-command code or, worse, a silent wrong read.

### Do

```json
{ "id": 42, "toStatus": "done", "createdAt": "2026-10-30T09:12:00Z" }
```

```json
{
  "items": [{ "id": 7, "title": "Fix login", "author": { "name": "ana" } }],
  "total": 134,
  "next": ["acme pr list --limit 40"]
}
```

### Don't

```json
{ "id": "42", "to_status": "done", "created": "30 Oct 2026" }
```

```json
[{ "id": 7, "title": "Fix login" }]
```

A bare array has no place for `next`, `total` or a warning. Adding one later turns every consumer's
`result[0]` into `result.items[0]`.

### What goes wrong

The agent lists pull requests and reads `id` as a number. A different command returns the same
concept as a string, so a strict comparison `pr.id === 42` quietly fails and the agent decides
the pull request does not exist. In the same session a date arrives as `30 Oct 2026` and the agent
sorts it as text, putting November before October. Neither mistake raises an error; both produce a
confident, wrong summary.

### Edge cases and trade-offs

- **"Deep objects mirror the service."** Flatten at the boundary. One level of nesting keeps field
  selection ([2.3](declared-json-fields.md)) a plain dotted path and keeps diffs readable.
- **"A list command may return an array, it is simpler."** Simpler once. Every list needs `next` or
  a cut-off note sooner or later ([2.5](bounded-lists.md)), and a uniform object shape means no
  command is ever special.
- **Ids that look numeric.** Choose one type per concept and keep it everywhere. Strings are safer
  when the service may change id formats, but whichever you pick, pick it once.
- **Human output differs.** Tables and wording may be friendlier, but they come from the same
  result object; do not compute anything in the renderer that JSON lacks.
- **Locale and time zones.** Timestamps are ISO 8601 with an offset or `Z`, never localised.
- **Naming.** Key names follow the same vocabulary as flags and verbs
  ([1.1](../names/closed-verb-set.md), [1.4](../names/one-flag-one-purpose.md)).
- **Action results.** A write returns the same kind of object and names what happened
  ([4.1](../success/name-what-happened.md)).

### How to check it

A test walks the command tree and asserts three things: no command redefines `--json`, every
driven result is one object with at most one level of nesting, and every timestamp-looking value
parses as ISO 8601.

```ts
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const snake = /_/;

it.each(["pr list", "pr view 1", "ticket view T-1"])("%s output shape", (cmd) => {
  const out = JSON.parse(execFileSync("acme", [...cmd.split(" "), "--json"]).toString());
  expect(Array.isArray(out)).toBe(false);
  for (const [key, value] of Object.entries(out)) {
    expect(key).not.toMatch(snake);
    if (/At$/.test(key)) expect(String(value)).toMatch(iso);
  }
});
```

### How to score

Maximum: 5 points. A command without clean JSON forces per-command parsing code, and it can be any.

Sample the first 30 leaf commands by sorted path plus every write command. A command violates when
any of these holds:

- **No `--json`:** it has no JSON switch, judged as the
  [entry page](../../benchmark/README.md#json-fields) says.
- **Not one object:** `--json` stdout is not a single JSON object (a bare array, several
  documents, or text). The one-object rule applies to the documented envelope as a whole.
- **Deep:** a record (the result object or its documented envelope, or an element of its list)
  nests objects more than one level, so `author.name` is fine and `author.org.name` is not. The
  envelope's own data member does not count as a level.
- **Inconsistent:** a key is not camelCase, a timestamp-looking value is not ISO 8601, or a key
  that most other sampled commands type one way (`id` as a number) is typed another way here.

Shape checks run only on commands that can be run safely (writes only against a sandbox service);
the JSON switch is judged on all, from each command's own help or the global flag's
documented scope.

- **0:** At least 25% of the sampled commands violate.
- **About half (3):** Under 25% violate and at least one does (for example every read returns an
  object but one write prints `{"created_at": "30 Oct 2026"}`).
- **Maximum (5):** No sampled command violates.
- **Not applicable when:** never.
- **Evidence:** `acme <command> --help` and look for `--json`; then `acme <command> --json
  2>/dev/null` and parse stdout as one JSON document, checking nesting, key style, timestamps and
  the type of repeated keys such as `id` across commands.
