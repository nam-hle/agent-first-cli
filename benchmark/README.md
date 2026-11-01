# Benchmark

Scores how agent-first a command line tool is, one practice at a time, using the guide's 42
practices. Design:
[the benchmark design](../docs/superpowers/specs/2026-11-01-cli-benchmark-design.md).

Rubric version: 1.0.0

An agent applies this rubric by hand: no scripts, no runner. Each practice page has a "How to
score" section with its maximum (front matter `max`) and its anchors. Fill in
[the scorecard template](scorecard-template.md).

## Categories

| Category | Practices | Possible |
|---|---|---|
| Command surface | 1.1 to 1.6 | 18 |
| Input | 5.1, 5.3, 5.4, 5.5, 7.3 | 19 |
| Output | 2.1 to 2.5, 4.1, 4.5, 7.5 | 34 |
| Errors and guidance | 3.1, 3.2, 3.3, 3.4, 3.6, 4.2, 4.3 | 27 |
| Safe writes | 2.6, 3.5, 5.2, 6.1 to 6.5 | 44 |
| Discoverable and maintainable | 4.4, 7.1, 7.2, 7.4, 8.1 to 8.4 | 32 |

## How to run it

1. List the commands. Walk `--help` from the root down and record every command path.
2. Build the sample (see Sampling) and write down which commands it holds.
3. Run the probes each practice page names, on the sample only.
4. Score each practice twice. The second pass does not see the first. Keep the lower score.
5. Apply N/A and the gates (see below), then compute each category score.
6. Write the report from the template, with evidence for every score.

## Sampling

The sample is the first 30 commands by sorted path from walking `--help`, plus every write command
and every slow command, so writes and slow jobs are never left with nothing to score.

Practices judged from provoked errors (3.1, 3.2, 3.3, 3.4, 3.6) use a narrower sample: the first
10 read commands plus every write command, and only for the unknown-flag probe. A parse failure
never runs the command, so it is safe on writes, and an error probe on a read command costs a
real run. Say in the report that these five used the narrower sample.

## Scoring

- Points are whole numbers from 0 to the practice's maximum, never above it. The maximum is the
  practice's importance, so there is no separate weight.
- Every practice page anchors 0, about half and the maximum. The anchors are mutually exclusive and
  exhaustive. Pick whole points between anchors.
- Category score = points earned / points possible x 100, rounded to a whole number. An N/A
  practice leaves both sums.
- If N/A removes more than half of a category's points, or nothing is possible, the category
  reports "n/a (low coverage)" instead of a number.
- Show `earned/possible` beside every score. There is no total score.
- Tests, snapshots and lint rules never change a score. Score what the CLI does.
- <a id="json-flag"></a>`--json` on a practice page means the CLI's documented switch to JSON
  output (for example `--json` or `--format json`); judge the behaviour, not the spelling. A JSON
  switch under another name is not a violation of the JSON practices. A practice that needs JSON
  is N/A only when no flag at all produces JSON.
- <a id="small-samples"></a>Share thresholds (25%) need at least 4 counted items. With fewer than
  4, a practice scores 0 only if every counted item violates, and half if some but not all do.
  This applies to every share-based anchor on every practice page. The boundary belongs to 0: "at
  least 25%" scores 0, below 25% with at least one violation scores half.
- Scored twice: the same agent scores each practice twice, the second pass blind to the first. The
  lower score stands until a person settles a gap above a quarter of the maximum. The report flags
  every such gap.

## Gates

Three failures cap Safe writes, whatever easy points were earned:

- [6.4 `no-yes-or-force`](../sections/writes/no-yes-or-force.md): a skip flag over a real
  approval. Cap 40.
- [5.2 `no-secrets-in-flags`](../sections/input/no-secrets-in-flags.md): a secret in a flag or
  variable. Cap 40.
- [2.6 `sanitise-service-text`](../sections/output/sanitise-service-text.md): unsanitised
  service text. Cap 60.

- Compute the Safe writes score first (earned/possible x 100, rounded), then cap it:
  score = min(score, cap). With several gates failed, the lowest cap applies. The displayed
  `earned/possible` stays the raw sum.
- A gate fails when the practice earns at most a quarter of its maximum.
- [`confirm`](../sections/writes/confirm.md) (6.2) is N/A when 6.4 is N/A, and scores 0 when 6.4
  fails.
- Show a gate as a badge in the report, for example "Safe writes capped at 40: 6.4".

## Not applicable

Each practice page's "Not applicable when" line says when it is N/A; read it there. The general
rule: a practice the CLI has nothing to exercise (no writes, no slow commands, no `--json`, no
sandbox) is N/A. Evidence that lives in the repo or docs and is absent while readable scores 0.
Evidence that is not readable (a closed or vendor CLI) is N/A. A state the sandbox cannot exercise
is [not exercised](#not-exercised), never 0.

[`confirm`](../sections/writes/confirm.md) (6.2), 6.4 and 6.5 are N/A when no write has an
approval gate of any kind. The report lists ungated destructive writes (deletes, overwrites and
merges with no approval gate) so the gap is visible even though it is not scored.

## Probes and safety

- A probe that could change real state (any write, any delete, anything that could hit a default
  file, repo or remote) runs only inside a sandbox the agent controls: a fresh empty temporary
  working directory, and a copy of or a dedicated file or workspace for the CLI's data (for
  example an explicit file-path flag).
- <a id="not-exercised"></a>"Not exercised": a probe skipped because no sandbox can be set up or
  because the target cannot be exercised. The practice is scored from the probes that were run; if
  none could run, it is N/A and its points count under "not checked". Exception: practices that
  need failure injection or a hostile fixture (3.5 `failed-write-changed`, 2.6
  `sanitise-service-text`) with no run are capped at a quarter of the maximum and marked
  "unverified". Never probe a remote or shared service with a write.
- Probes that run a command with no arguments (for example for missing-input behaviour) run in the
  empty temporary working directory so default files cannot be touched.
- When a page's probe appends `--no-input` (or any optional flag), use it only if the command's
  help lists it; otherwise close stdin (`< /dev/null`) and use `timeout` or `gtimeout`.
- Capturing output may use a pipe or a redirect to a file; the agent is not bound by the "no
  pipes" rule that applies to the CLI's own documentation.

## Binary-only runs

Practices that can only be judged from a repo or docs (7.4, 8.1, 8.2, 8.3, 8.4) are N/A. 4.4 is
not: its live strings are scored. The report prints two figures: "not checked" is the share of
points of practices that are N/A only because a repo or docs were not readable (these five), and
"N/A in total" is the share of all N/A points. Categories that lose too much follow the
[low-coverage rule](#scoring).

## Evidence

- Every score cites one quoted command and its output, or one file and line.
- A command path "resolves" only when `acme <path> --help` exits 0 AND its help text names that
  path (its usage or title line contains the path). A CLI that prints its root help for any path
  resolves only the root.
- Practices that need failure injection
  ([3.5](../sections/errors/failed-write-changed.md)) or a hostile fixture (2.6) are scored from a
  run. With no run, the score is capped at a quarter of the maximum and marked "unverified";
  never infer it from reading code alone.
- The report lists the commands of the sample.

## Evolving the rubric

- Each practice has a permanent id, its page slug (for example `error-envelope`), never reused.
  The README numbers are display order and may shift.
- A removed practice stays as a tombstone with a reason and the version it left.
- Reports store the points earned and the maximum per id, plus the rubric version. Scores are
  recomputed on demand, so a changed maximum or a new practice rescores history.
- To compare two reports, use the practices both versions share, and show the score under the old
  and the new version.
- Versions: major when categories change, minor when a practice is added or removed or a maximum
  changes, patch for wording.
- A change that moves a category's share of total points by more than 5 percentage points gets a
  changelog line.
- The version is the `Rubric version: 1.0.0` line near the top of this page.
