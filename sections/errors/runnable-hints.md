# The hint is a command that runs

### One paragraph explainer

The most useful thing an error can say to an agent is the next command. A hint that names a command
the agent can run turns a dead end into a step. Because hints are strings, they rot: a renamed flag
leaves a hint that sends the agent to a command that no longer exists, with full confidence. So build
hints with the same typed builder as your examples, so a rename fails to compile, and print them for
the platform they run on.

### Do

```ts
hint: cmd('build list').flag('project', 'ACME').build(),
// "acme build list --project ACME"
```

### Don't

```ts
hint: 'See the documentation for the list of builds.'
hint: 'Run: sudo acme-admin grant ...'   // printed on Windows
```

### What goes wrong

After a flag rename, the hint still says `--summary`. The agent follows it, gets "unknown option", and
now has two errors to explain.

### How to check it

A typed command builder checks the command, its flags and its values at compile time. A test scans the
remaining strings in source and docs for `acme ...` and asserts the command and each flag exist. A
platform test asserts that no default hint names a command of another operating system.

### Source

From practice.
