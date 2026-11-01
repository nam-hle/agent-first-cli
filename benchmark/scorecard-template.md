# Benchmark report: <cli name>

Rubric version: <x.y.z>. Date: <YYYY-MM-DD>.

CLI judged: <name> at commit <sha or release version>. Run type: <repo and binary | binary only>.
Not checked (N/A or capped because not exercised or repo or docs unreadable): <n>% of points.
N/A in total (all N/A points, including N/A by nature): <n>% of points.
Sample: <the commands used, one per line or comma separated>.

## Categories

No total score.

| Category | Score | Earned/possible | Gate |
|---|---|---|---|
| Command surface | <0-100 or n/a (low coverage)> | <earned>/<possible> | |
| Input | <score> | <earned>/<possible> | |
| Output | <score> | <earned>/<possible> | |
| Errors and guidance | <score> | <earned>/<possible> | |
| Safe writes | <score> | <earned>/<possible> | <Safe writes capped at N: id> |
| Discoverable and maintainable | <score> | <earned>/<possible> | |

## Practices

| id | Points | Reason | Evidence | N/A |
|---|---|---|---|---|
| <slug> | <earned> of <max> | <one line> | <command and output, or file:line> | <reason or blank> |

## Flagged disagreements

Gap between the two passes above a quarter of the maximum. A person settles each one.

| id | Pass 1 | Pass 2 | Kept (lower) |
|---|---|---|---|
| <slug> | <points> | <points> | <points> |

## Ungated destructive writes

Ungated destructive writes: list every sampled write that deletes, overwrites or merges and has no
gate of any kind (no prompt, no confirm flag, no approval); informational, not scored.

## Needs a fixture

Practices that need real writes or failure injection and could not run against a shared service.
One line each: the fixture that would let a later round score it (a throwaway target or a fake
service mode).

- <slug>: <fixture>

## Five highest point gains

| id | Gain | What would raise it |
|---|---|---|
| <slug> | <max minus earned> | <one line> |

## Example: one category, filled in

Made-up tool `acme`, category Command surface (rubric <x.y.z>). Not a real result.

| Category | Score | Earned/possible | Gate |
|---|---|---|---|
| Command surface | 72 | 13/18 | |

| id | Points | Reason | Evidence | N/A |
|---|---|---|---|---|
| `closed-verb-set` | 3 of 5 | mixes `remove` and `delete` | `acme --help`: both listed | |
| `group-names-plural` | 2 of 2 | all groups are plural | `acme --help`: `users`, `jobs` | |
| `two-positionals` | 2 of 2 | no command takes more than two | `acme jobs run --help` | |
| `one-flag-one-purpose` | 3 of 5 | `-f` is `--file` and `--force` | `acme --help` | |
| `long-positive-flags` | 3 of 3 | all flags long and positive | `acme jobs run --help` | |
| `typed-placeholders` | 0 of 1 | bare `<value>` in most help | `acme jobs run --help` | |
