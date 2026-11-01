# Benchmark report: <cli name>

Rubric version: <x.y.z>. Date: <YYYY-MM-DD>.

CLI judged: <name> at commit <sha or release version>. Run type: <repo and binary | binary only>.
Not checked (N/A or capped because not exercised or repo or docs unreadable): <n>% of points.
N/A in total (all N/A points, including N/A by nature): <n>% of points.
Both figures are for the session whose category score stands (the lower one).
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

Score is the lower of the two sessions' category scores; earned/possible is that session's.
Each session applies its own N/A and gates before its category score.

| Category | Session 1 | Session 2 | Spread | Unstable |
|---|---|---|---|---|
| <category> | <score> | <score> | <difference, none if low coverage in one> | <yes or blank> |

## Practices

| id | Session 1 points | Session 2 points | Reason | Evidence | N/A |
|---|---|---|---|---|---|
| <slug> | <earned> of <max> | <earned> of <max> | <one line> | <evidence> | <N/A reason> |

## Practices that differ

Practices whose two sessions differ by more than a quarter of the maximum, or that are N/A in
only one session. A person settles each; until then each session keeps its own treatment.

| id | Session 1 | Session 2 |
|---|---|---|
| <slug> | <points or N/A> | <points or N/A> |

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

| id | Session 1 | Session 2 | Reason | Evidence | N/A |
|---|---|---|---|---|---|
| `closed-verb-set` | 3 of 5 | 3 of 5 | mixes `remove`, `delete` | `acme --help` | |
| `group-names-plural` | 2 of 2 | 2 of 2 | all groups plural | `acme --help` | |
| `two-positionals` | 2 of 2 | 2 of 2 | none takes over two | `acme jobs run --help` | |
| `one-flag-one-purpose` | 3 of 5 | 3 of 5 | `-f` is two flags | `acme --help` | |
| `long-positive-flags` | 3 of 3 | 3 of 3 | all long, positive | `acme jobs run --help` | |
| `typed-placeholders` | 0 of 1 | 0 of 1 | bare `<value>` | `acme jobs run --help` | |
