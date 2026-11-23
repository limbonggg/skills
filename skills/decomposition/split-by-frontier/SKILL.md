---
name: split-by-frontier
description: Use when a task is too big to hold at once — "break this into tickets", "split this epic", "where do I start", "what's the plan", "what's out of scope" — or when a plan is a numbered list with no blocking edges, no demo per ticket, and nowhere to put what is not yet known. Not for deciding whether to build it (use make-the-call) or for fixing a wrong problem framing (use frame-the-problem).
domain: decomposition
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: positive recipe
  baseline: slice-list-without-a-dependency-order
  eval: evals/
# pack membership is declared in packs/*.yml, not here — one skill lives in many packs
---

# Split by Frontier

A plan you can act on is a graph you can read the next move off — what is startable now, what is still
fog, what was never in scope — not a numbered list you re-derive every session.

```
PUT NOTHING IN THE PLAN THAT IS NOT SPECIFIABLE NOW AND VERIFIABLE ALONE.
```

## When to use / when not to use

Use when:

- the user says "break this into tickets", "split this epic", "how do I sequence this", "where do I
  start", "what's the plan", "what's in scope"
- the work spans more than one session or one context window and nobody has written down the order
- a plan exists as a numbered list, and you cannot tell which steps are blocked
- every ticket in a plan touches one layer, and nothing is demoable until the last one lands
- a new requirement arrives and the question is whether it belongs
- a plan went stale because reality contradicted a ticket three steps in

Not when:

- the whole change fits in one fresh context window — build it; a plan is overhead you will not read
  again
- the destination itself is unclear or the framing may be wrong — that is `frame-the-problem`; this
  skill measures every ticket against a destination it does not choose
- the slices already exist and one needs building — that is `red-green`
- you must choose which startable ticket to take first — that is `make-the-call`
- startable tickets are being handed to parallel agents — that is `dispatch-workers`; this skill
  produces the graph, not the dispatch

| if the situation is | use |
|---|---|
| the answer is unknown and the obvious framing may be wrong | `frame-the-problem` |
| the destination is known and the work needs slicing | this skill |
| the slices are known and one needs building | `red-green` |
| several tickets are startable and one must be chosen | `make-the-call` |
| startable tickets go to parallel workers | `dispatch-workers` |

## The process

The artifact has four parts. Fill them in this order; each phase fills one.

```
Destination:  <what is observably true when this is finished — one sentence>
Frontier:     <tickets startable now>
Fog of war:   <in scope, not yet specifiable — each with what would clear it>
Out of scope: <beyond the destination, permanent — each with why>

- <ticket>: demo "<what you can show when this lands>" · blocked by <ticket names | —>
```

A ticket is one line here plus its detail in one other place. The plan is an index, not a copy.

### Phase 1 — Name the destination as an observation

One sentence for what will be true when this is finished, phrased so a stranger could check it by
looking. "Auth works" is not a destination; "a new user can sign up, log in, and see only their own
records" is.

The destination is the scope ruler: every item later is measured against it. That is why it must be
observable — an unobservable destination cannot reject a ticket, so scope becomes whatever the last
person remembered.

**Done when:** you have one sentence, and for each clause of it you can name the check that would show
it false.

### Phase 2 — Sweep for fog, not for steps

Walk from what exists now to the destination asking, at each point, "what must be decided or known
before this can be built?" Write every answer down without ordering or sizing it. Ordering is Phase 4,
and it is the step that turns a plan back into a list.

Then sort each item with one test — **can you state the question sharply right now?**

- yes, and it blocks nothing else → a ticket
- yes, and other work waits on it → a ticket others depend on
- no → fog: write the question as far as it goes, plus the observation or decision that would sharpen
  it
- beyond the destination → out of scope, with the reason

The fog test is about phrasing, not answering. "How should auth work?" is a shrug; "JWT in a header,
or a session row?" is a ticket you cannot answer yet and can still plan around.

On an existing codebase, much of the fog is "what is already true here" rather than "what should we
do". That is still fog, and it clears by reading the system, not by deciding.

**Done when:** every item sits in exactly one of the three buckets, and every fog entry is a question
with a clearing condition. A fog entry that reads as a task was a ticket you did not want to specify.

### Phase 3 — Slice into tracer bullets

A ticket cuts a thin path through every layer it touches — data, logic, interface, test — and can be
demonstrated alone when it lands. "Write the schema" is not a ticket: nothing works until the API
lands, and its acceptance criteria reach into work someone else owns.

Ask each ticket what you can show when it is done. Behaviour is a slice. A file, a table, a type, or a
migration is a layer: merge it into the slice that demonstrates it.

Size is one fresh context window with no memory of this conversation. That is the only estimate this
skill makes; days and story points are not part of the artifact.

Two shapes are exceptions, and both are labelled rather than smuggled in:

- **Prefactor** — work that makes the change easy before making it ("rename the column so the feature
  is a one-line change"). No demo of its own. It goes first.
- **Wide refactor** — one mechanical change whose blast radius covers the codebase, so no slice can
  land green. Sequence it expand (new form beside the old) → migrate in batches → contract (delete the
  old form), with only the final integrate ticket required to be green.

**Done when:** every ticket has a demo line naming behaviour, and the only tickets without one are
labelled prefactor or integrate.

### Phase 4 — Add edges, then read the frontier

An edge is "this cannot start until that is done". Write it where the tooling can read it — a native
blocking link, or a `blocked by` field — never as a sentence in the ticket body. A blocker in prose
cannot be computed, so every ticket looks startable and the graph is decoration.

The frontier is then mechanical: open tickets whose blockers are all done. It should be non-empty.
Empty while work remains means a cycle, or an edge that is not real.

**Done when:** every ticket names its blockers, there is no cycle, and at least one ticket can start
now.

### Phase 5 — Freeze the buckets, re-read on every close

Out of scope is permanent. An item leaves it only if the destination changes, and the reason travels
with it. Deleting it instead is how the next session re-adds it as "while we're here" work, and the
scope argument restarts from nothing.

Fog graduates. When a ticket closes, what it settled may make something downstream specifiable:
re-read the fog list, promote what is now sharp into a ticket with edges, and remove it from fog. It
must never appear in both.

**Done when:** every out-of-scope entry carries a one-line reason, nothing has been deleted, and the
fog list has been re-read since the last ticket closed.

## Gotchas

- Slicing by layer is the default failure, not a rare one. A 26-ticket stack cut as corpus → producer
  → aggregator → selector cost one team roughly twenty agent runs per closed ticket, about three
  quarters of them rework, and the post-mortem traced every failure class to the horizontal slicing
  rather than the implementations. The tell is an acceptance criterion that only another ticket's
  work can satisfy.
- A wide refactor cannot be sliced vertically. Renaming a column or retyping a shared symbol breaks
  thousands of call sites at once, so no ticket can land green; a plan that promises green per ticket
  here is abandoned mid-flight. Use expand → migrate batches → contract, and let only the integrate
  ticket be green.
- Fog is not "unknown tasks". The test is whether the question can be stated sharply now, not whether
  it can be answered. A fog entry written as a task ("figure out billing") gets answered by whoever
  picks it up next, from their own priors, and the answer becomes load-bearing before anyone checks it.
- "Blocked by" written into the ticket body is not an edge. Trackers have native blocking links; a
  paragraph does not. Without edges the frontier cannot be computed, and a fleet of agents starts
  everything at once.
- Criteria that pass at the base commit. Three shapes recur: already true before any work, satisfiable
  only by another ticket, or a restatement of the request. For each criterion, name the observation
  that would show it false at the commit the implementer starts from — a vertical slice fails there by
  construction, which is the cheapest proof the criterion grades anything.
- Two copies of a ticket's content disagree within a day. The plan is an index — one line and a
  pointer — with the detail in exactly one place. A plan that restates the ticket body is a plan nobody
  can tell is stale.
- Over-decomposition is the other default: twelve tickets for a three-line change, one per atomic unit,
  losing the grouping that made them meaningful. If the whole change fits in one fresh context window,
  there is no plan to write.
- Frontier tickets that ask questions are not safe to parallelise. Two sessions on two decision
  tickets share no context and put the same question to the human twice. Parallelise builds; serialise
  decisions.

## Rationalizations

| Excuse | Reality |
|---|---|
| "I'll fill in the details as I go" | Then they are not in the plan. Fog is allowed; unrecorded fog is a decision someone makes from priors and you inherit. |
| "Cleaner to do all the schema first" | That is horizontal slicing in a nicer sentence: nothing is demoable until the last layer lands. |
| "The blockers are obvious from the order" | Order is not an edge. An obvious blocker is still one nothing can compute. |
| "This one is too small to demo" | A ticket with no demo is a layer. Merge it, or label it a prefactor. |
| "We don't need this — drop it" | Dropping is how scope gets re-litigated. Move it to out of scope with the reason. |
| "There's no fog, it's all clear" | Either the work fits one context window and needs no plan, or the sweep stopped at the first layer. |
| "The destination is obvious" | Then write the sentence and the check that would falsify it. An unstated destination cannot reject a ticket. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Milestones", "phases", and "workstreams" are tickets with the demo line removed. |

## Red flags

- You are writing ticket four and the destination is still in your head.
- Your tickets sort by layer: all the data, all the API, all the UI.
- You cannot say what you would demo after the ticket you just wrote.
- You are phrasing a fog item as a task so it fits in the frontier.
- You are writing a blocker as a sentence instead of an edge.
- An item left the plan and you cannot say which bucket it went to.
- You are estimating in days, or counting tickets as progress.

## Limitations

- Sizes in context windows only. It cannot produce a schedule, a cost, or an effort estimate — "one
  fresh context window" is a claim about what an agent can hold, not about how long a human takes.
- Cannot choose the destination. It measures every ticket against one; if the destination is wrong,
  the plan is internally consistent and useless. That is `frame-the-problem`.
- Cannot clear fog. It records that a question is unanswerable now and what would clear it; producing
  the answer is `weigh-evidence` or `make-the-call`.
- Knows exactly one exception to vertical slicing, the wide refactor's expand/contract, and that one
  assumes CI can run per migrate batch. A refactor that cannot keep any batch green has no shape this
  skill can give it.
- Assumes a tracker or a file. On a tracker with no native blocking links the edges are text that must
  be read by hand, so the frontier is a claim about the text rather than a query.
