# Rubric changelog

## 2.0.0

Breaking: the 42 practices are regrouped into eight mutually exclusive categories, each defined by
one question: Command surface, Input, Output, Errors and guidance, Safety and trust, Write
outcomes, Discoverable, Evolving. Category scores are not comparable with 1.x category scores.
Practice-level points are unchanged: no practice maximum, id or anchor changed.

- The gates (6.4, 5.2, 2.6) now cap Safety and trust instead of Safe writes; caps stay 40, 40
  and 60.
- Category totals: 18, 19, 24, 27, 32, 19, 17, 18 (sum 174).
- The summary table has eight rows in a fixed order.

## 1.8.0

Ambiguities closed that two independent scorers listed, so scores may differ from 1.7.0. No
practice maximum, front matter id or category possible total changed, so no category share changed.

- W1: `group-names-plural`: a mass-noun group is exempt from both "singular name offers `list`"
  and "singular name offers no `view`" when its verbs act on one mass resource.
- W2: `confirm` and the entry page: when the prompt path cannot run, 6.2 is not measurable and is
  not judged from help.
- W3: `enums-refuse-typos`: the allowed list or range counts in `context` or in the error
  `message` if an agent can read it from the error alone; numeric flags with junk use the same
  rule.
- W4: `bounded-lists`: help states an order with a sort key, a default order or a sort flag; "the
  server's order" or "unspecified" does not state one.
- W5: `json-everywhere`: help text is shape evidence for commands that cannot run safely only for
  the epoch-timestamp check; other shape checks stay on commands actually run.
- W6: `update-hidden-callers` and `check-command-strings`: text marked as history is not an
  instruction location; a shorthand of alternates is checked per alternate, and a group-word prefix
  match does not resolve a missing alternate.
- W7: `rename-leaves-a-hint` and `snapshot-the-surface`: a rename is probed with the old form as
  typed and a new name in the snapshot counts as updated; environment variables named in a committed
  help snapshot count as present.
- W8: `slow-commands`: a starter's help must say it starts or queues work that outlives the call; a
  flag that only asks the server to act later is not a starter.
- W9: `work-where-agents-run`: an identity lookup prints the authenticated remote account or its
  filterable id; per-service auth state alone is not one.
- W10: `closed-verb-set`: single-word domain verbs are judged by the closed list; an unlisted word
  violates only when a listed verb has the same meaning.
- W11: `no-yes-or-force`: clearing the tool's own configuration, telemetry or cache is a local
  write, gated only if refused without a required confirm flag in a non-terminal run.
- W12: `sanitise-service-text`: a command that echoes a caller-supplied subject or id into data or
  `next` counts as echoing; hostile bytes go through that argument on the default, JSON and
  terminal paths.

## 1.7.0

Ambiguities closed and one safety hole fixed, so scores may differ from 1.6.0. No practice
maximum, front matter id or category possible total changed, so no category share changed.

- Z1 (safety): a scorer ran a bare destructive write while sampling for 2.4. `no-tty-decoration`
  now compares only the first 5 sampled read leaves and writes only in dry-run form; the entry page
  requires classifying every sampled leaf as read or write from its help before running it, runs a
  non-read leaf only in dry-run or parse form (else "not run"), and every fixed probe list runs
  only classified reads or dry-run or parse forms.
- Z2: 6.4 states one rule: a destructive write is gated only if its confirm is required and
  refused without it in a non-terminal run; a local destructive write that runs without it is
  ungated (0 anchor, cap) unless its help documents it as reversible, then it is out of scope.
- Z3: 6.2 is not measurable when no sandbox lets the prompt path run, whatever 6.4 scored; the
  "scores 0 when 6.4 fails" rule is removed.
- Z4: the sample is the first 30 leaves by sorted path, plus every write not already inside them
  up to 30 more in sorted path order, plus every slow command; "help order" is gone.
- Z5: a command that fails for missing sandbox context is "not exercised" in `next-as-data` and
  `missing-input-fails`, not probed with a guessed context; a context may be named only if the
  tool's own list command prints it, and the report says so.
- Z6: in `work-where-agents-run`, a remote identity with no identity lookup fails probe 1; probe 1
  is "not run" only when not signed in.
- Z7: in `json-everywhere`, a numeric epoch timestamp beside an ISO timestamp is a violation.
- Z8: in `dead-ends-point-forward`, a cut list violates when either the omitted count or the
  resolving command is missing.
- Z9: `rename-leaves-a-hint` probes the newest 10 entries that are reads or have a dry-run or parse
  form, skips writes without one, and is not measurable with fewer than 3 probeable entries.
- Z10: in `snapshot-the-surface`, a snapshot lists a write when its command path appears in the
  snapshot file; a write with no dry-run form still counts; the V boundary of 25% belongs to 0.
- Z11: in `error-envelope` and `context-names-input`, a typed value split across two context keys
  names the input if the keys together reproduce the typed value.
- Z12: in `failed-write-changed`, when the network-failure half cannot run, the validation half
  alone is scored and capped at half; the quarter cap applies only when neither half ran.

## 1.6.0

Anchors and reporting changed, so scores may differ from 1.5.0. No practice maximum, front matter
id or category possible total changed, so no category share changed.

- Y1: `missing-input-fails`, `enums-refuse-typos` and `work-where-agents-run` have a fixed probe
  list and a pass rule stated as counts (max at 0 failures, half below 25%, 0 at 25% or more;
  the boundary belongs to 0); probes that cannot run are "not run", not measurable. For
  `enums-refuse-typos`, weak refusals now count in the failure share, not only silent accepts.
- Y2: practices that cannot run in a blind round with no fixture are "not measurable", distinct
  from N/A by nature; reports add a floor and a ceiling over `possible` plus not-measurable points.
  The low-coverage rule uses measured points only.
- Y3: one fixed summary table (categories in fixed order, with not-measurable points, N/A points,
  floor, ceiling, spread, gate), a "five biggest gains versus the last round" line and a line for
  practices where the sessions differ by more than a quarter of max.
- Y4: for every practice where the sessions differ by more than a quarter of max, the report names
  the one rubric sentence that allowed both readings ("Disagreement cause").

## 1.5.0

Anchors and definitions changed, so scores may differ from 1.4.0. No practice maximum changed, so
no category share changed.

- X1: a documented, deliberate text-on-terminal and JSON-when-captured default is still a format
  difference and violates; the pseudo-terminal recipe is `script -q /dev/null <cmd>`.
- X2: a mass noun group is singular, and the "singular group offers list" violation is waived when
  it has no list verb or its verbs act on a single mass resource.
- X3: a context key named after the input whose value is the observed input names the input; the
  key need not be documented when help or docs say context holds the failed input.
- X4: a destructive local write gated by a required, enforced confirm flag counts as gated with no
  cap; an ungated remote or shared destructive write still scores 0.
- X5: in a blind round without the tool's investigation notes, 8.4 is N/A (not checked), not 0.
- X6: 2.3 counts the commands exercised; any result key missing from the declared fields makes a
  command undeclared; absent optional keys are not drift; dry-run keys must be declared.
- X7: a list command is any command returning a growable array of records; a command that states
  no order counts as unbounded for the order sub-check.
- X8: "first N" always counts leaf commands by sorted path from the sample; a built-in per-group
  `help` pseudo-command is not a leaf.
- X9: "every write" is every write up to 30, then the first 30 in help order, local access and
  configuration writes included.
- X10: the slow-command handle is any field named `id` or ending in `Id` plus a state field,
  judged by behaviour; `--timeout` accepts the tool's documented unit.

## 1.4.0

Anchors and definitions changed, so scores may differ from 1.3.0. No practice maximum changed, so
no category share changed.

- U1: a command that changes the current repository or working tree (checkout, switch, reset) is a
  write; a download to a caller-chosen path is an output, not a write.
- U2: a mass or uncountable noun used as a group name counts as singular; the plural rule applies
  only to countable nouns.
- U3: an error with no failing input value names the input by listing the available commands or
  the missing argument under any documented key.
- U4: a context key counts when its value is the failing input's name as written in help or a
  documented alias; the key's own name may vary.
- U5: a "parse-only probe" is the command with an invalid flag or its dry-run form; a write is
  never run with no arguments in any other way.
- U6: the snapshot staleness share V is taken over up to 20 entries drawn across the
  exercised parts, the first ceil(20/E) of each in sorted order.
- U7: keys inside a service-defined map or dictionary (user data) are exempt from the key-style
  rule.
- U8: a presentation-only table on a terminal versus JSON when captured is a format difference;
  the comparison covers at least 5 leaf commands plus two writes in dry-run form.
- U9: a "natural follow-up" is a result that carries an identifier or key to pass to another
  command, or a list.
- U10: a served reference with summaries only is judged on summaries only; a command with no
  summary counts as disagreeing; summaries-only with under 25% missing is the half case.
- U11: help "leads with an example" when the examples are the first section after the summary and
  usage line; a flags table before them fails.
- U12: an equivalent identity lookup prints the authenticated identity on the remote service; a
  configured default does not count.
- U13: output sanitising is judged on the decoded value and the terminal bytes; a JSON escape that
  decodes to a control or bidirectional character is raw.
- U14: the docs need not list the context key names; a documented statement that errors carry a
  field naming the failing input counts when a sampled error shows such a key.
- U15: leading whitespace is trimmed from a line before testing that it starts with the command
  path.
- U16: exit codes are the documented code for each class; a different documented, consistently
  used number is acceptable.
- U17: context-dependent commands are probed with the context the tool's own read-only status
  reports; without such a context they are "not exercised".
- U18: an old name matches only inside a line that invokes the same command path as the old form.
- U19: exit by timeout is a hang only when the command waited for input; a command still
  producing output is a slow read.

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
