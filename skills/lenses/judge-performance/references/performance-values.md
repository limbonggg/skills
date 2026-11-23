# Performance values

The numbers this lens judges against. Take them from here rather than from memory, and say when you
are overriding one: a budget derived from a customer's constraint beats a default.

## 1. Frame and interaction budgets

| surface | budget | why this number |
|---|---|---|
| 60 Hz frame | 16.7 ms total, ~10 ms for application code | compositing, input and collection need the rest of the frame |
| 120 Hz frame | 8.3 ms total, ~5 ms for application code | same split, half the time |
| long task on the main thread | under 50 ms | past this the browser cannot respond to input; it is the browser's own long-task threshold |
| tap → visible response | under 100 ms | RAIL's input budget; past ~100 ms a response stops feeling instant |
| keep the user's flow | under 1 s | Nielsen's threshold; past 10 s attention is lost |
| interaction to next paint | 200 ms or less | Core Web Vitals "good" |
| largest contentful paint | 2.5 s or less | Core Web Vitals "good" |
| dropped frame | zero frames over 2× budget | one 33 ms frame at 60 Hz is visible as a stutter |

## 2. Request and query budgets

| surface | budget | why this number |
|---|---|---|
| user-facing request, server time | p99 ≤ 200–300 ms | network and client rendering push the user past a second beyond this |
| internal call in one datacenter | p99 ≤ 10 ms | a same-zone round trip is ~0.5 ms; ten of them is the whole budget |
| cross-region round trip | 30–100 ms | speed of light plus routing; a chatty cross-region call is a design error, not a tuning problem |
| queries per request | ≤ 1 per entity touched | 200 lazy-loaded rows at 0.5 ms is 100 ms of pure round trips |
| background job | deadline ÷ items = items/s | 1 M rows in 10 minutes is 1,667 rows/s, measured at p99 of the batch |
| cold start (serverless) | counted inside the p99 | 1 s of init is 1 s added to every unlucky request's tail |

## 3. Memory and allocation budgets

| surface | budget | why this number |
|---|---|---|
| per-request allocation | zero on frame- or collection-sensitive paths | every allocation is a future collection, charged to a later request |
| per-item copy | none inside a loop over user data | a payload copy per row is O(n × size), not O(n) |
| cache hit rate | ≥ 80%, with the invalidation rule stated | below this the cache is memory plus a bug |
| list response payload | 100 KB comfortable, 1 MB slow on mobile | parse time and transfer both scale with it |
| retained memory per connection or session | bounded and stated | an unbounded map keyed by user id is a leak with a schedule |

## 4. Allocation rules

1. Allocation is cheap; collection is not. The cost lands on whichever request is running at
   collection time — it is a tail cost, and the mean will not show it.
2. No allocation inside a loop bounded by user data (rows, items, events, frames). Preallocate, reuse,
   or write into a buffer that already exists.
3. Copying is allocation: `slice`, `map`, `filter`, spread, `[...x]`, `structuredClone`, and string
   concatenation in a loop each produce one. Name the copy when you name the cost.
4. String formatting in a hot loop is the loop. Build the message once outside, or log a code and
   format at the sink.
5. Prefer bounded structures: a fixed ring buffer over an array that grows per event, a preallocated
   buffer over a builder that doubles.
6. Reuse only what you measure. A pool larger than the working set is a leak with extra steps.
7. The metric is allocation rate — allocations per operation, bytes per second — not heap size. Heap
   size is a consequence; an allocation profile or a collection log is the evidence.

## 5. Verdict thresholds

| condition | verdict |
|---|---|
| the path runs ≈ once, or no budget can be named for it | `do-not-optimise` |
| headroom ≥ 2× (budget ÷ measured) | `do-not-optimise`, with the tripwire number that would reopen it |
| 1× < headroom < 2× | `ship`, with the tripwire number |
| measured over budget; one function; no new state | `fix-before-merge` |
| measured over budget; cause is shape (per-item allocation, N+1, O(n²) with unbounded n, copy per frame) | `redesign` |
| a budget exists and no number does | `measure-first` |

A regression under 10% on a shared runner is not a measurement. Say "within noise" and give the
variance, or run it again interleaved.

## 6. When a profiler is mandatory

Mandatory when any of these holds:

- a measured number misses the budget and the cause is not visible in the diff
- the path consumes more than 10% of the budget
- the proposed fix adds state, concurrency, a dependency, or an unsafe or native boundary
- the budget is a tail and the mean is inside it
- the workload is data-dependent (n, payload size, cardinality) and you have not varied it

Not mandatory when:

- the finding is asymptotic and n is unbounded — say that you are reasoning from shape, not from a number
- the cost is a per-item copy over a bounded n, visible in the code
- the path runs once — the verdict is `do-not-optimise` without a number

How to run one:

- sampling over tracing: a tracing profiler adds per-call cost and moves the hot spot to itself
- release build, production-like input sizes, no debugger, no logging added for the occasion
- read the top five frames as hypotheses: the leaf is where the work is, the parent is where the wait
  is attributed
- vary n by 10× and read the curve, not the point — a flat line across a 10× input change is the only
  evidence that the shape is right
