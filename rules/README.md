# Rules

Auto-loading code standards that any **generated** monitor or forensics script in
this skill should adhere to (e.g. "never use `eval` in an invariant evaluator",
"every fund-trace must report freeze-actionability per hop", "monitors must
fail-closed on RPC error"). Drop one `*.md` rule per standard here and it loads
automatically when the skill emits code.

### Why it's empty right now

This is a **designed extension point**, not an unfinished one. Rules accumulate
the way they should — from real incidents. The runtime → build-time feedback loop
([`../skill/feedback-loop.md`](../skill/feedback-loop.md), crown jewel #3) mints a
new rule from each post-mortem, so this directory grows as the skill is used in
anger rather than being pre-populated with guesses.

### Adding a rule

Create `rules/<short-kebab-name>.md` describing the standard and the failure it
prevents. Keep it concrete and code-shaped — it should be directly applicable to a
generated script, not abstract guidance.
