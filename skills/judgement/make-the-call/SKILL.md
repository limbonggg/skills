---
name: make-the-call
description: Use when a choice has to be made and defended — "should we", "which one", "is it worth it", "do we ship it", "cut it or keep it", "make the call", "go/no-go", or a decision that keeps getting reopened. Not for testing whether a claim is true (use weigh-evidence), slicing the work (use split-by-frontier), or confirming something works (use prove-it).
domain: judgement
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: survey-of-options-without-a-commitment
  eval: evals/
---

# Make the Call

A decision is an artifact with six filled slots, not a discussion. This skill makes the agent emit
the call, its price, its door, its exit, and what would reopen it.

```
NO DECISION WITHOUT A COMMITTED CALL, A PRICED COST, A DOOR TYPE, AND A REVERSAL PATH.
```

## When to use / when not to use

Use when:

- the user says "should we", "which one", "is it worth it", "do we ship it", "cut it or keep it",
  "make the call", "go/no-go", "now or later", "I can't decide"
- two or more options are on the table and somebody has to pick one
- a plan needs approval, a scope cut, or a stopping point
- an unattended run hits a fork, and asking the human would park the work for a day
- the same decision keeps getting reopened because nobody wrote down what would settle it
- you are about to answer a decision question with "it depends"

Not when:

- a claim needs testing before anyone acts on it — that is `weigh-evidence`; a decision priced on an
  unchecked claim is priced on nothing
- the decision is made and the work needs slicing — that is `split-by-frontier`
- the question is whether something works — that is `prove-it`
- the output is the message that delivers the decision — this skill produces the decision, not the
  announcement
- the choice is genuinely the owner's: a preference, a value, or an irreversible bet taken on their
  behalf. Price it, recommend, hand it over — do not rule for them

| if the situation is | use |
|---|---|
| the fact under the decision is unverified | `weigh-evidence`, then this |
| the decision is made and the work needs structure | `split-by-frontier` |
| the decision is made and the code must change | `red-green` |
| the question is "is it done" | `prove-it` |
| nobody owns the decision | escalate to the owner; do not rule on their behalf |

## The process

### Phase 1 — Write the question as a decision, not a topic

A topic cannot be decided; a question with a decider and a deadline can. Write one sentence: *who*
chooses *between what*, by *when*. Name the options as verbs or concrete artifacts ("ship behind a
flag", "patch the parser"), never as labels ("do it properly").

Separate the three things that masquerade as the decision: a missing fact (go get it), a preference
only the owner can supply (hand it over), and a choice under uncertainty (this skill).

**Done when:** one sentence names the decider, the options, and the date or event by which the call
is needed.

### Phase 2 — Price each option, in the unit that does not come back

Cost has three parts: cost if wrong, cost to find out, and cost of not deciding. Price in units that
cannot be recovered — data, customers, trust, a week of a person's attention — not in lines of code.
Read the blast radius instead of estimating it: grep the call sites, count the dependents, check what
a rollback actually restores.

An option whose cost you cannot state is not yet an option; it is a wish.

**Done when:** every option on the table has a number or a named unit for cost-if-wrong, and
"do nothing / keep waiting" has one too.

### Phase 3 — Classify the door

One question: if this is wrong, what does undo cost, and does undo restore the old state?

- **Two-way door** — undo is cheap and complete: a config value, an internal function's shape, a flag
  default. Decide now, at the confidence you have. Evidence gathering that costs more than the undo
  is a net loss.
- **One-way door** — undo is expensive, partial, or impossible: a dropped column, a published API, a
  price change, a sent email, a name customers learned. Widen the evidence, run a pre-mortem, and
  find the checkpoint — the last moment the door is still two-way. If no checkpoint exists, that is
  the finding, and it goes in the artifact.

Most decisions are two-way and get treated as one-way; the dangerous ones get treated as two-way
("we can always revert").

**Done when:** the door type is stated with its reason, and for a one-way door the checkpoint — or
its absence — is named.

### Phase 4 — Commit, with the rule named

Write the call in the imperative, in one sentence, choosing exactly one option. Name the rule that
chose it — maximum expected value, maximum expected utility, minimum maximum regret, or satisficing
(first option that clears the bar) — because the rule changes the winner: a satisficer and an EV
maximiser pick differently from the same table.

Every narrowing of the option set is already a call. If you filtered five options down to two, say
which filter did it and what it discarded; an unstated filter is a decision nobody priced.

A menu is not a call. "It depends", "here are the trade-offs", "you might want to", and "I'd lean
toward" are the failure this skill exists to prevent. When two options genuinely tie, the tie is
broken by undo cost and option value — not by more analysis.

Legal calls include **stop**, **do nothing**, **delete it**, and **decide later, on this date, for
this reason**. "Later" with no date is not a call.

**Done when:** exactly one option is chosen, in the imperative, and the rule that chose it is named.

### Phase 5 — Write the reversal path

For every call, name how it is undone: the exact step, its cost, and what does not come back. For a
one-way door the reversal path is the *plan for being wrong* — the fallback, the migration back, the
message to customers, the checkpoint.

"Revert the commit" is a reversal path only if the commit is the whole change. A migration, an API,
a published claim, and a customer's expectation are not in the commit.

**Done when:** the undo is a step someone could execute, with its cost stated — or the artifact says
plainly that there is no undo and names the exposure.

### Phase 6 — Set the tripwire, then write the artifact

A decision without a reopening condition becomes a belief. Name the observation that would change
the call, the threshold, and who or what checks it, by when. The tripwire must be observable — a
metric, a test, a date, a user report — not "monitor it".

Then write the artifact, six lines, no prose around it:

```
Call:      <one imperative sentence, and the rule used>
Cost:      <what is lost if wrong, in unrecoverable units>
Door:      one-way | two-way — <why>
Reversal:  <the undo step and its cost, or "none: <exposure>">
Tripwire:  <observation> crosses <threshold> by <date> → reopen
Owner:     <who decides, who watches>
```

**Done when:** all six slots are filled, and the tripwire names an observation, a threshold, and a
date.

When the decision is already made, the artifact is the audit: fill the slots for the call that was
taken. An empty `Reversal` on a one-way door is the finding, not a formatting problem.

## Gotchas

- A commit is not a decision. `git revert` restores code; it does not un-drop a column, un-send an
  email, un-publish an API, or un-teach a customer a price. Classify the door by the artifact that
  escapes the repository, not by the size of the diff.
- "We've already built it" is a sunk cost wearing a discount. Existing code collects a reuse credit it
  has not earned; the question is what the next month costs, not what the last one did.
- The undecided option is not free. Parking the question spends exactly the thing you were protecting
  — a blocked team, a branch that rots, a competitor's default becoming your default. Price "wait"
  like the others or it wins by default.
- An estimated blast radius is fiction. A rename looks two-way until the grep shows the symbol is a
  public export with three consumers. Read the call sites before you call something reversible.
- Effort and reversibility invert under time pressure: a day spent on a library choice (two-way) and
  thirty seconds on a schema drop (one-way). The door, not the calendar, sets how much evidence the
  call gets.
- "Ask the user" is a call with a price, not neutrality. In a two-way door it costs a parked session
  and buys almost nothing; in a one-way door owned by someone else it is the only correct move.
- Naming the decision rule after scoring lets the score pick the rule. Fix the rule first, or two
  people with the same table reach opposite calls and neither can say why.
- A pre-mortem that produces only fears is a mood. Each failure it names becomes a mitigation in the
  artifact or an accepted risk with a stated price.

## Rationalizations

| Excuse | Reality |
|---|---|
| "It depends — here are the trade-offs" | A trade-off list is the input. The output is one option, chosen. |
| "The user should decide" | Only if it is theirs: a preference, a value, an irreversible bet. A cheap two-way call is yours to rule and disclose. |
| "We can always revert it" | Name the undo step before you say that. If the undo is "restore from backup", it is a one-way door. |
| "There isn't enough information" | Name the missing fact, what it costs to get, and what you would decide without it. Waiting is an option with a price, not an escape from choosing. |
| "Both options are fine" | Then undo cost and option value break the tie. A tie is a decision, not permission to keep analysing. |
| "Let's revisit this later" | Later is a date and an owner, or it is never. |
| "It's not my call" | Then your call is the escalation: to whom, with what recommendation, by when. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "I'd lean toward", "the recommended path is", and "you probably want" are calls; price them. |

## Red flags

- Your answer contains more options than the question did.
- You wrote "it depends" and stopped there.
- You are pricing the option in hours of typing rather than in what does not come back.
- You called something reversible without naming the undo step.
- You are asking a question whose answer you would have ruled on yourself.
- You are re-opening a decision whose tripwire has not fired.
- You are gathering more evidence on a two-way door than the undo would cost.

## Limitations

- Supplies the structure and the price, not the values. Which product to build, whether a risk is
  acceptable, and what a team can live with belong to the owner; this skill prices them and hands
  over the call.
- The cost figures are estimates with a stated basis. The artifact makes them arguable; it does not
  make them accurate.
- Cannot make a one-way door safe. It can name the door, find the checkpoint, and price the exposure
  — the exposure remains.
- Assumes a decider exists or can be named. With nobody in that seat the honest output is the
  escalation, and this skill cannot manufacture the authority to rule.
