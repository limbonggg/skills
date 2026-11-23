# Reliability values

Floors, not targets. A finding cites one of these numbers and the finding is arguable; a finding that
says "fragile" is not. Where the source column says **house**, the number is this repository's chosen
floor, not a standard — change it here and every skill that reads this table follows.

## Table of contents

1. Deadlines
2. Retry classes
3. Backoff and attempt budget
4. Idempotency
5. Queues and consumers
6. Signals
7. Failure classes by cost
8. Zero-tier triggers
9. Sources

## Deadlines

| hop | floor | source | what it decides |
|---|---|---|---|
| user-facing request, end to end | 30 s | house (matches the inbound limit in `judge-risk`) | a request path with no end-to-end deadline is a finding |
| one dependency call inside a request | ≤ 5 s, and ≤ half the caller's remaining budget when one retry is planned | AWS Builders' Library (timeout = budget ÷ attempts) | a 60 s SDK default inside a 30 s request is a finding |
| TCP connect | 1 s | AWS Builders' Library | a connect timeout above the budget means the request dies before the socket opens |
| DNS lookup | 2 s | house | resolver retries turn one lookup into 5 s+ and are invisible in the client config |
| SQL statement | 5 s interactive, 60 s batch, set as `statement_timeout` on the role or session | house | a query with no `statement_timeout` holds a connection, a lock and a pool slot |
| pool acquire | 2 s interactive | house (HikariCP defaults to 30 s) | the acquire wait is the real timeout, and it is usually the one nobody set |
| row lock wait | 2 s interactive, 5 s batch, set as `lock_timeout` | house | one queued `ACCESS EXCLUSIVE` parks every later query on the table |
| queue visibility | ≥ 6 × p99 handler duration | Amazon SQS docs + house (SQS requires at least the processing time; 6× is the floor here) | below p99 the same message is delivered twice while the first copy still runs |
| shutdown drain | ≤ 25 s | Kubernetes `terminationGracePeriodSeconds` default 30 | a drain longer than the grace is a kill mid-write |
| liveness probe | 1 s timeout, 10 s period, 3 failures | Kubernetes | a probe slower than its period is a flapping instance |
| readiness dependency probe | 2 s, short-circuited, never per request | house | a probe that fans out multiplies load during the outage it is meant to detect |

Propagation rules:

- Each hop's deadline is the remaining caller budget minus the backoff reserve. With one retry planned,
  the attempt timeout is at most half the remaining budget — otherwise the retry can never start.
- Carry the budget: gRPC deadline, `grpc-timeout` / `X-Request-Deadline`, a Go `context` deadline, an
  `AbortSignal` in JS. A number that is not propagated is a local guess.
- When the deadline passes, the server cancels the work (`context` cancellation, a query cancel) and
  stops before the write, not after it.
- The enforced deadline is the outermost one you control. Every inner one is a copy that must be
  smaller.

## Retry classes

| retry | class | why |
|---|---|---|
| yes | connection refused or reset before the request was sent, connect timeout, DNS failure | no effect happened |
| yes | 429, 500, 502, 503, 504; gRPC `UNAVAILABLE`, `DEADLINE_EXCEEDED`, `RESOURCE_EXHAUSTED` | transient by definition |
| yes, bounded at 3 loops | 409 on a compare-and-set, with a re-read each loop | only when the read-modify-write is retried, not the whole request |
| no | 400, 401, 403, 404, 405, 410, 422, 501 | deterministic: the next attempt fails identically |
| only with a key | any mutation whose effect may already have happened — a timeout on a POST, a partial write, an ambiguous 502 | the retry is a second effect |

## Backoff and attempt budget

- Attempts: 3 total (initial + 2) for idempotent reads, 2 total for idempotent writes, 1 for an unkeyed
  mutation.
- Backoff: base 200 ms, factor 2, **full jitter** — `sleep = random(0, min(cap, base × 2^attempt))`,
  cap 2 s per delay. Equal jitter and no jitter both re-synchronize a fleet.
- Total retry window: ≤ 10% of the caller's budget, hard ceiling 5 s on an interactive path.
- `Retry-After` wins over the computed delay, capped at the remaining budget. If it exceeds the budget,
  fail now with the terminal state instead of sleeping past the deadline.
- Retry quota (AWS SDK standard mode shape): a token bucket of 500 tokens, 5 per retry, refilled at
  5/s. An empty bucket stops retrying regardless of attempts remaining — this is what stops a retry
  storm during an outage.
- Exactly one layer retries. A retry above a retry above a retry multiplies the attempts; the inner
  layers must fail fast.

## Idempotency

- The key is derived from the request: the caller's request id, or `hash(caller_id, operation,
  payload)`. A key generated inside the attempt loop is a new key every attempt and deduplicates
  nothing.
- Retain the key with its stored response for ≥ 24 h (Stripe uses 24 h; the IETF `Idempotency-Key`
  draft leaves the window to the server but requires it documented and at least as long as the client's
  retry window).
- Replay semantics: same key and same payload → the stored status and body, not a second effect. Same
  key, different payload → 409 or 422. Never last-write-wins.
- Check the key in the same transaction as the effect, or through a unique index on the key, or through
  a guarded transition (`UPDATE ... WHERE status = 'pending'` returning 0 rows on replay).
- Absolute writes are idempotent; relative ones are not. `SET balance = 100` replays safely;
  `SET balance = balance - 10` twice is a double debit.
- A side effect outside the process — email, payment, SMS, webhook — is idempotent only if the provider
  takes the key (`Idempotency-Key`) or the write goes through an outbox with its own dedupe.

## Queues and consumers

- Ack or delete only after the effect commits. Before the commit, a crash loses the message.
- Max receives 3–5, then dead-letter. A deterministic error goes to the dead letter on the first
  failure; retrying it burns the queue's capacity.
- The dead letter has an owner and an alert, and retention ≥ 14 days (the SQS maximum) or the org's
  incident window. A dead-letter queue with neither is silent data loss.
- Bounded queue with a shed policy — 429 or 503 plus `Retry-After` — instead of unbounded growth.
  Queue depth and oldest-message age are the signals; average depth is not.
- Batch consumption does not make the handler idempotent: a partial batch failure redelivers the whole
  batch unless the handler tracks per-message completion.

## Signals

- Every operation emits a counter or histogram labelled `operation`, `dependency`, `outcome`
  (`ok | retry | terminal`), and the error class.
- Every terminal failure logs `correlation_id`, `operation`, `attempt`, `error_class`, `terminal=true`.
  The payload is not logged; secret redaction belongs to `judge-risk`.
- Alert on the user-visible symptom (error rate, saturation, latency) and on the terminal-failure rate.
  Never page on retries: they are the mechanism working.
- Burn-rate alerting (SRE Workbook, multi-window): page at 14.4× burn over 1 h — 2% of a 30-day error
  budget — and open a ticket at 6× over 6 h — 5% of the budget. A single static threshold is either
  noisy or too slow, and both failures end in a muted alert.
- A signal with no threshold and no owner is a dashboard, not a paging path.

## Failure classes by cost

| class | what the caller gets | cost | usual verdict |
|---|---|---|---|
| visible error, nothing written | a 4xx/5xx with a correlation id | one failed request | `fix-before-merge` if a line restores the contract |
| degraded, labelled | stale data within a stated staleness, or a partial result with a flag | a worse answer the caller can judge | `holds-with-conditions` |
| silent wrong | an empty list, a default, a success envelope over a failure | a confident wrong decision | `fix-before-merge` or `redesign` — the caller cannot compensate |
| duplicate effect | a second charge, email, row, or webhook | money or trust | `refuse` until the key exists |
| lost effect | a write reported as done that did not happen | data loss | `refuse` |

## Zero-tier triggers

| situation | zero tier? |
|---|---|
| a script a human runs by hand, watches, and can re-run; failure prints a traceback and exits non-zero | yes |
| a notebook cell, a REPL, a one-off migration with a verified backup and a human at the keyboard | yes |
| a CLI whose contract is its exit code and whose output is the terminal | yes |
| a local fixture, a test double, a seed script against a disposable database | yes |
| the same script on cron, feeding a dashboard, or writing a table someone else reads | no — the human is asleep |
| a request handler, a consumer, a webhook receiver, a scheduled job, a CLI another program calls | no |

## Sources

AWS Builders' Library — *Timeouts, retries, and backoff with jitter*; AWS Architecture Blog —
*Exponential Backoff and Jitter*; AWS SDK retry behaviour (standard mode: 3 attempts, retry quota);
Google SRE Book ch. 22 (cascading failures) and SRE Workbook ch. 5 (multi-window burn rate); RFC 9110
§9.2.2 (idempotent methods); IETF draft `Idempotency-Key` header; Amazon SQS visibility-timeout and
dead-letter-queue documentation; Kubernetes probe and pod-termination documentation; library defaults:
Python `requests` (no timeout), `axios` (`timeout: 0` = none), browser `fetch` (no request timeout), Go
`net/http` (zero `Timeout` = none), gRPC (no default deadline), JDBC `socketTimeout=0` (infinite),
HikariCP `connectionTimeout` 30 s. Consulted 2026-11. Where a standard and this table disagree, the
standard wins and this table is the bug.
