---
name: run-autonomously
description: Run a task unattended for hours — disk-backed state, byte-exact completion sentinel, retry-to-abort budget, brakes. A human starts it; the model never fires it on its own.
domain: orchestration
risk: destructive
invocation: user
disable-model-invocation: true
version: 0.1.0
metadata:
  form: discipline
  baseline: run-ends-without-a-durable-state-file
  eval: evals/
# pack membership is declared in packs/*.yml, not here
---

# Run Autonomously

An unattended run is a loop whose memory is a file and whose ending is a comparison. This skill makes
the file carry the run, so a context reset or a crash costs an iteration instead of the night.

```
WRITE STATE TO DISK EVERY ITERATION; END ONLY ON THE BYTE-EXACT SENTINEL.
```

## When to use / when not to use

Use when:

- the user says "run it overnight", "keep going until it's done", "don't stop to ask me", "work
  through the backlog", "I'll check in the morning"
- the work is a list or queue of units and each unit has a check that can be run
- the human is leaving, and the value is hours of progress rather than a better answer
- a previous run died and a state file says what was in flight

Not when:

- the framing or the plan is still moving — that is `frame-the-problem` and `split-by-frontier`; an
  unattended run executes a wrong plan reliably and for a long time
- the whole task fits in one context — do it, do not build a loop around a single turn
- the next step needs a judgement only the human can make — stop and ask; `make-the-call` records a
  decision, it does not supply one
- you are handing one bounded slice to a worker — that is `dispatch-workers`; this skill is the loop
  around many of them
- the user wants to know whether the last thing worked — that is `prove-it`
- the run would need a destructive or production step nobody approved — preflight names it, or the
  loop aborts

Routing, when the boundary is close:

| if the situation is | use |
|---|---|
| the run is going badly and you are deciding whether to stop | `stop-or-escalate` |
| the question is how much this may cost or how long it may take | `budget-the-run` |
| one worker's contract, status, and return shape | `dispatch-workers` |
| the task graph the loop iterates over | `split-by-frontier` |

## The process

Two kinds of steps below. Preflight and the brakes are narrow bridges: exact values, written down
before the run starts. The work inside an iteration is open field: the loop fixes what must be true
when the iteration ends, not how to get there.

### Phase 1 — Sign the run contract

This skill can run commands for hours with no human watching, so the run starts with a gate, not with
work. Write a state file whose first block is the contract, and get the human to approve it:

```
run: <slug>
sentinel: <exact command>        # completes when exit 0 AND output equals expected, byte for byte
expected: <exact bytes>
state: <path>
iterations_max: <n>
skip_threshold: <n>               # consecutive skips before the run aborts; default 3
spend_max: <amount and currency>
per_command_timeout: <seconds>
allowed: <commands, paths, branches the loop may touch>
forbidden: <destructive, production, network, credentials>
escalate_to: <how a human is reached>
```

The approval of this block is the confirmation gate. It is the only place destructive permission can
be granted, and it is granted in advance or not at all: a run that needs a command outside `allowed`
aborts and escalates — it never widens its own envelope, and it never asks a question it was told not
to wait for.

**Done when:** the state file exists at the named path with no placeholders left, and the sentinel
command has been run once and observed to fail. A sentinel never seen failing is a string that may
already be true.

### Phase 2 — Start each iteration from the file

Each iteration begins in a fresh context — a new process, a new worker, a re-run — and inherits one
thing: the path to the state file. Read it, then read the current unit's definition. Do not read the
previous iteration's transcript, do not ask where you were, do not reconstruct progress from memory.

The transcript is the part that decays: it is compacted, summarized, and then defended. The file does
not decay. An iteration started from the transcript starts from a model of the run; an iteration
started from the file starts from the run.

If the file shows a unit as `next` with attempts but no disposition, the previous iteration died
mid-unit. That is a failed attempt, not a fresh start: apply Phase 4's table before redoing it.

**Done when:** the iteration's first tool call read the state file, and the unit it will work on is
recorded there as `next`.

### Phase 3 — One unit, checked by its own check

Do the next unit and nothing else. "Next" is the unit marked `next`; if none is marked, take the first
`pending` in file order and write it as `next` *before* starting, so a crash mid-unit is recoverable
rather than ambiguous.

Verify with the check the unit was defined with. `prove-it` applies inside the loop unchanged: run it
this iteration, read the output, and put the summary line — not a paraphrase of it — into the record.

**Done when:** the unit's check ran in this iteration and its output is in the state record.

### Phase 4 — Retry, skip, or abort

Every unit ends in exactly one disposition, appended as one record before the loop moves:

```
iteration: 12 · unit: migrate/003 · attempts: 2 · disposition: skipped
check: node scripts/check-migration.mjs migrate/003
output: "3 assertions failed: users.deleted_at missing"   # the summary line, verbatim
reason: fixture assumes a soft-delete column the schema never had; needs a human decision
next: migrate/004
```

| attempt | disposition | what must be true |
|---|---|---|
| first failure | `retry` | the next attempt has new information: the failure output, a different approach, a narrower unit. Same input, same failure. |
| second failure | `skipped` | the unit is blocked with its failure and the reason a third attempt is not worth it; the loop moves to the next unit |
| consecutive skips | `abort` | skips in a row reach `skip_threshold` — the run has lost its footing, and the plan is wrong, not the unit |
| gate violation | `abort` | the next step needs a `forbidden` action or something outside `allowed` |

**Done when:** the record holds `attempts`, `disposition`, and either the evidence or the reason, and
it was appended before the next unit started.

### Phase 5 — Check the sentinel and the brakes, then close the iteration

Run the sentinel exactly as written and compare its output to `expected` as bytes. "Looks done", "the
tests pass", and a zero exit code are not comparisons; they are the impressions the sentinel exists
to replace.

Then read the brakes — iterations used, spend so far, wall clock, consecutive skips. A tripped brake
ends the run now, not after this unit, and never with an exception for the unit that is nearly
finished.

Every stop ends the same way: write `status: complete | blocked | out-of-budget | aborted`, list the
units that remain, and leave a handoff a stranger can resume from (`write-handoff`). A run that stops
without one has cost the human the hours it saved.

**Done when:** the last record carries a terminal `status`, the remaining units are listed, and the
handoff exists.

## Gotchas

- A sentinel never observed failing is not a sentinel. `grep -q "OK"` matches the log header, an
  unrelated line, or yesterday's tail, so the run "completes" at iteration 1. Run it before the work
  and watch it fail; if it does not fail, the sentinel is wrong, not the work.
- Appending to one log makes every sentinel historical. Iteration 3 greps bytes written by iteration
  1 and reads a state that no longer exists. Truncate or rotate the log in the iteration that
  produces it.
- A worker's exit code 0 is not the unit's completion. A worker that stopped to ask a question, hit
  its own limit, or answered in prose also exits 0. The loop runs the unit's check itself.
- Model-written state drifts toward narrative. "Attempt 2, failed on the migration" becomes "attempt
  1, migration mostly done" after a compaction. Use append-only records with fixed fields and never
  regenerate the file from recollection.
- A skip that is not recorded is a retry. The next iteration reads `pending`, picks the same blocked
  unit, and spends budget rediscovering the same failure.
- Cost per iteration grows. Early iterations read a small tree; late ones read everything and carry
  summaries. A token cap derived from iteration 1 is wrong by iteration 40 — cap in the unit the bill
  uses, and read spend every iteration.
- A hung command does not trip a time brake, because the brake is checked between commands. Every
  command the loop runs gets `per_command_timeout`, or one hang eats the night.
- A dirty worktree is ambiguous state. Uncommitted work from a dead iteration looks like the current
  iteration's work on resume. Commit each unit, or stash under a named message, so a resumed run
  starts from a tree it can identify.
- A state file inside the tree the loop resets dies with the tree. `git checkout .`, a stash, or a
  branch switch takes the run's memory with it. Keep it where cleanup cannot reach — a sibling path
  or an ignored `.run/` directory — and keep it out of the reset.
- "Fresh context" with the old summary attached is not fresh. If the harness injects a compaction
  summary, put the state-file path in the first line of the new context and nothing else from the
  transcript.

## Rationalizations

| Excuse | Reality |
|---|---|
| "I can see the output is right" | The sentinel is a byte comparison. Seeing is not comparing, and "right" is not a byte string. |
| "I know where the run is" | You are a fresh context. What you know is the prompt; where the run is lives in the file. |
| "I'll write state at the end, when the picture is coherent" | The iteration that dies is the one that did not write. Append the record before the next step. |
| "One more retry will get it" | Third attempt, same input, same failure. Retry once with new information, then skip, then abort. |
| "It's basically done — I'll mark it and finish the rest" | "Basically" is the word the sentinel exists to reject. |
| "The work is nearly finished, the cap can wait" | The cap is the only thing between "nearly finished" and an unbounded bill. Stop and hand off. |
| "The user said not to stop" | They authorised the work and the brakes. Stopping at a brake is following the instruction. |
| "This command is outside the envelope but obviously fine" | The envelope was the price of running unattended. A human widens it, or the run aborts. |
| "Different words, so the rule doesn't apply" | Spirit over letter. |

## Red flags

- You are about to say "done" and the sentinel has not run this iteration.
- You are reconstructing progress from the conversation instead of reading the state file.
- You are on the third attempt at one unit with nothing new in hand.
- You are past a brake, explaining why this particular unit is the exception.
- You are rewriting the state file to match what you remember happening.
- You are deciding whether the run is finished instead of running the comparison.

## Limitations

- Assumes a filesystem that survives between iterations and a harness that can start a fresh context.
  In a single-context chat, the fresh-start phase degrades to "re-read the file and distrust your
  summary"; the rest of the contract still holds.
- The sentinel proves the artifact, not the intent. A run can satisfy a wrong sentinel perfectly, for
  hours. Choosing it is the human gate; this skill cannot tell you it is the right one.
- Cost brakes need a meter you can read. Where the harness reports no spend, the brake degrades to
  iteration count, wall clock, and per-command timeouts — and one expensive command can still
  overshoot the money cap.
- Cannot fix a bad plan. A wrong unit graph executes reliably and at scale; that is
  `split-by-frontier`'s failure, caught before preflight or not at all.
- Destructive steps stay outside the loop's authority unless preflight named them. The loop aborts
  instead of improvising, but that does not make an unapproved migration safe.
- A model that ignores the state file cannot be caught from inside the iteration. The gate is at
  resume: if iteration N's first action was not reading the file, the run is already off-contract.
