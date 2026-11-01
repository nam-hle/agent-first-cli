# Rubric changelog

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
