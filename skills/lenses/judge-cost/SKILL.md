---
name: judge-cost
description: Use when the user says "this is expensive", "the bill jumped", "the bill tripled after this deploy", "cost per request", "unit economics", "we're retrying too much", "it's hammering the API", "the agent burned 200k tokens", "stop re-reading the same file", or a review touches a retry loop, a billed call per row, polling, or a run that re-derives what an artifact already states. Not for N+1s, latency, allocation or frame budgets (use judge-performance), a run's caps and stop conditions (use budget-the-run), or whether the price is worth paying (use make-the-call).
domain: lenses
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: cost-review-as-adjectives-with-no-meter
  eval: evals/
---

# Judge Cost

Read a change for correctness and it shows what it does; read it for latency, how fast; read it
for cost and this lens shows what it **bills**: the unit you pay per, the amplifier that multiplies
it, and whether the spend has a ceiling. The discipline is cost engineering — unit economics for
code and for agent runs.

```
NO COST VERDICT WITHOUT A UNIT, A METER, AND THE AMPLIFIER THAT MULTIPLIES THEM.
```

## When to use / when not to use

Use when:

- the user says "this is expensive", "the bill jumped", "the bill tripled after this deploy", "cost per
  request", "unit economics", "we're retrying too much", "it's hammering the API", "why does this cost
  so much", "the agent burned 200k tokens", "stop re-reading the same file"
- the diff adds or moves a retry, a billed call inside a loop, a fan-out, a poll interval, a log line
  per row, or work that used to happen once per deploy and now happens per unit
- an agent run re-reads a file, re-runs a search, or re-asks a question whose answer is already in its
  state file or a subagent's report
- a spend exists with no ceiling and no meter: a queue consumer, a nightly job, an unattended loop
- someone justifies a shortcut with "it's only one extra call", "tokens are cheap", "the rate limit
  bounds it", or "we'll optimise when it's slow"
- a PR is under review and the question is not whether it works but what it costs to run

Not when:

- the complaint is latency, throughput, memory, N+1 round trips, or a frame budget — that is
  `judge-performance`; it owns those words. An N+1 is a performance finding; a retry loop billed per
  attempt is a cost finding. If a symptom is both, price it here and route the timing half there
- the question is how much a run may spend, when it must stop, or whether the work is worth its price —
  `budget-the-run`, `stop-or-escalate`, `make-the-call`; this lens prices the unit the run repeats
- the window is filling and something has to cross the boundary — that is `manage-context`; this lens
  flags the spend pattern that makes the boundary necessary
- the question is where a seam or a cache layer belongs — that is `judge-architecture`; this lens
  prices the shape it chose
- the claim is "it works", or "the fix cut the bill" — that is `prove-it`, read at the meter
- one worker's contract is the question — that is `dispatch-workers`; this lens prices what a wave
  repeats across workers

| if the situation is | use |
|---|---|
| "it's slow", "it's an N+1", "p99 regressed" | `judge-performance` |
| "the bill tripled after this deploy" | this skill |
| "how much may this run spend, and when does it stop" | `budget-the-run`, then `stop-or-escalate` |
| "the agent keeps re-reading the same files" | this skill; `manage-context` if the window is the constraint |
| "is this worth what it costs" | `make-the-call`, with this lens's cost per unit as input |
| "prove the fix cut the bill" | `prove-it`, at the meter |
| "one service or three" | `judge-architecture` |
| "hand this to the next session" | `write-handoff` |

## The words this lens uses

Seven terms, all of them about money. The avoided word on the right is where the finding turns back
into opinion.

| term | means here | _avoid_ |
|---|---|---|
| **unit** | the thing the spend is divided by: a request served, a job run, a task completed, a tenant-day, a document processed | "call", "operation" — events, not what anyone pays for |
| **meter** | where the spend is read, in money, with a period: the billing export, the usage counter, the token count, GB egressed, GB ingested | "estimate", "roughly" — a meter has a number and a period |
| **cost per unit** | measured spend ÷ units completed, on a named workload | "expensive", "cheap", "heavy" — adjectives, not prices |
| **amplifier** | the mechanism that turns one unit into many paid events: a retry layer, a billed call per row, a fan-out, a re-read, a re-poll | "inefficiency", "overhead", "bloat" — moral words naming no mechanism |
| **ceiling** | the most one unit may cost before the work is unaffordable: revenue per unit × the margin allowed, or the owner's cap ÷ units expected | "budget" — a total, not a rate |
| **re-derivation** | producing an answer an artifact already states: a re-read, a re-run, a re-asked question, a re-summarised file | "context" — a resource, not an act |
| **idle spend** | spend that accrues while no unit completes: a retry storm, a poll loop, a run waiting on itself | "waste" — a verdict, not a measurement |

## The rejection list — reject on sight

Every row is a finding, not a note. The right-hand column is the only observable that clears it; "it's
small" is not one. If you cannot point at the clearing condition, the row stands.

| rejection | why | what clears it |
|---|---|---|
| a retry loop with no attempt cap, or a retry layer stacked on a client that already retries | retries multiply across layers: three layers of three attempts is 27 billed requests per user action, and each layer looks reasonable alone | ≤ 3 attempts per layer, one retry layer, exponential backoff with full jitter, and a retry budget as a share of traffic — [references/cost-values.md](references/cost-values.md) §1 |
| a billed call inside a loop over rows, or a fan-out whose page size and concurrency are unstated | the unit's price becomes n × the call price, and n grows with the customer's data, not with a deploy | one batched call per page, page size named, ≤ 2 billed round trips per unit |
| billed requests that grow with the data rather than with the deploy: a listing per object, a lookup per item, a scan per page | the invoice grows with no release: double the customer's rows and that line quadruples | work batched into a page-sized set, or the per-item lookup replaced by one request built once |
| work billed per unit whose input changes at most once per deploy: config parse, client construction, model load, template compile | cheap per call, dominant per unit, and it is idle spend at every request | computed once at startup or build time, with the invalidation named |
| an agent re-reading a file, re-running a search, or re-asking a question whose answer is already in an artifact | tokens are the meter, and a re-derivation buys the same answer at full price | a pointer in the state — path, line, artifact id — instead of a copy of the content |
| a spend with no ceiling and no meter: an agent run, a queue consumer, a poller, a nightly job | the default ceiling is infinity, chosen by the party that also wants to finish | a ceiling and the meter that reads it, written before the first unit (`budget-the-run` for a run) |
| per-unit logging, tracing, or metrics at row volume with no sampling and no retention bound | the observability bill is charged on ingest and again on every scan, and outlives the incident | sampled, one structured line per unit, retention stated |
| a fixed short poll interval where an event or a webhook exists | 1,000 clients polling every second is 86.4 M billed requests a day, nearly all returning nothing | event-driven, or the interval derived from a stated freshness requirement |
| a batch retried whole when one item fails, or a payload re-sent after an ambiguous timeout | the amplifier re-pays for every item, including the ones that succeeded | per-item retry with idempotency keys, plus a dead-letter path |

A rejection-list hit is `fix-before-merge` when a line clears it and `redesign` when the shape has to
move. It is never `priced`: a measured number does not clear a mechanism that multiplies it.

## The process

### Phase 0 — Decide whether there is a price at all

The zero tier. Four questions, answered from the diff or the run:

1. Does it run more than once per deploy — per request, per row, per event, per turn, per poll?
2. Is there a meter that charges for it — a per-call API, egress, billed compute, tokens, log ingest, a
   queue?
3. Does it repeat work already paid for — a retried unit, a re-read, a re-derived fact?
4. Does the spend grow with data, traffic, or turns rather than with deploys?

All four "no" → verdict `do-not-price`, with the reason and the file that decided it. Stop. That is a
complete review, not a skipped one. A one-shot backfill, a startup step, a CLI command, dev-only
tooling, a rename, and a docs change land here.

"Behind a rate limit" is not a fourth answer: rate × unit price is still a bill. It supports
`do-not-price` only when the product is small enough that nobody would act — and then the arithmetic
goes in the answer.

**Done when:** the four answers are written, each naming the file or hunk that decided it, and any
rate-limit exemption carries its rate × price arithmetic.

### Phase 1 — Name the unit, the meter, and the ceiling

The unit is what the user pays for — a request served, a document processed, a task completed — not
what the code emits. The meter is the exact place spend is read, with its period. The ceiling is the
most a unit may cost: revenue per unit × the margin the business allows, or the owner's cap ÷ expected
units. Take the margin floor and the no-revenue rule from
[references/cost-values.md](references/cost-values.md) §4, never from memory.

No meter is a finding, not a gap to fill with an estimate. An estimate in the meter slot is how a cost
review becomes fiction.

**Done when:** one sentence carries the unit, the meter with its period, and the ceiling with its
basis.

### Phase 2 — Count the amplifiers

Write every multiplier between one unit and paid events: attempts per retry layer × layers, rows per
page × calls per row, turns × re-reads, polls per day, rows per listing. Multiply them; the product is
what the rest of the review is about.

Two outcomes:

- **product ≈ 1 and bounded** → `do-not-price`, with the count as the reason. Finished answer.
- **product large or unbounded** → continue.

If a factor cannot be counted, that is the missing fact: get it from the call site, the pagination
default, the loop bound, or the run's state file before Phase 3. An assumed multiplier is how a bill
gets discovered by an invoice.

**Done when:** every amplifier has a count and the product is written — or the verdict is
`do-not-price` with the count that says so.

### Phase 3 — Read the number at the meter, or refuse to judge

Same workload and period before and after; real volumes, not ten rows; the meter's own unit; list
prices from the reference with their date. Compute cost per unit, then multiply by units per day — the
daily bill is what makes a per-unit number arguable to someone who signs it.

If the number cannot be obtained — no billing export, no usage counter, no token count — the verdict is
`price-first` with the exact measurement named: which meter, which period, which workload.

One exception, and it is narrow: a **structural finding** is admissible unmeasured when the amplifier
is unbounded by construction — an uncapped retry, a billed call per row over an unbounded page, a poll
with no freshness requirement. That is a claim about the multiplier, not a number. Say which of the two
you are making.

**Done when:** a number exists with meter, period and workload — or the verdict is `price-first` naming
the measurement — or the finding is structural with its multiplier shown and its unboundedness proved.

### Phase 4 — Price the fix as a shift, not a saving

Every fix moves cost somewhere: batching adds a larger failure unit, a cache adds memory and a
stampede at expiry, startup work adds boot time, a pointer can go stale, sampling adds blind spots, a
ceiling stops work that might have finished. Compare the shift with the ceiling, and with what the fix
costs to build.

A fix that halves the unit cost on a path already at a tenth of its ceiling is a net loss: it trades a
permanent liability for a number nobody needed.

**Done when:** the fix has a named shift and a named gain against the ceiling — or the verdict is
`do-not-price` because the ceiling is already met.

### Phase 5 — Emit the verdict and the artifact

One value from the enum below, then the block, every slot filled, no prose around it:

```
Verdict:     <one of the six>
Tier:        <pass | conditional | fix | redesign | refuse — mapped below>
Unit:        <the thing paid per> at <the workload>
Meter:       <where the spend is read>, <period>
Cost/unit:   <value at the meter> | unmeasured — <the measurement that decides it>
Amplifier:   <mechanism> × <count>, n = <bound or "unbounded">
Ceiling:     <the most a unit may cost, and its basis>
Next:        <the one action: the fix and its shift, the measurement, or nothing>
```

**Done when:** exactly one value from the enum below is chosen and every slot in the block is filled —
the unit, the meter, the number, the amplifier with its bound, the ceiling, and one action in `Next`.

## The verdict enum

| verdict | tier | means | must be accompanied by |
|---|---|---|---|
| `do-not-price` | `pass` | cold path: runs ≈ once per deploy, spend is zero by construction, or the whole product is bounded by an external limit and small enough that nobody would act | the count or limit that says so |
| `priced` | `pass` | a meter exists and cost per unit is under its ceiling | the number, the period, the workload |
| `price-first` | `conditional` | a unit exists and no number does | the meter, the period, the workload |
| `fix-before-merge` | `fix` | cost per unit misses the ceiling and one change closes it: a retry cap, a batch, a startup move, a pointer, a sample rate | the amplifier, the number, the fix, and its shift |
| `redesign` | `redesign` | the cost is shape — a billed call per row by design, an unbounded n, re-derivation as the plan — so no local line closes it | the shape, the multiplier, and what replaces it |
| `refuse` | `refuse` | the work cannot be afforded at any price the owner will pay: cost per unit above the value of a unit, or spend with no ceiling and no meter | the exposure, and what would make it affordable |

`do-not-price` and `priced` both end in no code change. Use `priced` when the question was "is this
affordable?"; use `do-not-price` when the question was "should we price this at all?". When both apply,
answer `do-not-price`, because it carries the refusal.

## Gotchas

- Retries multiply across layers, not within them. A 3-attempt client behind a 3-attempt gateway in
  front of a 3-attempt service is 27 billed requests per user action at the moment of an outage — and
  the outage is exactly when the bill spikes. Read every layer's config, including the SDK default:
  most HTTP clients retry twice without being asked.
- "One extra call per row" is a ratio, not a count. Against a baseline of one billed round trip per
  unit, the second doubles the bill; at 200 rows a page it is 201×.
- The per-unit charge that hides is the trivial one alone: a client constructed per call, a config
  re-parsed per request, a model reloaded per message. 2 ms of billed compute at 5,000 rps is ten
  CPU-seconds per second, paid for input that changed at the last deploy.
- A rate limit bounds the rate, not the unit price. 10 requests a second at $0.001 is $864 a day; the
  quota was never the ceiling.
- Egress is billed per direction and per hop. Cross-AZ traffic is charged each way and internet egress
  by the GB, so a chatty mesh is a line item no latency measurement shows.
- A retry without jitter synchronizes the fleet: every client backs off to the same instant, the
  recovery peak exceeds the original load, and capacity is then sized — and billed — for that peak.
- Billing granularity rounds up. Know the meter's step — per invocation, per 100 ms, per GB, per 1,000
  requests — because a unit 20% over a step is billed as the next one.
- Log and metric volume is billed on ingest and again on scan. A debug line per row is a bill with a
  query attached, and retention outlives the incident.
- A cache pays for itself only when measured: memory, invalidation, and the stampede at expiry are
  charged to the same unit. An unknown hit rate is a guess with a monthly bill.
- On the agentic side the meter is tokens, and the dearest ones re-establish what a compaction dropped.
  A conclusion carried without a pointer is a re-derivation scheduled for the next turn; a subagent
  handed a file to summarise bills that file twice. And an agent's unit is the completed task, not the
  turn: forty cheap turns that finish nothing have spend with no units.

## Rationalizations

| Excuse | Reality |
|---|---|
| "It's only one extra call per row" | Against one billed round trip per unit it is n+1 calls. Name n and the page size. |
| "Retries are resilience" | Resilience with a multiplier. Cap the attempts, budget the share of traffic, jitter the backoff. |
| "Tokens are cheap" | Per token, yes. Per completed task, times turns, times workers, times re-reads — that is the meter. |
| "The bill will tell us" | The bill arrives after the month; the code ships before it. Price the amplifier at review time. |
| "The cache will pay for itself" | Name the hit rate, the invalidation rule, and the stampede cost, or it is a guess with a memory bill. |
| "I'll just re-read the file" | A re-read is a paid act that buys the same answer. Write the pointer instead. |
| "It's behind a rate limit, so it's bounded" | A rate limit bounds the rate. Multiply it by the unit price before calling anything cold. |
| "We'll optimise when it's slow" | Cost is not latency: a fast path still bills per row. This lens is not waiting for a pager. |
| "It only runs once" | Once per deploy, once per customer, or once ever? Two of those are bills. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Chatty", "heavy", "a bit wasteful", "hammering the API" are cost claims; price them. |

## Red flags

- You are recommending a fix and no meter has been named.
- Your finding is an adjective ("expensive", "chatty", "bloated") and there is no number.
- You counted the loops and not the retries multiplying them.
- You are pricing a path that runs once per deploy.
- You are about to re-read a file you could point at.
- You are proposing a cache, a batch, or a ceiling without naming what it shifts.
- You are comparing a per-unit number against a monthly total without the unit count.
- You are optimising the unit price while the amplifier doubles the units.
- You are writing a cost review of code no meter reaches.
- You are quoting a latency number to justify a cost finding, or the reverse.

## Limitations

- Cannot read the bill. Without a meter — a billing export, a usage counter, a token count — the verdict
  stays `price-first`, and this lens will not invent a number to look decisive.
- Prices are dated. The list prices in `references/cost-values.md` are order-of-magnitude defaults
  consulted on the date shown; a contract discount, a committed-use rate, or a vendor change supersedes
  them.
- Attribution is approximate across shared infrastructure. A per-tenant cost inside a shared cluster is
  a cost-sharing rule, not a measurement, and this lens cannot make it one.
- Prices the unit, not the purchase — whether the unit should be produced at all is `make-the-call`.
  Agent spend is visible only when the harness reports it: a session's token count can be unknown until
  the run ends, and a killed run may never report.

## Reference docs

Read [references/cost-values.md](references/cost-values.md) before writing a verdict, and take the retry
caps, round-trip limits, billing granularities, list prices and margin floor from it — never from
memory.

Read [references/amplifiers.md](references/amplifiers.md) when the finding lands on a surface you have
not priced before: per surface, the multiplier, the meter, the count to ask for, and the one-line fix.
