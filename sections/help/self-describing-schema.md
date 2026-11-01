# The tool describes its own output, versioned

Practice 7.5 in the [guide](../../README.md).
Practice 7.5 in the [guide](../../README.md#75-the-tool-describes-its-own-output-versioned).

### One paragraph explainer

`acme schema <command>` prints the JSON Schema of that command's `--json` output, and the output
names a `schemaVersion`. A new field is additive within a version; a rename or removal is breaking
and bumps it. `acme --version` stays a plain version string. An agent that parses output must know
the shape before it runs the command, and must be able to tell "the tool changed" from "I made a
mistake". The schema is the machine form of the fields declared in
[2.3](../output/declared-json-fields.md), for results that are always one JSON object
([2.2](../output/json-everywhere.md)).

### Do

```sh
acme schema pr-list --json
```

```json
{
  "schemaVersion": "v1",
  "schema": {
    "type": "object",
    "required": ["items", "truncated"],
    "properties": {
      "items": { "type": "array", "items": { "$ref": "#/$defs/pullRequest" } },
      "truncated": { "type": "boolean" }
    }
  }
}
```

### Don't

```text
"The fields are listed in the wiki."
```

### What goes wrong

An agent scripts a loop over `acme pr list --json` and reads `.items[].author`. A release renames
`author` to `authorId` and does not bump anything. The loop now reads `undefined` for every row, the
agent reports "no pull requests by this author", and it moves on to approve the wrong one. With a
printed schema and a version, the agent would have fetched the schema first, seen `v2`, and
noticed the missing field before acting.

### Edge cases and trade-offs

- Additive means optional: a new field may appear, no existing field changes type or meaning.
  Consumers must tolerate unknown fields; the schema says `additionalProperties: true`.
- Adding a value to an enum is breaking for a strict consumer. Treat it as additive only if the
  schema documents the enum as open ([5.3](../input/enums-refuse-typos.md)).
- `schemaVersion` versions the output, not the binary. `acme --version` stays plain text so
  existing probes keep working; do not add JSON to it.
- Errors have their own envelope with its own version ([3.1](../errors/error-envelope.md)),
  so `acme schema` also answers for it and need not repeat it per command.
- "Schemas are heavy." Print one command at a time, and let `acme schema` with no argument list
  the commands with their versions, bounded as in [2.5](../output/bounded-lists.md).
- A rename or removal also needs a hint and a window ([8.2](../evolving/rename-leaves-a-hint.md),
  [8.3](../evolving/update-hidden-callers.md)); the version bump tells callers, the hint helps
  them.
- Include `schemaVersion` in the real output too, not only in the schema command, so a saved
  result still says which shape it has.
- Generate schemas from the same types the command serialises
  ([7.4](generate-the-reference.md)); hand-written ones drift.

### How to check it

Validate the real output of every command against its printed schema, and pin the versions.

```ts
import { execFileSync } from "node:child_process";
import Ajv from "ajv";
import { expect, test } from "vitest";

const run = (...a: string[]) => JSON.parse(execFileSync("./dist/acme", a, { encoding: "utf8" }));

test.each(run("schema", "--json").items.map((c: any) => c.name))("%s matches", (name) => {
  const { schemaVersion, schema } = run("schema", name, "--json");
  const output = run(...name.split("-"), "--json", "--limit", "1");
  expect(output.schemaVersion).toBe(schemaVersion);
  const validate = new Ajv({ strict: false }).compile(schema);
  expect(validate(output), JSON.stringify(validate.errors)).toBe(true);
});
```

Snapshot the printed schemas ([8.1](../evolving/snapshot-the-surface.md)): a changed field in the
diff must come with a changed `schemaVersion`.
