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
