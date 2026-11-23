---
name: learn-from-correction
description: Use when the user corrects you — "no", "not what I meant", "I said…", "again?", "you changed the wrong file", "stop doing that", "we don't do it that way here" — or a review comment rejects the change for a reason the next change will hit too. Not for deciding whether the correction is right (use disagree-well) or for a one-off instruction that applies only now.
domain: meta
risk: writes
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: reflection-instead-of-an-artifact
  eval: evals/
  classifier: mechanical when a program can decide whether the rule was followed
---

# Learn From Correction

A correction is an instruction aimed at the next session, which will not remember this one. This skill
converts it into the artifact that session reads — and forbids the paragraph that only the current
conversation will ever see.

```
EVERY CORRECTION LANDS AS A CHECK OR A WRITTEN STANDARD, NEVER AS A REFLECTION.
```

## When to use / when not to use

Use when:

- the user rejects what you did: "no", "not like that", "that's not what I asked", "I said X", "why did
  you touch…", "you changed the wrong file", "stop doing that"
- the user fixes your work by hand, or repeats an instruction you were already given
- "again?" or "the second time" appears — recurrence is the strongest signal available
- a review comment rejects the change for a reason that will apply to the next change as well
- a test or CI run caught something a rule on disk already covered, and you did not apply it

Not when:

- the user is asking for new behaviour rather than rejecting old behaviour — that is a task, not a
  lesson; use `frame-the-problem`
- the correction might itself be wrong, or is a taste disagreement — test it with `weigh-evidence`,
  argue it with `disagree-well`, and return here only if it survives
- the constraint applies to this run only ("use staging", "don't push yet") — obey it now; encoding it
  turns a circumstance into a rule
- the rule already exists on disk and you merely failed to apply it — the defect is placement, not
  learning; fix that artifact (Phase 6) instead of writing a second one
- the user asks you to verify the work — that is `prove-it`

| situation | skill |
|---|---|
| the same correction, a second time | this skill, Phase 6 — promote the existing artifact |
| the correction may be wrong | `disagree-well`, before Phase 3 |
| the rule is "write the test first" | `red-green` — that one is enforced by the test |
| the lesson has to cross a context boundary | this skill writes it; `write-handoff` carries the state |

## The process

### Phase 1 — Record the instance before interpreting it

Three lines, before any diagnosis:

```
did:      <the action the user objected to, as a diff hunk or one sentence>
said:     <their words, verbatim, from the transcript>
expected: <what they wanted instead, in their framing>
```

Verbatim matters twice over: the user's phrasing is the trigger that will recognise the next instance,
and a paraphrase drifts toward the mistake you already know how to fix. "You're being sloppy with
types" is not "ban `any`" — it is the class, and the class is what generalises.

**Done when:** the three lines exist and `said:` is quoted, not summarised.

### Phase 2 — Resolve the antecedent

Corrections arrive compressed. "Not like that" points at a hunk. "Again" points at an earlier turn.
"No, the other one" points at a noun you chose. Find the referent in the transcript — the diff, the
review comment's line, the file they had open — before writing anything. A guess here becomes a
permanent rule against something you never did.

If the referent cannot be resolved from what you have, ask one question and stop. One question, not a
list; the answer is a fact only the user holds.

**Done when:** you can name the specific action, without hedging, in one sentence.

### Phase 3 — Test the correction before encoding it

Three outcomes, and only three:

- **accept** — the user is right and the rule generalises as stated.
- **narrow** — the user is right about this instance and the generalisation you would write is wrong.
  "Don't mock the database *in the integration suite*" is not "never mock". Write the general rule and
  the scope in the same sentence, and put the scope in the receipt.
- **reject** — the correction is wrong, or it is a preference with no durability. Say so now, with the
  evidence (the formatter config, the failing build, the spec), and encode nothing. Silent obedience
  and silent refusal are the same defect: neither leaves a rule the user agreed to.

A correction that contradicts a rule already on disk is not an append. The old rule is edited or
deleted in the same change. Two rules that disagree are worse than one wrong rule, because the next
session picks the one it prefers.

**Done when:** one outcome is chosen, and for *narrow* the rule and its scope are one sentence.

### Phase 4 — Classify, with one question

> Could a program decide, from the artifact alone, whether the rule was followed?

- **Yes → mechanical.** Build a check at the cheapest enforcement point that already runs on every
  change: the linter or type checker in the repo → the test suite that is already run → the repo's
  validator or CI config → a new script wired into one of those. A check nothing invokes is a comment
  with extra steps.
- **No → judgement.** Write a standard: one imperative line, in the file the agent reads *while doing
  the thing* — the gotcha list of the skill governing that action, `AGENTS.md`, the module header, the
  review checklist. Not a lessons-learned directory, which nothing loads.
- **Neither, because you cannot state the rule** → you have not understood the correction. Return to
  Phase 2. This is the only honest third answer, and it is not "write a reflection".

Hybrid is the normal case: the mechanical half gets a check, the judgement half gets one line, and each
names the other.

**Done when:** each half has exactly one named artifact path, and you can say which question decided
it.

### Phase 5 — Make the artifact fail without the fix

For a check: reproduce the behaviour that was corrected, watch the check fail, then restore and watch
it pass. A check written after the fix and never seen failing may be asserting nothing — a regex that
matches no file, a test in a suite nothing runs.

For a standard: locate the decision point, the file that would have been read before the mistake, and
confirm the line is in it. A line the agent reads only at the end of a session is in the wrong place,
however well written.

**Done when:** for a check, both runs are in this session's output; for a standard, you can name the
file, the line, and the action that loads it.

### Phase 6 — Emit the receipt

Six fields, in this order, greppable as written:

```
correction: <the user's words, verbatim>
class:      mechanical | judgement | both
artifact:   <path>#<rule id or line>
prevents:   <the general rule, one imperative sentence>
proof:      <command> -> failed before, passed after   |   <file:line, loaded by <action>>
scope:      <where it applies, and where it does not>
```

A reflection is any output whose only reader is the current conversation: "I'll be more careful",
"noted", a paragraph about what went wrong, an apology with a promise attached. None of them survive
the session, and all of them feel like the lesson was learned.

First occurrence: a gotcha line or a scoped convention is enough — one instance is an anecdote, and a
hard rule built from an anecdote over-fits. The second occurrence of the same correction promotes it:
widen the check, or move the line from a comment to the enforcement point. State in the receipt which
occurrence this is, and if it is the second, edit the existing artifact rather than adding a
neighbour.

State `prevents:` in the reply, as one sentence, before you move on. It is the only line the user can
check against what they meant, and a rule they can veto in the same turn is a rule they agreed to.

Put the `artifact:` and `prevents:` lines in the commit message or the PR body. `git log` is the one
ledger that is greppable, dated, and read by the next session.

**Done when:** all six fields are filled, the artifact path exists, and nothing in the receipt is a
promise about your future behaviour.

## Gotchas

- A correction's literal wording is narrower than the failure behind it. "Don't use `any` in the
  payment module" names one file; the failure was silencing a type error, which recurs everywhere.
  Encode the class in `prevents:` and keep the literal instance in `scope:`.
- A lint rule added for one incident fires on code the user did not ask you to touch. The next session
  meets four hundred violations, disables the rule, and the lesson is deleted with it. Scope the check
  to changed lines, or land the rule with an allowlist and a comment saying why the legacy hits are
  exempt.
- A regression test that asserts the fix's implementation — an exact error string, a private method
  name — dies in the next refactor and takes the lesson with it. Assert the observable the user
  actually cared about.
- `AGENTS.md` grows until it is skimmed. At two thousand lines your addition sits at 1,997, and a rule
  that is not read is not a rule. Past one screen, the lesson belongs in the skill's gotchas or the
  module header instead.
- A check that has never been seen failing may be asserting nothing: a regex typo, a glob that matches
  no path, a test file no suite imports. The failing run is the artifact's proof of life; without it
  you have shipped a comment in a test's clothing.
- Corrections about your process — "you should have asked first", "don't delete files without telling
  me" — are not checkable by repository code. A test written for one asserts nothing. They belong in
  the operating instructions, where they are read every session, or in a harness hook if one exists.
- Users correct in the middle of thinking. "No wait" followed by a better idea is a change of
  direction, not a verdict on you; encoding it adds a rule against something you never did. Confirm the
  antecedent is an action you took before writing Phase 1's `did:` line.
- A correction can arrive with a stated cause that is wrong ("this broke because you used a library
  function"). Encode the rule the failure supports, not the diagnosis offered with it — the diagnosis
  is a claim, and `weigh-evidence` is the skill for claims.

## Rationalizations

| Excuse | Reality |
|---|---|
| "I've noted that for future reference." | Where is the file? A note that exists only in this turn is gone at compaction. |
| "I'll be more careful next time." | The next session is a different context with no memory of your care. Care is not a mechanism. |
| "It was a one-off, not worth a rule." | Then it is worth one gotcha line, which costs a sentence. If it recurs, it was not a one-off. |
| "The check would fail on existing code." | Scope it to changed lines. Deleting the lesson to avoid a cleanup is the wrong trade, and it is the trade made by default. |
| "A lint rule is overkill for this." | Overkill compared to being corrected a third time? The rule is five lines and runs forever. |
| "I already left a comment in the code." | A comment at the site of one mistake does not fire at the next site. If a program could catch it, it is a check. |
| "The user was venting; this was not a real instruction." | The mood is not the content. If the content is wrong, say so in Phase 3 — do not discard it silently. |
| "I'll write a fuller explanation so it lands." | Length is not durability. The receipt is six lines and the artifact is a path. |
| "It was a suggestion, not a correction." | A suggestion you did not follow and were then told about is a correction. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Noted", "understood", and "I'll keep that in mind" are all reflections. |

## Red flags

- You are typing "noted", "understood", or "I'll be careful" and no file is open.
- The artifact you are about to write is prose about your mistake rather than a path.
- You are encoding a rule you cannot state as a predicate, and you have not checked whether the user
  would accept the generalisation.
- You are adding a second rule beside an existing one instead of editing it.
- The check you just wrote has never been seen to fail.
- You are placing the lesson in a file you know the next session does not load.
- You are generalising a hard rule from one instance without saying it is the first occurrence.

## Limitations

- Cannot separate a correction from a preference without the user. The skill forces the classification
  and the one-sentence rule, so the user can veto it in the same turn, but a wrong call still lands a
  rule they never asked for.
- Judgement standards are read or they are not; this skill picks the placement most likely to be read
  at the decision point and cannot measure whether it was.
- Needs a writable place to land the artifact. On a read-only checkout the honest output is a handoff
  message naming the artifact that should exist, and the receipt's `artifact:` field becomes a
  proposal rather than a path.
- Cannot prove the correction will not recur. Recurrence is the evidence, and it arrives in the next
  session, not this one.
- Assumes the correction is about the work. If it is about the harness or the tooling, the artifact
  belongs in the agent's own configuration, which this skill names but does not edit.
