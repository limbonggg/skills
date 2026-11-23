---
name: judge-performance
description: Use when the words are "slow", "janky", "laggy", "hangs", "hot path", "p99", "memory keeps growing", "add a cache", "we should optimise this", "it's O(n²)", or when a review touches code that runs per request, per row, or per frame. Not for whether the feature is worth building (use make-the-call) or for blast radius and trust boundaries (use judge-risk).
domain: lenses
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: optimisation-list-without-a-budget
  eval: evals/
---

# Judge Performance

A performance review is one comparison — a measured number against a named budget. This lens makes the
agent name the budget first, find the number second, and reach a verdict third, with "do not optimise
this" as a finished answer.

```
NO OPTIMISATION WITHOUT A NAMED BUDGET AND A MEASURED NUMBER THAT MISSES IT.
```

## When to use / when not to use

Use when:

- the user says "slow", "janky", "laggy", "hangs", "takes forever", "p99", "memory keeps growing",
  "it's O(n²)", "add a cache", "we should optimise this", "make it faster"
- a change touches code that runs per request, per row, per frame, per keystroke, or per event
- someone proposes a cache, an index, a pool, a thread, a denormalised column, or a native extension
  "for performance"
- a review needs to know whether a number is acceptable, or whether a number got worse
- a load, a frame budget, or an SLA is in the conversation and nobody has stated the number

Not when:

- the question is whether the work is worth doing — that is `make-the-call`, and this lens supplies the
  budget it prices
- the code is shaped badly and nothing is slow — that is `judge-architecture`; this lens judges a
  number against a budget, not where the seams belong
- the failure mode is a trust boundary, an injection surface, or a secret — that is `judge-risk`
- the claim is "it works" rather than "it is fast enough" — that is `prove-it`
- the code is slow *and wrong* — correctness first; a fast wrong answer is this lens's blind spot

| if the situation is | use |
|---|---|
| "it's slow" with no number anywhere | this lens, Phase 3, then the verdict |
| a proposed optimisation with no budget at risk | this lens → `do-not-optimise` |
| a budget exists and the question is whether to spend a week on it | `make-the-call`, with this lens's budget as input |
| a benchmark that has to be run nightly in CI | orchestration, not judgement |
| the module is hard to change but fast | `judge-architecture` |

## The vocabulary

Seven terms. The verdict uses these words; the avoided ones are where the reasoning leaks back into
opinion.

| term | means | _avoid_ |
|---|---|---|
| **budget** | the number this path must meet, in the unit the user feels: ms per frame, p99 ms, queries per request, bytes retained | "fast", "performant", "efficient" |
| **hot path** | code whose execution count is multiplied by requests, frames, rows, or events — with that count named | "bottleneck" (an unmeasured claim), "critical code" |
| **tail** | the p99 or p999, which is what a user experiences as a stall | "average", "typical latency" |
| **allocation** | an allocation or a copy on the hot path; its cost is paid at collection, on another request's clock | "memory usage" (a level, not an event) |
| **measurement** | a number from the real workload, with unit, percentile, and conditions | "benchmark" for one run, "test" for a number |
| **regression** | a delta against a baseline on the same workload and conditions | "slower" (an unmeasured comparison) |
| **headroom** | budget ÷ measured — how far the number can grow before it matters | "it's fine", "plenty of room" |

## The rejection list

A lens is its dislikes. These are refused on sight:

| rejected | why | instead |
|---|---|---|
| "this is slow" with no number | it is a hypothesis wearing a conclusion | name the budget, then measure |
| a micro-benchmark presented as system evidence | the isolated function is warmed, cached and compiled in a way the request path is not | measure the workload, or say the claim is per-call only |
| an average where the budget is a tail | the mean hides the queue, the collection pause, and the lock | quote the p99 and the count of requests above budget |
| "just add a cache" with no hit rate | a cache is a correctness bug with a memory cost, waiting to be written | name the hit rate and the invalidation rule, or drop it |
| concurrency as a speed fix on a saturated path | it converts latency into queueing, contention, and a new bug class | remove the work before adding a thread |
| a performance note on code that runs once | a 40 ms saving at boot is noise, and it is review budget spent for nothing | `do-not-optimise` |
| "premature optimisation" as a refusal | the sentence has a second clause, and it covers the measured 3% | quote the whole thing or none of it |
| a fix named before the hot path is located | the profile moves; the guess stays in the code as complexity | locate, then fix |

## The process

### Phase 1 — Name the budget

A budget has four parts: the metric, the threshold, the unit, and the workload it holds at. Read
[references/performance-values.md](references/performance-values.md) before naming one, and take every
number from it rather than from memory.

If nobody can supply a budget, derive it from the user-visible constraint — the frame rate, the SLA,
the hardware the customer owns, the deadline the job must finish in — or state that the requirement is
undefined. An undefined requirement is not permission to optimise; it is the finding.

**Done when:** one sentence carries all four parts — "p99 checkout latency ≤ 300 ms at 500 rps",
"16.7 ms per frame on a 2020 mid-tier Android", "≤ 2 queries per request", "the export finishes in
10 minutes for 1 M rows".

### Phase 2 — Place the code on the path

Frequency × n. Name how often the code runs and what multiplies it: once per request, once per row
returned (n = page size — bounded or not?), once per frame, once per keystroke, once at boot.

Two outcomes:

- **frequency ≈ 1 and n is bounded** → stop. The verdict is `do-not-optimise`, with the frequency as
  the reason. That is the zero tier and it is a finished answer, not a deferral.
- **frequency × n is large** → the path is hot; continue.

If you cannot state the frequency, you have found the missing fact. Get it from the call site, the
route, or the render loop before Phase 3 — an assumed frequency is how cold code gets optimised.

**Done when:** the path has a frequency and an n, or the verdict is `do-not-optimise` with the
frequency stated.

### Phase 3 — Get the number, or refuse to judge

Measurement rules: the same workload before and after; real input sizes, not ten rows; the percentile
the budget is stated in; production-like hardware, or the difference stated; a release build, without a
debugger and without logging added for the occasion. On a shared machine, interleave A/B in one run and
report the variance — a 10% delta on a CI runner is noise.

If the number cannot be obtained — no profiler, no staging environment, no reproducible workload — the
verdict is `measure-first` with the exact measurement named. A code verdict on an unmeasured claim is
the failure this lens exists to stop. When the cause is not visible in the diff, §6 of the reference
decides whether a profiler run is mandatory or merely useful.

One exception, and it is narrow: an **asymptotic finding** is admissible without a profiler when the
cost grows with an unbounded n. "This is O(n²) in the items per request, and the page size is
unbounded" is a claim about the shape of the curve, not a number. Say which of the two you are making.

**Done when:** a number exists with unit, percentile and workload — or the verdict is `measure-first`
naming the measurement — or the finding is asymptotic with its n named and its unboundedness shown.

### Phase 4 — Price the fix

Price it in surfaces, not hours: new state (cache, index, buffer pool), new concurrency, a new
dependency, an unsafe or native boundary, lost readability, and the correctness bug the optimisation
invites. Then compare against headroom.

A fix that buys 15% on a path with 4× headroom is a net loss: it trades a permanent liability for a
number nobody needed.

**Done when:** the fix has a named surface cost and a named headroom gain, or the verdict is
`do-not-optimise` because the headroom already exceeds the budget.

### Phase 5 — Emit the verdict

Assign exactly one value from the enum below, then fill the six-line block. The thresholds that pick
the verdict are in [references/performance-values.md](references/performance-values.md) §5 — read them
before choosing, not after.

**Done when:** exactly one value from the enum is chosen, all six slots in the block are filled, and
`Next` names one action — the fix and its surface cost, the measurement, or nothing.

## The verdict

| verdict | tier | predicate | must be accompanied by |
|---|---|---|---|
| `do-not-optimise` | `pass` | no budget is at risk — the path runs ≈ once, headroom ≥ 2×, or the fix costs more surface than the headroom buys — and any optimisation in front of you should be dropped or not started | the frequency or the headroom that says so |
| `ship` | `pass` | a budget is at risk and the measured number meets it | the number, its percentile, and the workload |
| `measure-first` | `conditional` | a budget is named and no number exists | the exact measurement: tool, workload, percentile, threshold |
| `fix-before-merge` | `fix` | the number misses the budget, the fix touches one function, and it adds no new state | the number, the budget, the fix, its surface cost |
| `redesign` | `redesign` | the number misses the budget and the cause is shape — per-item allocation, N+1, O(n²) with unbounded n, a copy per frame — so no local change closes it | the shape, the n, and the change the path needs |

`do-not-optimise` and `ship` both end in no code change. Use `ship` when the question was "is this
acceptable?"; use `do-not-optimise` when the question was "should we optimise this?". When both apply,
answer `do-not-optimise`, because it carries the refusal.

```
Verdict:   <one of the five>
Tier:      <pass | conditional | fix | redesign | refuse — mapped in the table above>
Budget:    <metric> <threshold> <unit> at <workload>
Number:    <value> <percentile> on <workload> | unmeasured — <the measurement that decides it>
Hot path:  <file:line or function> × <frequency>, n = <bound or "unbounded">
Next:      <the one action: the fix and its surface cost, the measurement, or nothing>
```

## Gotchas

- **The average hides the stall.** p50 of 2 ms with p99 of 900 ms is a system that queues; the mean
  reports neither number. Budget user-facing latency at p99 and count the requests above budget — a p99
  inside budget with 5% of requests over it is a different system from one with 0.1%.
- **A per-request allocation is paid at collection, on another request's clock.** That is why
  allocation appears in the tail and not the mean, and why "a small object is cheap" is true per call
  and false per request.
- **A micro-benchmark warms what production never warms.** A loop over the same thousand items hits a
  hot cache and a compiled branch; the request path pays the cold start, the first-touch page fault,
  and the allocator's slow path. A benchmark of a function is evidence about that function under
  benchmark conditions.
- **The N+1 is invisible in application code.** 200 rows × one lazy-loaded query is 200 round trips; at
  0.5 ms each that is 100 ms before any business logic. The cost lives in the ORM's default, not in the
  loop you are reading.
- **Logging and string formatting are usually the hot loop.** `log.debug("row " + row.id)` builds a
  string per row whether or not the level is enabled. The line reads like a diagnostic; the profile
  reads it as the work.
- **A profiler run under instrumentation measures the instrumentation.** A tracing profiler adds
  per-call cost and relocates the hot spot to itself; a debug build and a debugger change the
  optimiser's decisions. Profile a release build with a sampling profiler, and treat the top frames as
  hypotheses — the leaf is where the work is, the parent is where the wait is attributed.
- **The cache is a correctness bug you have not written yet.** An unknown hit rate makes the cache a
  guess plus an invalidation surface plus memory. Below a measured ~80% hit rate with a stated
  invalidation rule, it is a liability bought to avoid a measurement.
- **Optimising the constant on a quadratic path buys a month at most.** A 2× allocator win is erased the
  next time n doubles. Fix the shape first; on an unbounded n the constant is a rounding error.

## Rationalizations

| Excuse | Reality |
|---|---|
| "It's obviously O(n²) — fix it now" | Name n and the budget. At n = 50 the quadratic is 2,500 operations, which is nothing. |
| "A cache will help here" | A cache is a correctness liability. Name the hit rate and the invalidation rule, or drop it. |
| "The benchmark shows it's 3× faster" | On which workload, at which percentile, on which machine — and which number misses the budget? |
| "We can optimise later" | Later is honest only with a tripwire: the number that triggers the work. Without one, later is a rewrite. |
| "Users won't notice 50 ms" | 50 ms is three frames at 60 Hz, and a click response past 100 ms stops feeling instant. Name the unit. |
| "It's just one small allocation per row" | It is one collection event per row, charged to whichever request is running when it happens. |
| "The profiler says this function is hot" | A profile says where time is attributed, not why. The hot function is often the victim — the serialiser, the allocator, the syscall. |
| "Premature optimisation is the root of all evil" | That sentence ends "…yet we should not pass up our opportunities in that critical 3%". The 3% is found by measurement, not by refusing to look. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Make it snappier", "reduce the overhead", "this feels heavy" are performance claims; budget them. |

## Red flags

- You are writing the fix and you have not written the budget.
- You are quoting an average where the budget is a tail.
- You are calling a function hot because it looks expensive.
- You are adding a cache, a pool, a thread, or a denormalised column to avoid measuring.
- You are comparing two numbers from different workloads, machines, or builds.
- You are reviewing performance on code that runs once.
- You are citing the first half of the Knuth sentence.
- You are about to say "faster" without a unit.

## Limitations

- Cannot measure without access. No profiler, no staging environment, or a workload you cannot
  reproduce means the verdict stays `measure-first`; this lens will not manufacture a number to look
  decisive.
- A measurement is only as good as its workload. A synthetic input distribution is a claim about
  production; the number inherits that claim and this lens cannot validate it.
- Single-process view. Queueing across services, connection-pool exhaustion, autoscaling lag and
  capacity sit outside it — a path can pass here while the fleet falls over.
- Absolute numbers do not transfer between machines; budgets do. The values in the reference are
  defaults from browser and web-performance guidance, not laws about your hardware.
- Cannot make the budget right. If the requirement is wrong — 200 ms where users tolerate 500 — the
  lens enforces the wrong number faithfully. Who owns the budget is outside it.
- Prices the fix's surfaces, not its schedule. Whether a redesign is affordable this quarter is
  `make-the-call`.
