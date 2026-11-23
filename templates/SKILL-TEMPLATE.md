---
name: replace-with-verb-first-name
description: Use when [the literal words a user says] — [symptom], [symptom], or [situation]. Not for [adjacent thing] (use [other-skill]).
domain: thinking
risk: none
invocation: model
# invocation: user also requires, uncomment to enforce:
# disable-model-invocation: true
version: 0.1.0
metadata:
  form: discipline
  baseline: the-failure-this-skill-is-written-against
  eval: evals/
# no pack field — membership is declared in packs/<lens>.yml, one skill lives in many packs
---

# Replace With Title

<!--
HOW TO USE THIS TEMPLATE
Delete every comment before publishing. The comments are the standard, restated in place; the
normative version is docs/AUTHORING-STANDARD.md.

Fill in this order, because each step constrains the next:
  1. The Iron Law  — what is the one non-negotiable?
  2. When not to use — the boundary is harder than the trigger and prevents overlap
  3. The process   — phases, each ending on a checkable artifact
  4. Gotchas       — the specific, surprising facts (from a real failure)
  5. Rationalizations — in the model's own voice, from a real baseline
  6. Red flags     — the self-check, compressed
  7. Limitations   — what this cannot do
Then write evals/ before you think the skill is done.

One line of prose explaining what changes after this skill runs. No "this skill helps you".
-->

```
THE ONE NON-NEGOTIABLE, IN CAPS, IN A FENCE.
```

<!--
Exactly one. A fenced line reads as a literal rather than prose to be paraphrased. Put it before any
explanation: hosts that compact context keep the first 5,000 tokens of a skill, so position is
retention. Two Iron Laws means none.

Good:  NO COMPLETION CLAIM WITHOUT A COMMAND RUN IN THIS TURN.   (plain fence, caps)
Good:  NO PRODUCTION CHANGE WITHOUT A FAILING TEST FIRST.
Bad:   > **Be rigorous and thorough.**                          (not a law, not checkable)
Bad:   > **A fence with a blockquote inside reads as styled prose.** Use a plain ``` fence.
-->

## When to use / when not to use

Use when:

- the user says "…", "…", or "…" (their words, not the technique's name)
- the situation is: [a concrete situation, not a category]

Not when:

- [adjacent situation] — that is `[other-skill]`, because [the distinguishing fact]
- [another adjacent situation] — that is `[other-skill]`

<!--
The "not when" list is not optional and is usually longer than the "use when" list. It is what keeps a
library from becoming a pile of overlapping triggers. Name the other skill by its exact `name`.

If the boundary is genuinely non-obvious, add a routing table:

| if the situation is | use |
|---|---|
| the answer is unknown and the framing may be wrong | this skill |
| the answer is known and the work needs slicing | split-by-frontier |
-->

## The process

<!--
Numbered phases. EVERY phase ends on a completion criterion: a condition that distinguishes done from
not-done, checkable by the agent without asking anyone.

The strongest criteria are checkable AND exhaustive:
  weak:    "understanding reached"
  strong:  "every modified model accounted for"
A vague bound invites premature completion — the agent ends the step because the next one is visible.

Choose degrees of freedom per step, not per skill:
  - narrow bridge, cliffs both sides (destructive, ordered, fragile) -> exact command, no options
  - open field (review, design, diagnosis) -> goal + constraints + the reason; the agent picks the path
Reasoning skills are mostly open field. Do not railroad: "state the goal and the constraints, not every
step." A skill that dictates every move produces compliance without judgement.
-->

### Phase 1 — [name the phase as an action]

[What to do, and *why* it matters — the reason is what lets the agent generalise to cases you did not
anticipate.]

**Done when:** [a checkable, ideally exhaustive, condition — an artifact you can point at].

### Phase 2 — [name]

[What to do.]

**Done when:** [checkable condition].

### Phase 3 — [name]

[What to do.]

**Done when:** [checkable condition].

<!--
If a phase is a gate, name the artifact that opens it, and name the shortcut the gate exists to block:
  "No red-capable command, no Phase 2. Jumping to a hypothesis is the exact failure this prevents."
A gate that says "do not proceed until you are sure" is not a gate.
-->

## Gotchas

<!--
The highest-signal section, and the only content guaranteed wrong without the skill. Format: the fact,
the consequence, what to do instead. Specific and surprising. At least three.

A gotcha is not advice:
  not a gotcha:  "Handle errors appropriately."
  gotcha:        "pytest -x stops at the first failure, so a green run from it is a claim about one test."
-->

- [Fact that defies assumption]. [What goes wrong if you assume otherwise]. [What to do instead].
- [Fact]. [Consequence]. [Instead].
- [Fact]. [Consequence]. [Instead].

## Rationalizations

<!--
A two-column table of the model's own anticipated self-talk against a one-line rebuttal. Write the
excuse in the voice the model actually uses — the mechanism is recognition, not instruction.

Build it from OBSERVED drift: a real baseline run, a real session, a real correction. An invented
table is a guess about how the model fails, and it reads as one.

The spirit-over-letter row is mandatory. It closes semantic reframing, which is the actual failure mode.
-->

| Excuse | Reality |
|---|---|
| "[the thing the model will say to skip the work]" | [one line that ends the argument] |
| "[second escape]" | [rebuttal] |
| "[third escape]" | [rebuttal] |
| "Different words, so the rule doesn't apply" | Spirit over letter. |

## Red flags

<!--
The rationalization table compressed into what the agent can check mid-stream. Short. Each line is a
thought that means stop.
-->

- You are about to [specific shortcut] before [the gate].
- You are reading [the material] to *confirm* a conclusion you already stated.
- You are explaining why the rule does not apply here.

## Limitations

<!--
Specific. Never the three-line boilerplate ("use only when the task matches", "not a substitute for
validation", "ask for clarification") — a corpus we studied has that exact filler in 41.9% of its
skills, and the gate that required it produced presence without quality.

If the honest answer is "nothing beyond the obvious", delete this section and record why in metadata.
-->

- Assumes [environment/input]. On [other environment] [what breaks], so [the workaround].
- Cannot [thing it genuinely cannot do], because [reason].

---

<!--
OPTIONAL SECTIONS — add only when the skill needs them, and record the choice in metadata.sections.

## Reference docs
Read [references/values.md](references/values.md) before writing the verdict, and take every number
from it. (Name the load explicitly: a weakly worded pointer is a variance bug.)

## Invocation variants
`quick` / `deep` / `execute <plan>` — when one skill genuinely serves two depths.
-->
