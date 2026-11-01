# No colour, spinner or pager off a terminal

Practice 2.4 in the [guide](../../README.md).

### One paragraph explainer

Off a TTY there are no escape sequences, spinners or pagers. Honour `NO_COLOR` and `TERM=dumb`
too, because some harnesses allocate a terminal but still do not render it. Decoration is a service
to a human eye; an agent has no eye, it has a context window that stores every byte, and an ESC
sequence there is garbage that costs tokens and can break a parser. A pager is worse: it blocks
waiting for a key that will never come, and the agent sees a hang. Decide once, centrally, whether
the output is interactive, and let every command inherit the answer.

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
Run it once more with `NO_COLOR=1` under a pseudo-terminal if your test setup has one.

```sh
for cmd in "pr list" "pr view 1" "ticket list" "--help" "pr list --help"; do
  out=$(acme $cmd 2>&1 < /dev/null | cat)
  if printf '%s' "$out" | grep -q "$(printf '\033')"; then
    echo "ESC byte in: acme $cmd"; exit 1
  fi
done
```
