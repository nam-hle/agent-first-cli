# Rubric changelog

## 1.3.0

Anchors and definitions changed, so scores may differ from 1.2.0. No practice maximum changed, so
no category share changed.

- T1: scorer variance was seen in practice, so each practice is now scored by two independent
  scorer sessions; the lower category score stands, a spread above 15 points marks a category
  "unstable", and practices that differ by more than a quarter of the maximum are listed.
- T2: a `next` entry that offers a larger limit or the next page counts as a cut signal.
- T3: "resolves" skips the tool's documented leading global flags and their values.
- T4: each distinct group name counts once in the group-name denominator and violation share.
- T5: the declared JSON fields must cover the actual result, including the dry-run result.
- T6: a single-word noun-view leaf is an allowed domain leaf; a compound state name used as a
  verb violates unless it starts with a core verb.
- T7: a default output format that differs between a terminal and captured stdout violates; with
  no pseudo-terminal the comparison is not run and the score cannot exceed half.
- T8: the not-found probe value must be a well-formed id that does not exist; format-validated
  inputs are excluded.
- T9: "newest 10" is defined by date and file name order; a removed-names table is the primary
  source and the changelog supplements it.
- T10: audit evidence that is not readable makes the audit practice not applicable.

## 1.2.0

Anchors and definitions changed, so scores may differ from 1.1.0. No practice maximum changed, so
no category share changed.

- S1: the search and explore hops are judged by behaviour: any documented command that searches
  commands and topics, at any depth, and any documented command that lists or explains topics.
- S2: a command "lists its fields" only when its own help or the tool's reference page lists
  them; a field selector inherited from a global flag does not count; a JSON switch is judged from
  the command's help or the global flag's documented scope.
- S3: an old name is stale only inside a line that invokes the tool under test; matches in lines
  for other tools are ignored.
- S4: slow commands are those that start or wait on work that can outlive the call; a read that is
  merely slow is not a violation; a starter can be judged from its help and a dry-run result.
- S5: output paths are defined per mode (default when captured, JSON mode, error path); a path
  that needs a pseudo-terminal is "not run" when none exists.
- S6: "approval" is a gate enforced outside the CLI process; a flag that only skips the CLI's own
  prompt is not a skip over a gate.
- S7: "takes an id" is defined; a not-found probe answered with the denied class is not exercised;
  an access query about an unknown subject is valid and not provoked.
- S8: the error envelope needs an observed value only when the error concerns an input value.
- S9: a command that fails with a usage error when run with no input counts as needing input.
- S10: singular nouns ending in `s` are not plural; the nested-group rules do not apply to
  top-level groups.
- S11: only commands whose result has a natural follow-up are examined for `next`.
- S12: the practice applies when the tool offers an output-path option or an identity lookup; the
  scratch directory counts only under the allowed roots.
- S13: the write-command part of the snapshot is judged only for write commands.
- S14: an example in help is a runnable command with concrete values; exit codes may be stated
  once centrally with a pointer from each command.

## 1.1.0

Anchors and definitions changed, so scores may differ from 1.0.0. No practice maximum changed, so
no category share changed.

- R1: only compound (hyphenated) domain verbs must start with a core verb; a single-word domain
  verb is allowed when no core verb fits.
- R2: "not checked" has one definition (N/A or capped because not exercised or unreadable); "N/A
  in total" counts all N/A points.
- R3: practices that need real writes or failure injection are listed under "Needs a fixture" in
  the scorecard, with the fixture that would let a later round score them.
- R4: "write command" is defined once; local writes count in the dry-run and confirm shares only
  when the tool documents such a form for them.
- R5: a file form is any documented way to read text or items from a file or stdin, whatever its
  spelling.
- R6: help is compared after whitespace normalisation; a wrapping-only difference is not stale.
- R7: any documented context key that carries the failing input's name or the observed value is
  accepted; the other error envelope keys keep their names.
- R8: when an envelope is documented, the result object is its data member, `next` may sit beside
  or inside it, and the one-object rule applies to the envelope as a whole.
- R9: a reference served by a command of the tool counts as reference docs, and the command is
  the generation marker.
- R10: discovery probes search with the full command path, found within the first 10 hits.
- R11: a `next` entry must be a command of the tool or be marked as a human step; an unmarked
  privileged system command line is a violation.
- R12: the sample is the first 30 leaf commands; the denominator for group-name practices is the
  groups that are ancestors of the sampled leaves.
- R13: the allowed output roots are the working directory and the system temporary directory; a
  tool with no output-path option is N/A for that half.
- R14: any command that blocks until a timeout or a final state is a waiter, with `--timeout`
  standing in for `--wait`.
- R15: echoed caller input is in scope for output sanitising; the unverified cap applies only
  when no output path was run with hostile bytes.
- R16: "resolves" has an exact check: help exits 0 and contains the full requested path.
- R17: an environment variable that the tool refuses or gates in its normal configuration is not
  an accepted secret path.

## 1.0.0

First release.
