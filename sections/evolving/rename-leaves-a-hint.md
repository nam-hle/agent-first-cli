# A rename leaves a hint behind

### One paragraph explainer

Agents, hooks and scripts copy command lines into places you cannot grep: skill files, project
instructions, shell history, remembered notes. A rename that looks free in the repo breaks all of them
the next time they run, and the agent reads "unknown option" as its own mistake. You may choose to
break cleanly instead of keeping an alias, which is a fair choice for a tool with few callers. If you
do, keep a small table of removed names. A flag or command that matches it still fails, so nothing
stays quietly alive, but the error names the replacement.

### Do

```text
$ acme pr comments add 42 --text "LGTM"
Error: unknown option --text (renamed to --body)
Hint: acme pr comments add 42 --body "LGTM"
```

### Don't

```text
$ acme pr comments add 42 --text "LGTM"
Error: unknown option --text
```

### What goes wrong

A notification script and a project instruction keep using `--text`. Every session fails on first use,
and each agent re-discovers the new name from the option list before carrying on. The stale text
survives until someone searches for it.

### How to check it

A test per entry in the removed-names table asserts the error and hint. Add a breaking-change entry to
the changelog. In the same change, search hooks, skill files and project instructions for the old
form.

### Source

From practice.
