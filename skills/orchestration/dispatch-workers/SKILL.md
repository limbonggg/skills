---
name: dispatch-workers
description: Use when handing a unit of work to a subagent, a worker, or a second session — "delegate this", "spawn agents", "fan this out", "have someone else do it", "hand this off to a worker" — or when a dispatch came back as a wall of prose, or as "done" with nothing to check. Not for slicing the work (use split-by-frontier), verifying a claim (use prove-it), or whether concurrent writes are safe (use parallel-safely — this skill decides who does what, that one whether running them at once is safe).
domain: orchestration
risk: writes
invocation: model
version: 0.1.0
metadata:
  form: positive recipe
  baseline: whole-brief-dispatch-and-prose-return
  eval: evals/
# pack membership is declared in packs/*.yml, not here — one skill lives in many packs
---

# Dispatch Workers

A dispatch is a file with eight filled slots and a status the worker must return from a list of four.
This skill makes a delegation bounded — one slice, one check, one capped shape of answer — so the
coordinator can verify the result without reading the report.

```
NO DISPATCH WITHOUT A SLICE, A DONE-CHECK, A STATUS ENUM, AND A 40-LINE RETURN CAP.
```

## When to use / when not to use

Use when:

- you are about to hand a unit of work to a subagent, a worker process, or a second session
- the user says "delegate this", "spawn agents", "fan this out", "have someone else do it", "hand this
  off to a worker", "give this to a subagent"
- a frontier of startable units exists and more than one can be in flight
- a dispatch came back as three pages of prose, or as "done" with nothing to check
- a worker stopped and asked a question, and the run stalled on an answer it already had
- you are resuming a run and need to know exactly what a worker was asked

Not when:

- the work fits in this context — do it; a dispatch costs a spec, a file, and a verification pass
- the units do not exist yet — that is `split-by-frontier`; this skill dispatches a graph it does not
  produce
- two workers would write the same file — that is `parallel-safely`; this skill forces the ownership
  paths to be named, and naming them is not the same as making them safe
- the question is whether the returned work is real — that is `prove-it`, which governs the claim;
  this skill governs the contract that makes the claim checkable
- the loop around many dispatches is the subject — that is `run-autonomously`
- you are deciding whether to delegate at all — that is `make-the-call`

| if the situation is | use |
|---|---|
| the units do not exist yet | `split-by-frontier` |
| units exist and each worker gets one | this skill |
| two units touch the same file | `parallel-safely` |
| a worker returned "done" and nobody checked | `prove-it` |
| the dispatch is one iteration of an hours-long run | `run-autonomously` |
| a worker is stuck and the question is whether the run continues | `stop-or-escalate` |

## The process

### Phase 1 — Write the unit spec from the graph

Take the unit's entry from the task graph, not from the conversation. The conversation holds the
deliberation: rejected options, half-answered questions, a destination that moved twice. None of that
belongs in a dispatch, and the reliable way to keep it out is to write from the unit's own line.

Every unit needs a done-check: a command whose output distinguishes done from not-done. Run it at the
base commit before you dispatch. A check that already passes grades nothing, unless the unit's job is
to keep it passing — a refactor, a prefactor, an integrate ticket. Then label it that, and name the
observation that fails if the unit is wrong: a reference to the old name, a call site on the old
signature.

**Done when:** the spec names one imperative outcome, and you have either watched its done-check fail
at the base commit or labelled the unit one whose check is green by design.

### Phase 2 — Cut the slice: the unit plus its interfaces

A worker gets its slice, never the brief. The slice is not a summary of the brief — that distinction is
the whole skill, because the two ways to get it wrong are opposite and both look reasonable.

- **Dumping.** The whole brief, "so nothing is missed". Every worker then pays for the brief, and the
  brief carries open questions the worker will resolve from its own priors — after which the answer is
  load-bearing and nobody has checked it. A worker holding the whole plan also cannot tell what is out
  of scope, so it fixes the next ticket too.
- **Starving.** A one-line goal with no interfaces. The worker invents the signature, the schema, and
  the fixture name; the diff reads correctly and fails at the first integration.

The resolution is that **interfaces are copied, not described**. "It takes a user object" produces a
call with `userId` where the schema says `user_id`. Copy the signature, the schema, the fixture path,
verbatim. Prose about an interface loses exactly the precision the worker needed.

Two tests, both required:

- **Completeness** — could the worker finish without asking you anything, and without reading a file
  you did not name?
- **Minimality** — does every line change what the worker does? A line recording why the plan is what
  it is, or which option was rejected, is brief, not slice.

Minimality without completeness produces invention. Completeness without minimality produces the dump.

**Done when:** every path the unit writes is named as owned, every path it must leave alone is named,
and every symbol, schema, or fixture it calls into appears copied rather than described.

### Phase 3 — Emit the dispatch as a file, then hand the worker the path

The dispatch is a file because three readers need it: the worker now, the coordinator when the return
is ambiguous, and whoever resumes after a crash. A dispatch that exists only inside a prompt cannot be
re-read, and a re-dispatch written from memory is a different task.

```
Unit:            <id> — <one imperative line: what exists when this is done>
Owns:            <exact paths this worker may write>
Must not touch:  <paths owned elsewhere, shared files, generated files>
Interfaces:      <exact signatures, schemas, fixtures and file paths this unit calls into, copied>
Done check:      <the exact command, and the exact output that means pass>
Report to:       <path>
Return:          the shape below, 40 lines maximum
Out of scope:    <what this unit does not include, named>

status:     done | partial | blocked | failed
            done    = the check ran after your last change and passed
            partial = some acceptance conditions hold, the work is usable, the rest are named
            blocked = the check could not be reached; a decision, an approval, or a resource is missing
            failed  = the check ran and rejected the work
check:      <command> → <summary line, verbatim> | not run
artifacts:  <paths written>
report:     <path, when the detail is longer than this return>
next:       <one line: what you need, or what remains>
```

The status enum goes in the dispatch, not in your head. A worker that has to infer what `partial` means
invents `mostly-done`, and the coordinator cannot act on a fifth word. When a worker hesitates between
two, the order of the questions decides: did the done-check run and reject the work (`failed`)? Is
something outside the worker's authority missing (`blocked`)? Is there usable work in hand covering
part of the acceptance (`partial`)? Half the work done and then an approval needed is `blocked`, not
`partial` — the coordinator's next move is set by the blocker, and the finished half goes in
`artifacts`.

Forty lines is a context budget, not a style rule: a return that size is roughly 400 tokens, so a
coordinator with eight dispatches in flight spends about 3k of its window on their answers. Anything
longer goes in the report file and the return points at it.

**Done when:** the file exists with no slot empty, the enum is copied into it with all four definitions,
the return cap is stated as a number, and what the worker receives is that path plus "return the shape
in the file" — nothing else from the conversation.

### Phase 4 — Read the status, then verify it

| returned | what it means | what the coordinator does |
|---|---|---|
| `done` | the worker says the check passed after its last change | run the done-check yourself, read the summary line, and only then close the unit |
| `partial` | some acceptance conditions hold; the rest are named | inspect what is claimed to exist; accept the gap with it recorded, or dispatch the remainder as a new unit |
| `blocked` | the check could not be reached; something outside the worker's authority is missing | supply the missing thing or escalate; never re-dispatch the same spec |
| `failed` | the check ran and rejected the work | read the failing output; retry once with it as new information, then skip |

`done` is a claim, not an observation. The worker ran in a context you cannot see: it may have been
compacted mid-unit, may have run one file of the suite, may have run the check before its last edit.
`prove-it` applies unchanged — the coordinator runs the check, in this turn, and reads the output.

A return that uses a fifth word is not a status. Read the report file and the artifact, write the
status yourself from what you find, then fix the dispatch — the worker had no enum it could return, and
that is the coordinator's defect, not the worker's.

**Done when:** the status in the record is one you verified or one you wrote from observation, and its
evidence line is the check's own summary line rather than the worker's sentence.

### Phase 5 — Record the disposition before the next dispatch

One record per dispatch, in the run's state file, using `run-autonomously`'s fields: `unit`,
`attempts`, `disposition`, `check`, `output`, `reason`, `next`. A dispatch with no record is a unit
whose state nobody knows, and a resumed run will start it again.

The retry rule belongs to that loop, not to this skill: retry once with new information, skip with the
reason, abort on consecutive skips. What this skill contributes is the input to that decision — the
check's output line, verbatim. It is the only thing that makes a retry different from a repeat.

**Done when:** the record exists before the next dispatch is written, and it carries the check's
summary line rather than a paraphrase of it.

## Gotchas

- A worker that stops to ask a question exits 0. Its turn ended normally and the harness reports
  success, with the question in the prose. Read the returned status, never the exit code; a return with
  no status is not `done`.
- Give a worker a pointer to the plan and it reads the plan. "See plan.md for context" becomes the whole
  brief with extra steps: the worker adopts the fog list, starts the next ticket, and reports both.
  Name the section, and say the rest is not theirs.
- A summary of an interface is not the interface. "It takes a user object" produces `userId` where the
  schema says `user_id`; the diff reads correctly and fails at the first integration. Copy signatures,
  schemas, and fixture paths verbatim.
- A report file appended across attempts reads as the current attempt. Attempt 3 opens a file whose
  first 200 lines are attempt 1's green run, and the coordinator reads the wrong run's evidence.
  Truncate per dispatch, or put the attempt number in the filename.
- The dispatch grows on every retry. Each retry adds "also, last time it failed with…" until the third
  dispatch is the brief you were avoiding. The retry carries the failure output and a changed approach;
  the spec stays the spec.
- A worker's `done` is a claim about a context you cannot see. It may have been compacted mid-unit, run
  one file of the suite, or run the check before its last edit. The check takes a minute; the
  coordinator runs it.
- Long returns are the coordinator's fault, not the worker's. Nothing said 40 lines, so the worker wrote
  300, and every one of them sits in the coordinator's window for the rest of the run. The cap is in the
  dispatch or it does not exist.
- Two workers on one file is not a merge conflict, it is silent loss. The second save overwrites the
  first, git shows one diff, and the missing work surfaces at the check. Ownership is exact paths,
  compared against the other dispatches in flight, before dispatch.

## Rationalizations

| Excuse | Reality |
|---|---|
| "I'll give them the whole context so nothing is missed" | That is the failure, not the safety margin. The brief carries decisions and open questions that are not the worker's to settle. |
| "They'll figure out the details" | They will invent them, and you will find out at integration. Copy the interface. |
| "The worker said DONE" | A status from a context you cannot see. Run the check before you close the unit. |
| "The status enum is bureaucracy — I can read the prose" | You can read what it says, not what it did. The enum is what lets a coordinator act without reading 300 lines. |
| "This unit's answer genuinely needs 60 lines" | Then it gets a report file and a 40-line pointer. The cap bounds the return, not the report. |
| "I'll read the full report to be safe" | Reading every report is how the coordinator's window dies at hour two. Read it when the return is insufficient. |
| "Writing a dispatch file is overhead for a small unit" | Then the return stays under 40 lines and the file is never written. Naming the path costs one line. |
| "It's faster to just do it myself" | Then you are not dispatching — say so. The unit still gets its check and its record. |
| "This worker is reliable, I don't need to check" | Reliability is a prior. The check is an observation, and it costs a minute. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Hand this off to a worker", "delegate", "spawn an agent", and "give this to a subagent" are dispatches. |

## Red flags

- You are pasting the conversation into a dispatch.
- The dispatch has no done-check, or the check is "it works".
- You are about to close a unit because the worker said done.
- You are reading a 300-line report for a unit whose return already gave the status.
- The retry dispatch differs from the first only by an apology and a summary of the failure.
- Two dispatches in flight name the same path as owned.
- You cannot say what this worker must not touch.
- You are deciding what a fifth status word probably meant.

## Limitations

- Assumes a harness that can start a worker in its own context and return a value. In a single-context
  chat, dispatching degrades to "write the spec, then do the unit" — the check and the record still
  apply, the context isolation does not.
- Cannot make a slice safe to parallelise. It forces ownership paths to be named and compared; worktrees,
  serialised merges, and overlapping dependencies are `parallel-safely`.
- The 40-line cap is a budget heuristic, not a correctness rule. A return that genuinely needs 60 lines
  gets a report file and a 40-line pointer, never a bigger cap.
- Cannot supply the done-check. When a unit has no check a command can run, the dispatch is a wish and
  the honest output is the refusal — the unit goes back to the graph.
- Says nothing about what the worker does inside its slice. That discipline is `execution`'s, loaded by
  the worker rather than by the coordinator.
