# Behaviour eval — judge-cost

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, in the form it usually takes. Replace each with the observed transcript the first
time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The retry storm praised as resilience

**Setup.** A PR wraps an outbound payment call in `for attempt in range(5)` with a fixed 200 ms sleep,
inside a service whose HTTP client already retries twice by default. The user asks "is this OK to
merge?".

**Baseline (hypothesis — unverified).** The model replies "Retries are good for transient failures.
Consider adding exponential backoff and a cap." No number, no meter, no verdict, and no mention that
the client already retries.

**Required.** The model names the unit (one payment attempt by a user), the meter (the per-call price),
and the amplifier as a product: 5 attempts × the client's 3 = 15 billed requests per user action,
multiplied again by the outage's failure rate. It states the fix — one retry layer, ≤ 3 attempts,
exponential backoff with full jitter, idempotency key on the mutation — and the verdict
`fix-before-merge` with the shift named (retries now bounded, so some transient failures surface as
errors instead of silently re-billing).

**Observable.** The output carries the multiplied count and the per-call price, and the verdict is
`fix-before-merge`. The output does not argue from latency, round-trip counts as speed, or any
`judge-performance` term.

### 2. The cold path priced anyway

**Setup.** A PR adds a one-shot migration script that re-encodes 4,000 stored documents at $0.002 per
document. The user asks "cost review before I run this?".

**Baseline (hypothesis — unverified).** The model produces a cost table, proposes batching, and
suggests a cheaper encoder tier — work on a script that runs once, ever.

**Required.** The model runs the four Phase-0 questions, answers "runs once per deploy at most" and
"no repeat of work already paid for", and returns `do-not-price` with the one arithmetic line that
matters: $8 once, against a migration that cannot be re-run cheaply. No fix, no cache, no batching
advice.

**Observable.** The verdict is `do-not-price`, the frequency is stated, and the output contains no
optimisation proposal. A single total-cost line is present and no cost-per-unit framing is invented.

### 3. The agent that re-derives what the state already says

**Setup.** An unattended run's state file lists the four files already read and the decision they
settled. On the next iteration the agent re-reads all four files, re-runs the failing test, and
re-summarises the spec. The user asks "why did this run cost $6 for one small fix?".

**Baseline (hypothesis — unverified).** The model answers that the task was complex and that long
context is inherently costly, then suggests using a cheaper model.

**Required.** The model names the meter (tokens in), the amplifier (four re-reads per iteration ×
iterations), and the fix as a pointer discipline: the state carries `path:line` and the decision, so a
re-derivation is replaced by a lookup. Verdict `fix-before-merge` if the state file already has the
slots, `redesign` if the loop's contract has no place to carry them. The cheaper-model suggestion is
either dropped or priced as a shift, not offered as the fix.

**Observable.** The output names the re-read count per iteration and the tokens-per-completed-task
figure, and the proposed change is to the state's carry-forward slots rather than to the model choice.

### 4. The rate limit mistaken for a ceiling

**Setup.** A PR adds a poller that calls a partner API every second per connected tenant, with 1,000
tenants, and the PR description says "we're well under their 10 rps limit".

**Baseline (hypothesis — unverified).** The model accepts the framing: "Since you're under the rate
limit, this is fine. Consider caching the response."

**Required.** The model multiplies: 1,000 clients × 86,400 polls per day = 86.4 M billed requests a
day, and at the reference's per-request price that is a five-figure monthly line. The rate limit bounds
the rate, not the bill. It names the freshness requirement that would justify a poll at all, proposes
the event or webhook path, and returns `redesign` when the poll is the integration's only mechanism —
`fix-before-merge` only if a stated interval bound fixes it.

**Observable.** The output contains the 86.4 M/day arithmetic and the monthly figure, the verdict is not
`priced` or `do-not-price`, and the rate limit is described as a rate bound rather than a cost bound.

### 5. The N+1 handed to the wrong lens

**Setup.** The user says "the invoice list is an N+1 and it's slow — review it". The calls are to the
local database; nothing in the path bills per query.

**Baseline (hypothesis — unverified).** The model loads the cost framing, produces a "cost per request"
verdict for a path with no meter, and invents a monthly figure from a database price it half-remembers.

**Required.** The model routes: an N+1 measured in milliseconds with no meter is `judge-performance`'s
finding, and it says so in one line. It prices the change only if a billed surface is in the path — a
per-query managed service, cross-AZ traffic, a billed read unit — and names that meter before any
number. With no meter, the verdict here is `do-not-price` and the pointer goes to
`judge-performance`.

**Observable.** The output either routes with no cost verdict, or names a meter and prices it. It never
reports a cost verdict whose only evidence is latency.
