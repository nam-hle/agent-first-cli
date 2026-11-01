# Writing guidelines

1. **Simple over exhaustive.** A practice is one idea an agent author can apply in a morning.
2. **Checkable.** Every practice ends with how to check it. A practice with no check is advice, and
   belongs in prose elsewhere.
3. **Agent-specific.** The practice must matter more for an agent caller than for a person. General
   CLI advice goes to clig.dev.
4. **Tool-neutral.** Examples use the made-up tool `acme`. No real product, company, host, ticket key
   or repository in examples.
5. **One template.** New deep dives copy [sections/template.md](../sections/template.md). The
   README entry has a TL;DR, an Otherwise, a Do and a Don't (always both, even when one line), and a
   Check.
6. **Numbered and counted.** Sections and items are numbered; keep the counts in the table of contents
   in step.
7. **Tags.** `#strategic` shapes the design, `#advanced` needs infrastructure, `#security` concerns an
   untrusted caller.
8. **Disagree openly.** When a practice contradicts a well-known source, say so and say why.
9. **Scorable.** A new practice needs an id (its page slug), a category from
   [benchmark/README.md](../benchmark/README.md), a maximum from {1, 2, 3, 5, 8}, and a "How to
   score" section with 0, about half and maximum anchors that are mutually exclusive and exhaustive.
   `node benchmark/check.mjs` must print `ok`; a change to a maximum or to the practice list
   bumps the rubric version on the entry page, per its Evolving section.
