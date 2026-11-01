# Agent-first CLI best practices

Practices for building a command line tool whose main caller is an AI agent and whose second caller
is a person. Each practice is a numbered item with a TL;DR, the cost of ignoring it, a Do and a
Don't, and how to check it. Some link to a deeper write-up.

## Three things to know first

1. **The caller has no terminal and cannot read your docs.** It cannot answer a prompt, see colour or
   scroll a pager, and it acts on whatever your error text says. The tool itself has to say how to
   continue.
2. **The JSON is the interface.** The table a person sees is a view of it. Design the data first.
3. **Check the rules, do not remember them.** A rule nobody tests decays. Wire each practice into
   the suite by walking the command tree, so a new command is checked without being listed.

Examples use a made-up tool called `acme`.

## Table of contents

1. [Names](#1-names) (6)
2. [Output](#2-output) (6)
3. [Errors](#3-errors) (6)
4. [Success and next steps](#4-success-and-next-steps) (5)
5. [Input](#5-input) (5)
6. [Writes](#6-writes) (5)
7. [Help and discovery](#7-help-and-discovery) (5)
8. [Evolving the surface](#8-evolving-the-surface) (4)

Tags: `#strategic` shapes the design, `#advanced` needs infrastructure, `#security` concerns an
untrusted caller.

# 1. Names

### 1.1 Use one shape and a closed verb set

**TL;DR:** Commands are `acme <noun> <verb>`. The last segment is always a verb from a short list
(`list`, `view`, `create`, `edit`, `delete`, `search`, plus domain verbs such as `merge`), and a verb
means the same on every noun. No synonyms, no aliases, no abbreviations.

**Otherwise:** An agent that has seen `show` once guesses `show` everywhere, and `get`, `fetch` and
`ls` as well. Each guess is a failed call, and an alias that works teaches a second spelling.

**Do**

```sh
acme ticket comments add ...
acme pr list
```

**Don't**

```sh
acme add-comment ...
acme pr ls
```

**Check:** a test walks the command tree; every leaf is in the verb list, none is a banned synonym,
no alias is registered. Adding a verb means editing the list.

[Read more](sections/names/closed-verb-set.md) | [Return to top](#table-of-contents)

### 1.2 One group name, plural for collections

**TL;DR:** The top-level group for an entity is singular (`pr`, `ticket`); a group for a collection
inside it is plural (`comments`, `pods`). No group has a singular twin. In a group with one verb, a
plural noun takes `list` and a singular noun takes `view`.

**Otherwise:** `comment` beside `comments` doubles the surface and splits the help.

**Do**

```sh
acme deploy pods list
acme pr status view
```

**Don't**

```sh
acme deploy pod list     # singular twin of pods
acme pr status list      # a singleton asked to list
```

**Check:** the same tree walk; no group has a singular twin.

[Return to top](#table-of-contents)

### 1.3 At most two positionals

**TL;DR:** A positional is the thing acted on, then its child or value. Everything else is a flag.
Name each for what it accepts, in kebab-case.

**Otherwise:** Three positionals cannot be told apart from a typo, and `<id>` does not say whose id.

**Do**

```sh
acme ticket view <ticket>
acme pr comments get <pr> <comment-id>
```

**Don't**

```sh
acme comments get <id> <id> <number>
```

**Check:** count and names asserted in a test; snapshot every command's positionals.

[Return to top](#table-of-contents)

### 1.4 One concept, one flag name; one name, one purpose #strategic

**TL;DR:** `--since` is the start of a window everywhere, never `--from` in one command and `--after`
in another. Keep a committed table of flag name to purpose so a clash shows as a diff.

**Otherwise:** The same flag name meaning two things makes every guess a coin toss, and the
inconsistency compounds with each command added.

**Do**

```sh
acme pr stats view --since 2026-01-01 --until 2026-02-01
acme audit view --since 2026-01-01
```

**Don't**

```sh
acme pr stats view --from 2026-01-01 --to 2026-02-01
acme audit view --since 2026-01-01
```

**Check:** snapshot every flag with its help and purpose; review the diff. Ban the synonyms in a
test.

[Return to top](#table-of-contents)

### 1.5 Long, unambiguous flags with positive booleans

**TL;DR:** Long flags, kebab-case. `--user-id` over `--user`. A boolean is positive (`--dry-run`);
`--no-` only negates a default-on behaviour. A short letter exists only for the few flags people type
daily.

**Otherwise:** `--user` could be a name, an id or an email; `--no-dry-run` is a double negative nobody
parses correctly under pressure.

**Do**

```sh
acme pr list --user-id 42 --dry-run
```

**Don't**

```sh
acme pr list --user 42 --no-dry-run --skip-prompts
```

**Check:** a lint test bans bare `--user`, `--name`, `--id`, `--key` and `--skip-*`.

[Return to top](#table-of-contents)

### 1.6 Placeholders name a type; multi-value flags repeat

**TL;DR:** `<path>`, `<count>`, `<user>`, never `<value>`. A flag that takes several values is
singular and repeats or takes commas (`--label a --label b,c`); it never reads the words after it.

**Otherwise:** `--output <value>` says nothing, and a flag that swallows following words eats the
positional that comes next.

**Do**

```text
--output <path>   --limit <count>   --label <name>   (repeat, or --label a,b)
```

**Don't**

```text
--output <value>   --labels <a> <b> <c>
```

**Check:** a test fails on a `<value>` placeholder and on a variadic flag.

[Return to top](#table-of-contents)

# 2. Output

### 2.1 Data on stdout, everything else on stderr #strategic

**TL;DR:** Results go to stdout; progress, warnings and hints go to stderr. Discarding stderr still
leaves a complete, parseable result.

**Otherwise:** A progress line on stdout corrupts the JSON an agent is about to parse, and the failure
shows up as a parse error far from the cause.

**Do**

```sh
acme pr list --json 2>/dev/null    # exactly one JSON document
```

**Don't**

```text
Fetching page 2...          <- on stdout, before the JSON
{"items": [{"id": 1}]}
```

**Check:** run the built binary with stderr discarded and parse stdout as exactly one document, for
every command.

[Read more](sections/output/stdout-stderr.md) | [Return to top](#table-of-contents)

### 2.2 `--json` on every command, shallow and stable

**TL;DR:** Every command has `--json`, and its result is always one object, never a bare array, so
there is room for `next` (4.2) and a cut-off note (2.5). Keys are shallow (one level of nesting, such
as `author.name`), one name and one type per concept, one key style (camelCase), timestamps in
ISO 8601. `--json` carries the same content as the human output, machine formatted.

**Otherwise:** A number in one command and a string in another for the same concept forces per-command
parsing code.

**Do**

```json
{ "id": 42, "toStatus": "done", "createdAt": "2026-10-30T09:12:00Z" }
```

**Don't**

```json
{ "id": "42", "to_status": "done", "created": "30 Oct 2026" }
```

**Check:** a test asserts no command redefines `--json`, nesting stays one level, and every driven
result holds ISO 8601 timestamps.

[Return to top](#table-of-contents)

### 2.3 Declare the JSON fields and show them in help

**TL;DR:** `--json=a,b` selects fields. Each command declares its fields in code; the type checker
refuses a declared field the result type lacks and a result key that is neither declared nor
explicitly omitted. `--help` lists them.

**Otherwise:** Agents discover fields by trial. A field that was removed from the type but not from
the list fails only at runtime.

**Do**

```ts
const PR_FIELDS = jsonFieldsOf<PullRequest>()(['id', 'title', 'state', 'author.name']);
```

**Don't**

```ts
const PR_FIELDS = ['id', 'title', 'state'];   // an untyped list that drifts from PullRequest
```

**Check:** compile-time, plus a test that runs real output through field selection and fails on a
declared field that is always null. The type check alone does not catch a stale nested path
(`author.name` passes whenever `author` exists) or a presenter that reshapes data after the type was
taken.

[Return to top](#table-of-contents)

### 2.4 No colour, spinner or pager off a terminal

**TL;DR:** Off a TTY there are no escape sequences, spinners or pagers. Honour `NO_COLOR` and
`TERM=dumb`.

**Otherwise:** Escape sequences in piped output show up as garbage in an agent's context and in logs.

**Do**

```sh
NO_COLOR=1 acme pr list        # plain text
acme pr list | cat             # no ESC bytes, no spinner, no pager
```

**Don't**

```text
\x1b[32m✔\x1b[0m done          <- colour and spinner frames in a pipe
```

**Check:** run piped, assert no ESC byte in stdout or help.

[Return to top](#table-of-contents)

### 2.5 Bound every list and say when you cut

**TL;DR:** Every list or search takes `--limit` with a declared default and a stated, deterministic
order (a sort key plus the id, so pages never overlap). A cut result says so and how to continue:
"20 of 134, narrow with `--state`". When narrowing is not enough, the JSON carries `total` and an
opaque `nextCursor`, and `next` holds the runnable command that uses it.

**Otherwise:** An unbounded dump fills the agent's context, and a silent cut-off looks like the whole
answer.

**Do**

```text
20 of 134 shown. Narrow with --state open, or raise --limit.
```

**Don't**

```text
(134 rows, unpaged)        or        (20 rows, no mention that 114 more exist)
```

**Check:** a test finds every list and search command and asserts it takes `--limit` or is small by
nature; a full page offers a bigger `--limit`; two runs over the same data return the same order.

[Return to top](#table-of-contents)

### 2.6 Sanitise text that came from another system #security

**TL;DR:** A title, a commit message or an API error is untrusted. Strip terminal escapes and show
invisible or direction-changing characters visibly (`\u{202E}`) in one place that every output path
passes through, before the text is printed, returned as JSON or sent to a model.

**Otherwise:** An escape sequence can rewrite the terminal, and a right-to-left override makes
`pay\u{202E}usd` read as something else. An agent reading unsanitised text reads it as instructions.

**Do**

```ts
const clean = sanitiseDeep(result);   // one place, every output path
```

**Don't**

```ts
console.log(ticket.title);            // raw service text
```

**Check:** a test per output path (human, JSON, error, streaming) with a hostile fixture; a test that
no handler prints service text without going through the sanitiser.

[Read more](sections/output/sanitise-service-text.md) | [Return to top](#table-of-contents)

# 3. Errors

### 3.1 One envelope for every failure #strategic

**TL;DR:** Every failure is the same shape, on stderr: `status`, `code`, `message`, `context`,
`hint`. No bare string, no per-command shape, no library message leaking through. Codes are a closed
table, UPPER_SNAKE and stable.

**Otherwise:** An agent must regex each command's error text. A library's internal message becomes
the thing the agent tries to act on.

**Do**

```json
{ "status": "error", "code": "NOT_FOUND", "message": "No ticket ACME-9",
  "context": { "field": "ticket", "observed": "ACME-9" },
  "hint": "Run `acme ticket list --project ACME`" }
```

**Don't**

```text
Error: ECONNRESET at TLSSocket.onConnectEnd (node:_tls_wrap:1594:19)
```

**Check:** a test per code asserts the envelope; unexpected errors map to a general code with a
`--verbose` hint, never a stack.

[Read more](sections/errors/error-envelope.md) | [Return to top](#table-of-contents)

### 3.2 The hint is a command that runs

**TL;DR:** A hint is a command the caller can run next, on the platform it is printed for. A wrong
word adds `suggestions` and the available commands.

**Otherwise:** "See the docs" ends the agent's run. A hint with `sudo` on Windows, or a renamed flag,
sends it down the wrong path with confidence.

**Do**

```json
{ "hint": "Run `acme build list --project ACME`", "suggestions": ["build list"] }
```

**Don't**

```json
{ "hint": "See the documentation for the list of builds." }
```

**Check:** build hints with a typed command builder so a rename fails to compile; a test scans every
other mention and checks the command and its flags exist.

[Read more](sections/errors/runnable-hints.md) | [Return to top](#table-of-contents)

### 3.3 `context` names the failing input

**TL;DR:** `context` carries the field and the observed value, not an empty object.

**Otherwise:** "Invalid value" with no field leaves an agent with five flags and no idea which one.

**Do**

```json
{ "code": "VALIDATION_ERROR", "context": { "field": "--limit", "observed": "abc" } }
```

**Don't**

```json
{ "code": "VALIDATION_ERROR", "message": "Invalid value", "context": {} }
```

**Check:** a test asserts `context` on every validation and not-found code.

[Return to top](#table-of-contents)

### 3.4 The exit code is the class of failure

**TL;DR:** One table maps codes to exit classes: 0 success, 1 unexpected, 2 usage, 3 not found,
4 auth, 5 denied, 6 conflict, 7 transient, 8 cancelled. The tool prints the table.

**Otherwise:** Exit 1 for everything makes a script unable to tell "retry" from "fix your input".

**Do**

```sh
acme ticket view NOPE-1; echo $?     # 3 (not found)
```

**Don't**

```sh
acme ticket view NOPE-1; echo $?     # 1, same as every other failure
```

**Check:** each code must declare a class to compile; a test pins the table.

[Return to top](#table-of-contents)

### 3.5 A failed write says whether anything changed

**TL;DR:** On a failed write, `context.changed` is a string: `"no"`, `"unknown"` after a lost
connection or an unexpected error, or `"yes"` when only showing the result failed. Transient codes
carry `retryable: true` as data.

**Otherwise:** After a timeout the agent cannot tell if the ticket was created. It retries and
duplicates, or gives up and leaves the work undone.

**Do**

```json
{ "code": "NETWORK_ERROR", "context": { "changed": "unknown", "retryable": true } }
```

**Don't**

```json
{ "code": "NETWORK_ERROR", "context": { "changed": false } }   // a boolean here, a string there
```

**Don't**

```text
Error: socket hang up
```

**Check:** a test per write operation forces a failure before and after the call.

[Read more](sections/errors/failed-write-changed.md) | [Return to top](#table-of-contents)

### 3.6 Parse failures look the same at any depth

**TL;DR:** An unknown command, an unknown option and a group typed without its verb all return the
envelope; the last is `MISSING_COMMAND` with the verbs in `availableCommands`.

**Otherwise:** Library help text dumped as an error is not data and has no next step.

**Do**

```json
{ "code": "MISSING_COMMAND", "context": { "availableCommands": ["list", "view"] } }
```

**Don't**

```text
Usage: acme build [options] [command]        <- the library's help page, exit 0
```

**Check:** run every group without its verb and every command with a bad option.

[Return to top](#table-of-contents)

# 4. Success and next steps

### 4.1 Say what happened and name the thing

**TL;DR:** One line: `Created ACME-12`, then the URL. Never `Done.`

**Otherwise:** A follow-up command needs the id; "Done." makes the agent search for it.

**Do**

```text
Created ACME-12
https://tracker.example.com/ACME-12
```

**Don't**

```text
Done.
```

**Check:** a test per write asserts its first line carries the new id or key.

[Return to top](#table-of-contents)

### 4.2 Offer the next step as data

**TL;DR:** Add a `next` field to the JSON result object: up to three runnable commands using real
values from this output, never placeholders. Human mode prints it dimmed on stderr, only on a TTY.

**Otherwise:** The agent invents the next command from memory, and gets it wrong when the tool
changed.

**Do**

```json
{ "key": "ACME-12", "next": ["acme ticket view ACME-12"] }
```

**Don't**

```json
{ "next": ["acme ticket view <ticket>", "acme see-also"] }
```

**Check:** a test asserts at most three, no `<placeholder>`, and each command exists.

[Return to top](#table-of-contents)

### 4.3 Dry runs, empty results and cut-offs all point forward

**TL;DR:** A dry run's `next` is the same command without `--dry-run`. An empty result says so and
offers a way to widen. A cut result offers a bigger `--limit`.

**Otherwise:** A preview with no way forward, or a blank screen, is a dead end the agent has to
explain away.

**Do**

```text
Would merge PR 42.          next: acme pr merge 42
No jobs matched.            try: acme build jobs list
```

**Don't**

```text
Would merge PR 42.          (no next step)
                            (blank output for an empty list)
```

**Check:** snapshot the empty-list lines; a test asserts each offered command exists.

[Return to top](#table-of-contents)

### 4.4 Check every command written inside a string

**TL;DR:** Examples, hints, `next`, recipes and docs mention commands. Build them with a typed builder
so a renamed flag fails to compile, and scan the remaining prose in a test.

**Otherwise:** Renames leave stale hints that point at commands that no longer exist.

**Do**

```ts
cmd('pr list').flag('state', 'open').build();    // a renamed flag fails tsc
```

**Don't**

```ts
'acme pr list --status open'                      // a plain string; nothing checks it
```

**Check:** a `command-strings` test: every `acme ...` written in source or docs resolves in the tree,
flags included.

[Return to top](#table-of-contents)

### 4.5 A slow command returns an id and a state

**TL;DR:** A command that can take minutes returns at once with an `id`, a `state` (`queued`,
`running`, `succeeded`, `failed`, `cancelled`) and a `next` that resumes it. `--wait` blocks, and
`--wait --timeout <duration>` that runs out exits as transient (7) with `state: running`: the job
continues, and that is not a failure.

**Otherwise:** The agent either hangs on a call with no end or polls blindly, and a timeout looks
like a failed job, so it starts the work a second time.

**Do**

```json
{ "id": 7, "state": "running", "next": ["acme build view 7 --wait --timeout 10m"] }
```

**Don't**

```text
(no output for eleven minutes, then exit 1 "timed out", the job still running)
```

**Check:** a test starts a job, waits past the timeout, asserts exit 7 with `state: running`, and that
a second `--wait` on the same id reaches a final state.

[Return to top](#table-of-contents)

# 5. Input

### 5.1 A missing input fails naming the flag; nothing prompts without a terminal #strategic

**TL;DR:** A required input that is missing fails with "Pass --title" and a non-zero exit. No prompt
without a TTY or under `--no-input`. A prompt is for people and never the only path.

**Otherwise:** An unattended run waits forever on a prompt nobody sees.

**Do**

```text
$ acme ticket create --no-input                     (exit 2, envelope on stderr)
{ "code": "VALIDATION_ERROR", "context": { "field": "--title" }, "hint": "Pass --title" }
```

**Don't**

```text
$ acme ticket create
Title: _                                            (waits with no TTY)
```

**Check:** run every command with no input and no TTY; assert it exits and names a flag.

[Return to top](#table-of-contents)

### 5.2 No secret in a flag or an environment variable #security

**TL;DR:** `--token abc` and `ACME_TOKEN=abc` leak into process lists, shell history, logs and the
agent's own context. Read credentials from a store the caller cannot read.

**Otherwise:** Anything an agent can read, a prompt injection can ask it to send elsewhere.

**Do**

```sh
acme config setup          # credentials go to a store the caller cannot read
```

**Don't**

```sh
acme pr list --token abc123
ACME_TOKEN=abc123 acme pr list
```

**Check:** a test bans `--token`, `--password` and secret-named variables.

[Return to top](#table-of-contents)

### 5.3 Enum over string; refuse typos

**TL;DR:** A closed set is a choice list in the command's definition and prints in the help. A typo is
an error, not ignored. Numbers are parsed and junk is refused.

**Otherwise:** `--state opne` silently returns nothing and the agent concludes there is no data.

**Do**

```text
$ acme pr list --state opne                         (exit 2, envelope on stderr)
{ "code": "VALIDATION_ERROR",
  "context": { "field": "--state", "observed": "opne", "allowed": ["open", "merged", "declined"] } }
```

**Don't**

```text
$ acme pr list --state opne
No pull requests.
```

**Check:** a test passes a wrong value to each choice flag and a non-number to each numeric flag.

[Return to top](#table-of-contents)

### 5.4 Long text comes from a file or stdin

**TL;DR:** Offer `--body-file <path>` beside `--body <text>`. Multi-line text through shell quoting
gets mangled by agents and by shells. The same goes for structured input: a command that takes many
items reads a JSON file or stdin (`--input <path>`, `--input -`) beside its flags.

**Otherwise:** Backticks, quotes and newlines in a comment body corrupt the command line.

**Do**

```sh
acme pr comments add 42 --body-file comment.md
```

**Don't**

```sh
acme pr comments add 42 --body "Fix `foo()`: it said \"done\"
and broke on the second line"
```

**Check:** a test posts a body with quotes, backticks and newlines through the file form, and one
structured input through `--input`.

[Return to top](#table-of-contents)

### 5.5 Work where agents run

**TL;DR:** Provide `whoami`, so the agent need not guess a username to filter by. If an agent
sandbox gives it a scratch directory, `--output <path>` must accept it, and a refusal must name an
allowed place.

**Otherwise:** The agent guesses a username and filters to nothing, or writes its result to a path the
tool refuses with no hint.

**Do**

```sh
acme whoami --json
acme pr list --output /tmp/agent-scratch/prs.json
```

**Don't**

```text
Error: output path not allowed          <- and no word on which paths are
```

**Check:** run the suite from inside a sandbox directory; a test asserts the output-path refusal names
an allowed location.

[Return to top](#table-of-contents)

# 6. Writes

### 6.1 Every write has `--dry-run` #strategic

**TL;DR:** The preview uses the same selection logic as the real run, runs the same refusals
(duplicate, locked, forbidden) and returns structured output.

**Otherwise:** A preview that is a stub passes, and the real write then fails with an error the preview
should have shown.

**Do**

```sh
acme pr merge 42 --dry-run     # refuses on a conflict, exactly as the real merge would
```

**Don't**

```sh
acme pr merge 42 --dry-run     # prints "would merge" without checking for conflicts
```

**Check:** a test asserts every write declares it and the preview is not an empty stub.

[Return to top](#table-of-contents)

### 6.2 Every write has `--confirm`, and an agent never needs it

**TL;DR:** `--confirm` skips the prompt a person sees on a terminal. Without a terminal, or under
`--no-input`, the prompt is not there, so an unattended caller does not need the flag. That is safe
only when approval is enforced outside the flag (see 6.4); a prompt alone guards nothing from an
agent.

**Otherwise:** A prompt that exists only on a terminal leaves unattended writes either blocked or
unguarded.

**Do**

```sh
acme pr merge 42 --confirm     # a person skips the prompt
acme pr merge 42 --no-input    # an agent: runs directly, no prompt to answer
```

**Don't**

```sh
acme pr merge 42               # unattended, blocks on "Merge? [y/N]"
```

**Check:** a test asserts every write declares `--confirm` and that a no-TTY run does not prompt.

[Return to top](#table-of-contents)

### 6.3 A repeated write ends `unchanged`

**TL;DR:** Doing the same write twice reports `unchanged`, not a duplicate and not an error.

**Otherwise:** Agents retry. Without idempotence, every retry after a timeout doubles the effect.

**Do**

```sh
acme ticket link ACME-1 ACME-2   # linked
acme ticket link ACME-1 ACME-2   # unchanged
```

**Don't**

```sh
acme ticket link ACME-1 ACME-2   # linked
acme ticket link ACME-1 ACME-2   # linked again, a duplicate link
```

**Check:** one test per idempotent write calls it twice.

[Return to top](#table-of-contents)

### 6.4 No `--yes` or `--force` over a real gate #security

**TL;DR:** If a write needs an approval, the approval is the gate, enforced where the caller cannot
add a flag to skip it. Several sources recommend `--yes` for automation; for gated writes this
practice disagrees.

**Otherwise:** A flag the agent can add is a gate the agent can open, including after a prompt
injection.

**Do**

```text
acme pr merge 42      -> waits for the approval enforced by a separate process
```

**Don't**

```sh
acme pr merge 42 --yes --force
```

**Check:** a test bans `--yes` and `--force`; enforcement lives in a separate process with its own
identity where possible.

[Return to top](#table-of-contents)

### 6.5 Plan for parallel writes #advanced

**TL;DR:** Agents fire several writes at once. If each write needs an approval, batch or queue the
requests. Declining all but one is a defect they will hit.

**Otherwise:** One run of five writes produces one result and four unexplained failures.

**Do**

```text
5 writes -> 5 queued approvals, 5 distinct outcomes
```

**Don't**

```text
5 writes -> 1 approved, 4 "declined" with no reason
```

**Check:** an integration test issues N writes concurrently and asserts each gets a distinct outcome.

[Return to top](#table-of-contents)

# 7. Help and discovery

### 7.1 Help leads with an example

**TL;DR:** `--help` starts with an example, marks required arguments, and states the output shape and
exit codes. Then flags, then caveats.

**Otherwise:** Prose before the first example costs the agent tokens and still leaves the syntax
unclear.

**Do**

```text
EXAMPLES
  $ acme pr list --state open
ARGUMENTS
  <pr>   (required) pull request number
```

**Don't**

```text
Lists pull requests. Pull requests are... (three paragraphs before any syntax)
```

**Check:** a test asserts a leaf command prints EXAMPLES first and marks required arguments.

[Return to top](#table-of-contents)

### 7.2 Discoverable in two hops

**TL;DR:** `acme search <word>` finds commands, flags, topics, error codes and config keys.
`acme explore <topic>` explains an idea. Every command has a description.

**Otherwise:** A feature only the docs mention does not exist for an agent that cannot read the docs.

**Do**

```sh
acme search merge          # lists pr merge and related topics
acme explore exit-codes
```

**Don't**

```text
"See the wiki for the full command list."
```

**Check:** a test finds every command through search and asserts every topic referenced exists.

[Return to top](#table-of-contents)

### 7.3 No documented pipe, redirect or `cd ... &&`

**TL;DR:** If a workflow needs a pipe, a flag is missing: `--output`, `--cwd`, `--jq`. Sources that
recommend piping to `jq` assume a shell session; if your agents run one atomic command per call, put
the filter in the tool.

**Otherwise:** A compound command fails permission checks that allow each part, and cannot be
approved or audited as one step.

**Do**

```sh
acme pr list --jq '.[].title' --output titles.txt
```

**Don't**

```sh
acme pr list --json | jq '.[].title' > titles.txt
```

**Check:** a docs test fails on a documented pipe or redirect in a workflow. The test commands in
this guide (`2>/dev/null` in 2.1, `| cat` in 2.4) are checks, not workflows, and are exempt.

[Return to top](#table-of-contents)

### 7.4 Generate the reference, do not write it

**TL;DR:** The command tree describes itself as data; the reference docs and any agent tool
definitions come from it, and a test fails when the description is incomplete.

**Otherwise:** A hand-written reference and the code disagree within a release.

**Do**

```sh
acme docs-gen          # reference pages and tool definitions, from the command tree
```

**Don't**

```text
docs/reference.md      <- edited by hand next to the code
```

**Check:** a generation step in the build; a test fails on a command without a description or
example.

[Return to top](#table-of-contents)

### 7.5 The tool describes its own output, versioned

**TL;DR:** `acme schema <command>` prints the JSON Schema of that command's `--json` output, and the
output names a `schemaVersion`. A new field is additive within a version; a rename or removal is
breaking and bumps it. `acme --version` stays a plain version string.

**Otherwise:** The agent learns the shape by trial, and cannot tell whether a changed output is a new
tool version or its own mistake.

**Do**

```sh
acme schema pr-list --json     # { "schemaVersion": "v1", "schema": { ... } }
```

**Don't**

```text
"The fields are listed in the wiki."
```

**Check:** a test validates every command's real `--json` output against its printed schema, and a
snapshot (8.1) pins `schemaVersion`.

[Return to top](#table-of-contents)

# 8. Evolving the surface

### 8.1 Snapshot the whole surface #strategic

**TL;DR:** Commit a snapshot of every flag with its help, the JSON keys, the list of writes, the error
codes with class and hint, the environment variables and each command's full `--help`. A change fails
until someone accepts a diff they have read.

**Otherwise:** A flag renamed in a refactor reaches callers as a silent break.

**Do**

```text
tests/__snapshots__/flags.txt, json-keys.txt, writes.txt, error-codes.txt, help/<command>.txt
```

**Don't**

```text
review a flag rename by reading the source diff of the file that declares it
```

**Check:** the snapshot test itself, updated with one command that makes the diff reviewable.

[Read more](sections/evolving/snapshot-the-surface.md) | [Return to top](#table-of-contents)

### 8.2 A rename leaves a hint behind #strategic

**TL;DR:** Agents and scripts copy your command lines into hooks, skill files and project
instructions you cannot grep. Keep a small table of removed names. An unknown flag that matches it
fails, still failing so there is no alias, but names the new flag:
`unknown option --text (renamed to --body)`.

**Otherwise:** The agent reads a bare "unknown option" as its own mistake, retries variants, and the
stale instruction survives to break the next session.

**Do**

```json
{ "code": "UNKNOWN_OPTION", "message": "unknown option --text (renamed to --body)" }
```

**Don't**

```json
{ "code": "UNKNOWN_OPTION", "message": "unknown option --text" }
```

**Check:** a test per entry in the removed-names table; a changelog entry marked breaking.

[Read more](sections/evolving/rename-leaves-a-hint.md) | [Return to top](#table-of-contents)

### 8.3 Update the callers you cannot see

**TL;DR:** As part of the change, search hooks, skill files, project instructions and agent memory for
the old form. Do not wait for the first failure.

**Otherwise:** The repo's tests pass while every agent session fails.

**Do**

```text
rename PR includes: grep of hooks, skill files and project instructions, all updated
```

**Don't**

```text
merge the rename, wait for the first agent failure, then search
```

**Check:** a checklist item on the PR template; a script that greps known instruction locations.

[Return to top](#table-of-contents)

### 8.4 Audit naming and record the decisions

**TL;DR:** Compare flags, placeholders and verbs across commands now and then. Write down what was
decided, including "no change" and why, so a dismissed finding does not look like an unexamined one.

**Otherwise:** Inconsistencies pile up, and each looks like an accident nobody owns.

**Do**

```text
docs/investigations/2026-10-naming.md: 14 findings, each with a decision or "no change, because ..."
```

**Don't**

```text
a decision recorded only in a commit message
```

**Check:** the flag-purpose table (1.4) shows drift as a diff; the audit lives in a dated document.

[Return to top](#table-of-contents)

## Sources and thanks

Format modelled on [nodebestpractices](https://github.com/goldbergyoni/nodebestpractices). General CLI
baseline from [clig.dev](https://clig.dev/). Agent angle from
[Agent-first CLI: a design pattern](https://akeemjenkins.com/blog/agent-first-cli-a-design-pattern/),
[CLI-first architecture](https://agents-squads.com/engineering/cli-first-architecture/) and
[Designing a CLI for AI agents](https://arcjet.com/blog/designing-a-cli-for-ai-agents). Practices not
traced to those come from running an agent-driven CLI in practice.

## Contributing

See [.operations/writing-guidelines.md](.operations/writing-guidelines.md) and the
[template](sections/template.md).

## License

[CC-BY-SA-4.0](LICENSE).
