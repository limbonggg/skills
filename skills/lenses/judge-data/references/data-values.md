# Data values

Exact values for `judge-data`. PostgreSQL 12+ unless a row says otherwise. Every number is a default to
argue against with a measurement, not a law.

## Table of contents

1. Size thresholds — when a table stops being small
2. DDL cost — rewrite or metadata, and the lock it takes
3. Lock levels — what each one blocks
4. Expand/contract recipes — the five changes that need three deploys
5. Backfill — batch sizes, keyset paging, the stop condition
6. Type choices — the default and what it replaces
7. Nullability and constraints — what each constraint does and does not enforce
8. Index rules — what to index, and what an index costs
9. JSONB rules — when a blob is correct
10. Zero-tier triggers — when the verdict is `keep`

---

## 1. Size thresholds

Measure, never estimate:

```sql
SELECT reltuples::bigint AS approx_rows,
       pg_size_pretty(pg_total_relation_size('public.orders')) AS total_size;
```

| rows | treat as | consequence |
|---|---|---|
| under 100k | small | a rewrite is acceptable if a rehearsal shows under ~1s |
| 100k–10M | medium | no full rewrite under load; no unbatched `UPDATE`; no index build without `CONCURRENTLY` |
| over 10M, or over 1 GB on disk | large | expand/contract mandatory; every DDL gets `lock_timeout` and a rehearsal on a copy |
| over 100M | very large | assume every non-metadata statement is a maintenance window; batch 1k–5k rows |

The threshold that decides the method is the one where a rewrite exceeds the acceptable write pause —
usually a few hundred milliseconds on a live primary, longer if a replica must keep up.

## 2. DDL cost

| statement | rewrite? | lock | note |
|---|---|---|---|
| `ADD COLUMN` (nullable, no default) | no | ACCESS EXCLUSIVE, brief | the cheapest real change |
| `ADD COLUMN ... DEFAULT <non-volatile constant>` | no (PG11+) | ACCESS EXCLUSIVE, brief | the default is stored in the catalog |
| `ADD COLUMN ... DEFAULT <volatile>` (`now()`, `gen_random_uuid()`, `random()`) | **yes** | ACCESS EXCLUSIVE, full duration | reads like metadata, behaves like a rewrite |
| `ADD COLUMN ... GENERATED ALWAYS AS (...) STORED` | **yes** | ACCESS EXCLUSIVE, full duration | computed for every existing row |
| `ALTER COLUMN TYPE` (non-binary-coercible) | **yes** | ACCESS EXCLUSIVE, full duration | rewrites and reindexes |
| `ALTER COLUMN TYPE` (`varchar(n)`→`varchar(m>n)`, `varchar`→`text`) | no | ACCESS EXCLUSIVE, brief | binary-coercible; everything else rewrites |
| `SET NOT NULL` | full scan, no rewrite | ACCESS EXCLUSIVE for the scan | skipped when a validated `CHECK (col IS NOT NULL)` exists (PG12+) |
| `DROP NOT NULL` | no | ACCESS EXCLUSIVE, brief | |
| `ADD CONSTRAINT ... CHECK (...) NOT VALID` | no | ACCESS EXCLUSIVE, brief | enforces new rows immediately |
| `VALIDATE CONSTRAINT` | no | SHARE UPDATE EXCLUSIVE | scans, does not block reads or writes |
| `ADD FOREIGN KEY ... NOT VALID` | no | ACCESS EXCLUSIVE, brief | pair with an index on the child column |
| `CREATE INDEX` | no, but scans | SHARE | blocks writes for the whole build |
| `CREATE INDEX CONCURRENTLY` | no | SHARE UPDATE EXCLUSIVE | two scans, no write block, cannot run inside a transaction, may leave `INVALID` |
| `DROP INDEX CONCURRENTLY` | no | SHARE UPDATE EXCLUSIVE | cannot run inside a transaction |
| `DROP COLUMN` | no | ACCESS EXCLUSIVE, brief | **irreversible**; space not reclaimed until rewrite |
| `RENAME COLUMN` / `RENAME TABLE` | no | ACCESS EXCLUSIVE, brief | breaks every running deploy with the old name |
| `SET DEFAULT` / `DROP DEFAULT` | no | ACCESS EXCLUSIVE, brief | |
| `TRUNCATE` | no | ACCESS EXCLUSIVE | **irreversible**, not transactional in intent |
| `VACUUM FULL` / `CLUSTER` | **yes** | ACCESS EXCLUSIVE, full duration | maintenance window |

Always: `SET lock_timeout = '3s'; SET statement_timeout = '30s';` before DDL, and retry the statement
rather than let it queue.

## 3. Lock levels

| lock | blocks | typical source |
|---|---|---|
| ACCESS EXCLUSIVE | reads and writes | most `ALTER TABLE`, `DROP`, `TRUNCATE`, `VACUUM FULL` |
| SHARE | writes | `CREATE INDEX` (non-concurrent) |
| SHARE ROW EXCLUSIVE | writes, and itself | `CREATE TRIGGER`, some `ALTER TABLE` |
| SHARE UPDATE EXCLUSIVE | other DDL and `VACUUM` only | `VALIDATE CONSTRAINT`, `CREATE INDEX CONCURRENTLY` |
| ROW EXCLUSIVE | writes to the same rows | `INSERT`/`UPDATE`/`DELETE` |

A pending ACCESS EXCLUSIVE request jumps the queue and blocks every query behind it, including plain
`SELECT`s. That is why `lock_timeout` matters more than the statement's own duration.

## 4. Expand/contract recipes

**Rename a column.** 1. `ADD COLUMN new_name` (nullable, no default). 2. Deploy code writing both and
reading both. 3. Backfill in batches. 4. Deploy code reading only the new name. 5. `DROP COLUMN` the
old one, after a release in which nothing reads it.

**Make a column `NOT NULL`.** 1. Backfill until no row is null. 2.
`ADD CONSTRAINT col_not_null CHECK (col IS NOT NULL) NOT VALID`. 3. `VALIDATE CONSTRAINT` (SHARE
UPDATE EXCLUSIVE). 4. `ALTER COLUMN SET NOT NULL` — metadata-only on PG12+, it reuses the validated
check. 5. Optionally drop the check.

**Add a foreign key.** 1. Index the child column concurrently. 2. `ADD CONSTRAINT ... FOREIGN KEY ...
NOT VALID` (brief ACCESS EXCLUSIVE). 3. `VALIDATE CONSTRAINT` (SHARE UPDATE EXCLUSIVE).

**Change a type.** 1. Add a column of the new type. 2. Dual-write, backfill. 3. Switch reads. 4. Drop
the old column in a later release. For a binary-coercible change, `ALTER COLUMN TYPE` directly.

**Add a unique constraint.** 1. `CREATE UNIQUE INDEX CONCURRENTLY`. 2. `ADD CONSTRAINT ... UNIQUE USING
INDEX` (brief lock, adopts the index). Never `ADD CONSTRAINT ... UNIQUE` directly on a large table — it
builds the index under a write-blocking lock.

**Split a table.** Contract is the mirror: new table, dual-write, backfill, switch reads, stop writing
the old one, drop it a release later. Both tables are live for at least one full deploy cycle.

## 5. Backfill

- Batch 1k–10k rows per transaction. Larger batches hold locks and flood the WAL; smaller ones spend
  their time in round trips.
- Page by key range (`WHERE id > :last AND id <= :last + :step`), never `OFFSET` — offset rescans.
- Sleep 50–200 ms between batches so replicas can catch up.
- Stop condition: replica lag over 1s (or your replica budget) or lock waits over 1s. Pause, do not
  push through.
- Make it idempotent and restartable: `WHERE new_col IS NULL` is the natural guard, but check the plan
  once the table is mostly done — the predicate gets less selective as it succeeds.
- Backfill against the exact predicate the constraint will validate, or validation fails on rows the
  backfill skipped.

## 6. Type choices

| value | use | avoid |
|---|---|---|
| money | `numeric(12,2)`, or `bigint` minor units with `_cents` in the name | `float`/`double`/`real`, `money` (locale-dependent, rounds oddly) |
| instants | `timestamptz` | `timestamp` — stores a wall clock with no offset |
| future local wall-clock (an alarm, a store's opening time) | `timestamp` plus a separate zone column | pretending it is an instant |
| text | `text` + `CHECK (length(col) <= n)` | `varchar(n)` — no performance gain, and decreasing `n` rewrites |
| identifiers | `bigint GENERATED ALWAYS AS IDENTITY`, or UUIDv7 | UUIDv4 as a clustered PK (random insert order, index bloat) |
| status | `text` + `CHECK (col IN (...))`, or a lookup table with an FK | native `enum` (cannot remove values, `ADD VALUE` is awkward pre-PG12), free text |
| boolean | `boolean`, `NOT NULL` | `char(1)` `'Y'`/`'N'`, `int` 0/1, and a nullable boolean (that is a tri-state) |
| counts | `integer`/`bigint` | `numeric` |
| IP, network | `inet`, `cidr` | `text` |
| intervals of time that must not overlap | `daterange`/`tstzrange` + `EXCLUDE` | two nullable date columns checked in the app |
| a payload the app owns whole | `jsonb` | `json` (no indexing, keeps whitespace) or `text` |
| derived value | view, or `GENERATED ... STORED` if it must be indexed | a column kept in sync by hand |

## 7. Nullability and constraints

| constraint | enforces | does not enforce |
|---|---|---|
| `NOT NULL` | a value exists | that it is meaningful |
| `CHECK` | the predicate for non-null values | anything about `NULL` — the check passes |
| `UNIQUE` | distinct non-null values | distinctness across `NULL`s (many `NULL`s allowed; PG15 `NULLS NOT DISTINCT` changes this) |
| partial `UNIQUE INDEX ... WHERE` | distinctness within a subset | rows outside the predicate |
| `FOREIGN KEY` | the parent exists | an index on the child column — Postgres does not create one |
| `FOREIGN KEY ... ON DELETE CASCADE` | the children go with the parent | that the delete is fast without a child index |
| `EXCLUDE` | no two rows overlap | that the range is well-formed |
| `GENERATED ... STORED` | the value equals the expression | that the expression is cheap on read |

`NULL` meanings, decided per column and written down: *unknown* (will be known), *not applicable*
(never), *not yet* (a state machine, not a null). Three different columns.

## 8. Index rules

- Every foreign key column gets an index. This is the most common missing index in application schemas.
- Index for a named query: its `WHERE` equality columns first, then the range or sort column.
- A partial index when the query always filters: `WHERE deleted_at IS NULL`, `WHERE status = 'open'`.
- An index on a low-cardinality boolean alone is rarely chosen by the planner; a partial index on the
  minority value usually is.
- Every index costs writes and disk. Find the unused ones: `pg_stat_user_indexes.idx_scan = 0` after a
  full statistics cycle, excluding unique indexes that enforce a constraint.
- Build on a live table with `CREATE INDEX CONCURRENTLY`; verify `indisvalid` afterwards.

## 9. JSONB rules

- Correct: a payload the application owns whole — a webhook body, a rendered document, a provider's
  response — stored and returned intact.
- Wrong: anything filtered, joined, aggregated, or constrained on more than one field. Those fields
  become columns; the rest can stay in the blob.
- A blob has no foreign keys, no `NOT NULL` on keys, no type safety, and no migration path for its
  shape. Put `schema_version int NOT NULL` beside it and read the version before the payload.
- If you query containment, index it: GIN with `jsonb_path_ops` for `@>` — smaller and faster than the
  default `jsonb_ops` when you only need containment.
- A blob that gets a query per field is a table that has not admitted it yet.

## 10. Zero-tier triggers

Verdict `keep` when any of these holds. Say which one, and what serves the need instead.

- The value is derivable from columns that already exist — a view or a generated column, not a copy.
- No query reads it: no consumer, no predicate, no row count.
- It is one consumer's presentation preference; a view or the read path serves it.
- It duplicates state another table owns, with no mechanism keeping them equal.
- The need is "we might want it later", with no date and no ticket.
- The invariant it would enforce is already enforced somewhere.
- It is a rename with no consumer map and no expand/contract plan.
- The proposed type would be `jsonb` and the first three queries against it are equality filters.
