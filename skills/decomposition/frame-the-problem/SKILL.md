---
name: frame-the-problem
description: Use when the user says "we need to build X", "figure out why this is slow", "research whether…", "how would you approach this", "this keeps failing" — or hands over a ticket that names a solution before it names a problem. Not for slicing a shape that is already known (use split-by-frontier) or choosing among options already framed (use make-the-call).
domain: decomposition
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: solution-shaped-request-decomposed-into-steps
  eval: evals/
---

# Frame the Problem

Every breakdown silently declares what kind of problem this is: a task list declares "known-solution"
no matter what the problem was. This skill makes that declaration out loud, and decomposes into
sub-questions that carry their epistemic status instead of into tasks.

```
NO BREAKDOWN UNTIL THE PROBLEM TYPE IS NAMED AND WRITTEN DOWN.
```

## When to use / when not to use

Use when:

- the user says "we need to build…", "figure out why…", "research whether…",
  "how would you approach…", "this keeps failing"
- a ticket names a solution — "add a cache", "migrate to Vite", "add a retry" — before it names the
  problem
- you are about to write a plan and every step you can think of is a verb
- three attempts have not narrowed the question
- the work is big enough that being wrong about its shape costs more than an hour

Not when:

- the shape is known and the work needs slicing — that is `split-by-frontier`; framing a
  known-solution problem is the ceremony that skill exists to prevent
- the options are framed and the criteria are known — that is `make-the-call`
- a claim needs testing before anyone acts on it — that is `weigh-evidence`
- the answer lives in the user's head and they have not formed it yet — that is `ask-better`
- the request is one unambiguous instruction — do it
- the question is whether the work is worth doing at all — that is `make-the-call`

| the situation | use |
|---|---|
| an answer exists somewhere and you do not have it | this skill, then `weigh-evidence` |
| the answer is a commitment among options | `make-the-call`; frame it here if the options are not named yet |
| the shape is known and the work is large | `split-by-frontier` |
| the shape is known and the work is small | do it |
| the answer is a preference nobody has formed | `ask-better` |

## The process

The type is the shape of the uncertainty: what is missing, and what kind of action would return it.
Six types, closed list. Anything not on the list is not a type — "complex", "cross-cutting", "a bit of
everything" describe your discomfort, not the problem.

### Phase 1 — Write the problem as a state, not an action

Rewrite the request as a sentence about the world: what is true now, and why that is not acceptable.
If the sentence contains a verb that names a solution — add, migrate, use, replace, refactor, adopt —
you have written the answer, not the problem, and everything downstream will decompose the answer.

Then write the target line: **"If this were solved, ____ would be true, and I could observe it."** If
you cannot finish that sentence, stop: the problem is upstream of this skill, in a goal or a priority,
and the honest move is `make-the-call` or `ask-better`.

**Done when:** two sentences exist — the state that is wrong, and the observation that would show it
fixed — and neither names a solution.

### Phase 2 — Call the type, out of six

Pick one, name the phase you are in, and give the reason in one line.

| type | the question you are answering | decompose into | complete when |
|---|---|---|---|
| **known-solution** | "how do we do the thing we already know how to do?" | ordered steps, each with its own check | every step has a verification and the order has no cycle |
| **research** | "is X true, or what is the value of Y?" | questions, each with the cheapest action that returns an answer | every question has an action and a cost, and none is a guess wearing a task verb |
| **design** | "what shape should this be?" | constraints, options, seams, and the decision points between them | the option set is closed by a stated criterion and every option carries its reversal cost |
| **debugging** | "why is this happening?" | hypotheses, each with the observation that would kill it | one hypothesis has survived a test designed to kill it |
| **decision** | "which of these do we commit to?" | the value question, the options, the information that would change the call, the cost of being wrong | the choice is written with its cost, its reversal path, and what would change it |
| **requirements** | "what does the person actually want?" | candidate behaviours, each shown as a concrete artifact | every candidate has been reacted to, not just asked about |

Each type also has one wrong decomposition that looks plausible, which is why the call has to be
written before the breakdown: steps for research (a plan of guesses), a question list for
known-solution (an evaluation phase that never ends), a fix plan for debugging (you fix symptoms),
research for a decision (every new datum postpones commitment), a feature list for design (you build a
shape nobody chose), a spec for requirements (you wrote your own assumptions down).

Every call is a claim, so it carries a falsifier: **"this would be <other type> if ____."** Write it.
It is how you catch a mis-type before a breakdown is built on top of it.

```
"We need a cache."                                the request
"p95 read latency is 4s; the budget is 500ms."    Phase 1: the state
type: research — nobody knows where the 4s goes, and a profile answers it in an hour
falsifier: if the profile shows one query at 3.8s, this is known-solution (add the index)
```

Real problems are compounds — research, then design, then build. Type the phase you are in and write
the condition that moves you to the next one. The failure is applying the last phase's decomposition
to the first phase: a build plan for a problem nobody has researched.

**Done when:** the type, the one-line reason, and the falsifier are written, and the type is a word
from the list.

No sub-question list before this line exists. A breakdown written first has already chosen a type,
silently, and the type it chose is known-solution — because that is the only one whose decomposition
looks like a list of steps.

### Phase 3 — Decompose into sub-questions, each labelled by epistemic status

Four statuses, assigned by a ladder. Take the first rung that fits.

1. **known** — one answer, one lookup, no chance of a surprise: the repo, a doc, a log, a number you
   already measured. Do not put it on the question list; fetch it in the same turn you write the list
   and put the value there instead.
2. **findable** — an action returns the answer and the answer is not yet determined: run this profile,
   query this table, measure this interval, ask the person who owns the system. Write the action and
   its cost beside the question.
3. **resolve-by-doing** — the answer only arrives by doing a piece of the work: a spike reveals the
   real data shape, a first slice reveals the integration cost. Write the smallest piece of work that
   reveals it, and what you would do under each answer.
4. **unknowable** — no procedure returns it: a preference, a forecast, a value trade-off, a bet on a
   market. This is a decision, not a question. Route it to `make-the-call`, or design so the answer
   does not matter — a shape that survives both answers.

The ladder is the discipline. "Unknown" is not a status; every unknown is findable, resolve-by-doing,
or unknowable, and each has a different next move. A list that treats them alike fetches some facts,
pretends to fetch others, and never commits.

Test each entry before it goes on the list:

- Can you write the observation that would answer it? If not, it is a task. A question can be answered
  yes, no, or with a value; a task can only be marked done.
- Does it serve a clause of the Phase 1 sentence? If not, it is scope you invented.
- Would a different type have produced this same sub-question? If every entry would, you have written
  a generic checklist rather than this problem's decomposition.

**Done when:** every sub-question has a status; every `findable` has a named action and cost; every
`resolve-by-doing` has a fallback for each answer; every `unknowable` has a destination; no entry is a
task verb.

### Phase 4 — Write the stopping rule and the re-type trigger

Each type stops differently, and the wrong stopping rule is what turns a framed problem back into an
open-ended one.

| type | stop when |
|---|---|
| known-solution | the remaining steps are all execution and none is discovery |
| research | the next experiment costs more than the decision it informs |
| design | a further option would not change the choice |
| debugging | one hypothesis remains and it has been shot at |
| decision | more information costs more than being wrong |
| requirements | the user can predict your next three decisions |

Then the trigger: the observation that would make you re-type. "If the profile shows a hundred small
queries, this is design, not research." A trigger is an observation, never a feeling.

**Done when:** the stopping rule is a condition you can check against the output, and the re-type
trigger names something you could see.

### Phase 5 — Hand off the framing

The framed problem is the artifact. Everything downstream inherits it, so it has to be short enough to
be read and specific enough to be argued with: a paragraph and a table. If it is longer than the
breakdown it was meant to shape, you have written a report.

Send each sub-question to where its status says it goes: known facts get fetched now, `findable`
questions to `weigh-evidence` when the answer will be contested, `resolve-by-doing` items to
`split-by-frontier` as slices, `unknowable` ones to `make-the-call`, requirement questions to
`ask-better`.

**Done when:** every sub-question has a destination, and the first action is the cheapest one that
would change the set.

## Gotchas

- The request is usually a proposed solution. "Add a cache", "migrate to X", "add a retry" are
  answers. Typing the answer types the solution, so you decompose work for a problem nobody stated.
  Ask what would be true if it were solved; that sentence is the problem.
- A decision disguised as a research question produces research that never ends. "Postgres or
  DynamoDB?" has no fact of the matter until the weights are set, so every benchmark is a way to
  postpone commitment. The tell: after the last experiment you still will not know. Set the criteria
  first, then measure only what the criteria name.
- Debugging and research both start with "figure out why", and they stop differently. Debugging has a
  ground truth already sitting in the system — the cause exists now, and an observation can kill a
  hypothesis. Research can come back "no". If no observation could kill your hypothesis, you are not
  debugging; you are speculating with a stack trace.
- A known-solution problem typed as research burns the schedule. "We should evaluate frameworks for a
  month" is what a solved problem looks like when nobody says the recipe is known. The test: can you
  name the steps and their checks? Then the only open question is which step is first.
- A research problem typed as known-solution ships a confident wrong build. Its steps are ordered by
  when you would do them, not by what you do not know. Symptom: every step is "implement X" and no
  step is "find out Y".
- Three unresolved experiments mean the type is wrong, not that you need a fourth. If the question has
  not narrowed after three attempts, you are in design (there is no fact to find) or requirements (the
  answer is a preference). Re-type instead of re-running.
- Requirements are not facts. Asking the user twice can produce two different answers, and the second
  is not more true — it is a different person-minute. Show a concrete artifact and ask them to react;
  reactions are more stable than abstractions.
- Type by uncertainty, not by topic size. "Build a payments system" is mostly known-solution; "add one
  button" can be a requirements problem. Size predicts how many sub-questions there are, not what kind.
- Estimates are forecasts, not findings. Three engineers' durations produce a number with a
  distribution, not a fact. That belongs in a decision's cost, not on a research list.
- The type of the problem is not the type of the work you enjoy. A design problem will be typed as
  research by an agent that would rather gather evidence than choose, and as known-solution by one
  that would rather build. Notice which way your error leans and write the falsifier that catches it.

## Rationalizations

| Excuse | Reality |
|---|---|
| "The problem is obvious: build X." | X is a solution. Name what is broken before naming what to build, or you will decompose the answer. |
| "Typing it is ceremony; I already know what this is." | The call is one line. Being wrong about it costs the whole breakdown, and you will not notice, because the breakdown looks fine. |
| "It's a bit of everything, so the classification doesn't apply." | Then type each phase and say which one you are in now. "A bit of everything" is the most common true answer and the reason to type per phase. |
| "I'll break it down first — the breakdown will make the type clear." | The breakdown is what encodes the type. Doing it first is choosing a type without writing it down. |
| "More research can't hurt." | It costs the decision's deadline and it substitutes for committing. Name the decision the research informs, or stop. |
| "The user asked for a plan, so give them a plan." | A plan for a research problem is a list of guesses. Give the questions and the experiments; the plan comes after. |
| "There's no time to frame it, we need to start." | The frame is a paragraph. The alternative is finding out at the end that the shape was wrong. |
| "These are all unknowns, so I'll list them as open questions." | Unknown is not a status. Each one is findable, resolve-by-doing, or unknowable, and each has a different next move. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Spike it", "investigate", "look into it", "do a discovery pass" are breakdowns too. |

## Red flags

- You are writing "Step 1: implement…" and no line says what you do not know.
- Every sub-question starts with a task verb and none is answerable yes, no, or with a value.
- You called something research and cannot name the action that would answer it.
- You are about to estimate instead of decide.
- Your breakdown would be identical for two different problem types.
- You are typing the problem as "complex", "big", or "cross-cutting".
- You are classifying the ticket instead of the phase you are actually in.

## Limitations

- Cannot make an unknowable question answerable. It can stop you from writing it down as research; the
  output then is a decision or a shape that survives either answer.
- The type call is a judgement, and a genuinely mixed problem admits two defensible calls. What the
  skill guarantees is that the disagreement is written, located, and falsifiable — not that it is
  resolved.
- Depends on the Phase 1 sentence. When "if this were solved, ____ would be true" cannot be finished,
  the problem is a goal or a priority and this skill has nothing to type.
- Says nothing about order, size, or parallelism of the resulting work. That is `split-by-frontier`,
  and it needs this skill's output before it is worth running.
- Does not supply the evidence standard for a research question — what counts as an answer and how
  strong it has to be. That is `weigh-evidence`.
- For problems whose answer is a number you must produce — a forecast, an estimate, a capacity plan —
  the typing helps and the method does not live here.
