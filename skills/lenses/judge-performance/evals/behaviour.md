# Behaviour eval — judge-performance

Each case records the **baseline** (what a competent model does without the lens), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, in the form it usually takes. Replace each with the observed transcript the first
time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The optimisation list

**Setup.** A 300-line request handler with a `for` loop that spreads a sub-object per row, a
`JSON.parse(JSON.stringify(x))` for a copy, and three sequential `await`s. The user says "this endpoint
is slow, can you make it faster?"

**Baseline (hypothesis — unverified).** The model produces six bullet optimisations — hoist the spread,
use `structuredClone`, `Promise.all` the awaits, add a `Map` cache — with no budget, no workload, and
no number. It closes with "these should give a solid speedup."

**Required.** A budget ("p99 ≤ 300 ms at the production rate"), the frequency × n for the loop, and
then either a measured number or `measure-first` naming the measurement (tool, workload, percentile,
threshold). If a number exists and misses, the verdict is `redesign` when the cause is the per-row copy
at unbounded n, `fix-before-merge` when it is one function with no new state. The `Promise.all`
suggestion is not offered without knowing whether the awaits are independent and whether the downstream
saturates — concurrency as a speed fix is on the rejection list.

**Observable.** The reply contains the six-line block with a filled `Budget` line. No optimisation is
named before the budget. Each fix carries a surface cost and a headroom gain, or the verdict is
`measure-first`.

### 2. The unmeasured claim

**Setup.** A reviewer comments on a PR: "this will be slow, the loop is O(n²)". The PR is a 40-line
change in a function called once per request; the loop iterates over the user's selected tags, which
the schema caps at 20.

**Baseline (hypothesis — unverified).** The model agrees, calls it a performance issue, and asks for
the loop to be rewritten with a `Set`.

**Required.** n is 20 and bounded by the schema; 400 operations per request is not a budget risk. The
verdict is `do-not-optimise`, with the frequency and the bound as the reason — and a note that if the
cap is ever lifted, the number that triggers the work is the cap.

**Observable.** The verdict is `do-not-optimise`, the `Hot path` line reads "× 1 per request, n = 20
(schema cap)", and no code change is requested.

### 3. The speculative cache

**Setup.** A service adds an in-process cache for tenant configuration. The user asks whether the
cache is a good idea "for performance". Nobody has measured the lookup.

**Baseline (hypothesis — unverified).** The model endorses the cache, suggests a TTL, and mentions
Redis as a next step.

**Required.** The lookup is a single indexed read; the budget (p99 of the request) has headroom. The
cache is a new invalidation surface with an unknown hit rate. Verdict: `do-not-optimise` — or, if the
read genuinely dominates the budget, `fix-before-merge` gated on a measured hit rate of 80%+ and a
stated invalidation rule.

**Observable.** The reply names the hit rate and the invalidation rule as preconditions, or refuses the
cache. It never recommends a cache whose hit rate nobody has measured.

### 4. The average that hides the stall

**Setup.** A dashboard reports 45 ms mean latency and 1.2 s p99. The user asks "are we fast enough?"

**Baseline (hypothesis — unverified).** The model reads the mean against a 100 ms target and answers
yes, noting the p99 as "expected variance".

**Required.** The budget is a tail budget, so the mean is not the number. The p99 misses a 300 ms
budget; the finding is the shape of the distribution — a queue, a collection pause, a lock, or a cold
cache — and the verdict is `redesign` or `measure-first` depending on whether the cause is located.

**Observable.** The verdict quotes the p99, names the percentage of requests over budget, and does not
use the mean as evidence of health.

### 5. The Knuth refusal

**Setup.** A measured regression: p99 went from 180 ms to 620 ms after a change. The user quotes
"premature optimisation is the root of all evil" and asks to merge anyway.

**Baseline (hypothesis — unverified).** The model concedes, notes that optimisation can come later, and
approves.

**Required.** The regression is measured against a named budget, so it is not premature — it is the
critical 3%. The verdict is `fix-before-merge` or `redesign` with the number, and the quote is
completed rather than conceded.

**Observable.** The verdict is not `ship`, the `Number` line carries both the baseline and the new p99,
and the refusal is answered with the second half of the quote.

### 6. The micro-benchmark as proof

**Setup.** A PR swaps a library call for a hand-rolled implementation and attaches a benchmark:
"3.2× faster on 1,000 iterations in isolation".

**Baseline (hypothesis — unverified).** The model accepts the benchmark as evidence and approves.

**Required.** The benchmark is a per-call claim under benchmark conditions: warm cache, one input size,
no concurrent load, and it does not show which system number misses the budget. Verdict:
`measure-first` with the request-path measurement named — or `do-not-optimise` if the call is off the
hot path.

**Observable.** The `Number` line distinguishes the per-call benchmark from the system measurement, and
the verdict is not `ship` on the strength of the micro-benchmark alone.

### 7. The cold-path review note

**Setup.** A reviewer asks for a performance fix in the startup path: a config file parsed twice, once
at boot and once on reload.

**Baseline (hypothesis — unverified).** The model accepts the note as a legitimate finding and asks for
the parse to be cached.

**Required.** The path runs once at boot; a double parse of a small file is microseconds against a
budget nobody stated. Verdict `do-not-optimise`, with the frequency as the reason — the review budget
is better spent elsewhere.

**Observable.** The verdict is `do-not-optimise` and the reply says why the note is not a finding,
without inventing a budget to justify the work.
