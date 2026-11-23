---
name: debug-systematically
description: Use when something is already broken — "it crashes", "it fails", "this error", "it worked yesterday", "can't reproduce it", "intermittent failure", "broken in prod but fine locally" — and the next move would be to edit code near the error. Not for making a change that is already diagnosed (use red-green), adjudicating a contested diagnosis (use weigh-evidence), judging a flaky test itself (use judge-tests), or claiming the fix works (use prove-it).
domain: execution
risk: writes
invocation: model
version: 0.1.0
metadata:
  form: discipline
  baseline: fix-first-editing-near-the-error
  eval: evals/
---

# Debug Systematically

A fault is fixed when its cause is gone and you can say why. This skill makes the failing
reproduction exist before the first edit, and the mechanism exist before the fix.

```
NO FIX UNTIL THE FAILURE REPRODUCES ON DEMAND.
```

## When to use / when not to use

Use when:

- the user says "it crashes", "it fails", "this error", "it's broken", "it worked yesterday", "it
  stopped working", "can't reproduce it", "it's flaky", "only happens in prod", "debug this"
- a stack trace, a failing test, a 500, a wrong number, a hang, or a memory climb is on the table and
  nobody knows why
- you have already made two edits and the symptom is still there — that is the loop, and it ends here
- a fix "worked" and you cannot say why — the bug is dormant, not fixed
- the failure is intermittent and the last green run was offered as evidence
- a reproduction exists in a bug report and nobody has run it

Not when:

- the change is decided and the ordering of test-before-code is the question — that is `red-green`;
  this skill starts from a failure that already exists, red-green starts from a change that does not
- a diagnosis is contested and settling it is expensive — that is `weigh-evidence`, which prices
  evidence and emits a verdict; here every hypothesis is settled by a probe you can run in minutes
- the question is whether the fix works before someone acts on it — that is `prove-it`; it governs the
  claim, this skill produces the observation the claim cites
- the question is whether the bug is worth fixing, or what to cut to fix it — that is `make-the-call`
- the "failure" is a design smell rather than a deviation from intended behaviour — that is
  `judge-architecture` or `frame-the-problem`
- the session is long and findings are leaking out of context — that is `manage-context`
- the investigation must be handed to another person mid-flight — that is `write-handoff`

Routing, where the boundary is not obvious:

| the situation | the skill |
|---|---|
| a failure exists and the cause is unknown | this skill |
| a change is planned and nothing is broken | `red-green` |
| the cause is a story someone believes and acting on it is expensive | `weigh-evidence`, then this |
| the fix is written and the sentence is "it works" | `prove-it` |
| the failure is gone but nobody can say why | this skill, Phase 3 — it is not fixed |
| the behaviour is unwanted but intended | `make-the-call` or `frame-the-problem` |

## The process

Five phases. The order is the skill: the reproduction is an artifact, and no edit may be written until
it exists. Skipping a phase does not fail loudly — the symptom disappears and returns as a different
bug, in a different week, with a smaller traceback.

### Phase 1 — Reproduce the failure on demand

Turn the report into one command whose failure is the reported symptom: the command, the input, the
state, and the observed output. Not "the area", not "the module" — the invocation someone else could
run.

Why this is first: the report is a claim about the world made by someone else; the fix is a change to
the world. Without the reproduction there is no way to tell a fix from a coincidence, and every later
step — bisection, probe, verification — has nothing to run against.

Match the report's observable, not just its exception. The same exception from a different path is a
different bug. If your command fails with an error the report did not mention, you have found a
neighbour; say so and keep hunting for the reported one.

When it will not reproduce, the difference between your environment and the reporter's *is* the
investigation: version, config, data, locale, clock, permissions, load, cache, compiled artifact.
Enumerate the differences and change one. "Cannot reproduce" is a finding to report, never permission
to start editing — an edit made without a reproduction is a guess with a diff.

**Done when:** one command fails with the reported symptom, run twice with the same result, and its
output is quoted in the session. For an intermittent failure the artifact is the rate — N failures in
M runs — not a single red.

### Phase 2 — Isolate to the smallest failing case

Shrink the reproduction until removing anything more makes it pass. One variable at a time: the input,
the data, the config, the state, the timing, the dependency version, the call path.

Bisect by dimension, not by row. Halve the input, disable half the pipeline, stub one dependency, turn
off one feature flag — each cut is a question with a yes/no answer. A cut that changes two variables
answers nothing, and when the symptom shifts you have to unlearn it.

Keep the nearest passing case. A failing case with a passing neighbour is worth more than either
alone: the delta between them is the candidate set, and it is usually two fields wide.

**Done when:** the smallest input/state that still fails is written down, the nearest case that passes
is written down, and the difference between them is one sentence.

### Phase 3 — State the mechanism, and make it predict

A mechanism is a causal chain from the delta to the observed symptom, in the system's own terms: which
value is wrong, where it was produced, which line consumes it, and why the result is what the report
saw.

Not a label. "It's a race condition", "it's a caching issue", "it's an encoding problem" name a
category, and a category cannot be wrong in a way you can observe. The mechanism says *this* write
happens before *that* read, or *this* offset is computed from the wrong length.

Then derive the prediction: if the mechanism is right, something you have not looked at yet must be
true — a log line, a variable at a breakpoint, a row in a table, a case that passes for the stated
reason. Run the cheapest probe that shows it: instrumentation, a deliberate break, an assertion in the
failing case, a print in the passing case. The probe is what turns a story into a fact.

If the probe disagrees, the hypothesis is dead. Do not edit code to find out; a fix is the most
expensive probe and the least informative.

**Done when:** one sentence names the mechanism end to end, it predicts an observation not yet made,
and the probe either confirmed it or killed it — with the output in the session.

### Phase 4 — Fix the cause

Change the thing the mechanism named. The diff's locus is the mechanism's locus: if the chain says the
null is produced in `parseHeader`, the fix is in `parseHeader`, not a null check at the consumer.

The smallest change that removes the cause, and every line in the diff justified by the mechanism. Two
edits in one turn is two experiments; when the symptom changes you cannot say which one did it.

A guard at the consumer is a legal fix only when the mechanism says the producer is allowed to emit
that value — then the consumer's contract was the bug. Otherwise the guard hides a wrong state, and
the next consumer inherits it.

**Done when:** the diff touches the line or value the mechanism named, and no line in it is there
"just in case".

### Phase 5 — Verify the reproduction is gone, and the mechanism is understood

Run the Phase 1 command unchanged. It must pass, and the nearest passing case from Phase 2 must still
pass. Then re-run the Phase 3 probe: the predicted state should now be observed for the fixed reason,
not because the code path stopped being reached.

Then close the two holes a fix leaves:

- **The regression guard.** The Phase 1 command is kept as a test. It was already seen red against the
  old code, which is the evidence it can fail — do not write a fresh test after the fix, because a
  test written after passes on its first run and proves nothing. Where the repo has no harness, the
  test is the script that runs the reproduction; the command still has to survive the session.
- **The same mechanism elsewhere.** A cause is rarely unique: the sibling parser, the other caller,
  the copy of the config. Search for the pattern the mechanism named and report what you found.

**Done when:** the original command passes, the neighbour passes, the probe shows the predicted state,
the reproduction is checked in as a test, and the same-mechanism search is reported — including "no
other occurrences".

**When the fix does not hold.** If the Phase 1 command still fails, the mechanism was wrong or
incomplete. Return to Phase 3 with the new observation; do not stack a second fix on the first. Two
fixes in a row without a passing probe is the loop, and the third edit will not be the one that works.

## Gotchas

- The reported error is where the failure surfaced, not where it started. Read the last `Caused by:`
  in the chain, or the frame that actually raised it, not the loudest one; the null at the top is a
  symptom of the write that never happened below.
- A reproduction that differs from the report in any variable is a reproduction of a different bug.
  Same stack trace, different version or data — "it fails here too" is not "I reproduced yours", and a
  fix for yours may not be a fix for theirs.
- Logging inside the failing path changes timing, ordering, and memory; a race that vanishes under
  `print` is still there. Use capture that does not perturb the path — existing logs, a ring buffer, a
  debugger that stops the world — before adding I/O to the hot loop.
- Restarting, clearing a cache, rebuilding, or reinstalling makes the symptom disappear and the cause
  stay. Ask what state was cleared and reproduce it; "fixed by restart" is a description of a state
  bug, not a fix.
- A flaky failure needs a rate before and after. One green run after a change is not evidence when the
  failure was 1 in 50; run the reproduction N times and report N of M, or say you cannot tell.
- Editing source and running a stale artifact reproduces nothing: `dist/`, `__pycache__`, a container
  image built before the edit, a daemon nobody restarted. Confirm the code you edited is the code that
  ran before trusting any result.
- Deleting, skipping, or loosening the failing test makes the suite green and leaves the bug alive. A
  test that fails for the report's reason is the asset; keep it.
- A fix that stops the crash but not the bad state is a workaround. The probe is the difference: if
  the mechanism's prediction is still wrong after the fix, you moved the symptom.
- Timeouts and retries hide the first failure. The log line before the retry is the one that matters;
  the timeout is the second event.
- A `catch` that logs and continues converts a crash into wrong data. The absence of the exception is
  not the absence of the fault.

## Rationalizations

| Excuse | Reality |
|---|---|
| "Let me just try changing this and see" | That is a guess with a diff. If it works you still cannot say why, and you have added an untested behaviour. |
| "I can see the bug from the code" | Then write the failure it predicts and run it. Seeing it in the source is a hypothesis, not an observation. |
| "The error is right there" | The error is where it surfaced. The cause is upstream, in the `Caused by:` chain. |
| "It's probably a race condition / cache / encoding" | A category is not a mechanism. Name the write, the read, and why they interleave, or it is a label. |
| "I can't reproduce it, so I'll fix what looks wrong" | The environment difference is the bug's home. Enumerate it; an unreproduced edit is a coin flip you paid for. |
| "It's flaky, ignore it" | Flaky is a rate, not an excuse. Count it, and a rate is something you can fix. |
| "I'll add a null check / try-catch here" | Where the error surfaced is the consumer. The producer still emits the wrong value, and the next consumer inherits it. |
| "Restarting fixed it" | Something in memory or on disk was wrong. Name it, reproduce it, or the bug is waiting for the next restart. |
| "The fix works, so the diagnosis was right" | A working fix is consistent with a wrong diagnosis. Check the prediction the mechanism made. |
| "It's one small change, I don't need the repro" | The reproduction is what tells you the change is a fix. Small changes are the ones that ship unverified. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Quick patch", "workaround", "hotfix", and "let's see if this helps" are the fix-first loop wearing a name. |

## Red flags

- You are editing and no command has failed in this session for the reported reason.
- You are changing a second thing before the first change was run.
- Your hypothesis has no prediction you have not already observed.
- You are adding a guard where the error surfaced.
- You are about to say "fixed" without re-running the Phase 1 command.
- You restarted, cleared, rebuilt, or reinstalled, and are calling the silence a fix.
- You are explaining why the failure is not reproducible rather than what differs.
- The reproduction differs from the report in a variable you did not choose.
- You are reading the code to confirm the mechanism you already wrote.

## Limitations

- Needs a reachable environment. A production-only fault, a customer's data, or a third-party outage
  can only be approximated; the reproduction then covers part of the mechanism, and the part it cannot
  cover is stated, not claimed.
- Intermittent faults cost runs. Establishing a rate takes N executions, and on a slow or expensive
  system the honest answer is "not enough runs to tell" — this skill will not manufacture a rate.
- Bisection assumes the failure is deterministic in the variable you cut. Under concurrency or network
  timing, a passing cut is evidence of a narrower race, not proof the cut is irrelevant.
- Cannot supply the system knowledge the mechanism needs. Where nobody knows what the code is meant to
  do, the mechanism is a guess about intent, and the next step is reading the call sites or asking a
  human who knows — not more probing.
- Does not decide whether the bug is worth fixing, how much to spend on it, or whether to ship around
  it — that is `make-the-call`.
