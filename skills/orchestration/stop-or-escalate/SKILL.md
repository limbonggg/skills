---
name: stop-or-escalate
description: Use when a run is at its boundary — "should I stop", "it's stuck", "it keeps going", "we're blocked", "out of budget", "did it finish", "it says done but I don't believe it", "it died and I don't know where it got to" — or an unattended loop, a dispatched worker, or a turn is about to end without a named terminal state. Not for starting or resuming a run (use run-autonomously), deciding whether to abandon the work (use make-the-call), or a handoff while work continues (use write-handoff).
domain: orchestration
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: conditional
  baseline: run-ends-without-a-named-stop
  eval: evals/
---

# Stop Or Escalate

A run has four legitimate endings, and each one is an artifact. This skill makes the agent name which
stop fired, quote the observation that fired it, and write both down before it says anything else — so
a stopped run is a state a human can act on, not a transcript that trails off.

```
END ON ONE OF FOUR NAMED STOPS, AND WRITE THE OBSERVATION THAT FIRED IT BEFORE THE REPORT.
```

## When to use / when not to use

Use when:

- the user says "should I stop", "call it", "pull the plug", "it's stuck", "it keeps going", "we're
  blocked", "out of budget", "did it finish", "it says done but I don't believe it", "it died and I
  don't know where it got to"
- an unattended loop, a dispatched worker, or a multi-turn run is about to end and nobody has said
  which terminal state it is in
- you are the one ending it — the turn is about to close on a question, an apology, or a progress
  summary
- a brake fired: spend, iterations, wall clock, consecutive skips, a command outside the envelope
- a previous ending is being reported, and the report leads with progress instead of the stop

Not when:

- the run is healthy and the next unit is the question — that is `run-autonomously`
- the question is how much the run may cost, before it starts — that is `budget-the-run`
- the work continues across a context boundary — that is `write-handoff`; this skill supplies the
  terminal block for a run that is not continuing
- you are deciding whether to abandon the work at all, priced, with a reversal path — that is
  `make-the-call`
- one claim needs checking — that is `prove-it`
- the framing is still moving and no run has started — that is `frame-the-problem`

| if the situation is | use |
|---|---|
| the loop is running and the next unit is the question | `run-autonomously` |
| a brake fired, or the run is ending | this skill |
| the work continues in a fresh context | `write-handoff` |
| the plan may not be worth continuing at all | `make-the-call` |
| a worker returned and its return must be interpreted | this skill, against the run's envelope |

## The process

Phase 1 happens before the boundary, because the party that classifies a stop is the party that wants
the run over — or wants it not to be over. Fixing the four predicates in advance is what keeps the
classification honest at the moment it is most compromised.

### Phase 1 — Fix the four predicates while the run is still healthy

Write four lines for *this* run, before it can end:

```
done:        <sentinel command> → <expected output, byte-exact>
envelope:    allowed <…>; forbidden <…>; the edges a stop may hit
assumptions: <2–4 the plan rests on>, each with the observation that would falsify it
brakes:      <meter> ≤ <cap>, read now at <value>; <the projection rule, when the envelope wrote one>
```

The assumptions line is the one that gets skipped and the one that makes `wrong` decidable. A plan
whose load-bearing assumptions are unnamed cannot be invalidated by evidence — only by mood.

If the run is already at its boundary when this skill loads, reconstruct the four from the state file
or the task definition. If one cannot be reconstructed, that absence is itself the finding: an
unwritten sentinel or cap means the run cannot reach `done` or `out-of-budget` honestly.

**Done when:** four lines exist, each naming an observable for this run — a command with expected
output, an envelope edge, a falsifier, a meter with a cap and a reading, and the projection rule
whenever the envelope wrote one.

### Phase 2 — Observe before classifying

Run the sentinel first: it is the only reading that can turn a failing run into a complete one. Then
read every brake — and where the envelope wrote a projection rule, compute the projection from the
readings rather than from the plan. Then look at what the run learned that the plan did not expect.

Nothing here is recalled. "The tests were green" is a memory; the sentinel's output from this turn is
an observation, and only observations are admissible in the record.

**Done when:** the sentinel's output, every brake reading, and the written rule's arithmetic were
produced in this turn, and each assumption has been checked against what the run actually saw.

### Phase 3 — Apply the admission tests in order; a failed test means no stop

Four tests, in admission order — cheapest and least arguable first. (The record's enum lists them
`done | blocked | wrong | out-of-budget`; the order below is the order to check them, not a rank.)

| stop | fires when | the observation it carries | the near-miss that does not qualify |
|---|---|---|---|
| `done` | the sentinel ran this session and its output matched, byte for byte | the command and its output line | "looks done", a worker's `DONE`, a green suite from before the last change |
| `out-of-budget` | a meter was read and it crossed its written cap, **or** the envelope's written projection rule fired | the meter, the cap, the reading — or the rule, the arithmetic, and the reading | "nearly out", a projection against a threshold nobody wrote down, a cap nobody wrote down |
| `blocked` | a named dependency sits outside the envelope, and the edge it hits is named | the dependency and the envelope line | hard work, a decision you can make and disclose, a fix inside the envelope |
| `wrong` | an assumption is contradicted **and** what remains changes because of it | the assumption, the contradiction, the delta | difficulty, a failed attempt, a better design you found |

**`done`.** The sentinel is the only admissible evidence. If it did not run this turn, `done` is
unavailable whatever else suggests it — a green unit suite is a claim about the units, not about the
run's completion criterion. One contradiction outranks it: a unit check that fails while the sentinel
passes means the sentinel no longer measures the work, and that is `wrong`, below.

**`out-of-budget`.** A cap that was never written down cannot be crossed. With no cap, the honest stop
is `blocked` on the human who owns how much more this may cost — say that, instead of inventing a
number at the boundary. A projection qualifies only when the envelope wrote the rule down — a
`stop_when` line, the cost per unit, and the remainder the arithmetic used. A projection against a
threshold nobody wrote is a guess about the future, and the run continues.

**`blocked`.** Two clauses, both required: the dependency, and the edge of the envelope that stops you
resolving it. Without the edge, this is work wearing a stop's clothes. Asking a human is also a stop
with a price: it is `blocked` only when the decision is theirs, not when it is yours to make and
disclose.

**`wrong`.** Three parts: the assumption, the observation that contradicts it, and what changes in
`remains`. No delta means the plan is intact — this is a revision or a retry, and the run continues.
A sentinel that now measures the wrong thing is `wrong` even when it passes: the completion criterion
moved, and a run that reaches a moved sentinel has proved nothing about the goal. A contradiction that
changes `remains` also voids the projection priced on the old remainder — units that never existed
have no measured cost per unit, so no projection rule fires and the stop stays `wrong`.

**No stop.** None of the four passing is the default verdict and the commonest one. You cannot name
the observation, the edge, or the delta — so the run continues. Do not narrate the deliberation into
the report; just work.

Read [references/edge-cases.md](references/edge-cases.md) when a case does not obviously pass one
test, and take the verdict from the row rather than from the nearest-sounding stop.

**Done when:** exactly one stop is named together with the observation that passed its test, or all
four tests have failed and the run has resumed work.

### Phase 4 — Write the record at the moment the condition is observed

Not at the end of the turn. Not from memory after the summary. The record is six fields, no prose:

```
stop:      done | blocked | wrong | out-of-budget
fired_on:  <the observation, verbatim: command and output line, meter reading, projection rule and its arithmetic, envelope edge, or contradicted assumption>
because:   <one sentence: why this stop and not the adjacent one>
remains:   <units, decisions, or claims left — listed; or "none">
resume:    <the exact first action a fresh context takes, or the single decision a human must make, with your recommendation>
handoff:   <path to the handoff this record heads, or "inline" when the run has no disk>
```

`fired_on` quotes; it never paraphrases — a paraphrase is what the next reader cannot check.
`because` names the adjacent stop it is *not*; that field is what makes the classification auditable
instead of assertive. `resume` is an action or a decision, never a status: "add
tests/fixtures/users.json from the schema, rerun unit 7" — not "unblock the fixture".

This block is the head of the handoff artifact. A handoff that begins with progress has buried the
one fact the reader needs.

**Done when:** all six fields are filled, `fired_on` quotes an observation from this session, and the
block exists at a path or in the terminal message.

### Phase 5 — Escalate once, then end

Escalation is part of the stop, not a follow-up to it. For `done`, the artifact says what was produced
and that nothing remains. For the other three, it carries one question or one decision, addressed to
the person who owns it, with the recommendation you would act on — a stop with no ask leaves the run
parked and the human guessing.

Then the run is over. The terminal message's first line names the stop; the body is the evidence and
what remains. Resumption is a new run with a new record, not more work appended to this one.

**Done when:** the terminal message's first line names one of the four, and no work follows the record
in this run.

## Gotchas

- A worker's `BLOCKED` is not the run's `blocked`. A worker blocked on something inside the run's
  envelope is a worker failure — retry with new input, then skip per the loop's table — and adopting
  its label ends the run on a dependency the run could have resolved. Classify the report against the
  envelope, not against the worker's vocabulary.
- A worker that ends with a question has stopped without a record. The transcript closes politely and
  nobody notices the run has no terminal state; this is the commonest form of dying silently, and it
  looks like collaboration. Either answer from the envelope and continue, or write `blocked` with the
  question as `fired_on`.
- `blocked` spends someone else's attention, which is exactly why it gets over-used. A missing
  fixture, a spec you can read, a flaky test you have not re-run: all inside the envelope, all work.
- `wrong` needs a delta, and the delta is the part that gets skipped. "The API is slower than
  documented" can contradict an assumption and still leave the sentinel measuring the right thing —
  then the framing is intact and the run continues.
- Meters lag. Spend and tokens land after the command that spent them, so a reading taken at the
  boundary under-reports by the last unit. Stop on the reading, and never start a unit whose measured
  cost exceeds what the reading says is left.
- The stop that is announced is not the stop. "I'll stop here" mid-transcript, followed by two more
  edits, is narration. Only the record ends a run, and a record followed by work is stale.
- Resuming without a new record leaves a terminal record that lies. `done` → a small fix → end of
  turn: the last record says done, and the next reader believes the fix was verified.
- `done` is the only stop reachable by accident, because it is the only one whose evidence is a byte
  comparison. A sentinel that was already true — a stale log, a pre-existing green suite, a `grep`
  that matches the header — converts a run that did nothing into a complete one.
- A brake checked only between units cannot see a hang. Without a per-command timeout, one blocked
  call eats the window and the run stops for a reason the record will not contain.
- Three consecutive skips is not three blocks. The pattern says the units cannot be done as specified:
  that is `wrong`, unless one dependency explains all three — then it is `blocked` on that dependency.
- The loop contract's status enum is not this one. `run-autonomously` writes
  `complete | blocked | out-of-budget | aborted`, and `aborted` splits: a skip threshold is `wrong`,
  a gate violation is `blocked`. Copying `aborted` into the record leaves the next reader unable to
  tell whether the plan died or an approval was refused.

## Rationalizations

| Excuse | Reality |
|---|---|
| "Let me just finish this one unit" | The brake fired before the unit started. Finishing is the grind, and the record is what the next run reads. |
| "It's basically done" | `done` is a comparison against the sentinel, run this session. "Basically" is the word the comparison exists to reject. |
| "I'll write the record at the end, when the picture is coherent" | The turn that dies is the one that did not write. The observation is in hand now; the picture is a story you will tell from memory. |
| "Calling it blocked is more honest than admitting I couldn't finish" | Blocked has two clauses: a dependency and an envelope edge. Without the edge it is work, and "blocked" hands your work to a human. |
| "The plan is wrong, so I'm stopping" | Name the assumption, the contradiction, and the delta. If `remains` is unchanged, the plan is intact and this is difficulty. |
| "We're out of budget" (meter unread) | Read the meter. A wrong plan charged to the budget is paid for twice: now, and by the next run that repeats it. |
| "The user said not to stop for questions" | They authorised the work and its brakes. Stopping at a brake is the instruction being followed. |
| "There's no time to write a record — I need to report now" | The record is six lines and the report's first line. Writing it is faster than explaining its absence. |
| "I'll put it in the summary" | A summary is the lossy copy of the observation. The record is the part that survives compaction and handoff. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Wrapping up", "calling it", "handing back", and "parking this" are stops; name them. |

## Red flags

- You are about to run one more command after a brake fired.
- You are writing the report and its first line is progress, not a stop.
- You are about to write `done` and the sentinel has not run this session.
- You are calling it blocked and cannot name the envelope edge.
- You are calling the framing wrong and `remains` is unchanged.
- You are choosing which stop reads best rather than which test passed.
- You are ending the turn with a question and no record.
- You are explaining why this unit is the exception to the cap.

## Limitations

- Assumes the run had a sentinel, an envelope, and a cap before it reached its boundary. Without a
  sentinel the honest output is `wrong` — the run never had a completion criterion; without a cap it
  is `blocked` on whoever owns the cost, because there is no line to cross. Neither can be retrofitted
  mid-run.
- Four stops cover terminal states, not causes of death. A crash, a killed process, or context
  exhaustion leaves no record at all; the only defence is that the record is written when the
  condition is observed, and `resume` is written before the run needs it.
- Cannot unblock anything. It names the dependency and its owner; the dependency stays theirs and the
  run stays stopped.
- `wrong` is a judgement on evidence, not a proof. Two people can read the same contradiction and
  disagree about the delta; the record makes the disagreement visible rather than settling it.
- Not a budget policy. It reads the cap and the projection rule the envelope wrote; `budget-the-run`
  sets both, and either set badly produces an honest stop at the wrong number.
- A single-turn task has no envelope to hit, so the skill degrades to "say which of the four and show
  the observation" — which is still the difference between a report a human can act on and one they
  cannot.
