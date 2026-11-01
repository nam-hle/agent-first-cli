# Agent-first CLI benchmark: design

> Note: rubric 2.1.0 uses six different categories (2.1.0); see benchmark/README.md. This document keeps the original six.

Date: 2026-11-01. Status: draft for review.

## Intent

The guide has 42 practices. Today nobody can answer "how agent-ready is this CLI?" except by
reading all 42. This design turns the guide into a benchmark: an agent is pointed at any CLI,
applies a written rubric per practice, and produces a report with one score per category, each
from 0 to 100, in the style of Lighthouse. Every score comes with its reason and its evidence so a
second round can re-check one score quickly instead of repeating the run.

The person who runs it wants to judge a CLI they did not write (a team's tool, a vendor's, a new
one) and decide whether agents can use it, and to see exactly where it falls short.

## Goals

- One score per category, 0 to 100, so a reader sees strengths and weaknesses at a glance.
- Every one of the 42 practices is scored from the binary and, where it is readable, the source. A
  closed CLI is judged on what can be observed, and the report says how much that was.
- A score is explained: reason, evidence, and what would raise it.
- The rubric lives with the guide, so the guide and the benchmark cannot drift apart.
- Adding or removing a practice does not break comparison with older reports.

## Non-goals

- Not a measure of real agent task success (completion, retries, tokens). That would be a
  different benchmark, and could be related to this one later.
- Not a check that a hint or a `next` command is correct, only that it exists and is runnable.
- No scripts or runner. An agent applies the rubric.
- No single overall number.

## Anti-goals

- A score that is easy to game by adding flags without behaviour. Each score needs evidence from a
  run or from source.
- A score that moves when nothing about the CLI changed. Reports state the rubric version and keep
  raw data so history can be recomputed.

## Categories

Placement rule, so every practice, present and future, has exactly one home: the category is the
part of the interface the practice's check inspects.

| Category | What its checks inspect | Practices | Count |
|---|---|---|---|
| Command surface | the command tree and flag definitions | 1.1 to 1.6 | 6 |
| Input | what a caller gives and how a missing or bad input behaves | 5.1, 5.3, 5.4, 5.5, 7.3 | 5 |
| Output | the bytes and shape returned, including slow-job state | 2.1 to 2.5, 4.1, 4.5, 7.5 | 8 |
| Errors and guidance | failure paths and the next step offered | 3.1, 3.2, 3.3, 3.4, 3.6, 4.2, 4.3 | 7 |
| Safe writes | state changes, secrets and untrusted text | 2.6, 3.5, 5.2, 6.1 to 6.5 | 8 |
| Discoverable and maintainable | help, docs, snapshots and change process | 4.4, 7.1, 7.2, 7.4, 8.1 to 8.4 | 8 |

Total 42, no practice in two categories.

## Scoring

Per practice, an agent assigns whole points from 0 up to that practice's maximum, or N/A. The
maximum is the practice's importance, so there is no separate weight.

- Each practice page gains a "How to score" section that anchors three levels: 0 (absent or
  contradicted), about half (most commands, or the behaviour with a common gap), and the maximum
  (all commands behave as the practice says). The agent picks whole points between anchors.
- No test enforcement: a score reflects observed behaviour. Whether the CLI has a test, a snapshot
  or a lint rule that holds the behaviour never raises or lowers a score. Those stay as advice to
  authors in the guide's "How to check it" sections.
- The maximum per practice is a fixed number from {1, 2, 3, 5, 8}, set by severity and breadth:

| | few commands | many or every command |
|---|---|---|
| cosmetic, or costs tokens | 1 | 2 |
| failed or wasted calls | 3 | 5 |
| silent wrong result, lost or duplicated work, security hole | 5 | 8 |

- Category score = points earned / points possible x 100, rounded to a whole number. N/A removes
  the practice from both sums.
- If N/A removes more than half of a category's points, the category reports "n/a (low coverage)".
- Show `earned/possible` beside every category score.

### Maximum points (proposal)

| Category | Practice: maximum | Possible |
|---|---|---|
| Command surface | 1.1:5, 1.2:2, 1.3:2, 1.4:5, 1.5:3, 1.6:1 | 18 |
| Input | 5.1:8, 5.3:5, 5.4:3, 5.5:1, 7.3:2 | 19 |
| Output | 2.1:8, 2.2:5, 2.3:3, 2.4:3, 2.5:5, 4.1:2, 4.5:5, 7.5:3 | 34 |
| Errors and guidance | 3.1:8, 3.2:5, 3.3:3, 3.4:3, 3.6:3, 4.2:3, 4.3:2 | 27 |
| Safe writes | 2.6:8, 3.5:5, 5.2:8, 6.1:5, 6.2:3, 6.3:5, 6.4:8, 6.5:2 | 44 |
| Discoverable and maintainable | 4.4:3, 7.1:3, 7.2:5, 7.4:3, 8.1:8, 8.2:5, 8.3:3, 8.4:2 | 32 |

The maximum is written in each practice page's header with a one-line severity and breadth reason.
A scale of 0 to 8 is finer than an agent can judge reliably, which is why only three levels are
anchored and why double scoring flags gaps by share of the maximum.

### Gates

Three failures cap Safe writes however many easy points are earned, shown as a badge in the report
("Safe writes capped at 40: 6.4"):

- 6.4 fails (a skip flag over a real approval): Safe writes at most 40.
- 5.2 fails (a secret in a flag or variable): at most 40.
- 2.6 fails on any output path: at most 60.

A practice fails a gate when it earns at most a quarter of its maximum (my call). If 6.4 is N/A, 6.2 is N/A too; if
6.4 fails, 6.2 scores 0. The gates are my call; the alternative is pure points with no gates, as
Lighthouse has.

### Not applicable

Written into each practice's rubric. Examples: 6.1 to 6.5 and 3.5 when the CLI has no writes; 4.5
when no command is slow; 6.4 (and with it 6.2) when no write needs approval; 5.5 when there is no
agent sandbox; 2.3 and 7.5 when there is no `--json`.

- 5.2 is N/A when the CLI needs no credential.
- 2.6 is N/A when the CLI has no command that reads from a service or file it does not own.

## Evidence rules

- Every score cites one quoted command and its output, or one file and line.
- Sampling is deterministic and the report says which commands were used (see below).
- Practices that need failure injection (3.5) or a hostile fixture (2.6) are scored from a run. If
  no run was made the score is capped at a quarter of the maximum and marked "unverified"; it is
  never inferred from reading code alone.
- Evidence that lives outside the CLI (4.4, 8.1, 8.3, 8.4: docs, hooks, snapshots, history): the
  rubric names the files to inspect. If the repo and docs are readable and the evidence is absent,
  the score is 0. If they are not readable (a closed or vendor CLI), or the evidence itself is not
  readable, the practice is N/A.
- Binary-only run (my call): practices that can only be judged from a repo are N/A, and the report
  prints the share of points that could not be checked. A category below half checked reports
  "n/a (low coverage)".
- Two independent scorer sessions (my call): each in a fresh context, neither sees the other's
  scores or evidence until both are written. Each session computes its own category scores (its
  own points, N/A and gates); the category score reported is the lower of the two; a spread above
  15 points marks the category "unstable"; practices differing by more than a quarter of the
  maximum, or N/A in one session only, are listed for a person to settle. The "not checked" and
  "N/A in total" figures are printed for the session whose score stands.
- Sampling (my call): the first 30 commands by sorted path, plus every write command and every slow
  command, so practices about writes and slow jobs are never left with nothing to score.

## Report

One page, in this order: rubric version and date, the CLI and commit judged, then for each
category its score, `earned/possible`, any gate badge, both sessions' scores and the spread, then
a per-practice table (id, both sessions' points of maximum, one-line reason, evidence, N/A), then
the practices that differ, then the five highest point gains available. No total.

## Evolving the rubric

- Each practice has a permanent id, its page slug (for example `error-envelope`), never reused. The
  README numbers stay as display order and may shift.
- A removed practice stays as a tombstone with a reason and the version it left.
- Reports store the points earned and the maximum per id, and the rubric version. Scores are
  recomputed on demand, so a changed maximum or a new practice rescores history instead of breaking
  it.
- To compare two reports, use the practices both versions share, and show the score under the old
  and the new version.
- Versions: major when categories change, minor when a practice is added or removed or a maximum
  changes, patch for wording. A change that moves a category's share of total points by more than 5
  percentage points gets a changelog line.

## Where it lives

In this repo. The "How to score" section and the maximum-points header go into the 42 practice
pages. One entry page (my call, `benchmark/README.md`) tells the agent how to run it: the steps,
sampling, double scoring, gates, N/A rules and the category table with totals (pinned by the
check; each practice's maximum lives in its page's front matter); the guide's README gets a short section
pointing to it. A report template sits beside the entry page. No new repo, no skill, no script.

## Left to the builder

The exact wording of the three anchors per practice, the report template layout, and how the
version number is recorded in the pages' front matter.
