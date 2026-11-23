---
name: trace-second-order
description: Use when a change is defended by its intended effect and the user asks "and then what", "what does this incentivize", "who will game it", "what breaks at 10x", "what are we locking in", "what's the catch", or "will this bite us later" — or when the change touches a default, a metric, a permission, a cache, a retry, a queue, or an interface. Not for making the choice (use make-the-call), testing the premise (use weigh-evidence), or judging a schema (use judge-data).
domain: thinking
risk: none
invocation: model
version: 0.1.0
metadata:
  form: structural slot
  baseline: change-defended-by-its-intended-effect
  eval: evals/
---

# Trace Second Order

A proposed change is a claim about its first effect. This skill makes the agent trace the next two
links — the behaviour the change rewards, the mistakes it makes cheap, the bill at scale, the door it
closes — and hand the decision a chain with a signal on it.

```
NO CHANGE IS PROPOSED ON ITS INTENDED EFFECT ALONE: NAME WHAT IT INCENTIVIZES, WHAT IT MAKES EASIER TO BREAK, WHAT IT COSTS AT 10X, AND WHAT IT FORECLOSES.
```

## When to use / when not to use

Use when:

- the user says "and then what", "what does this incentivize", "who will game it", "what breaks at
  10x", "what are we locking in", "what's the catch", "is there a trap", "what happens after", "what
  are we signing up for", "will this bite us later", "what does this make harder"
- the argument for a change is its intended effect: "this cuts p95", "this unblocks the team", "this
  removes the noise", "this is just a small change"
- the change alters a **default**, a **metric**, a **permission**, a **cache**, a **retry**, a
  **queue**, or an **interface** — the shapes whose second-order bill is routinely paid by someone
  who was not in the room
- a previous fix came back as a new bug and nobody connected the two
- you are about to write "side effects: none", "low risk", or "should be safe"
- a plan has a `Risks` section that lists categories rather than mechanisms

Not when:

- the choice between options is the question — that is `make-the-call`; this skill produces the chain
  the call must price, and stops there
- the premise under the change is untested — that is `weigh-evidence`; tracing consequences of a
  mechanism that does not work is fiction with a signal attached
- the change is decided and the job is to make it safely, test-first — that is `red-green`
- the object is a schema, a constraint, or a migration — that is `judge-data`, which carries the
  data-level rejections this skill does not
- the question is what to tell a human about the risk — that is `report-with-evidence`
- a run must decide whether to stop — that is `stop-or-escalate`
- the change itself is the wrong change because the problem was mis-framed — `frame-the-problem`
  first; a precise chain from the wrong mechanism is wasted work
- the work must be sliced, the handoff written, or the context compacted — that is `split-by-frontier`,
  `write-handoff`, and `manage-context`

| if the change is | do |
|---|---|
| a default, metric, permission, cache, retry, queue, or interface | trace it — these are the shapes with a second-order bill |
| a rename or a private helper with no behaviour change and no exported surface | no chain to trace; say so in one line and move on |
| proposed but its premise is unverified | `weigh-evidence` first, then trace |
| one of several options with a decider | trace, then `make-the-call` prices the chains |
| a schema or migration | `judge-data` |
| decided and being written | `red-green` |

## The process

### Phase 1 — Write the change as a mechanism

Consequence chains attach to mechanisms, not to benefits. "Add caching to make reads fast" names a
benefit; "reads will be served from a copy refreshed on a timer" names the moving part, and the
invalidation bug is already visible in it.

One sentence, three parts: what changes, whose behaviour changes because of it, and the measure that
says the intended effect happened.

| stated as | rewritten as |
|---|---|
| "add a cache to fix p95" | "profile reads will come from a 5-minute copy; p95 drops; every writer now owns invalidating a second store" |
| "raise the alert threshold to 900 ms" | "the pager stops firing below 900 ms; on-call stops seeing 700–900 ms regressions" |
| "make queue creation self-serve" | "any team can create a queue through the API without a ticket; queue count grows with no reviewer" |

**Done when:** the sentence names the mechanism (the copy, the default, the new capability), the
behaviour it changes, and the measure of the intended effect — and it contains no "just".

### Phase 2 — Ask the four questions, each cashed out as a chain

The four lenses are fixed because they fail differently: incentive catches the human response, misuse
catches the engineering failure, 10x catches the resource, foreclosure catches time. Run all four. A
lens that finds nothing is a result, not a skip. A chain can also be good news — a change that removes
a footgun has a second-order benefit — and it belongs in the ledger; this is not a risk register.

The rule that makes the work checkable: **a consequence is an actor or resource, a mechanism, a
signal, and a horizon.** "Security risk" is a category. "The new admin flag will be granted to the
support bot within a month, because the bot already has prod database access and the flag removes the
last manual step; the signal is the audit log showing a non-human grant" is a consequence.

**1. Incentive — who does what more, because it is now cheaper?**
Every change moves a cost, and people move toward the cheaper path. Ask what the change pays for,
what it makes free, and what it makes expensive. This lens catches the fix that improves the number
while the complaint stays: the metric is now a target, so it is being managed rather than measured.

**2. Misuse — what does it make easier to do wrong?**
Not "what could an attacker do" — what will a competent teammate do at 6pm under pressure, and what
will the code let them do? Every copy is an invalidation surface, every default is a policy nobody
read, every bypass becomes load-bearing the day another team builds on it. The failure this catches:
the cache that is correct on day one and stale on the first write path added after it.

**3. 10x — what binds first, and what breaks when it does?**
Not "does it scale" but "which resource becomes the constraint, and what fails at that boundary". The
thing that is slow at 1x is often not the thing that breaks at 10x: a per-request query becomes pool
exhaustion, a single writer becomes a coordination problem, a table scan becomes a lock.

**4. Foreclosure — what becomes expensive or impossible later?**
What does this publish, pin, or teach? A name customers learn, an API consumers call, a data shape
every reader now depends on, a workaround other code is written against. The test: if we wanted this
undone in a year, what would have to be migrated, retrained, or renegotiated? The failure this
catches: the temporary export three customers now call, which is an API you must version forever.

Each lens gets one line per chain: `<actor or resource> → <mechanism> → <signal> · <horizon or scale>`.

**Done when:** each of the four lenses holds at least one chain with all four parts, or
`none — checked <what>` naming the specific check; a lens holding a category and no actor is not done.

### Phase 3 — Attach the earliest signal to every chain

A consequence you cannot see arriving is not one you can price; it is a mood with a mechanism. For
each chain, name the earliest observation that shows it happening: a log line, a count, a support
ticket, a series on a dashboard, a review comment. If the signal arrives only after the damage is
done, say so — that is the finding, and it changes the response from "monitor" to "don't".

**Done when:** every chain names an observation and the moment it becomes visible, and chains whose
only signal is "later, from a customer" are marked as such rather than dropped.

### Phase 4 — Pick the dominant consequence, and dispose of the rest

Consequences are not equal, and a list of twelve is a refusal to think. Pick the one chain that, if
true, would change the decision — usually the shortest horizon, the largest unrecoverable cost, or the
actor with the strongest incentive. If none would change the decision, that is the finding: write
`Dominant: none` and say what you checked.

The other chains do not disappear; they become dispositions — accepted, mitigated with a named step,
or dropped with the reason. What the decider gets is one chain to price plus the list they can
overrule.

**Done when:** exactly one chain is named dominant (or `none` with its check), and every other chain
carries a disposition.

### Phase 5 — Emit the ledger and hand it to the decision

```
Change:      <the mechanism sentence from Phase 1>
First order: <the intended effect and its measure>
Incentive:   <actor → mechanism → signal> · by <horizon>
Misuse:      <actor → mechanism → signal> · by <horizon>
At 10x:      <resource → what binds first → signal> · at <scale>
Forecloses:  <what becomes expensive or impossible> · by <horizon>
Dominant:    <the chain that should price the decision — or none: <what you checked>>
Watch:       <earliest signal, its threshold, who watches it, and the response if it fires>
```

Every slot is filled; `none` is legal only with its check. Then hand the ledger to `make-the-call`:
the dominant chain is what its `Cost` slot prices and its `Tripwire` slot watches. This skill does not
choose.

**Done when:** all eight slots are filled, the dominant chain appears in `Watch` with a threshold and a
watcher, and no `none` appears without its check.

## Gotchas

- A metric used as a target stops measuring the thing. A change that improves the number while the
  complaint stays is not a fix; read the complaint, not the dashboard. The signal that a metric has
  become a target is that the number and the user's experience have diverged.
- Every cache is a second copy with a permanent invalidation obligation on every future writer. The
  bug arrives months later in a write path nobody touched, written by someone who never saw this
  change. If invalidation is not enforced by the write path itself — one write function, a
  transaction, a TTL the domain genuinely tolerates — the cache is a scheduled incident.
- A default is a policy for everyone who never read it, including people you cannot grep: another
  repo's YAML, a customer's deploy script, an environment variable in a system you do not own. `rg`
  finds call sites; it does not find configuration.
- Retries multiply across layers. Three layers with three attempts each is 27 requests per user
  action, and they fire together exactly when the dependency is already failing. Count the layers
  before adding one; the retry storm is worst when the system is weakest.
- A queue turns a synchronous failure into a delayed, invisible one. p99 improves because the error
  moved to a dead-letter queue nobody reads, and the user gets a spinner instead of an error. Name the
  DLQ's owner and its alert as part of the change.
- Making something easier to do raises its volume, not just its convenience. A one-click review gets
  ten times the submissions; a self-serve endpoint gets traffic nobody capacity-planned. The plan for
  the new flow includes the new flow's peak.
- At 10x the constraint changes kind, not degree. A 200 ms query becomes a connection-pool wait
  because 200 concurrent callers now hold connections, and an index does nothing for that. Look at
  what is shared, not at what is slow.
- A "temporary" workaround becomes an interface the day another team builds on it. Whatever unblocks
  you is what the next code is written against, and the bypass outlives the ticket that created it.
- Removing a safeguard removes the only place a human saw the change. The approval step nobody liked
  was the reader of the diff; the audit log now records an action nobody reviewed.
- A feature flag is a fork, not a switch. Every flag doubles the states that must be tested and the
  combinations that ship, and a flag that outlives its rollout is a permanent branch with no owner.
- A pre-mortem that stops at fears is this skill without the cash-out. Each fear either becomes a
  chain with a signal or an accepted cost with a named owner; a mood is not an output.

## Rationalizations

| Excuse | Reality |
|---|---|
| "I considered the side effects" | Name them. The sentence "side effects considered" is the absence of the analysis. |
| "Nobody would do that" | Someone benefits from doing it, or nobody does. Name which. "Nobody" is a claim about incentives with no evidence. |
| "We'll deal with it when it happens" | Then name the signal that tells you it happened and who is on call. Without one, "when it happens" means "when a customer tells us". |
| "It's reversible" | The code is. The other team's integration, the customer's script, and the habit are not. Name what the revert does not restore. |
| "The alternative has side effects too" | Compare the chains. Symmetry is not an argument, and it is the fastest way to skip both. |
| "At our scale it doesn't matter" | Name the scale at which it does and the signal that you are approaching it. "Our scale" is a number you have not looked up. |
| "It's internal, there are no users" | Internal users have incentives too, and the first gaming happens in your own team. |
| "It's a small change" | Diff size is not consequence size. Defaults and metrics are one-line changes with system-wide effects. |
| "Everything has side effects, so here are twelve" | A list is not a trace. Four lenses, one dominant chain; padding buries the one that should price the decision. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Pre-mortem", "blast radius", "risk section", "trade-offs", and "safety review" are this skill under other names. |

## Red flags

- You are writing the benefits, and "side effects" appears only as a heading.
- Your consequence is a category — "performance", "security", "maintainability" — with no actor and no
  mechanism.
- You traced one link and stopped at the effect the change was bought for.
- Your mitigation is "monitor it" and there is no signal to watch.
- You are arguing a consequence is unlikely instead of naming the signal that would show it arriving.
- You listed every risk you could think of and none of them is priced.
- You are about to write "we can fix it later" without naming what fixes it.
- Your ledger has no `Dominant` line, or `Dominant` is a category.
- You are choosing between options instead of handing the chain to the decider.

## Limitations

- Produces chains and signals, not probabilities. It cannot tell you how likely a consequence is; it
  can only make the claim specific enough that the likelihood is arguable.
- The 10x question is extrapolation. Without a measured baseline at 1x it is a scenario, not a
  forecast, and must be labelled one.
- Cannot price a chain in money, customers, or reputation. That is `make-the-call`'s `Cost` slot and
  the owner's values.
- Long chains diverge. Two links past the intent is the discipline; beyond that each link multiplies
  the branches and confidence falls faster than insight rises. When a chain leaves the system you can
  observe, stop and say where it left.
- Does not see consequences of *not* changing, unless you run it on the status quo as the proposed
  change. That is legal and often the more informative run.
- Assumes the Phase 1 mechanism is roughly right. A change whose mechanism is unknown — a rewrite, a
  migration with unclear semantics — needs `frame-the-problem` first; tracing consequences of an
  unnamed mechanism produces fiction with a signal attached.
