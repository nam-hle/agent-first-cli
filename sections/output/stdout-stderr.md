# Data on stdout, everything else on stderr

### One paragraph explainer

A caller that parses your output reads stdout as one document. Anything else you want to say (progress,
warnings, a next-step hint, a deprecation notice) goes to stderr, where it cannot corrupt the data.
This also lets a person see both on a terminal while a script sees only the result. The test is simple:
discard stderr and the result must still be complete and valid.

### Do

```sh
acme pr list --json 2>/dev/null     # exactly one JSON document
acme pr list --json 1>/dev/null     # messages only: progress, hints
```

### Don't

```text
Fetching page 1 of 3...
Fetching page 2 of 3...
[{"id": 1, ...}]
```

### What goes wrong

The agent pipes stdout into a JSON parser. The progress lines make it fail with
`Unexpected token F in JSON at position 0`, and the agent debugs the parser instead of the tool.

### How to check it

Run the built binary, not the source, for every command, with stderr redirected away. Assert stdout
parses as exactly one document. Run it once more with stdout discarded to confirm messages land on
stderr.

### Source

From practice. The general rule is also in [clig.dev](https://clig.dev/).
