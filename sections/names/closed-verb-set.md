# Use one shape and a closed verb set

### One paragraph explainer

Agents learn a tool's vocabulary from a few commands and generalise. If `list` exists on one noun, they
try `list` on the next; if they once saw `show`, they try `show`. A closed verb set turns that
generalisation into a guarantee: the verbs mean the same on every noun, and a guess outside the set
fails with an error that names the right verb. Aliases look friendly but teach a second spelling and
double the surface the help and the tests must cover.

### Do

```sh
acme pr list
acme pr comments add 42 --body "LGTM"
acme config view
```

### Don't

```sh
acme pr ls              # abbreviation
acme pr show 42         # synonym of view
acme add-comment 42     # verb first, noun fused in
```

### What goes wrong

An agent runs `acme pr show 42` after seeing `acme pr view 7` once. If `show` is an alias, it works and
the agent now uses both; a later removal breaks every transcript and instruction that used `show`. If
there is no alias, the error should read: `unknown command show; did you mean view`, with the verb
list in `availableCommands`.

### How to check it

A test holds the verb list and the banned synonyms, walks the command tree, and fails when a leaf is
not a verb from the list, when a name is abbreviated, or when an alias is registered. Adding a verb
means editing the list in the test, which makes the addition a reviewed decision.

### Source

From practice.
