# Behaviour eval — trace-second-order

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

Every baseline below is a **written hypothesis, not yet captured from a live run** — it describes the
failure we expect, quoted in the form it usually takes. Replace each with the observed transcript the
first time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The threshold raise

**Setup.** p95 on `/search` has crossed 800 ms three nights running and pages on-call. The thread's
proposed fix is "raise the alert threshold to 900 ms and move on". The user asks "and then what?"

**Baseline (hypothesis — unverified).** "Raising the threshold to 900 ms will stop the noisy pages.
p95 is 850 ms, so 900 gives headroom, and we can revisit if it gets worse."

**Required.** The ledger names the incentive chain — on-call stops seeing 700–900 ms regressions and
the threshold becomes the de facto target — the misuse (the next regression is invisible until it
crosses 900), the 10x cost (each later raise is a one-line change nobody reviews), the foreclosure
(nobody will remember why 900), a dominant chain, and a `Watch` signal that is not the pager.

**Observable.** The reply contains an actor (on-call) and a mechanism (the signal was removed, not the
latency), plus a signal to watch, and does not end at "the pages stop".

### 2. The cache

**Setup.** "Add a Redis cache in front of the profile read; p95 is bad." The change is a copy of a
row, refreshed on a TTL, read by three services.

**Baseline (hypothesis — unverified).** "Add a cache with a 5-minute TTL and invalidate on write. That
cuts the read load and fixes p95."

**Required.** The ledger names the invalidation obligation as a permanent tax on every future writer,
a specific future code path that will forget it, the 10x bound (key cardinality or memory), the
foreclosure (stale reads become normal; debugging now includes cache state), and a dominant chain with
a signal. It may still recommend the cache — the skill does not decide — but the cost is priced.

**Observable.** The `Misuse` slot names a concrete future writer or path rather than "cache
invalidation is hard", and `Forecloses` names something a revert would not restore.

### 3. The second worker

**Setup.** "The worker polls every 5 s and is behind; run two workers to keep up." The job claims rows
with a plain `SELECT ... WHERE status = 'pending'` and no locking.

**Baseline (hypothesis — unverified).** "Run two instances of the worker; throughput doubles and the
backlog clears."

**Required.** The 10x lens identifies what binds first: the claim is not atomic, so two workers take
the same row and the failure mode changes from slow to duplicate side effects. The ledger names the
missing claim mechanism, a signal (duplicate downstream writes), and a dominant chain.

**Observable.** The reply names duplicate processing and the absent `SKIP LOCKED`/claim step, not
"more workers means more throughput".

### 4. The retry

**Setup.** "The payments call flakes; add retries." The call is a `POST` that charges a card, and the
HTTP client, the gateway, and the mobile app each already retry.

**Baseline (hypothesis — unverified).** "Add 3 retries with exponential backoff and a jitter; that
should smooth over the flakes."

**Required.** The ledger counts the layers and the multiplier, names the non-idempotent path (a
duplicate charge when the first attempt succeeded but the response was lost), names the correlated
failure (all retries fire while the dependency is already down), and gives the `Watch` signal as
request rate during dependency errors.

**Observable.** The reply states the amplification (layers × attempts) and names the duplicate-charge
path; it does not stop at "retries with backoff".

### 5. The zero tier

**Setup.** A private function is renamed from `getUser` to `fetchUser` inside one module. There is no
export, no serialized shape, and no configuration key.

**Baseline (hypothesis — unverified).** "This is low risk, though it could confuse new developers and
might break external consumers, so consider adding an alias for compatibility."

**Required.** Each lens says `none — checked <what>` (grep for the export, the config surface, the
serialized name), `Dominant: none`, and the ledger is short. Speculative chains are not invented to
fill slots.

**Observable.** The answer is a short ledger with `none — checked ...` lines and no invented risks;
`Watch` reads `none — no chain` rather than being left blank.

### 6. The queue

**Setup.** "Put a queue between the API and the email worker so the API returns immediately." The
queue is at-least-once.

**Baseline (hypothesis — unverified).** "A queue decouples the API from email sending, so the API
returns as soon as the message is enqueued."

**Required.** The trace goes two links past the intent: at-least-once delivery means duplicate emails
unless every send carries an idempotency key, and a DLQ means failures now need an owner. The ledger
names both with signals.

**Observable.** The reply names duplicate delivery and the idempotency requirement (plus the DLQ
owner), not only "decouples the API from the worker".
