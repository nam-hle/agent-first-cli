# Agent-first CLI benchmark Implementation Plan

> Note: rubric 2.1.0 uses six different categories (2.1.0); see benchmark/README.md. This document keeps the original six.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 42-practice guide into a rubric an agent applies to any CLI, producing six 0 to 100 category scores with reasons and evidence.

**Architecture:** The rubric lives in the 42 practice pages: front matter holds each practice's permanent id, category and maximum points, and a "How to score" section holds three anchors. One entry page (`benchmark/README.md`) tells the agent how to run it. One small dependency-free Node script (`benchmark/check.mjs`) keeps the data consistent; it never scores a CLI.

**Tech Stack:** Markdown, Node 22+ with `node:test` (no dependencies, no package.json).

**Spec:** `docs/superpowers/specs/2026-11-01-cli-benchmark-design.md`

## Global Constraints

- Categories, exactly six, each practice in exactly one: Command surface, Input, Output, Errors and guidance, Safe writes, Discoverable and maintainable.
- Maximum points per practice from {1, 2, 3, 5, 8}; the table in the spec ("Maximum points (proposal)") is the source for each value.
- Practice id = its page slug (the file name without `.md`), never reused.
- Category score = points earned / points possible x 100, rounded to a whole number; N/A drops a practice from both sums; a category with no possible points, or with more than half of its points N/A, reports "n/a (low coverage)".
- A practice page's three anchors: 0, about half (ceiling of max/2), maximum. A max-1 practice has only 0 and maximum.
- Gate practices: 6.4 (`no-yes-or-force`) and 5.2 (`no-secrets-in-flags`) cap Safe writes at 40; 2.6 (`sanitise-service-text`) caps it at 60. A gate fails at a quarter of the maximum or less.
- 6.2 (`confirm`) is N/A when 6.4 is N/A and scores 0 when 6.4 fails.
- Scores reflect observed behaviour; tests, snapshots and lint rules never change a score.
- Sampling: first 30 commands by sorted path plus every write command and every slow command. Each practice is scored twice by the same agent, the second pass blind to the first; the lower score stands until a person settles a gap of more than a quarter of the maximum.
- Lines at most 100 characters; examples use the made-up tool `acme`; no real product, company or host names; no emojis, no em-dashes.
- No total score. No scripts that score a CLI.

## Review Focus

- A category whose practices are all N/A (a CLI with no writes): the score is "n/a", never a division by zero. Pinned in Task 3 (formula text) and Task 1 (`categoryScore` returns null).
- An agent awards more points than the maximum, or a fraction: the report template states points are whole and at most the maximum. Pinned in Task 3.
- A practice assigned to no category or two categories after an edit: Task 1 test `partition fails on duplicate or missing practice`.
- A gate practice page that loses its gate line when edited: Task 1 test `gate practices must carry a Gate line`.
- A changed maximum that leaves the entry page's "possible" totals stale: Task 1 test `category totals must match the entry page table`.

---

### Task 1: The consistency check

**Files:**
- Create: `benchmark/check.mjs`
- Test: `benchmark/check.test.mjs`

**Interfaces:**
- Produces (exported from `check.mjs`):
  - `parsePage(path: string, text: string): Page` where `Page = { id: string; category: string | null; max: number | null; howToScore: string | null; gate: boolean }`; `id` is the file basename, `category` and `max` come from the YAML front matter, `howToScore` is the text under `### How to score`, `gate` is true when that text has a line starting `- **Gate:**`.
  - `checkPage(page: Page): string[]` returns problems for one page.
  - `checkPartition(pages: Page[]): string[]` returns problems if a category is unknown or the ids are not unique.
  - `categoryScore(earned: number, possible: number, naShare: number): number | null` returns null when `possible` is 0 or `naShare` is above 0.5, otherwise `Math.round(earned / possible * 100)`.
  - `checkTotals(pages: Page[], entryText: string): string[]` compares each category's summed `max` with the "Possible" column of the table in `benchmark/README.md`.
- CLI: `node benchmark/check.mjs [--root <dir>] [--category <name>]` prints one problem per line and exits 1, or prints `ok` and exits 0; `--category` limits page checks to one category.

- [ ] **Step 1: Write the failing tests in `benchmark/check.test.mjs`** (node:test, fixtures built as strings). Test names and assertions:
  - `parsePage reads id, category, max and the How to score block`: a page with front matter `id`, `category: Output`, `max: 5` and a `### How to score` section gives `{ id: 'x', category: 'Output', max: 5 }` and a non-null `howToScore`.
  - `checkPage requires the three anchors`: max 5 without `- **About half (3):**` reports a problem naming it; max 1 needs only `- **0:**` and `- **Maximum (1):**`; the `Maximum (N)` number must equal `max`.
  - `checkPage rejects a max outside 1, 2, 3, 5, 8`.
  - `gate practices must carry a Gate line`: ids `no-yes-or-force`, `no-secrets-in-flags`, `sanitise-service-text` without a gate line report a problem; other ids with one do not.
  - `partition fails on duplicate or missing practice`: two pages with the same id, and a page with `category: Nonsense`, each report a problem.
  - `category totals must match the entry page table`: pages whose max sums to 18 for Command surface against a table row saying 19 report a problem.
  - `categoryScore returns null with nothing possible or mostly N/A`: `(0, 0, 0)` and `(5, 10, 0.6)` give null; `(11, 18, 0)` gives 61.

- [ ] **Step 2: Run to verify failure**

Run: `node --test benchmark/check.test.mjs`
Expected: FAIL, cannot import `./check.mjs`.

- [ ] **Step 3: Implement `benchmark/check.mjs`** with the signatures above. The anchors are matched by their exact bold labels: `- **0:**`, `- **About half (N):**` with N = `Math.ceil(max / 2)`, `- **Maximum (N):**`, plus `- **Not applicable when:**` and `- **Evidence:**` on every page. Reading the repo: pages are `sections/*/*.md` except `template.md`; the entry page is `benchmark/README.md`.

- [ ] **Step 4: Run to verify it passes**

Run: `node --test benchmark/check.test.mjs`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add benchmark/check.mjs benchmark/check.test.mjs
git commit -m "docs: add the benchmark consistency check"
```

### Task 2: Front matter on all 42 pages, and the category table

**Files:**
- Modify: all 42 `sections/*/*.md` (add front matter at the top)
- Create: `benchmark/README.md` (only the heading and the category table in this task)

**Interfaces:**
- Consumes: `checkPartition`, `checkTotals` from Task 1.
- Produces: front matter on every page, exactly:

```yaml
---
id: error-envelope
category: Errors and guidance
max: 8
---
```

  and in `benchmark/README.md` a table with the header `| Category | Practices | Possible |`, one row per category, the Possible column holding the sums from the spec: 18, 19, 34, 27, 44, 32.

- [ ] **Step 1: Run the check to see the expected failures**

Run: `node benchmark/check.mjs`
Expected: problems for every page (no front matter) and for the missing entry table.

- [ ] **Step 2: Add the front matter to each page.** `id` is the file's basename; `category` and `max` come from the spec's category table and "Maximum points (proposal)" table, looked up by the practice number in the page's first body line (`Practice N.M in the guide`). Leave the rest of each page untouched.

- [ ] **Step 3: Create `benchmark/README.md`** with a one-line purpose, a link to the spec, and the category table.

- [ ] **Step 4: Run the check**

Run: `node benchmark/check.mjs`
Expected: the only problems left are the 42 missing `How to score` sections, and no partition or totals problem.

- [ ] **Step 5: Commit** `git add sections benchmark/README.md` then `git commit -m "docs: tag every practice with an id, category and maximum"`.

### Task 3: How to score, one category per slice

Six slices, one per category, each independently reviewable. Run in this order: Safe writes first (it carries the gates and sets the wording), then the other five in any order.

**Files:**
- Modify: the practice pages of one category (see the spec's category table for the list).

**Interfaces:**
- Consumes: front matter `max` of each page; the spec's "Evidence rules" and "Not applicable" sections.
- Produces: in every page of the category, appended after "How to check it", exactly this section (labels are matched by the check):

```markdown
### How to score

Maximum: N points. One line: severity and breadth that justify N.

- **0:** what absent or contradicted looks like for this practice.
- **About half (K):** the common partial case, concrete (for example "`--json` on reads but not on writes").
- **Maximum (N):** all commands behave as the practice says.
- **Not applicable when:** the condition, or "never".
- **Evidence:** the command to run or the file to read, so a score can be re-checked quickly.
```

  A max-1 practice omits the "About half" line. The three gate practices add `- **Gate:** failing caps Safe writes at 40` (60 for `sanitise-service-text`), placed after Evidence. `confirm` adds a line stating it is N/A when `no-yes-or-force` is N/A and scores 0 when that fails.

- [ ] **Step 1: Run the check for the category and see its pages fail**

Run: `node benchmark/check.mjs --category "<name>"`
Expected: one "missing How to score" problem per page of the category.

- [ ] **Step 2: Write the section for each page.** The anchors describe observed behaviour only; never mention tests, snapshots or lint rules as raising a score. Evidence names a concrete probe (a command against `acme`, or a file path pattern).

- [ ] **Step 3: Run the check for the category**

Run: `node benchmark/check.mjs --category "<name>"`
Expected: `ok`.

- [ ] **Step 4: Commit** one slice per commit: `git commit -m "docs: add How to score to the <category> practices"`.

Slices: `Safe writes`, `Command surface`, `Input`, `Output`, `Errors and guidance`, `Discoverable and maintainable`.

### Task 4: The entry page and the report template

**Files:**
- Modify: `benchmark/README.md`
- Create: `benchmark/report-template.md`

**Interfaces:**
- Consumes: the category table from Task 2.
- Produces: `benchmark/README.md` sections in this order: How to run it (numbered steps: list commands, build the sample, run probes, score each practice twice, apply N/A and gates, write the report); Sampling; Scoring (points, anchors, formula, "n/a (low coverage)" rule, whole points at most the maximum); Gates; Not applicable; Binary-only runs; Evidence; Evolving the rubric (ids, tombstones, versions, stored data). `report-template.md` has the report order from the spec: rubric version and date, CLI and commit judged, category rows (score, earned/possible, gate badge), per-practice table (id, points of maximum, one-line reason, evidence, N/A), flagged disagreements, five highest point gains, no total.

- [ ] **Step 1: Write the entry page sections** from the spec, copying exact values (30 commands, a quarter, the caps 40 and 60, the 5-percentage-point changelog rule). Link each rule to the practice page that owns the details rather than restating it.

- [ ] **Step 2: Write `report-template.md`** with placeholders in angle brackets and a filled one-category example using `acme`.

- [ ] **Step 3: Run the check and the tests**

Run: `node benchmark/check.mjs` then `node --test benchmark/check.test.mjs`
Expected: `ok` and all tests PASS.

- [ ] **Step 4: Commit** `git commit -m "docs: add the benchmark entry page and report template"`.

### Task 5: Wire it into the guide

**Files:**
- Modify: `README.md`, `sections/template.md`, `.operations/writing-guidelines.md`

- [ ] **Step 1:** In `README.md` add a short "Benchmark" section after "Three things to know first" linking `benchmark/README.md`, and one line that each practice page carries its maximum and how to score it.
- [ ] **Step 2:** In `sections/template.md` add the front matter block and the `How to score` section exactly as in Task 3; in `.operations/writing-guidelines.md` add a rule: a new practice needs an id (its slug), a category, a maximum from {1, 2, 3, 5, 8} and a How to score section, and `node benchmark/check.mjs` must print `ok`.
- [ ] **Step 3: Run** `node benchmark/check.mjs` and `node --test benchmark/check.test.mjs`; expected `ok` and PASS.
- [ ] **Step 4: Commit** `git commit -m "docs: link the benchmark from the guide and the writing rules"`.

### Task 6: Trial run

**Files:** none committed; the report goes to the scratchpad directory.

- [ ] **Step 1:** Pick one small command-line tool already installed on the machine, binary-only. Follow `benchmark/README.md` exactly and write a report from `report-template.md`.
- [ ] **Step 2:** List every place the rubric was ambiguous or an anchor did not fit (for example a practice you could not tell how to score, or two practices that pulled on the same evidence).
- [ ] **Step 3:** Fix those ambiguities in the affected practice pages or the entry page, then run `node benchmark/check.mjs`; expected `ok`. Commit `git commit -m "docs: tighten the rubric after a trial run"`.
- [ ] **Step 4:** Report to the user: the category scores, the number of ambiguities found and fixed, and that the trial report was not committed (it names a real tool).

---

## Self-review

- **Spec coverage:** categories and placement (Tasks 2, 3); points, anchors, formula, low coverage (Tasks 1, 3, 4); gates and 6.2 rule (Tasks 3, 4); not-applicable (Task 3 per page, Task 4); evidence, sampling, double scoring, binary-only (Task 4); report (Task 4); ids, tombstones, versions, stored data (Task 4); where it lives (Tasks 2, 4, 5). Trial run covers "verified over claimed".
- **Type consistency:** `Page`, `parsePage`, `checkPage`, `checkPartition`, `checkTotals`, `categoryScore` are named the same in Task 1 and where later tasks consume them.
- **Added beyond the spec (my call):** the dependency-free check script, so ids, categories, maxima and totals cannot drift. It never scores a CLI.
