---
name: budget-the-run
description: Use when the user says "how much will this cost", "how long will it take", "cap the spend", "keep it under $20", "don't let it run all night", or when a loop is about to start with no stated limit and is already on its third attempt at one unit. Not for the loop's mechanics (use run-autonomously) or for choosing the ending once a cap has been hit (use stop-or-escalate).
domain: orchestration
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: discipline
  baseline: unbounded-retry-loop
  eval: evals/
---

# Budget the Run

A run's price is three numbers written before it starts and a projection read before every unit. This
skill turns "keep going until it works" into an envelope, a threshold that ends the run while money is
still left, and a record the next iteration can read.

```
THREE NUMBERS IN THE STATE FILE BEFORE ITERATION 1; THE RUN ENDS AT THE PROJECTION, NOT AT THE CAP.
```

## When to use / when not to use

Use when:

- the user says "how much will this cost", "how long will it take", "what's the budget", "cap it at
  $20", "keep it cheap", "don't let it run all night", "I need it by morning"
- a loop is being set up and nobody has written a number down — the state file has a `state:` path and
  no `spend_max`
- a run is on its second or third attempt at one unit and the reason to continue is "the next attempt
  might work"
- spend or elapsed time is climbing faster than units are completing, and someone asks whether to keep
  going
- a previous run ended with no idea what it cost, and the next one should not

Not when:

- the loop's mechanics are the question — sentinel, disk state, fresh context, retry/skip/abort. That
  is `run-autonomously`; this skill fills the numbers that loop reads, it does not build the loop
- a cap has been hit and the question is what to do about it — that is `stop-or-escalate`; this skill
  produces the ending, that one classifies it
- the question is whether the work is worth the money at all — that is `make-the-call`; this prices the
  execution, it does not judge the purchase
- the work is one command or one turn — there is no run to budget
- the ask is a report of what was spent — that is `report-with-evidence`

| if the situation is | use |
|---|---|
| the loop exists and needs its numbers | this skill |
| the numbers exist and the loop must obey them | `run-autonomously` |
| a cap fired and you are naming the stop | `stop-or-escalate` |
| whether the work is worth its price | `make-the-call` |

## The process

Phases 1 and 2 are a narrow bridge: exact fields, written before any work. Phases 3–5 are arithmetic —
the numbers are fixed, and every judgement is a comparison against them.

### Phase 1 — Price the run before the first iteration

Three caps — iterations, spend, wall clock — plus the deadline they derive from and the meter they are
read with. Each carries the basis written beside it. A number with no basis gets re-guessed at the
first sign of trouble, and the re-guess is always optimistic.

| field | how to get it | the failure it prevents |
|---|---|---|
| `iterations_max` | `units × attempts_allowance + 3` | A round number (50, 999) that cannot trip on a six-unit plan, or trips on a forty-unit one. |
| `spend_max` | The owner's stated ceiling. If none: the cost of the same work done by a person, or a round number with its basis in the record. | The default cap is infinity, and infinity is chosen by the agent that also wants to finish. |
| `deadline` | The moment the result must exist: a morning, a meeting, a deploy window. | A run that finishes at 09:40 for a 09:00 standup. |
| `wall_clock_max` | `deadline − handoff_reserve`, where `handoff_reserve = max(15 min, 10% of the window)`. | A run that spends its last minute mid-unit and leaves no record and no commit. |
| `meter` | The exact place spend is read: the harness counter, the provider's usage endpoint, `time`. | A cap in dollars with a meter in tokens is a cap nobody can check. |

Write `attempts_allowance` too, and set it to 2: one retry with new information, then skip. This is
the field the baseline failure spends. "One more attempt might work" is a purchase, and it has to be
priced before the moment of hope or the loop will price it at zero.

**Done when:** every field holds a value and a one-line basis, and none is blank, "unlimited", or
larger than any plausible failure could reach.

### Phase 2 — Write the envelope into the run's state file, once

The budget lives in the file the loop already reads at iteration start (`run-autonomously`, Phase 1),
appended to that contract block before the first unit:

```
iterations_max: 25            # 11 units x 2 attempts + 3
spend_max: 12.00 USD          # owner's ceiling, stated 09:14
deadline: 2026-11-24T07:00Z   # standup
wall_clock_max: 6h45m         # deadline - 15m handoff reserve
attempts_allowance: 2
handoff_reserve: 15m
meter: harness token counter, field `spend`
stop_when: projected_total > spend_max AND spend_so_far > spend_max/2; elapsed + time_per_unit × units_left > wall_clock_max
```

Every iteration appends one line and nothing else:

```
iteration: 7 · spend: 4.10 · wall: 1h52m · done: 3 · left: 8 · projected_total: 15.90 · threshold: stop
```

The envelope lines are append-only. Changing one mid-run is not an adjustment; it is an escalation, and
a human writes the new number or the run ends. A budget the loop can edit is a suggestion with a field
name.

**Done when:** the file holds every field with a value, the envelope lines precede the first unit
record, and `projected_total` can be recomputed from the file alone.

When the skill fires mid-run — a loop already burning with no envelope — write the envelope now and put
`spend_so_far` and `elapsed` in its first record. Late beats never: the projection needs a rate and a
remainder, and both are readable from the run so far.

### Phase 3 — Calibrate once, from measurement

Before iteration 1 the only cost per unit is an estimate, and the plan's estimate is in "small /
medium / large", not in the meter's unit. Measure iteration 1, then recalibrate at the end of iteration
3 or at 20% of `spend_max`, whichever comes first.

- `cost_per_unit` = spend of the last three iterations ÷ units completed in them. Not the mean since
  iteration 1: cost grows with context, so the mean is biased low exactly where the projection needs it.
- With fewer than three completed iterations, use the most expensive iteration so far. Over-projecting
  early costs a slower start; under-projecting costs the whole envelope.
- `time_per_unit` = the same statistic on wall clock.

If the calibrated projection already exceeds `spend_max`, the run is mispriced before it is half done.
That is the finding: stop and escalate with the arithmetic. Do not "see how it goes" — seeing how it
goes is how the envelope is spent.

**Done when:** `cost_per_unit`, `time_per_unit`, and `projected_total` are in the file, each tagged with
the iteration it was computed at.

### Phase 4 — Project before every unit, and end at the threshold

Starting a unit is a purchase. Before each one, compute:

```
projected_total = spend_so_far + cost_per_unit × units_remaining
```

and end the run at the first of these that holds — this table *is* the envelope's `stop_when` line, so
the ending is a written rule firing rather than a judgement made at the boundary:

| condition | ending |
|---|---|
| `projected_total > spend_max` and `spend_so_far > spend_max / 2` | `out-of-budget` — the envelope cannot buy the remaining work |
| `elapsed + time_per_unit × units_remaining > wall_clock_max` | `out-of-budget` — the window cannot hold the remaining work |
| `iterations_used >= iterations_max` | `out-of-budget` — the allowance is gone |
| `spend_so_far >= spend_max` or `elapsed >= wall_clock_max` | `out-of-budget` — the hard cap, whatever the projection said |

The `spend_so_far > spend_max / 2` guard exists because a projection from two iterations is noise; below
half the budget, being wrong about it is cheap. Above half, the projection is the decision.

These are two different thresholds and they are not interchangeable. **The projection** ends the run
with money left, because it says the envelope cannot buy the remaining work: the human gets the same
partial result at 40% of the price, plus the information that the plan was mispriced. **The hard cap**
ends the run at the number, whatever the projection says, and exists for the case where the projection
is wrong in the optimistic direction.

End at the first one that fires. Never at the average, never at "we're fine on time, so we're fine on
money", never after "just this unit, it's nearly done".

**Done when:** every iteration records `projected_total` and a `threshold: clear | stop` verdict
*before* its unit starts, and no unit started on a `stop`.

### Phase 5 — End the run and record the bill

An out-of-budget ending is a normal ending with the same obligations as any other: a terminal status,
the arithmetic that fired, what is left, and a handoff a stranger can resume from.

```
status: out-of-budget
fired: projection rule "projected_total > spend_max AND spend_so_far > spend_max/2" (stop_when) — 14.20 projected vs 12.00 cap, at 6.30 spent, iteration 9
remaining: 5 units (migrate/007..011)
spend: 6.30 USD of 12.00 (53%)
handoff: .run/HANDOFF.md
```

One message goes to the run's `escalate_to`, carrying that record and no question that waits: the run is
over, and what the human does with the remaining five units is a new run with a new envelope.

Do not re-price the work to fit. Splitting `migrate/007` into three cheaper units after the threshold
fires is the same work at the same price with the budget field renamed, and it is how an envelope gets
spent twice.

**Done when:** the terminal record quotes the envelope rule that fired, with the arithmetic, the spend,
and the remaining units, and the handoff exists.

## Gotchas

- Spend meters lag. A provider dashboard refreshes minutes after the call, so a cap read from it can
  overshoot by a whole iteration — and the overshoot lands at the top of the cost curve. Read the
  harness's local counter, or set `spend_max` 10% below the ceiling the human actually means.
- A retry is a purchase at the unit's price. "One more attempt might work" is not a hypothesis about the
  code; it is an unpriced bet, and three attempts at one unit is 3× that unit's cost against a budget
  priced for 2. Price `attempts_allowance` up front so the third attempt is a budget question.
- Cost per iteration grows, so a mean is biased low. Late iterations carry a larger context and retry
  more; a mean over iterations 1–5 under-projects 30–40. Project from the last three, and from the most
  expensive so far when there are fewer than three.
- A percentage of budget is not a projection. 92% used with two units left is on track; 92% used with
  forty means the run stops at 100% with 35 units unfinished. What ends a run is what remains divided by
  what each unit costs.
- Wall clock is not the sum of command time. Model latency, rate-limit backoff, and queueing sit outside
  every per-command timeout, so a six-hour cap can expire having run ninety minutes of commands. Read
  the clock, not the sum.
- The ending needs budget of its own. A run that spends its last minute mid-unit leaves a dirty
  worktree, no commit, and no record of what finished. `handoff_reserve` is spent before the work, not
  out of it.
- An envelope the loop can edit is not an envelope. `spend_max: 12` that becomes `spend_max: 18` at
  iteration 9 is the failure the field exists to prevent, and the record will contain a paragraph
  justifying it. Append-only; a human changes a number.
- A cap that cannot trip is decoration. `iterations_max: 999` and `spend_max: 500` on a task that costs
  40 pass every review and never fire, so the run has no brake and a field that looks like one.
- Two caps trip in different places. A slow network hits wall clock at 30% of spend; a large model on a
  fast machine hits spend at 40% of the window. End at whichever fires first.

## Rationalizations

| Excuse | Reality |
|---|---|
| "One more attempt might work" | "Might" is the tell. The envelope prices attempts; a third attempt is outside it. Retry once with new information, then skip. |
| "I'm nearly done with this unit" | The unit that is nearly done is the one that eats the reserve. Cost is what finishing takes, not what has been spent. |
| "The cap is a guideline; the task is the goal" | The cap was the price of running at all. A run that ignores it gets one run. |
| "Nobody gave me a budget" | Then the default you chose is infinity, and you chose it. Propose a number with a basis, get one word back, write it down. |
| "I'll work out the cost at the end" | An estimate after the spend is a receipt. The only moment a price is useful is before the run buys anything. |
| "It's only tokens" | Tokens are a bill someone receives, and the expensive ones are the ones nobody watched. |
| "Stopping now wastes what we already spent" | Sunk cost. What remains is priced against what is left, and that arithmetic does not contain the past. |
| "I'll set the cap high so it never interrupts" | Then you built a field, not a brake, and the run has no ending a human chose. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Soft cap", "target", and "ballpark" are caps; price them or drop the word. |

## Red flags

- You are about to start a unit and cannot state `projected_total` for the run.
- You are quoting a percentage of budget instead of what remains and what it costs.
- You are on the third attempt at one unit and the envelope has no line for it.
- You are editing a number in the envelope instead of stopping.
- You are reading the cost meter for the first time after the work is done.
- You are calling a 200-unit, $12 run "on budget" because the cap has not fired yet.
- You are deciding the run is nearly finished while the projection says otherwise.

## Limitations

- Needs a meter readable inside the loop. Where the harness reports no spend, the money cap degrades to
  iterations × a measured per-iteration cost, and one expensive command can overshoot between reads. Say
  that in the record instead of calling the cap exact.
- Cannot price work that has never been run. Iteration 1 is the measurement, so a run that must be
  exactly priced before it starts cannot be — the honest output is a range plus a threshold that stops
  early.
- Does not decide whether the work is worth the money. That belongs to the owner and is priced by
  `make-the-call`; this skill makes the price visible, not acceptable.
- A cap does not make a bad plan cheap. A 200-unit plan under a $20 cap ends at $20 with 190 units left:
  the envelope converts "unbounded" into "known partial", not into "done".
- Assumes the remaining unit count is knowable. On an open-ended queue ("fix the failing tests") the
  spend projection has no multiplicand and degrades to the iteration cap plus the burn rate — name which
  brake is live instead of reporting a projection that was never computed.
- Assumes the loop reads the file every iteration. A loop that ignores its state file cannot be braked
  from here; that gate is `run-autonomously`'s iteration start.
