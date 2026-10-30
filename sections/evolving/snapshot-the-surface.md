# Snapshot the whole surface

### One paragraph explainer

The surface of a CLI is more than its commands: flags and their help, JSON keys, the list of write
operations, error codes with their exit class and hint, environment variables and each command's full
`--help`. Agents depend on all of it. Write each to a committed snapshot, and make any change fail the
test until someone accepts the diff. Then no rename, new flag or reshaped key reaches callers without
a person having looked at it.

### Do

```text
tests/__snapshots__/
  flags.txt            # every flag, its placeholder and help
  flag-purposes.txt    # flag name -> the purposes it carries
  json-keys.txt
  writes.txt
  error-codes.txt      # code, exit class, hint
  env-vars.txt
  help/<command>.txt   # full --help, one file per command
```

### Don't

Reviewing a flag rename by reading the diff of the source file that declares it.

### What goes wrong

A refactor changes `--since` to `--from` in one command. The source diff looks like a cleanup; the
snapshot diff shows an inconsistency, and a second one shows a changed help line the author did not
intend.

### How to check it

The snapshot test is the check. Update with one command (`-u`), and keep the update in the same
commit as the change so the diff is reviewable.

### Source

From practice.
