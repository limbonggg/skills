# Cost values

Floors and defaults, not targets. A finding cites one of these numbers and the finding is arguable; a
finding that says "expensive" is not. Where the source column says **house**, the number is this
repository's chosen default — change it here and every skill that reads this table follows.

## Table of contents

1. Retry and timeout budgets — attempts, layers, jitter, idempotency
2. Billed events per unit — round trips, page size, fan-out, poll interval
3. Billing granularity — the meter's step, and what rounds up
4. The ceiling — cost per unit against revenue per unit
5. List prices, order of magnitude, with the date
6. Agent-run costs — tokens, re-reads, pointers
7. When a structural finding may skip the meter

Prices move. The list prices in §5 are order-of-magnitude defaults for comparing two designs, not
invoices; a contract rate, a committed-use discount or a vendor change supersedes them, and the answer
says which it used.

## 1. Retry and timeout budgets

| control | floor | source | what it decides |
|---|---|---|---|
| attempts per layer | ≤ 3 (initial + 2 retries) | Google SRE workbook | a fourth attempt is `fix-before-merge` |
| retry layers | 1. A client that retries behind a gateway that retries is two layers | house | two layers multiply to 9 billed requests per user action |
| retry budget | retries ≤ 10% of requests, per client | Google SRE workbook | an unbounded retry budget is the outage amplifier |
| backoff | exponential from 100 ms (internal) or 500 ms (public), multiplier 2, full jitter | AWS Architecture Blog | fixed or unjittered backoff synchronizes the fleet |
| total retry window | ≤ the caller's deadline; never extends it | house | a retry that outlives the deadline bills for an answer nobody reads |
| retried mutation | requires an idempotency key | house | a retried POST without one is a duplicate charge and a duplicate row |
| circuit breaker | opens at ≥ 50% errors over ≥ 20 requests, half-open probe after 30 s | house | without one, a failing dependency is billed at full traffic |
| ambiguous timeout | retry only with idempotency, else dead-letter and report | house | "timeout, so retry" is how a batch is paid for twice |

## 2. Billed events per unit

| path | ceiling | what it decides |
|---|---|---|
| read path, one unit | 1 billed round trip | a second read on the same unit is a finding unless the second is a cache hit |
| unit total | ≤ 2 billed round trips | includes the write, the audit line, and any lookup |
| batch page size | ≥ 100 rows, ≤ 1,000 | a page of 10 over 1,000 rows is 100 billed calls where 1 would do |
| fan-out per unit | ≤ 5 downstream calls, concurrency ≤ 10 | both named in the diff, or the fan-out is unbounded |
| listing per item | 0 | a listing per object is `redesign`, not a fix |
| poll interval | ≥ 60 s per client, or derived from a stated freshness requirement | 1 s polling by 1,000 clients is 86.4 M requests a day |

## 3. Billing granularity — the meter's step

| meter | step | consequence |
|---|---|---|
| serverless invocation | per request + per 1 ms of billed duration | a 1.2 s handler bills as 1.2 s, not 1 s |
| container compute | per second, 1-minute minimum on some platforms | a 5 s job bills a minute |
| object store requests | per 1,000 requests, per class | a LIST is ~10× a GET |
| egress | per GB, per direction, per hop | cross-AZ is billed twice, once each side |
| log ingest | per GB, rounded up per batch | a debug line per row is a bill with a query attached |
| managed queue | per million requests, 64 KB chunks | a 200 KB payload bills as 4 requests |
| model tokens | per token, input and output priced separately | output is typically 4–5× the input price |

## 4. The ceiling

Cost per unit is measured against what a unit earns, not against last month.

| cost per unit ÷ revenue per unit | verdict floor | note |
|---|---|---|
| ≤ 10% | `priced` | healthy; stop pricing it |
| 10–25% | `priced` with a tripwire | name the growth rate that would cross 25% |
| 25–50% | `fix-before-merge` | affordable now, not at the next 2× of traffic |
| > 50% | `refuse` at scale | the unit does not pay for itself; `make-the-call` owns the exception |

No revenue per unit (internal tool, agent run, batch job): the ceiling is the owner's cap ÷ expected
units, written before the first unit. With no cap and no meter, the verdict is `refuse`, not
`price-first` — there is nothing to measure against.

Growth rule: if cost per unit grows with data or turns while revenue per unit does not, the verdict is
`redesign` at any absolute number, because the crossing point is arithmetic.

## 5. List prices, order of magnitude

us-east-1, on-demand, no discount; consulted 2026-11. Use for ratio comparisons between two designs.

| meter | default | source |
|---|---|---|
| serverless request | $0.20 per 1 M requests | AWS Lambda public pricing |
| serverless compute | $0.0000166667 per GB-second | AWS Lambda public pricing |
| object GET / PUT / LIST | $0.0004 / $0.005 / $0.005 per 1,000 | AWS S3 public pricing |
| internet egress | $0.09 per GB (first 10 TB) | AWS public pricing |
| cross-AZ transfer | ~$0.01 per GB, each direction | AWS public pricing |
| log ingest / storage | $0.50 per GB ingested, $0.03 per GB-month | CloudWatch public pricing |
| NAT gateway | $0.045 per hour + $0.045 per GB | AWS public pricing |
| managed queue request | $0.40 per 1 M | AWS SQS public pricing |
| key-value write / read unit | $1.25 / $0.25 per 1 M | DynamoDB on-demand public pricing |
| model tokens, small tier | ~$0.15 in / $0.60 out per 1 M | house (order of magnitude) |
| model tokens, mid tier | ~$3 in / $15 out per 1 M | house (order of magnitude) |
| model tokens, frontier tier | ~$15 in / $75 out per 1 M | house (order of magnitude) |

## 6. Agent-run costs

The meter is tokens and the unit is the completed task.

| control | default | what it decides |
|---|---|---|
| reads of one file per task | 1 | a second full read is a re-derivation; cite `path:line` instead |
| facts carried across a boundary | pointer, not content | a copied file is paid again at every later turn that re-reads it |
| subagent handoff | summary + pointers, never a file to re-read | a worker handed material to summarise bills it twice |
| per-task token ceiling | `spend_max ÷ units expected` | a run with no per-task ceiling spends the whole envelope on unit 1 |
| turns per completed task | track it; a rising ratio with flat completions is idle spend | forty cheap turns that finish nothing are spend with no units |

## 7. When a finding may skip the meter

Structural only, and only when the multiplier is unbounded by construction:

- an uncapped or stacked retry (multiplier grows with failure rate);
- a billed call per row over a page whose size the customer controls;
- a listing or lookup per object in a bucket or table that grows;
- a poll with no freshness requirement and no interval bound;
- a per-turn re-derivation with no pointer discipline.

Everything else is `price-first`. The claim is about the multiplier; say so, and show what makes it
unbounded.
