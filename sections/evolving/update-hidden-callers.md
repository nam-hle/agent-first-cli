---
id: update-hidden-callers
category: Maintainability
max: 3
---
# Update the callers you cannot see

Practice 8.3 in the [guide](../../README.md).

### One paragraph explainer

A CLI's real callers are not in its repository. They are hooks, skill files, project instructions
and agent memory spread across other repos and home directories, each holding a copy of a command
line.
The tool's own tests cannot reach them, so they stay green while every agent session fails. As part
of the change itself, search the known instruction locations for the old form and update them. An
agent cannot tell a stale instruction from a real one, so it follows the instruction and blames
itself for the failure.

### Do

```text
rename PR includes: grep of hooks, skill files and project instructions, all updated
```

### Don't

```text
merge the rename, wait for the first agent failure, then search
```

### What goes wrong

A flag `--assignee` becomes `--owner` in `acme ticket list`. The repo's tests pass. A review
skill that many agents load still contains `acme ticket list --assignee me --json`. Every run that
loads it fails with a usage error. The agent reads the hint ([8.2](rename-leaves-a-hint.md)),
retries with `--owner`, and succeeds, but only in that session. The skill file is unchanged, so each
new session repeats the failure and the retry. Nobody connects the two weeks of wasted calls to the
rename.

### Edge cases and trade-offs

- "We cannot search other people's repos." Search what you can reach: your own repos, the shared
  skill and hook directories, the plugin catalogue. Then say in the changelog what changed so
  others can search for themselves.
- "The hint makes this unnecessary." The hint ([8.2](rename-leaves-a-hint.md)) shrinks the damage;
  it does not fix the stale file. Do both.
- Agent memory is the hardest location. Name the old form in the changelog and in the hint so a
  memory search by the agent finds it.
- Keep the list of locations in one file in the repo, so the search is a script and not a memory
  of where to look.
- Generated reference pages are callers too. Regenerate them
  ([7.4](../help/generate-the-reference.md)) and fix examples that embed command strings
  ([4.4](../success/check-command-strings.md)).
- A breaking change that looks small, such as a changed default or a new required flag, needs the
  same search ([5.1](../input/missing-input-fails.md)).
- Do not use this as a reason to never rename. Use it to price a rename honestly.

### How to check it

Two cheap forms: a PR template checkbox, and a script that greps the known locations.

```sh
#!/bin/sh
# usage: find-old-form.sh <old-text>
old="$1"
status=0
for dir in "$HOME/.claude" ./.claude ./docs ./hooks ./skills; do
  [ -d "$dir" ] || continue
  if grep -rn --fixed-strings -- "$old" "$dir"; then
    status=1
  fi
done
exit $status
```

Run `find-old-form.sh -- "--assignee"` before merging a rename. A non-zero exit lists the files
still to update. Wire it into the rename PR's checklist, not into CI, because most of the locations
live outside the repo.

### How to score

Maximum: 3 points. Stale callers fail every session that loads them, but the count is bounded by
the few renames a tool makes, so the weight is moderate.

Old forms: the removed or renamed flags and commands from the removed-names table, `CHANGELOG.md` or
`docs/`, newest 10. "Newest 10" means by date inside the changelog, newest first, and across
several changelog files by file name descending. When both a removed-names table and a changelog
exist, the table is the source of removed names and the changelog supplements it. The 10 are the
table's entries first, in file order, then changelog entries newest first up to 10 in total (not
per source); an undated entry sorts last. Instruction
locations: `hooks/`, `skills/`, `.claude/`, `docs/`, `scripts/`, `AGENTS.md`, `CLAUDE.md` and
`.github/` or `.bitbucket/` templates in the repo, plus any location the repo's own list names. A
stale hit is an old form found, as a whole token, inside a line that
invokes the tool under test (a line containing `acme` followed by the old form; an old name
matches only inside a line that invokes the same command path as the old form), in an instruction
location outside the changelog, the removed-names table and text marked as history. Text marked as
history is dated plans, specs, changelogs, investigation notes and anything under a docs folder of
plans, specs or history; it is not an instruction location. Matches in lines for other tools are
ignored. Process
evidence is present when a committed script, checklist or PR template names the locations to search
for an old form. An old form is stale when it has at least one stale hit.

- **0:** At least 25% of the old forms are stale.
- **About half (2):** Under 25% of the old forms are stale and at least one is, or none is stale
  and no process evidence is present.
- **Maximum (3):** No old form is stale and process evidence is present.
- **Not applicable when:** the repo and docs are not readable (a closed or vendor CLI); or the
  changelog and docs show no removed or renamed name.
- **Evidence:** read the changelog for the old forms, run `grep -rnF -- "<old form>"` over each
  existing location (read-only; skip a location outside the repo unless the repo names it), keep
  only the matching lines that invoke the same command path as the old form (an old name
  matches only inside such a line), and look for the process in `scripts/`, the PR template
  and `CONTRIBUTING.md`. Capture each old form, the matching file and line, and the process
  file path.
