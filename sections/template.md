---
id: page-slug            # the page file name without .md
category: Category name  # one of the eight names listed in benchmark/README.md
max: 3                   # one of 1, 2, 3, 5, 8 by severity and breadth
---
# <Practice title>

Practice <number> in the [guide](../../README.md). Keep the title the same as the README entry.

### One paragraph explainer

One paragraph: what to do, and why an agent caller makes it matter more than it would for a person.

### Do

```sh
acme ...
```

### Don't

```sh
acme ...
```

### What goes wrong

A concrete failure: the input, what the tool did, what the agent did next. Prefer a real incident
over a hypothetical one.

### Edge cases and trade-offs

When to bend the practice, the objections a maintainer will raise and the answer to each, and how it
interacts with neighbouring practices (link them by number).

### How to check it

The test that walks the command tree, or the snapshot that shows the drift as a diff. Include a
short runnable sketch of the test (TypeScript or shell, against `acme`).

### How to score

Maximum: N points. One line: severity and breadth that justify N.

- **0:** what absent or contradicted looks like.
- **About half (K):** the common partial case, concrete. (K is the ceiling of N/2; a max-1 practice
  omits this line.)
- **Maximum (N):** all commands behave as the practice says.
- **Not applicable when:** the condition, or "never".
- **Evidence:** the command to run or the file to read.
