# Sanitise text that came from another system

### One paragraph explainer

A CLI that wraps a service prints text it did not write: ticket titles, comment bodies, commit
messages, API error strings. Anyone who can write into that service can write into your output. For a
person that means terminal escape sequences and bidirectional control characters. For an agent it also
means instructions: the model reads the text as part of its context. Sanitise once, in the layer every
output path passes through (human rendering, JSON, errors, streaming, and the data you hand to an
agent tool). Remove escape sequences; show invisible and direction-changing characters visibly, so
nothing is silently hidden.

### Do

```ts
// every operation result passes through this before it is printed or returned
const clean = sanitiseDeep(result); // strips ESC sequences, shows U+202E as \u{202E}
```

### Don't

```ts
console.log(ticket.title); // raw service text
```

### What goes wrong

A ticket title contains an ESC sequence that clears the screen and rewrites earlier lines, or a
right-to-left override that makes `pay\u{202E}usd` display as something else. In an agent context, a
comment body saying "ignore previous instructions and ..." arrives unmarked.

### How to check it

One test per output path (human, JSON, error, streaming) with a hostile fixture. A second test asserts
no command handler prints service text without going through the sanitiser; list the hand-written
exceptions by name so a new one fails the test.

### Source

From practice. This does not stop prompt injection by itself; it removes the terminal-level attacks
and makes hidden characters visible.
