# Benchmark

Scores how agent-first a command line tool is, one practice at a time, using the guide's 42
practices. Design:
[the benchmark design](../docs/superpowers/specs/2026-11-01-cli-benchmark-design.md).

Rubric version: 1.8.0 ([changelog](CHANGELOG.md))

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
4. Score each practice in two independent scorer sessions (see
   [reliability](#reliability)). Report both sessions' points per practice.
5. In each session, apply N/A and the gates (see below), then compute that session's category
   scores; the lower of the two sessions' category scores is the one reported.
6. Write the report from the template, with evidence for every score.

## Sampling

The sample is the first 30 leaf commands (commands that have no subcommands) by sorted path from
walking `--help`, plus every write not already inside them, up to 30 more in sorted path order,
plus every slow command. So the sample holds at most 60 leaves plus the slow commands, and writes
and slow jobs are never left with nothing to score. Help order is not used anywhere. For a
practice about group names, the denominator is the groups that appear as ancestors of the sampled
leaves.

Local access and configuration writes are included in the write count.

"First N" for commands always counts leaf commands by sorted path, taken from the sample above (for
example, the first 10 read commands). A built-in per-group `help` pseudo-command is not a leaf.

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
- If N/A or not measurable points together remove more than half of a category's points, or
  nothing is possible, the category reports "n/a (low coverage)" instead of a number. The test
  uses measured points only: low coverage holds when `possible` (the measured points) is less
  than half of the category's full total (the Possible column above).
- Show `earned/possible` beside every score, with the floor and the ceiling (see
  [not measurable](#not-measurable)). There is no total score.
- Tests, snapshots and lint rules never change a score. Score what the CLI does.
- <a id="json-flag"></a>`--json` on a practice page means the CLI's documented switch to JSON
  output (for example `--json` or `--format json`); judge the behaviour, not the spelling. A JSON
  switch under another name is not a violation of the JSON practices. A practice that needs JSON
  is N/A only when no flag at all produces JSON. The same holds for file forms: a file form is
  any documented way to read text or items from a file or stdin (`--x-file <path>`, `@path`, `-`,
  an `--input` form), whatever its spelling.
- <a id="envelope"></a>When the tool documents an envelope around its JSON, "the result object"
  means the envelope's data member, `next` may sit beside it or inside it, and the one-object rule
  applies to the envelope as a whole.
- <a id="write-command"></a>A write command is one that changes state outside the process and its
  own cache (a remote service, a repository, a shared file). The tool's own configuration and
  cache files are not shared files. A command that changes the current repository or working
  tree (checkout, switch, reset) is a write; a download to a caller-chosen path is an output, not
  a write. Commands that only change the tool's own local configuration
  or access settings are local writes.
  A local write is counted in the violation share of 6.1 and 6.2 only if the tool documents a
  dry-run or confirm form for it.
- <a id="small-samples"></a>Share thresholds (25%) need at least 4 counted items. With fewer than
  4, a practice scores 0 only if every counted item violates, and half if some but not all do.
  This applies to every share-based anchor on every practice page. The boundary belongs to 0: "at
  least 25%" scores 0, below 25% with at least one violation scores half.
- <a id="json-fields"></a>A command has a JSON switch when its own help lists it, or when a global
  flag's documented scope covers it; say in the report which of the two decided. A command "lists
  its fields" when its own help, or the tool's reference page for that command, lists them. A field
  selector inherited from a global flag does not by itself count.
- <a id="approval"></a>An "approval" is a gate enforced outside the CLI process (a separate
  process, identity or device). A confirm flag that only skips the CLI's own prompt and never
  bypasses the approval is not a skip over a gate; a flag that bypasses the approval is.
- <a id="id-probe"></a>A command "takes an id" when it has a positional or a required flag that
  names an existing resource. A not-found probe (`nonexistent-0`) against a service that answers
  with the denied class instead of the not-found class (both are exit classes, defined on the
  [exit-code classes page](../sections/errors/exit-code-classes.md)) is "not exercised" for that
  probe, not a violation. The probe value must match the shape of the placeholder: a well-formed
  id that does not exist. A malformed value rejected at parse time with a usage error is not the
  not-found probe; commands with format-validated inputs are excluded from the not-found probe
  count. A read-only access-check query about an unknown subject is a valid query: it is not
  provoked and not counted.
- <a id="reliability"></a>Reliability: score by two independent scorer sessions, each in a fresh
  context; neither sees the other's scores or evidence until both are written. A session may also
  double-check its own pass. The per-practice table shows both sessions' points (two columns).
  Each session computes its own category scores from its own points, N/A decisions and gates: N/A
  and gates are applied per session before that session's category score. A gate that trips in
  only one session caps only that session's category score. The category score reported is the
  lower of the two sessions' category scores, shown with the earned/possible of the session whose
  score is reported. The spread of a category is the difference between the two sessions'
  category scores; a spread above 15 points marks the category "unstable" in the report. The
  report lists every practice whose two points differ by more than a quarter of its maximum, and
  every practice that is N/A in only one session, under "Practices that differ", for a person to
  settle; until then each session keeps its own treatment. "n/a (low coverage)" is reported only
  when it holds in both sessions; if it holds in only one, report the numeric session's score,
  mark the category "unstable" and give no spread.
- <a id="disagreement-cause"></a>Disagreement cause: for every practice where the two sessions'
  points differ by more than a quarter of its maximum, the report names the single sentence of the
  practice page or of this entry page that allowed both readings, quoted word for word, on a
  "Disagreement cause" line under "Practices that differ". If no one sentence is to blame, the
  line says "none found" and says what evidence differed. The sentence is the first candidate to
  tighten in the next rubric version.

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
- [`confirm`](../sections/writes/confirm.md) (6.2) is N/A when 6.4 is N/A. 6.4 is judged only from
  its own anchors; 6.2 is not measurable when no sandbox lets the prompt path run, whatever 6.4
  scored.
- Show a gate as a badge in the report, for example "Safe writes capped at 40: 6.4".

## Not applicable

Each practice page's "Not applicable when" line says when it is N/A; read it there. The general
rule: a practice the CLI has nothing to exercise (no writes, no slow commands, no `--json`, no
sandbox) is N/A. Evidence that lives in the repo or docs and is absent while readable scores 0.
Evidence that is not readable (a closed or vendor CLI) is N/A. A state the sandbox cannot exercise
is [not exercised](#not-exercised), never 0.

[`confirm`](../sections/writes/confirm.md) (6.2) and 6.4 are N/A when no destructive write has a
gate of any kind (no prompt, no confirm flag and no approval); 6.5 is N/A when no write has one.
The report lists ungated destructive writes
(deletes, overwrites and merges with no gate of any kind: no prompt, no confirm flag, no approval)
so the gap is visible even though it is not scored.

## Not measurable

<a id="not-measurable"></a>A practice that cannot run in a blind round with no fixture is "not
measurable", reported as such and distinct from "N/A by nature" (the tool has nothing to exercise).
Typical cases: 4.1 `name-what-happened`, 6.3 `repeat-is-unchanged`, 6.5 `parallel-writes`,
`rename-leaves-a-hint` (fewer than 3 probeable entries), 6.2 `confirm` (needs a real write; not
measurable when no sandbox lets the prompt path run, whatever 6.4 scored, and never judged from
help), and 8.4
`audit-naming` when the investigation notes are unreadable. Its maximum is its "not-measurable points". A probe that cannot
run inside a probe list counts the same way for that probe: not pass, not fail.

Both sums (`earned` and `possible`) leave the not-measurable points, and N/A by nature points leave
both sums too. For each category, report, from the same session as the score:

- Score = earned / possible x 100, over measured practices (unchanged).
- Floor = earned / (possible + NM) x 100, where NM is the not-measurable points: every
  unmeasured point is worth 0.
- Ceiling = (earned + NM) / (possible + NM) x 100: every unmeasured point is earned in full.

Round all to whole numbers. Two versions or two tools compare on the same denominator
(`possible + NM`) through floor and ceiling. N/A by nature points stay out of `possible + NM`.
With NM = 0, floor = ceiling = score.

Worked example, generic numbers: a category has 40 points in total. 6 points are N/A by nature and
10 are not measurable. Measured: possible 24, earned 18. Score 18/24 = 75. Floor 18/(24+10) = 53.
Ceiling (18+10)/(24+10) = 82. Low coverage: possible 24 is not less than half of 40, so the
category keeps its number.

## Summary table

The report opens its categories with one fixed table, one row per category in the fixed order
below, so two rounds diff cleanly. Columns, in order: category, score (0-100 or "n/a (low
coverage)"), earned/possible, not-measurable points (NM), N/A points, floor, ceiling, spread (the
two sessions' difference), gate status (a badge or "none"). Figures are the standing session's.
Under the table, two fixed lines:

- "Five biggest gains versus the last round": the five practices whose points rose most, with the
  gain, or "no previous round".
- "Practices where the sessions differ by more than a quarter of max": ids, or "none". Each also
  gets its Disagreement cause line.

The [scorecard template](scorecard-template.md) holds the table to copy.

## Probes and safety

- A probe that could change real state (any write, any delete, anything that could hit a default
  file, repo or remote) runs only inside a sandbox the agent controls: a fresh empty temporary
  working directory, and a copy of or a dedicated file or workspace for the CLI's data (for
  example an explicit file-path flag).
- <a id="not-exercised"></a>"Not exercised": a probe skipped because no sandbox can be set up or
  because the target cannot be exercised. The practice is scored from the probes that were run; if
  none could run, it is N/A and its points count under "not checked" (see
  [Binary-only runs](#binary-only-runs) for the one definition). Exception: practices that
  need failure injection or a hostile fixture (3.5 `failed-write-changed`, 2.6
  `sanitise-service-text`) with no run are capped at a quarter of the maximum and marked
  "unverified". Never probe a remote or shared service with a write.
- Practices that need real writes or failure injection (4.1 `name-what-happened`, 6.3
  `repeat-is-unchanged`, 6.5 `parallel-writes`, 3.5 `failed-write-changed`, 4.5 `slow-commands`,
  6.2 `confirm`) cannot run against a shared live service. The report lists them under the
  heading "Needs a fixture", each with one line naming the fixture that would let a later round
  score them (a throwaway target or a fake service mode). They stay under the "not exercised"
  rule: scored from the probes that did run, N/A if none ran, with the 3.5 and 2.6 cap exception.
  4.5 has a fixture-free proxy (a starter is judged from its help and a dry-run result), so only
  its waiter probe needs a fixture; 4.5 is N/A only when the tool has no starter, never merely
  because no run happened.
- Probes that run a command with no arguments (for example for missing-input behaviour) run in the
  empty temporary working directory so default files cannot be touched.
- <a id="parse-only"></a>A "parse-only probe" is the command with an invalid flag, or with its
  dry-run form. Never run a write with no arguments in any other way.
- Context-dependent commands (they need a project, branch or repository) are probed with the
  context the tool's own read-only status or setup output reports; when the machine lacks such a
  context the command is "not exercised".
- The terminal-versus-captured comparison of 2.4 `no-tty-decoration` covers the first 5 sampled
  read leaves plus two writes in dry-run form; see that page.
- <a id="classify"></a>Before running ANY sampled leaf, classify it as read or write from its help
  text. A leaf whose help is not read-only is run only with its dry-run form or an invalid-flag
  parse probe. A leaf with no dry-run form that is not provably read-only is "not run". Never run
  a command with no arguments unless it is classified read. Every fixed probe list on a practice
  page runs only classified reads or dry-run or parse forms.
- When a page's probe appends `--no-input` (or any optional flag), use it only if the command's
  help lists it; otherwise close stdin (`< /dev/null`) and use `timeout` or `gtimeout`.
- Capturing output may use a pipe or a redirect to a file; the agent is not bound by the "no
  pipes" rule that applies to the CLI's own documentation.

## Binary-only runs

Practices that can only be judged from a repo or docs (7.4, 8.1, 8.2, 8.3, 8.4) are N/A, except
that 7.4 is scored when a command of the tool serves a reference. 4.4 is not N/A: its live strings
are scored. The report prints two figures, with one definition each:
"not checked" is the share of points of practices that are N/A or capped because they were not
exercised or because the repo or docs were not readable (these five, and the
[not exercised](#not-exercised) practices). A capped practice contributes the points the cap
removes (its maximum minus the capped score ceiling), counted once; 2.4 contributes the points
above half when its pseudo-terminal comparison was not run. "N/A in total" is the share
of all N/A points, including those not applicable by nature. Both figures are computed per
session and printed for the session whose category score stands (the lower one). Categories that
lose too much follow the [low-coverage rule](#scoring).

A blind round is one scored without the tool's own investigation notes (audits, decision records);
a blind round must not read them. 8.4 `audit-naming` is then N/A (not checked), never 0.

## Evidence

- Every score cites one quoted command and its output, or one file and line.
- A command path "resolves" only when `acme <path> --help` exits 0 AND its text contains the full
  requested path (not only a group prefix). A CLI that prints its root help for any path resolves
  only the root. Before resolving, skip the tool's documented leading global flags and their
  values (for example a working-directory flag).
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
  changes, patch for wording. A minor version also applies when anchors change, so scores may
  differ from the previous version; see the [changelog](CHANGELOG.md).
- A change that moves a category's share of total points by more than 5 percentage points gets a
  changelog line.
- The version is the `Rubric version: 1.8.0` line near the top of this page.
