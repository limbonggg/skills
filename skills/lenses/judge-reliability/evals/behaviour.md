# Behaviour eval — judge-reliability

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, in the form it usually takes. Replace each with the observed transcript the first
time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The happy-path review

**Setup.** A PR adds a call to a payments SDK inside a request handler, wrapped in `try/except` that
logs the exception and re-raises. The SDK is initialised with its default configuration. The user asks
"can you review this before we merge?".

**Baseline (hypothesis — unverified).** The model replies "This looks good. Error handling is in place
and the exception is logged for debugging. One suggestion: consider adding a retry for transient
failures." No deadline, no terminal state, no statement of what the caller receives.

**Required.** The model names the missing deadline at the SDK call (the library default is not a
deadline), writes the four-line contract — deadline inside the 30 s request budget, retry only on the
transient class with attempts and jitter from the values table, the status the caller gets when the
budget is spent, and the idempotency key the mutation needs before any retry is allowed — and emits
`fix-before-merge` with a finding at the call line. The proposed retry is conditional on the key, not
offered as hardening.

**Observable.** The output contains a `Deadlines:` slot with a number and its enforcement point, a
`Retries:` slot that names the error classes, and a findings row at the SDK call line. A review that
recommends a retry without a key is a failure of this case.

### 2. The retry that duplicates the charge

**Setup.** A PR wraps a `POST /charges` call in a three-attempt retry with exponential backoff. The
request body carries no idempotency key, and the payments provider supports one.

**Baseline (hypothesis — unverified).** The model approves the retry: "Good practice — exponential
backoff handles transient failures and the retries make the charge more reliable."

**Required.** The model identifies the retried non-idempotent mutation as a rejection-list hit, states
the caller-visible cost as a concrete artifact ("a customer charged twice, refunded by a human a week
later"), and requires the key — derived from the order id, sent to the provider, checked before the
effect — before any retry is allowed. Verdict `refuse` if the retry ships unkeyed; `fix-before-merge`
if adding the key is a line inside this diff.

**Observable.** The verdict is not `holds`, the finding is at the retry wrapper, and the `Idempotency:`
slot names the key's source and check point.

### 3. The swallow that looks like an empty result

**Setup.** A PR adds a search call to a recommendation widget: on exception, it returns `[]` and logs a
warning. The widget renders "no recommendations".

**Baseline (hypothesis — unverified).** The model says "Graceful degradation — the page still renders
when search is down. Nice touch."

**Required.** The model classifies this as silent-wrong: an outage is indistinguishable from a genuine
empty result, so nobody is paged and the metric reports success. The required fix is one of the two
legal shapes — propagate to a handler that returns a labelled degraded result (with the staleness or
partial flag the caller sees), or keep the empty result and add a counter plus an alert on the
dependency's failure rate. `fix-before-merge`, with the counter named.

**Observable.** The `Failure map:` row for the search call names "silent: empty list" as the
caller-visible outcome today, and the `Signals:` slot carries a metric name and a threshold rather than
"logs".

### 4. The zero tier, held

**Setup.** A PR adds `scripts/backfill_orders.py`, run by hand by the author, printing progress to the
terminal, exiting non-zero on failure, re-runnable from the start against a verified backup.

**Baseline (hypothesis — unverified).** The model produces a reliability checklist anyway — add a
retry, add a timeout, add a dead-letter path, add metrics — on a script that has no caller, no queue,
and no schedule.

**Required.** The model answers the four Phase-0 questions no, emits `no-failure-contract` with tier
`pass`, names where the failure surfaces (the traceback and the exit code), names why re-running is
safe (idempotent by construction against the backup), and stops. `Refused:` records what it would not
add and why.

**Observable.** The verdict is `no-failure-contract`, there is no findings table, and no speculative
hardening advice appears. A follow-up turn that puts the same script on cron must produce the opposite
verdict.

### 5. The webhook that fires twice

**Setup.** A PR adds a webhook receiver that writes an event row and sends a confirmation email. The
provider documents at-least-once delivery with retries for up to 24 hours. The handler generates a
`uuid4()` per request and stores it as the dedupe key.

**Baseline (hypothesis — unverified).** The model notes "there's a dedupe key, so duplicates are
handled" and approves.

**Required.** The model observes that a key generated per delivery deduplicates nothing — each retry
carries a new value — and requires the provider's event id (or a hash of the signed payload) as the
key, checked before the email is sent, with the stored response replayed on a repeat. Verdict
`fix-before-merge`; the email side effect is named, not just the row.

**Observable.** The finding points at the key generation line and the `Idempotency:` slot names the
provider event id and the check point, not "uuid4 in the handler".
