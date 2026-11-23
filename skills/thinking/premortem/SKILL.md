---
name: premortem
description: Use when a plan, launch, migration, or project is about to start and someone says "what could go wrong", "how could this fail", "premortem", "de-risk this", "assume it failed — why", "what would kill this", "play devil's advocate", or "why do projects like this die" — or when a plan has dates and owners but no failure path. Not for choosing among options (use make-the-call), attacker-reachable surfaces (use judge-risk), or diagnosing a failure that already happened (use weigh-evidence).
domain: thinking
risk: none
invocation: model
version: 0.1.0
metadata:
  form: structural slot
  baseline: plan-with-no-failure-path
  eval: evals/
---

# Premortem

A plan that only plans to succeed has one path and no watchers. This skill makes the agent write the
obituary before the work starts, then turn every cause of death into a change to the plan, a tripwire
with a threshold, or an acceptance with a name.

```
NO PLAN WITHOUT AN OBITUARY; NO CAUSE WITHOUT A DISPOSITION.
```

## When to use / when not to use

Use when:

- the user says "what could go wrong", "how could this fail", "what are the risks", "premortem",
  "pre-mortem", "de-risk this", "stress-test the plan", "play devil's advocate", "what would kill
  this", "what am I missing", "why do projects like this die"
- a plan has dates, owners, and a happy path — a launch, a migration, a rewrite, a hire, a fundraise,
  a six-week build — and nobody has written what would make it fail
- the plan is approved on the strength of the estimate, the vendor's promise, or the team's confidence
- the work is expensive or irreversible and the team is confident; confidence is the trigger, not the
  reason to skip
- a project of the same shape died recently and nobody wrote down why
- a decision has been made and the next step is making the chosen plan survive

Not when:

- the options are still open — that is `make-the-call`; a premortem stresses the plan that was picked,
  it does not pick
- the exposure is attacker-reachable — that is `judge-risk`, which names the boundary and the worst
  case; a premortem covers operational and adoption failure, not exploit paths
- the failure already happened — that is `weigh-evidence` for the cause; a premortem on a dead project
  is a postmortem
- the question is whether a current assumption is true — that is `weigh-evidence`; a premortem assumes
  the failure and asks what follows, it does not test the present
- the question is a migration's DDL, lock, or schema shape — that is `judge-data`; the project around
  the migration is this skill's
- the disposition is "write the tests" or "make the change" — that is `red-green`; this skill assigns
  the work and its owner, it does not do it
- the question is an unattended run's budget, stop condition, or escalation — that is `budget-the-run`
  or `stop-or-escalate`; a premortem stresses a plan, not a loop's controls
- there is no plan yet, only an intention — `frame-the-problem` or `split-by-frontier` first; there is
  nothing yet to fail
- the deliverable is a summary, a handoff, or a compaction block — `write-handoff` and
  `manage-context` carry what crosses a context boundary; they do not examine what a plan risks
- the ask is a risk section for a document nobody will act on — the output here is dispositions with
  owners, not a list

| if the situation is | use |
|---|---|
| the plan exists, is unstarted, and needs failure modes | this skill |
| two plans exist and one must be chosen | `make-the-call` first, then this skill on the winner |
| the risk is someone attacking the surface | `judge-risk` |
| the failure already happened | `weigh-evidence` for the cause, then this skill on the next plan |
| the plan is still an intention | `frame-the-problem` or `split-by-frontier` |
| an assumption needs testing now, not imagining | `weigh-evidence` |

## The process

### Phase 1 — Pin the plan under test

A premortem is about one plan, and plans drift: the one in the deck, the one in the ticket, and the
one people believe are three different documents. Write one paragraph, quoted or paraphrased from the
plan: what ships, to whom, by when, and the observable that says it worked. The date and the number
are the load-bearing parts — they are what the obituary will contradict.

If the plan cannot produce that paragraph, the finding is upstream: it is not yet a plan, it is an
intention or a topic. Say so and stop. A premortem on an intention produces fiction about nothing.

**Done when:** one paragraph exists with a date and a success measure, and you have named the document
it came from.

### Phase 2 — Write the obituary, in the past tense

Set the scene: it is six weeks after the date in Phase 1 — or the horizon where failure would be
visible, the morning after the migration, the end of the first billing cycle. The project is dead.
Write the first paragraph of the postmortem: what killed it.

Two rules do the work:

- **Past tense, no conditionals.** "The vendor slipped and there was no second source" is a cause.
  "The vendor might slip" is a risk. Delete any sentence that could still be true.
- **One cause per load-bearing claim.** Every date assumes an estimate, every number assumes a
  behaviour, every dependency assumes someone else's roadmap, every "we" assumes a person is
  available. Take the Phase 1 paragraph sentence by sentence and write the obituary of the sentence
  where the assumption was false.

Generate before judging. Write every cause you can before deciding whether any is likely. Judging
early anchors the list on the first plausible cause and produces one cause with variations. The
default state is optimism — the plan was written by the faculty that now has to imagine its failure,
and that faculty prefers the version where it works.

**Done when:** every load-bearing claim in the Phase 1 paragraph has at least one cause, each cause
names an actor and an event, and no cause contains "if", "might", "could", or "potentially".

### Phase 3 — Make each cause observable, or drop it

A cause you could not have seen coming cannot get a tripwire, and a cause with no mechanism cannot be
priced. For each cause, name the earliest observation that would have shown it: a number, a test, a
date, a message. If the earliest observation is the failure itself, the cause is not preventable —
that is fine, and it decides the disposition in Phase 4.

Then apply the rewrite test: a cause that survives only as a category — "scope creep", "resourcing",
"alignment", "communication" — is not a cause. Rewrite it until it names an actor and an event, or
drop it. A category cannot be watched, assigned, or priced, which is why it survives every review.

**Done when:** every surviving cause has a named observation, and no cause is a bare category.

### Phase 4 — Give every cause exactly one disposition

Three, and only three:

- **Mitigate** — change the plan now so the cause cannot fire, or fires smaller. Name the change, its
  cost in the plan's own units (days, money, scope), and who does it. A mitigation that costs nothing
  is usually imaginary.
- **Tripwire** — an observation, a threshold, a check date, an owner, and the response when it trips.
  This is the disposition for a cause whose prevention costs more than its damage.
- **Accept** — a person who could have said no has said yes, knowing the price and the date. "The team
  accepts" is not a person; an acceptance with no name is silence with a label.

One disposition per cause. Two is a way of not choosing: a mitigation plus "we'll also monitor" is a
mitigation with an unowned backup.

**Done when:** every cause has exactly one disposition, and every disposition names its artifact — the
plan line, cost and date for a mitigation; all five parts for a tripwire; the name, price and date for
an acceptance.

### Phase 5 — Price the dispositions against the plan

The dispositions are work, and work spends the plan's slack. Add the mitigations up in days or in
scope. If they exceed the slack, the honest finding is that the plan does not fit and needs a decision
(`make-the-call`) — not a longer plan carrying the same date.

Then find the kill shot: the cause that is both likely and fatal. If it has a mitigation, that
mitigation is the first thing the plan does. If it has none and no owner has accepted it by name, the
plan does not start.

**Done when:** the total mitigation cost is compared against the plan's slack, and the kill shot is
named with either its mitigation or its named acceptance.

### Phase 6 — Write the artifact and set the re-run trigger

Fill six slots. An empty slot is written `none: <reason>`, never removed: `Accepted: none` says
nothing was knowingly left exposed, while a missing line says nobody looked.

```
Plan:       <what ships, by when, and the number that says it worked>
Obituary:   <the date, and the one sentence that killed it>
Causes:     <one row per cause: event | earliest observation | disposition | the artifact that carries it>
Kill shot:  <the cause that ends the project and what now watches it — or "none: <why>">
Accepted:   <cause> — price <what is lost> — accepted by <name> on <date> — or "none: <why>">
Rerun:      <the plan change or date that makes this premortem stale>
```

A filled example, from a billing-provider cutover:

```
Plan:      Move billing to the new provider by 14 March; success is zero failed charges in cycle one.
Obituary:  24 April — the cutover was rolled back in week one and the old provider's contract lapsed.
Causes:
| # | cause | earliest observation | disposition | artifact |
| 1 | the sandbox did not reproduce the old proration rules | parity test failures on day 2 | mitigate | parity suite in CI before cutover — 3 days |
| 2 | the cutover ran in one window, not by cohort | a dry run on 10% of accounts | mitigate | cohort ramp 10% → 50% → 100% |
| 3 | the finance team's manual invoicing did not survive the format change | the new invoice format differs from the old provider's | accept | one week of manual invoices — R.K., 2 Feb |
| 4 | the cutover failed with no path back to the old provider | a parity failure in the 10% dry run | mitigate | old contract alive 30 days past 100%; rollback rehearsed once |
Kill shot: cause 4 — a failed cutover with no path back; watched by the daily parity report.
Accepted: invoice-format rework — one week of manual invoices — R.K., 2 Feb.
Rerun: any change to the cutover date, the provider contract, or the parity suite.
```

Then set the trigger: a premortem is a claim about a plan version. Any change to the scope, the date,
a critical dependency, or the kill shot's mitigation makes it stale; so does the first tripwire check
date. Name which of those fires the re-run.

**Done when:** all six slots are filled or marked `none: <reason>`, and `Rerun` names an event or a
date.

## Gotchas

- The obituary written with "if" or "might" is a risk list in disguise. "The vendor might slip" can
  be filed and forgotten; "the vendor slipped in week 3 and there was no second source"
  forces a mechanism and a date. Write causes as completed events, and delete any sentence that could
  still be true.
- A premortem run after the irreversible step produces acceptances, not changes. Once the date is
  announced, the vendor is signed, or the schema is dropped, every cause has one disposition left.
  Run it at the last moment the plan can still change — usually before the estimate is committed, not
  before the launch.
- Causes come out as categories. "Scope creep", "resourcing", "communication", and "alignment" are
  labels on causes, not causes. A category cannot be observed, so it gets no tripwire; cannot be
  assigned, so it gets no owner; and cannot be priced, so it gets no acceptance. Rewrite until it
  names an actor and an event.
- Every cause becomes a mitigation and the plan doubles. If all eight causes get mitigations, you have
  planned a different, smaller project. Choose by cost: mitigate when the change is cheaper than the
  expected loss, tripwire when prevention costs more than the damage, accept when neither is worth it
  — then check the total against the slack.
- "Accept" is where the work disappears. "Accepted risk" with no name, no price, and no date is
  silence with a label. An acceptance is a person who could have said no saying yes knowing the
  number; if that person was never told, the risk is unowned, not accepted.
- A tripwire nobody watches is a wish. The threshold without a check date, the check without an
  owner, the owner without a response — each is a complete-looking line that fires nothing. Write all
  five parts or write a mitigation.
- The plan's assumptions are the cause list, and they are invisible from inside the plan. Every date
  assumes an estimate, every number assumes a behaviour, every dependency assumes someone else's
  roadmap. A premortem generated from generic risk categories finds generic risks; one generated from
  the plan's own claims finds this plan's.
- A cause that names a person gets softened into "resourcing", and the euphemism cannot be mitigated.
  Write the mechanism, not the blame: "the only person who can run the migration is on leave during
  the window" is assignable; "key-person risk" is not.
- Six weeks is a scene, not a rule. Date the obituary where the failure would be visible — the
  morning after the migration, the end of the first billing cycle, the quarter after launch. Too near
  and the cause is already determined; too far and the causes are weather.
- The plan's risk list is usually the set of things already mitigated, which is why it feels complete.
  A risk discovered as an incident was not a risk in the plan; it was a surprise. The unmitigated
  causes are the ones nobody wrote down, and they are what this skill exists to surface.

## Rationalizations

| Excuse | Reality |
|---|---|
| "The plan is solid — we've done this before." | Every project that died had a solid plan and a team that had done it before. That is the base rate, not an exemption. |
| "We don't have time for a premortem." | It is one paragraph and a table. The incident it prevents costs the deadline and the quarter. |
| "I already listed the risks." | A risk list is the input. A disposition per cause, with an owner and a date, is the output. |
| "The risks are obvious; everyone knows them." | Then they should already have thresholds and owners. A risk everyone knows and nobody owns is the one that fires. |
| "It's a small project." | Small projects die of the same causes and are cheaper to protect. The premortem is smaller too. |
| "Nothing can be done, so there's no point writing it down." | Then it is an acceptance: a price, a name, a date. Writing it is the only thing that makes it owned. |
| "We'll do a postmortem if it fails." | A postmortem assigns blame after the loss. A premortem assigns work before it. |
| "The user asked for a plan, not a list of fears." | A plan with no failure path is a schedule. The obituary is part of the plan, not an appendix to it. |
| "Raising this is negative." | The fears are already in the room, unspoken and unowned. Writing them is what makes them discussable and assignable. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Risk review", "assumptions check", "pre-launch review", "sanity check", and "what are we missing" are premortems, and each owes the dispositions. |

## Red flags

- You are writing "might", "could", or "if" in the obituary.
- Every disposition is "monitor" or "keep an eye on".
- You have a list of risks and no disposition column.
- An acceptance has no person's name on it.
- The mitigations add more time than the plan has slack, and you have not said so.
- Your causes are categories: scope, resourcing, alignment, communication.
- You are running the premortem after the date is announced or the irreversible step is done.
- You are ending with reassurance that the plan is fine.

## Limitations

- Cannot find the cause nobody imagined. It generates from the plan's claims and the experience
  available to the agent or team; the failure outside both is out of reach. The value is the
  dispositions and the watching habit, not coverage.
- Cannot price a cause without data. Frequencies and damages are estimates with a stated basis; the
  artifact makes them arguable, not accurate.
- Assumes the plan can still change. When every lever is fixed, the honest output is a set of
  acceptances — a finding about the plan, not a failure of the method.
- Does not replace `judge-risk` on attacker-reachable surfaces, `judge-data` on migration mechanics,
  or `weigh-evidence` on whether a current assumption holds. It imagines operational failure; those
  test the present.
- Depends on a plan stated in one paragraph. On an intention — "we should probably do something about
  onboarding" — the causes are fiction because there is no claim to contradict.
- A single-agent premortem is a single perspective. Generating per claim before judging any
  approximates the independent generation that makes a team premortem work, but the blind spots are
  the model's own.
