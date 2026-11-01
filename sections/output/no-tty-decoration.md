---
id: no-tty-decoration
category: Output
max: 3
---
# No colour, spinner or pager off a terminal

Practice 2.4 in the [guide](../../README.md).

### One paragraph explainer

Off a TTY there are no escape sequences, spinners or pagers. Honour `NO_COLOR` and `TERM=dumb`
too, because some harnesses allocate a terminal but still do not render it. Decoration is a service
to a human eye; an agent has no eye, it has a context window that stores every byte, and an ESC
sequence there is garbage that costs tokens and can break a parser. A pager is worse: it blocks
waiting for a key that will never come, and the agent sees a hang. Decide once, centrally, whether
the output is interactive, and let every command inherit the answer. The output format never
depends on whether stdout is a terminal: `--json` is the only way to get JSON, so the same command
gives the same data in CI and in a shell.

### Do

```sh
NO_COLOR=1 acme pr list        # plain text
acme pr list | cat             # no ESC bytes, no spinner, no pager
TERM=dumb acme pr list         # plain text
```

```ts
const interactive = process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== "dumb";
```

### Don't

```text
\x1b[32m✔\x1b[0m done          <- colour and spinner frames in a pipe
\r| Loading...                 <- carriage-return spinner written to a captured stream
```

```sh
acme pr list | less            # a tool that starts its own pager when output is long
```

### What goes wrong

The agent runs `acme pr list` through a harness that captures output without a terminal. The tool
prints a green tick and a spinner frame per poll, so the captured text is hundreds of lines of
`\r` and `\x1b[2K` ahead of the actual rows. The agent reads the first screenful, sees only spinner
fragments and concludes the list is empty. On a longer result the tool pipes into a pager, which
waits for input until the harness times out and kills the call.

### Edge cases and trade-offs

- **"Colour helps people."** It does, on a terminal. The rule is conditional, not a ban: keep
  colour when stdout is a TTY and nothing opts out.
- **Forcing colour.** An explicit `--color=always` is fine for a person who wants it in a CI log.
  It must never be the default, and it must never be implied by an environment the agent controls.
- **Help output.** Help is output too; `acme --help | cat` has no ESC bytes
  ([8.1](../help/help-leads-with-example.md)).
- **Unicode symbols.** A tick or box-drawing character is not an escape sequence, but it can
  break a log pipeline that assumes ASCII. Prefer words (`done`, `failed`) in anything an agent
  may read; see [4.1](../success/name-what-happened.md).
- **Spinners on stderr.** Hiding the spinner from stdout is not enough if a harness merges the
  streams. Suppress the spinner whenever stderr is not a TTY as well; see [2.1](stdout-stderr.md).
- **Width.** Do not wrap or truncate to the terminal width off a TTY. Truncated cells look like
  complete values to a parser.
- **Pagers.** Never start one unless both stdin and stdout are terminals, and honour `PAGER=cat`
  or a `--no-pager` flag for the cases where a terminal is present but unattended.
- **Long waits.** Silence is not the alternative to a spinner; report slow work as data
  ([4.5](../success/slow-commands.md)).

### How to check it

Run the built binary piped, and assert no ESC byte (0x1b) in stdout or in help, for every command.
Run it once more with `NO_COLOR=1` under a pseudo-terminal if your test setup has one. Also run
each command with and without a pseudo-terminal and compare the stdout data: it must be the same.

```sh
for cmd in "pr list" "pr view 1" "ticket list" "--help" "pr list --help"; do
  out=$(acme $cmd 2>&1 < /dev/null | cat)
  if printf '%s' "$out" | grep -q "$(printf '\033')"; then
    echo "ESC byte in: acme $cmd"; exit 1
  fi
done
```

### How to score

Maximum: 3 points. Stray escape bytes cost tokens and a pager is a hang, but both are easy to spot.

Sample the first 30 leaf commands by sorted path plus every write command (writes only against a
sandbox service). Run each, and its `--help`, with stdout and stderr sent to one capture (a pipe or
a redirect to a file) and stdin closed, under a 5 second timeout (`timeout` or `gtimeout`,
whichever exists). A command violates
when any of these holds:

- **Escape bytes:** the capture contains an ESC byte (0x1b) or a carriage-return spinner frame.
- **Pager:** there is evidence of one: a `less` or `more` process started by the CLI, or output
  that stops at a pager prompt such as `(END)` or `:`. A timeout alone is not a pager violation.
- **Format changes with the terminal:** the data fields differ between the piped run and a run
  with `NO_COLOR=1 TERM=dumb` (relative timestamps such as "2 minutes ago" are not compared), or
  the default output format differs between the captured run and a run through a pseudo-terminal
  (for example text on a terminal, JSON when piped). A format difference is a different output
  structure (text versus JSON, or a presentation-only table on a terminal versus JSON when
  captured), never a colour or width difference. A documented, deliberate default of text on a
  terminal and JSON when captured is still a format difference and still violates, because agents
  run captured; the documentation does not excuse it. Where a pseudo-terminal exists, an ESC byte
  under `NO_COLOR=1` also counts.

The terminal-versus-captured comparison covers at least 5 leaf commands (all if fewer than 5),
the first leaves by sorted path, plus two writes in dry-run form (when fewer than two writes
exist or none has a dry-run form, compare the leaf commands only). Recipe: from the shell tool,
run the command under `script -q /dev/null <cmd>` and compare its stdout with the captured run.
When that cannot be done, the comparison is "not run": mark the practice "unverified" and the
score cannot exceed half.

- **0:** At least 25% of the sampled commands violate.
- **About half (2):** Under 25% violate and at least one does (for example `acme --help` is plain
  but `acme pr list` prints `\x1b[32m` colour codes into a pipe); or no command violates but the
  pseudo-terminal comparison was not run (unverified).
- **Maximum (3):** No sampled command violates and the pseudo-terminal comparison was run.
- **Not applicable when:** never.
- **Evidence:** `timeout 5 acme <command> 2>&1 < /dev/null | cat`, then search the capture for the
  byte 0x1b (for example `grep -c "$(printf '\033')"`) and for `\r`; compare data fields with
  `NO_COLOR=1 TERM=dumb acme <command> 2>&1 < /dev/null | cat`. Compare the default output format
  of the piped run with the one through a pseudo-terminal allocator available on the host (its
  syntax differs between operating systems); if none can be used the comparison is not run. On a
  timeout, look for a `less` or
  `more` process (`ps`) or a trailing `(END)` before calling it a pager.
