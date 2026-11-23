---
name: weigh-evidence
description: Use when the user says "why is this happening", "it must be the cache", "the root cause is", "are you sure", "how do you know", "is that actually true", "everyone knows", "the logs show" — or cites a benchmark, an A/B result, a postmortem cause, or a conclusion reached by one line of reasoning — and the claim is about to be acted on untested. Not for confirming a change works (use prove-it) or for choosing what to do about it (use make-the-call).
domain: thinking
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: discipline
  baseline: single-hypothesis-confirmation
  eval: evals/
---

# Weigh Evidence

A verdict is a claim's evidence made inspectable. This skill makes the agent state the competitor,
bound the claim, price the evidence, and license only the action the evidence supports.

```
NO VERDICT FROM A SINGLE HYPOTHESIS.
```

## When to use / when not to use

Use when:

- the user says "why is this happening", "what's causing", "it must be", "I think the problem is",
  "the root cause is", "are you sure", "how do you know", "what's the evidence", "is that actually
  true", "can we assume", "everyone knows"
- a diagnosis exists and a fix is about to be written on top of it
- a result is cited as settled: a benchmark, an A/B test, a metric, a postmortem's causal claim, a
  doc, a previous engineer's note
- a claim is being generalized from one case — one reproduction, one customer, one repo, one run
- two parties disagree about the same facts, or you disagree with your own earlier conclusion
- the decision is expensive and the premise under it has never been checked

Not when:

- the claim is "it works / it's done / it's deployed" and the question is whether a command was run —
  that is `prove-it`
- the facts are settled and the question is what to do — that is `make-the-call`
- the problem has not been framed, so you do not yet know what claim to test — that is
  `frame-the-problem`
- one read-only command would settle it — run the command; a verdict ceremony on a cheap observation
  is waste
- the disagreement is about values, taste, or priority — there is no evidence to weigh
- the deliverable is the message to a human — that is `report-with-evidence`, which shapes the report
  after this skill produces the verdict

| the situation is | use |
|---|---|
| the premise under a decision is unchecked | this skill, then `make-the-call` |
| the claim is about a change you just made | `prove-it` |
| the claim is cheap to test directly | run the test; this skill is for claims that are expensive, ambiguous, or already believed |
| the claim is contested and the next step is irreversible | this skill before anything else |

## The process

Four instruments, one artifact. Each blocks a different way a single hypothesis survives:
the competitor blocks confirmation, the boundary blocks over-generalization, the base rate blocks the
vivid case, the reversal test blocks the double standard. Only one ordering constraint matters — the
competitor comes before the search, because a search run for one hypothesis cannot find the other.

### Phase 1 — Write the claim so it can fail

A claim you cannot falsify cannot be weighed, only repeated. Rewrite the assertion as one sentence
with three parts: the subject and predicate, the scope (where, when, for which inputs, versions, or
users), and the observation that would make it false.

| as stated | rewritten |
|---|---|
| "the API is slow" | "p95 latency of `GET /search` exceeds 800 ms for queries with more than 3 terms, in prod, since Tuesday" |
| "the cache is stale" | "for user 42, `/profile` returns a value older than the row in `users`" |
| "everyone uses X" | "the four repos in this org use X for auth" |
| "this fixes the flake" | "the 12 failures in the last 200 CI runs do not appear in the next 200 with this change" |

The scope is part of the claim. Narrowing it after the evidence arrives is how a false claim becomes
true without a single new observation; the verdict is about the scope written here.

**Done when:** one sentence carries a scope and a falsifying observation — or you have written "no
observation could falsify this", in which case the verdict is `unverifiable` and the competitor is
still named: even an untestable claim has an explanation that would replace it.

### Phase 2 — State the competitor before you look

Two-hypothesis discipline (LessWrong): hold at least two explanations that fit everything you
currently know. If only one survives your current facts, your facts are incomplete — not your
hypothesis proven.

The competitor is not a strawman. Write the version a competent person would hold: the mundane cause,
the measurement artifact, the "no effect", or the claim being true for a different reason. Give it its
own scope, in the same form as the claim.

Then find the discriminating observation — the one where the two predict differently. That
observation, not more evidence for the first hypothesis, is the next thing you look at.

| symptom: values are stale right after an update | read the row on the primary | read the row on the replica |
|---|---|---|
| H1: the cache is not invalidated on write | fresh | fresh |
| H2: the read replica is lagging | fresh | stale |
| H3: the write never committed | stale | stale |

Two reads separate three hypotheses. Note what is *not* in the table: the stale read the user reported
is identical under all three, so it is the symptom, not the discriminator. An observation shared by
every hypothesis is backdrop.

The "artifact" competitor earns its own line. Before attributing a change to a cause, rule out that
the measurement moved: a different sample, different load, a dashboard that gained a series, a test
that now runs in a different order.

**Done when:** two or more hypotheses are written, each fits the current facts, and a named
observation separates at least two of them — or you have written that no reachable observation does,
which caps the verdict at `contested` or `unverifiable`.

### Phase 3 — Bound it: IS / IS-NOT

Kepner-Tregoe. For each dimension that varies, write where the claim holds (IS) and where it does not
(IS-NOT). The IS-NOT side is the informative half: a cause must explain both sides, and the
*difference* between them is the candidate set.

| dimension | IS | IS-NOT | the difference it points at |
|---|---|---|---|
| what | CSV import fails | JSON import fine | the parser path, not the upload |
| where | eu-west only | us-east fine | region config, not code |
| when | since the 14:02 deploy | fine before it | the deploy window — or anything else in it |
| extent | 3% of rows | 97% fine | a data condition, not a code path |

Two rules:

- **Verify at least one IS-NOT entry by observation.** Recalled negatives are usually wrong; the case
  you are certain is unaffected is the one that quietly is.
- **Every IS-NOT case the claim cannot explain is a defect in the claim, not noise.** Either the claim
  is narrower than stated or it is wrong. Narrow it in the verdict's scope; do not explain the
  exception away.

For a claim that is not a diagnosis — a benchmark, a "best practice", a doc — the same matrix is the
applicability boundary: which inputs, versions, and workloads were measured, and which were not. A
benchmark result without its IS-NOT side is a claim about one machine.

**Done when:** every dimension that varies has an IS and an IS-NOT, each entry is marked
observed / reported / assumed, and at least one IS-NOT entry was observed rather than recalled.

### Phase 4 — Price the evidence against the base rate

Two questions, in this order — the first about the claim, the second about each observation.

1. **What usually happens?** Before the vivid detail, name the reference class and its rate: how often
   claims of this kind hold, how often incidents of this shape have this cause, what fraction of the
   system could produce this symptom. With no rate available, write "unknown" — a feeling is not a
   number.
2. **Is this observation more likely under one hypothesis than the other?** Evidence that would
   appear under either is backdrop, not evidence. Evidence that is expected under the claim and
   surprising under the competitor moves the verdict.

The traps this catches:

- **The available cause.** The last change is visible and feels causal; the config that flipped in the
  same window is not in the diff. Enumerate what changed, not what you can see.
- **The vivid case.** One dramatic log line outweighs a boring statistic in attention and not in
  likelihood.
- **Absence of evidence.** "No errors in the log" is evidence only if the error would have been
  logged — at that level, on that path, not swallowed, not sampled. State what the search would have
  found.
- **One source counted twice.** A stack trace and the log line that printed it are one observation.
  Count independent sources, not lines.

**Done when:** the base rate is named with its source or marked unknown, and every observation carries
"more likely under H1 / H2 / neither".

### Phase 5 — Run the reversal test

Julia Galef's test: would you accept the same evidence if it pointed the other way?

Three forms, all cheap:

- **Swap.** Present the evidence as support for the competitor. Does it still read as strong? If it
  weakens, the strength came from the conclusion.
- **Standard.** What would you demand before believing the opposite? If the bar is higher, you are
  running two standards and the lower one is doing the work.
- **Precommit.** Write the observation that would flip the verdict *before* running the test. A flip
  condition invented after the result is a rationalization with a timestamp.

The steelman belongs here: state the competitor at its strongest, including the version in which your
claim is the naive one.

**Done when:** the flip condition is written, specific enough for someone else to run, and you have
answered the swap question in one line.

### Phase 6 — Emit the verdict

Four states, defined by evidence rather than by tone:

| verdict | when | what it licenses |
|---|---|---|
| supported | a discriminating observation came out the claim's way and not the competitor's; the IS-NOT side is explained or outside the scope; the reversal test found no double standard | act at the claim's scope |
| contested | the observations fit both; the discriminating test has not been run; credible sources disagree; or the claim explains IS but leaves an IS-NOT case unexplained | reversible steps only, or go get the discriminating fact |
| unsupported | the observation the claim predicts is absent where it should be present; the competitor explains the same facts with fewer assumptions; or an IS-NOT observation contradicts what the claim predicts there | do not build on it, and do not report it as false — unsupported is not refuted |
| unverifiable | no reachable observation distinguishes it, or the claim is a belief with no falsifier | say so; do not launder it into supported with reasoning |

`contested` is the default until the discriminating test has run; `supported` requires that it ran and
came out the claim's way. An unexplained exception is `contested`; a contradicted prediction is
`unsupported`. When two states seem to fit, take the one that licenses less and name the observation
that would promote it.

Then the artifact, every slot filled:

```
Claim:      <one falsifiable sentence, with its scope>
Competitor: <the alternative that also fits the facts, at its strongest>
Evidence:   <the discriminating observations, each with its source>; <what was checked and not found>
Boundary:   IS <where it holds> / IS-NOT <where it does not, and what that rules out>
Base rate:  <how often claims of this kind hold, and the source — or "unknown">
Reversal:   <would the same evidence have been accepted the other way — yes/no, and why>
Verdict:    supported | contested | unsupported | unverifiable — <the one clause that decides it>
Flips if:   <the observation that would change the verdict>
Licenses:   <what may now be done: nothing / reversible steps only / act at this scope>
```

Two rules for the artifact:

- **`Licenses` may not be stronger than `Verdict`.** A contested verdict licenses a reversible step or
  a test, never the irreversible action the claim was gathered to justify.
- **The verdict is about the scope in `Claim`,** not about the topic. "Supported: the leak is in the
  CSV path, for files over 10 MB" says nothing about the JSON path.

A filled example, from a latency investigation:

```
Claim:      p95 of GET /search exceeds 800 ms for 4+ term queries, in prod, since Tuesday
Competitor: the p95 series changed Monday to include a nightly batch job
Evidence:   latency by query length from the series (observed); batch spans tagged `batch` (observed);
            the spike also appears in raw traces with batch spans excluded (observed)
Boundary:   IS 4+ term queries on /search / IS-NOT 1-3 term queries, and the JSON export that shares
            the query builder
Base rate:  unknown — no prior latency regression on this endpoint
Reversal:   yes — the same trace evidence would have been accepted for the batch-job hypothesis
Verdict:    contested — the batch job explains the series change but not the raw-trace spike
Flips if:   the raw-trace spike disappears once batch spans are filtered out
Licenses:   filter batch spans and re-read the series; no index yet
```

Note what `contested` did to `Licenses`: the interesting next step is a measurement, not the index the
investigation was originally gathered to justify.

When the verdict is `unsupported`, say what would have made it supported. That is the next test, not
an argument.

**Done when:** all slots are filled, the verdict is one of the four, and `Licenses` names an action no
stronger than the verdict supports.

## Gotchas

- `rg` skips `.gitignore`d and binary files by default; `git grep` searches the index, not the working
  tree. "No references found" is a claim about your search, not about the code. Re-run with ignores
  off and the working tree in scope before calling something unused.
- A stack trace and the log line that printed it are one observation, not two. Three lines from one
  code path agreeing with each other is one fact repeated, and counting them as three is how a
  single observation becomes "strong evidence".
- Exceptions swallowed by a bare `catch {}`, or logged at DEBUG while the level is INFO, make "no
  errors in the logs" a statement about the logger. Check the level and the handlers before treating
  silence as a signal.
- A reproduction that fails to reproduce is evidence about the reproduction: wrong version, wrong
  config, missing seed, cached artifact, different data. "Cannot reproduce" has its own causes, and
  one of them is that your setup differs from the report's.
- A fix that works does not confirm the diagnosis. The change may have worked around the cause, fixed
  a second cause, or coincided with a restart. Confirmation is the predicted side effect: if H1 were
  right, X should also be true now — go look at X.
- Any sufficiently flexible hypothesis explains every fact you have. Post-hoc explanation is free;
  prediction is not. If the hypothesis predicts nothing you have not already seen, you have a story,
  not a diagnosis.
- The verdict is set by the weakest link, not the average. Nine confirmations and one unexplained
  contradiction is `unsupported` until the contradiction is explained with evidence; "mostly
  supported" is not one of the four states.
- Narrowing the scope after the evidence arrives converts an unsupported claim into a supported one
  without a new observation. Fix the scope in Phase 1; if it has to move, that is a new claim and a
  new verdict.
- A user's report is evidence with a source and a base rate, not a fact. Users are usually right about
  the symptom and often wrong about the cause; the report is a hypothesis to test, and the test is
  usually one observation.

## Rationalizations

| Excuse | Reality |
|---|---|
| "The evidence strongly suggests…" | One observation is not evidence plural. Name what would be true if you were wrong. |
| "It's almost certainly the cache" | Almost certainly compared to what? Name the competitor and the observation that separates them. |
| "I've seen this before" | Memory is a hypothesis, not an observation. The same symptom has many causes and your last case is one sample. |
| "There's no evidence of X" | Absence is evidence only if the search would have found it. Say what you searched and how. |
| "The fix works, so the diagnosis was right" | A working fix is consistent with a wrong diagnosis. Check the side effect the diagnosis predicts. |
| "Both explanations fit, so it doesn't matter" | It matters exactly when they license different actions. Get the discriminating fact, or act only where they agree. |
| "The user told me it's X" | The user reported a symptom and offered a cause. Test the cause; it costs one observation. |
| "I already ruled that out" | With what observation? "I can't see how it would happen" is not a ruling. |
| "I don't have time for a second hypothesis" | The second hypothesis is one sentence. Being wrong costs the whole fix. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Most likely", "strongly suggests", "the obvious explanation", and "clearly" are verdicts without a competitor. |

## Red flags

- You are reading the code to confirm the hypothesis you already wrote down.
- You cannot name the observation that would prove you wrong.
- Your evidence and your hypothesis come from the same artifact.
- You wrote "clearly" or "obviously" before the mechanism.
- You are counting confirmations and have not looked at a case that should be unaffected.
- You are explaining the IS-NOT exception away instead of testing it.
- Your verdict got stronger after the fix was written.
- You are about to take an irreversible step on a contested claim.
- You are narrowing the claim to fit the evidence.

## Limitations

- Produces no evidence you cannot reach. For a production-only failure, a customer's environment, or a
  paid service, the honest verdict is `unverifiable` plus what would verify it; this skill cannot
  manufacture the observation.
- Base rates need a source. On a novel system there may be no reference class, and "unknown" is the
  entry; the skill will not invent a rate to make a verdict look calibrated.
- Two hypotheses is a floor, not a proof. Both can be wrong, and the skill cannot tell you that the
  space of explanations is exhausted.
- A verdict is a timestamp, not a truth. It holds until an observation contradicts it; the artifact
  should be reopened rather than defended.
- Does not price the decision or choose the action — that is `make-the-call` — and does not verify that
  a change works — that is `prove-it`.
