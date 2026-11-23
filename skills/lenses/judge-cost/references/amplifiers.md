# Amplifiers

One row per surface. The multiplier is what turns one unit into many paid events; the meter is where
the bill lands; the count is the one number to ask for. A finding that names the row, the count and the
meter is arguable. A finding that says "chatty" is not.

| surface | multiplier | meter | the count to ask for | one-line fix |
|---|---|---|---|---|
| retry layer | attempts × layers (3 × 3 = 9) | requests billed, or per-call API | attempts per layer, layers, retry share of traffic | cap at 3, keep one layer, add jitter |
| billed call per row | rows per page | per-call API, database round trips | page size and calls per row | one batched call per page |
| fan-out | calls per unit × concurrency | per-call API, egress | downstream calls per unit, concurrency cap | bound both in the diff; batch the fan-out |
| listing per object | objects per run | per-1,000-request store meter | objects in the bucket or table | one listing per run, cached by prefix |
| poll loop | clients × polls per day | per-request, per-invocation | poll interval, client count, freshness requirement | event or webhook; else interval from the requirement |
| per-request init | requests × init cost | billed compute, startup time | init work and its inputs' change rate | build once at startup or at build time |
| log/metric per row | rows × bytes per line × retention | per-GB ingest and scan | bytes per line, rows per unit, retention | sample, one structured line per unit |
| whole-batch retry | items per batch per failure | per-call API, per-message queue | failure rate, batch size | per-item retry with idempotency |
| ambiguous timeout resend | duplicates per timeout | per-request, storage writes | timeout rate, idempotency coverage | idempotency key or dead-letter |
| cache stampede | requests at expiry × cold path | per-call API, billed compute | hit rate, TTL, concurrent requests at expiry | single-flight load, jittered TTL |
| chatty service mesh | hops × directions × bytes | egress, per-request | calls per unit, cross-AZ share, payload size | co-locate, batch, compress |
| agent re-read | turns × file size | tokens in | files re-read per task | pointer (`path:line`) in the state, not a copy |
| subagent duplication | workers × handed context | tokens in, twice | what each worker was given to read | summary + pointers in the contract |
| compaction re-derivation | boundary × dropped conclusions | tokens in | what crossed the boundary without a pointer | carry decisions with their artifact ids |

## Reading the table

Two multipliers stack more often than any other: **retry × per-row**, because a per-row call inside a
retry loop is n × attempts, and **fan-out × poll**, because a poller that fans out re-pays the fan-out
every tick. Multiply before you quote a number.

The count column is where a review stops being an opinion. If the count is unknown, the finding is
`price-first` naming that count — not a guess about whether the number is big.

## What this table does not price

Latency, throughput, memory, and CPU time as a user experience. Those are `judge-performance`'s, and a
row here that is slow but free is not a cost finding. The rows above are here because a meter charges
for them: per request, per byte, per GB-second, per token.
