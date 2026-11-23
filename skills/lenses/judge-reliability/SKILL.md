---
name: judge-reliability
description: Use when the question is what happens when something fails — "what does the user see if this is down", "add a timeout", "should we retry", "double charge", "nobody noticed for three days", "do we need a dead letter queue", "it's a batch script, does it matter". Not for why a failure happened (use weigh-evidence), how slow a path is (use judge-performance), what a change opens for an attacker (use judge-risk), or whether the fix works (use prove-it).
domain: lenses
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: happy-path-review
  eval: evals/
---

# Judge Reliability

A review read for correctness asks what the code does when everything answers. This lens asks what the
caller gets when each thing it depends on does not — the deadline, the bound, the terminal state, the
key, the signal that reaches a human — and replaces a review that is correct only while the network is.

```
NO RELIABILITY VERDICT WITHOUT THE FAILING OPERATION AND WHAT THE CALLER SEES WHEN IT FAILS.
```

## When to use / when not to use

Use when:

- the user says "what happens if this call fails?", "what does the user see if Redis is down?", "should
  we retry?", "add a timeout", "it hangs in prod", "double charge", "the job ran twice", "the webhook
  fired twice", "it failed silently", "nobody noticed for three days", "do we need a dead letter
  queue?", "should this be idempotent?", "the queue is backing up", "what's our timeout?"
- the diff adds or changes a boundary crossing: a call, a query, a cache, a queue publish or consume, a
  filesystem write, a scheduled job, a webhook receiver
- the diff adds a retry, a backoff, a circuit breaker, a fallback, a health check, a dead-letter path,
  or an error handler
- a new call lands in a path already retried, queued, or behind a load balancer — it inherits a
  failure contract it did not write
- someone justifies a shortcut with "the framework handles it", "it's idempotent", "we'll retry",
  "it's just a log line", "the queue guarantees delivery", "it's a batch script"

Not when:

- the question is whether the code works — that is `prove-it`
- the question is why a failure already happened — that is `weigh-evidence`; this lens reviews a
  contract, it does not run an incident
- the question is how fast or slow a path is, against a budget and a measurement — that is
  `judge-performance`. This lens takes over past the deadline: a call that never answers is a missing
  contract, not a slow one
- the question is what a failure lets an attacker reach, or whether a secret leaks into the error body
  — that is `judge-risk`
- the question is which retry library, queue product, or managed service to adopt, or what reliability
  is worth funding — that is `make-the-call`
- an unattended agent run died and you need where it got to — that is `stop-or-escalate`
- you are writing the incident summary or the on-call handoff — that is `report-with-evidence` or
  `write-handoff`

| if the situation is | use |
|---|---|
| "what does the client get when the payment API is down?" | this skill |
| "why did the payment API fail last night?" | `weigh-evidence` |
| "is this endpoint fast enough under load?" | `judge-performance` |
| "it hangs, and nobody knows where" | this skill: a hang is a missing deadline |
| "can an attacker use this failure?" | `judge-risk` |
| "should we build our own retry layer?" | `make-the-call` |
| "did the retry fix it?" | `prove-it` |
| "the run died, where was it?" | `stop-or-escalate` |
| "explain how the consumer works" | no lens: answer the question |

## The vocabulary

Seven terms. Use these words in the verdict; the avoided one on the right is where the finding
dissolves into advice.

| term | means here | _avoid_ |
|---|---|---|
| **operation** | one boundary crossing that can fail: a call, a query, a publish, a consume, a write, a lock wait | "request", "call" — they hide the query and the lock |
| **deadline** | the seconds after which this operation stops waiting, and where that number is enforced | "timeout" in prose — the deadline is the budget a timeout should inherit |
| **attempt budget** | total tries and elapsed time for one logical operation, shared by every layer that retries | "retries" — a per-layer count is the number that multiplies |
| **terminal state** | the observable outcome when the budget is spent: a status, a dead-letter row, a failed job with an owner | "error handling" |
| **idempotency key** | the value that makes a repeated mutation produce one effect, checked before the side effect | "dedupe", "unique constraint" — a constraint is one implementation |
| **caller-visible outcome** | what the client, the queue producer, or the on-call engineer actually receives | "the error" — an error nobody sees is not an outcome |
| **paging path** | a failure path whose signal reaches a human who must act, with the signal and threshold named | "monitoring" — logs exist and page no one |

## The rejection list — reject on sight

Each row is a finding, not a note. The right column is the only observable that clears it; if you
cannot point at it in the diff, the row stands.

| rejection | why | what clears it |
|---|---|---|
| an external call with no deadline — HTTP, SDK, DNS, pool acquire, lock wait, query | the caller waits as long as the dependency holds it; one stuck dependency becomes a total outage | a number at the call site, ≤ the caller's remaining budget, from [references/reliability-values.md](references/reliability-values.md) |
| a retry with no attempt budget, or retries in more than one layer of the same call | attempts multiply: three layers × three tries is 27 requests per user request, at a dependency already struggling | one layer retries, with max attempts and an elapsed cap written down |
| retry with no backoff, or backoff with no jitter | synchronized clients re-arrive together and knock over a dependency that was recovering | exponential backoff with full jitter, parameters from the values table |
| an automatic retry of a non-idempotent mutation with no key: POST, a charge, a send, a publish | the retry is a second effect — a duplicate charge, email, or row | a key derived from the request, checked before the side effect; or no automatic retry |
| retry on an error that cannot succeed — 400, 401, 403, 404, 409, 422 | the attempts burn the budget and delay the real answer | retry only the transient class in the values table |
| a catch-all that swallows: `except: pass`, `catch {}`, `return []`, `if err != nil { return nil }` | the failure becomes a legitimate-looking empty result and nothing downstream can tell | the error reaches a handler that can act, or becomes a named degraded result with its own signal |
| a failure reported as success: 200 with `{"ok": false}`, an empty list on a failed query, a default value | every caller and retry library treats it as done; the loss is silent and the metric says healthy | a failure status or typed error, and the envelope parsed at the boundary |
| a consumer that acks before the effect commits, or a visibility timeout below the handler's p99 | the message is lost on a crash, or delivered twice while the first copy still runs | ack after commit; visibility above p99; max receives then dead letter |
| a liveness probe that calls a dependency | one outage restarts every instance and turns degradation into an outage | liveness checks the process only; readiness may probe a dependency with a short deadline |
| a fallback that hides the failure: stale cache served as fresh, a default on error, an empty page | the caller cannot tell wrong from right, so the wrong answer is trusted | degradation named, labelled on the metric, bounded by a staleness maximum |
| a failure path with no signal on it | the incident is found by a customer, and the postmortem's first line is "we had no alert" | a metric with an outcome label and an alert with a threshold, on the user-visible symptom |

A hit is `fix-before-merge` when a line fixes it, `redesign` when the contract sits in the wrong place
— a retry in the request path, a lying fallback, an ack before commit. Never `holds-with-conditions`: a
condition gates a deploy; it does not add a deadline.

## The verdicts

One enum, chosen once per review. `no-failure-contract` is the zero tier and a finished answer.

| verdict | tier | means | use when |
|---|---|---|---|
| `no-failure-contract` | `pass` | nothing here needs one | all four Phase-0 questions are no, and where the failure surfaces to the human is named |
| `holds` | `pass` | every operation has a deadline, a bounded retry, an owner, and a caller-visible outcome | findings are absent, not deferred |
| `holds-with-conditions` | `conditional` | acceptable only while named conditions hold: a gateway timeout, a runbook, a dependency SLO | each condition is observable after deploy and owned |
| `fix-before-merge` | `fix` | the shape is right and a line is missing or wrong | every finding has a one-line fix inside this diff |
| `redesign` | `redesign` | the contract is in the wrong place | retry in the request path, a lying fallback, sync where a queue belongs, ack before commit |
| `refuse` | `refuse` | the operation must not ship | unkeyed retried mutation, failure as success, no terminal state possible, unbounded growth |

The artifact, eight slots, no prose around it:

```
Verdict:      no-failure-contract | holds | holds-with-conditions | fix-before-merge | redesign | refuse
Tier:         <pass | conditional | fix | redesign | refuse — mapped in the table above>
Failure map:  <operation → failure mode → what the caller sees>, one per line
Deadlines:    <operation → deadline, enforced at <where>, inside the caller's <budget>>
Retries:      <operation → attempts, backoff, jitter, retried errors, terminal state> — or "none: <why>"
Idempotency:  <mutation → key, checked <where>, a replay returns <what>> — or "no retried mutation"
Signals:      <failure → signal, threshold, who acts> — or "none: <why no human acts>"
Refused:      <what you would not ship, and why>
```

`Refused` is never empty. A lens that only approves is a rubber stamp.

## The process

### Phase 0 — Decide whether there is a failure contract at all

The zero tier. Four questions, answered from the diff:

1. Does the code cross a boundary that can be slow, down, or duplicate — network, database, queue,
   filesystem, another process?
2. Is there a caller that cannot see the failure — a client reading a status, a producer, a cron, a
   downstream consumer?
3. Can a failure here lose or duplicate state?
4. Is the operation retried by anything — this code, a proxy, a queue, or a human pressing the button
   again?

All four "no" → verdict `no-failure-contract`, naming where the failure does surface (stderr, the exit
code, the notebook cell) and why the work is re-runnable. Stop: that is a complete review, not a
skipped one. A script a human runs by hand, watches, and can re-run lands here; the same script on
cron, feeding a dashboard, or writing a table someone else reads does not — the human is asleep.

Any "yes" → continue. A failure contract on a REPL helper is the failure this tier prevents.

**Done when:** the four answers are written, each naming the file or hunk that decided it.

### Phase 1 — Enumerate the operations and ask the one question

For each crossing the diff adds or newly puts behind an existing retry, queue, or load balancer, write
one row: the operation, the failure modes actually possible, and — the question this lens exists for —
*when this fails, what does the caller see?*

Name the modes concretely: deadline exceeded, connection refused or reset, 5xx, 429, slow but alive,
partial write, duplicate delivery, success reported before durability. "It throws" is not a mode; it
is what the language does about one.

**Done when:** every crossing in the diff is a row with a concrete failure mode and a caller-visible
outcome, and any row whose outcome is "unknown" is written down as a finding.

### Phase 2 — Write the contract for each operation

Four lines per row, values table open:

- **deadline** — the number and where it is enforced (client, server, gateway). Each hop fits inside
  the caller's remaining budget with room for the retry you plan.
- **retry** — attempts, backoff and jitter, which error classes, and the terminal state when the budget
  is spent. Or "none", with the reason.
- **caller-visible outcome** — the status code, exception class, envelope, or silence the caller gets.
- **idempotency** — the key and where it is checked, or "not retried, so none is needed".

Read [references/reliability-values.md](references/reliability-values.md) before this phase and take
every number from it — never from memory, and never from the library's default.

**Done when:** every Phase-1 row has all four lines, each number comes from the values table, and no
line says "handled by the framework" without naming the middleware and its line.

### Phase 3 — Trace every error to an owner that can act

Five owners exist: retried; degraded (with what the caller gets instead, and for how long); surfaced
(the status the caller sees); dead-lettered (the queue and the operator); terminated (the job fails and
something pages). Every error path ends in one of them.

An error with no owner — swallowed, logged and dropped, converted to a default — is a finding. So is a
degradation with no staleness bound: "serve the cache" is not "serve the cache for at most 60 seconds".

**Done when:** every error path terminates in a named owner, and every degradation names its substitute
and its staleness bound.

### Phase 4 — Check idempotency on every retried mutation

Any POST, PATCH, DELETE, queue message, webhook, or job step that can run twice: name the key, where it
is checked (before the side effect, or in the same transaction as the state change), and what a replay
returns — the original result, not a second effect.

"It's idempotent because it's an UPDATE" holds only for absolute writes. `SET count = 5` is idempotent;
`SET count = count + 1` is a second increment, and the retry is the bug.

**Done when:** every retried mutation has a key with its check point, or a written reason it is never
retried.

### Phase 5 — Place the signals on the paths that page

For each failure that reaches a human: the metric (with `operation`, `dependency`, `outcome` labels),
the log line (correlation id, operation, attempt, terminal), and the alert with its threshold. Alert on
terminal failures and on the user-visible symptom, never on retries. For each failure invisible to the
caller — a fallback, a degradation, a swallow you could not remove — name the counter that shows it.

**Done when:** every human owner from Phase 3 has a signal with a name and a threshold, and every
caller-invisible failure has a counter.

### Phase 6 — Emit the verdict and the slots

Pick one enum value, then fill the eight slots. Findings carry `file:line`, the failure mode, the
caller-visible outcome today, and a fix that names its mechanism — "add a timeout" without the number
and the place is not a fix.

**Done when:** the verdict is one of the six, the tier matches it, all eight slots are filled, and
`Refused` is non-empty.

## Gotchas

- A client timeout does not cancel the work on the server. The caller gives up at 2s, the handler keeps
  writing for 40s, the retry starts, and two writers run on the same row. A timeout is a promise by the
  caller, not a cancellation of the callee.
- The defaults are the finding: Python `requests` has no timeout, `axios` treats `timeout: 0` as none,
  browser `fetch` has no request timeout, Go's `http.Client` with a zero `Timeout` waits forever, gRPC
  has no default deadline, and JDBC's `socketTimeout=0` means infinite. A client library is not a
  deadline.
- `except Exception: return []` makes a dependency outage look like "no results". The empty list is
  indistinguishable from a real empty result, the alert never fires, and the next quarter goes into a
  data bug.
- A key generated inside the retry loop is a new key every attempt and deduplicates nothing. Derive it
  from the request: the caller's id, or a hash of caller plus payload.
- A unique constraint is idempotency for the row, not the side effect. The email is sent before the
  insert; the insert fails on the duplicate; the customer gets two emails and one order.
- Graceful shutdown that stops accepting but never drains loses requests in flight. The drain needs a
  deadline below the orchestrator's kill grace: 25s inside Kubernetes' default 30s.
- Alerting on retries pages on every blip, gets muted in a week, and the mute outlives it into the real
  outage. Page on terminal failures and on the symptom the user feels.

## Rationalizations

| Excuse | Reality |
|---|---|
| "The library handles errors" | It raises. Nothing catches, retries, or pages, and the caller gets a stack trace or a hang. |
| "Adding a timeout could break the slow batch job" | Then the batch job gets its own deadline, sized for it. The absence of a number is the bug. |
| "Retries make it more reliable" | Bounded retries on transient errors do. Unbounded ones turn the dependency's outage into yours; unkeyed ones duplicate the charge. Browser × SDK × service × driver, three tries each, is 81 queries for one click. |
| "The queue guarantees delivery" | At-least-once means duplicates. Without a key, the duplicate is a second email and a second charge. |
| "It's idempotent, it's just an UPDATE" | `count = count + 1` run twice is two increments. Absolute writes are idempotent; relative ones are not. |
| "It's just a log line" | The log line is the only signal on that path. Without a correlation id and an outcome label, the page never fires. |
| "We'll add monitoring after launch" | After launch is after the first incident, and the incident is exactly what you cannot see. |
| "It's a batch script, a human watches it" | Name the human, the screen, and the re-run. If it is on cron, the human is asleep — that is Phase 0, and it fails. |
| "The dependency has never failed in a year" | A year of uptime is a base rate, not a guarantee. The contract is for the day it fails, and that day is not schedulable. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Best effort", "eventually consistent", "graceful degradation" and "the gateway handles it" are the missing contract with a nicer name. |

## Red flags

- Your review lists error-handling improvements and never says what the caller sees.
- You wrote "add proper error handling" instead of the deadline, the bound, and the terminal state.
- You accepted "the framework handles it" without naming the middleware and its line.
- You are reviewing the happy path and calling it a reliability review.
- You are proposing a retry before naming what the retry is safe on.
- Your only signal is a log line with no alert and no owner behind it.
- You accepted "a human watches it" for something that runs at 3 a.m.
- You are counting attempts per layer instead of the end-to-end budget.
- You are building a failure contract for a rename, a constant, or a test fixture.

## Limitations

- Judges the contract in the diff, not the running system. The real deadline may live in the gateway,
  the mesh, or the cloud balancer; where you could not see a layer, say so — the end-to-end budget is
  only as complete as the layers you named.
- Cannot measure the real p99 or the dependency's latency distribution; the numbers here are floors to
  check against deployed configuration.
- Cannot prove a mutation is idempotent when the side effect leaves the process — email, payment,
  webhook, SMS. It can require the key and name the test; only the test proves it.
- Does not price an outage or decide whether an SLO is worth the spend; that is `make-the-call`, with
  this lens's failure map as input.
- The values are for HTTP/gRPC calls, SQL, and at-least-once queues. Kafka with manual offset commits,
  an event store, or a broker claiming exactly-once needs its own ack and offset rules — the reasoning
  transfers, the numbers do not.
- A bounded, correct retry can still be too slow or too expensive; that is `judge-performance`'s call.

## Reference

[references/reliability-values.md](references/reliability-values.md) — deadline floors per hop, retry
classes and backoff parameters, idempotency rules, queue and probe settings, alert thresholds, failure
classes ranked by cost, zero-tier triggers. Read it in Phase 2; take every number from it.
