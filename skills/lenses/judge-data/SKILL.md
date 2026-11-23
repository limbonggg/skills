---
name: judge-data
description: Use when a schema or data change is on the table — "add a column", "drop this column", "is this schema right", "backfill", "add an index", "JSON or its own table", "rename the field", "make it NOT NULL", "unique constraint", "we're splitting the table", "should this be nullable", or a data model review before it ships. Not for executing the change under test-first discipline (use red-green) or choosing which database to adopt (use make-the-call).
domain: lenses
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: approve-the-obvious-schema-change
  eval: evals/
---

# Judge Data

Read a schema the way a data engineer reads it: every fact has one home, every home has an enforcer,
and every change has a way back. This skill turns "add a column" into a verdict, and makes
"do not add a column" an answer you can give.

```
NO COLUMN WITHOUT THE QUERY THAT READS IT; NO MIGRATION WITHOUT ITS INVARIANT AND ITS REVERSAL PATH.
```

## When to use / when not to use

Use when:

- the user says "add a column", "drop this column", "rename the field", "make it NOT NULL", "add an
  index", "add a unique constraint", "backfill", "we're splitting the table", "we need a join table"
- the question is JSON or a table, a column or a child table, one table or two
- a migration is about to merge and nobody has read its down path
- a data model exists and keeps producing bugs: duplicated totals, contradictory status flags, rows
  that cannot happen
- the user says "is this schema right?", "review this migration", "will this lock the table?"
- you are about to write `ALTER TABLE` or a model class, and no query has been named yet

Not when:

- the change is agreed and the job is to make it safely, test-first — that is `red-green`
- the question is which database or storage product to adopt — that is `make-the-call`
- the question is whether a migration finished — that is `prove-it`
- the complaint is latency with no schema question behind it — that is `judge-performance`
- the question is multi-tenant isolation, tenancy keys, or access patterns across services — that is
  `judge-architecture`; this lens judges the rows, not the deployment
- the work needs slicing into tickets — that is `split-by-frontier`

| if the situation is | use |
|---|---|
| "should this be a column?" | this skill |
| "write it and prove it works" | `red-green`, then `prove-it` |
| "why is this query slow?" (plan, not shape) | `judge-performance` |
| "how do we isolate tenants?" | `judge-architecture` |
| "should we store this at all?" (product, cost, risk) | `make-the-call` |

## The vocabulary

Seven terms. Think in these; the generic word is where the judgement leaks out.

| term | it means | _avoid_ |
|---|---|---|
| **invariant** | a sentence true of every row at every commit: "every order has exactly one customer" | validation, business rule |
| **enforcer** | what makes the invariant unbreakable — a constraint, a trigger, or app-only with a stated reason | guard, check |
| **cardinality** | how many of one row per another, and the constraint that enforces it | relationship, link |
| **shape** | the chosen home for a fact: column, child table, join table, event table, JSONB | model, structure |
| **expand/contract** | the three-deploy change: add and tolerate both, backfill, remove the old | migration plan, phased rollout |
| **backfill** | writing existing rows until they satisfy a new invariant | data fix, script |
| **reversibility** | whether the pre-change **rows** can be restored — not whether the code can be reverted | rollback |

## Rejects on sight

Each of these is a verdict, not a discussion. Name the rejection and the reason.

- **A destructive migration with no verified backup.** `DROP COLUMN`, `TRUNCATE`, a narrowing type
  change, an `UPDATE` that overwrites rows. The data does not come back from `git revert`, and "we have
  backups" is a claim until someone has restored one.
- **Nullable-everything.** `NULL` on a column whose domain says "always present" makes every consumer
  defensive and every invariant a suggestion. Optionality is a claim about the world, not a safe default.
- **A JSON blob for relational data.** Anything you filter, join, aggregate, or constrain on cannot live
  in a blob. The database cannot enforce, index, or migrate what it cannot see.
- **Duplicated state with no mechanism to keep it equal.** A copied total, a cached count, a denormalised
  name. One owner; the copy is a view, a generated column, or it is the bug you will debug for a year.
- **Contradictory flags.** `is_active` + `is_deleted` + `status` admits states that cannot happen, and
  every reader picks a different pair to filter on.
- **A mutable natural key as the primary key.** Email, username, phone, slug. The day it changes, every
  foreign key and every external reference has to move.
- **Money in a float.** Binary floating point cannot hold cents; neither can a `SUM` over it.
- **A "temporary" column with no removal date.** Temporaries are permanent unless the ticket that removes
  them exists at the time it is added.

## The verdicts

One enum, chosen once per review. `keep` is the zero tier and a complete answer.

| verdict | tier | when | what it still owes |
|---|---|---|---|
| `keep` | `pass` | the zero tier: the need is served by what exists, or no query reads the change | the need you refused, and what serves it instead |
| `ship` | `pass` | shape, enforcers, migration and reversal all hold | the reversal, and one thing you refuse |
| `fix-before-merge` | `fix` | right shape, named gaps: a missing constraint, an unbatched backfill, an unindexed FK, a down path that lies | the gap list, each with its enforcer or its step |
| `redesign` | `redesign` | the shape is wrong: blob where a relation belongs, nullable where the domain is total, a copy with no owner | the shape that replaces it, and the invariants it must carry |
| `reject` | `refuse` | the change must not land: irreversible without a verified backup, data loss, an unvalidatable rewrite on a live table | the condition that would make it shippable |

The artifact, seven slots, no prose around it:

```
Verdict:    keep | ship | fix-before-merge | redesign | reject
Tier:       <pass | conditional | fix | redesign | refuse — mapped in the table above>
Invariants: <sentence → enforcer>, one per line
Shape:      <the home chosen, and the alternative it beat>
Migration:  expand → backfill → contract, lock per step — or "none"
Reversal:   <the exact undo, and the rows it cannot restore>
Refused:    <what you would not add, and why>
```

`Refused` is never empty. A lens that only approves is a rubber stamp.

## The process

### Phase 1 — Name the query, or take the zero tier

Before any shape, write the read: the columns, the predicate, the expected row count, and who issues
it. A change with no query behind it is a preference; preferences do not get columns. If you cannot
name a query and a consumer, the verdict is `keep` and the process ends here — that is a finished
review, not a refusal to do the work.

**Done when:** at least one query with a predicate and a row count is written down, or the verdict is
`keep` with the need it refuses named.

### Phase 2 — Write the invariants as sentences, then give each an enforcer

Not "the column should be required" — "every order has exactly one customer, and a customer cannot be
deleted while an order exists". For each invariant, name the enforcer: `NOT NULL`, `CHECK`, `UNIQUE`
(whole or partial), `FOREIGN KEY` with its `ON DELETE`, `EXCLUDE`, a generated column, or "app-only"
plus the reason the database cannot hold it.

The test of an invariant is a row that violates it. If the schema accepts that row, the invariant is a
wish. Do this for the columns that already exist too, not only the new one — most of what this lens
finds is already shipped.

**Done when:** every invariant implied by Phase 1's queries has an enforcer or a stated app-only
reason, and every nullable column has a written meaning for `NULL` ("unknown" and "not applicable" are
different states and get different columns).

### Phase 3 — Choose the shape

Cardinality and lifecycle pick the home. Not taste, not what the ORM generates.

| the fact | its home |
|---|---|
| one per row, same lifecycle, always present | column, `NOT NULL` |
| one per row, genuinely unknown for some rows | nullable column, with the `NULL` meaning written |
| many per row | child table, FK, and an index on that FK |
| many-to-many | join table with its own PK and a unique pair |
| the same fact over time | append-only rows with `valid_from`/`valid_to`, or an event table |
| the same fact in two places | one owner; the other is a view or a generated column |
| a payload the app owns whole | JSONB, with every queried field promoted to a column |
| one of a closed set | lookup table or `CHECK`; not free text, and usually not a native enum |

**Done when:** every field named in Phase 1 has a home, or is refused in the `Refused` slot with its
reason.

### Phase 4 — Classify the migration, values table open

Read [references/data-values.md](references/data-values.md) before this phase and take every number
from it: the DDL cost table, the lock levels, the batch sizes, the type choices. For each statement
answer four things: does it rewrite the table or only touch metadata, what lock does it take, can it
run concurrently, and which deploy order does the code need.

The default shape is expand/contract, not a single deploy: add the new thing and let both shapes be
tolerated, backfill in batches until the invariant holds, remove the old thing only once no reader
remains. A rename is not `ALTER TABLE ... RENAME`; it is add, dual-write, backfill, drop.

**Done when:** every step names rewrite-or-metadata, its lock, and its place in the deploy order — code
before schema, or schema before code, never "at the same time" — and every backfill step names its
batch size and its stop condition.

### Phase 5 — Write the reversal, then the verdict

Reversibility is about rows. Name what the down path restores and what it does not: a dropped column's
values, a narrowed type's overflow, an overwritten row, a truncated table. If the only undo is
"restore from backup", say so, name the backup, and check that it exists and is recent — an unverified
backup is a hope with a cron job.

Then pick one verdict and fill the slots.

**Done when:** one enum value is chosen, the reversal names the rows it cannot restore, and `Refused`
is non-empty.

Reviewing an existing model: run the same phases against it. Phase 1 is the queries the application
actually issues — read the access layer, do not imagine it; Phase 4 is the migration history. The
verdict applies to the model as it stands.

## Gotchas

- `CHECK` passes on `NULL`. `CHECK (amount_cents > 0)` accepts a `NULL` amount, so "positive" needs
  `NOT NULL` and the check together. Half a constraint reads like a whole one.
- `ADD COLUMN ... NOT NULL DEFAULT <volatile>` rewrites the table; `DEFAULT <constant>` does not
  (PostgreSQL 11+). `now()`, `gen_random_uuid()` and `random()` are volatile — a 40M-row table gets a
  maintenance window from a statement that reads like metadata.
- `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block, so the runners that wrap each
  migration reject it. A failed concurrent build leaves an `INVALID` index that still costs writes and
  is never used by the planner — check `pg_index.indisvalid` after every one.
- Postgres does not index foreign keys. An `ON DELETE CASCADE` on an unindexed FK scans the child table
  once per parent delete; the index is a migration, not an ORM setting.
- `UNIQUE` allows many `NULL`s: two rows with a `NULL` email do not conflict. If absence must still be
  unique, that is a partial unique index — or `NULLS NOT DISTINCT` on PostgreSQL 15+.
- A queued `ACCESS EXCLUSIVE` blocks everything behind it. One `ALTER TABLE` waiting on a long read
  parks every later query on the table; set `lock_timeout` and retry rather than queue.
- A down migration that re-adds a dropped column restores the shape, not the values. The revert test is
  "do the rows come back?" — if not, the change was one-way and needed a backup.
- Adding a stored generated column rewrites the table, because it is computed for every existing row —
  even though it "adds nothing new".
- Decreasing `varchar(n)` rewrites the table and fails on any longer row; `varchar(n)` → `text` is
  metadata-only. Length is a `CHECK`, not a type.

## Rationalizations

| Excuse | Reality |
|---|---|
| "It's just one column, it's additive" | Additive describes the code path. The default, the backfill and the lock decide the cost. |
| "We can always revert the migration" | Name the down path. If it drops the column, it restores a shape and loses the rows. |
| "The ORM handles it" | The ORM writes the DDL; it does not choose the lock, and it will not index your foreign key. |
| "The table is small" | Small is a measurement. Name the row count and the size before you call it small. |
| "We'll add the constraint once the data is clean" | Then the dirty rows exist and the constraint is a migration under load. Constrain first, `NOT VALID`, validate after the backfill. |
| "JSON is simpler" | Simpler to write, impossible to join, constrain or migrate. Simplicity that moves the work to every future reader is not simpler. |
| "It's nullable for now" | Nullable is a permanent statement about the domain. Every consumer written against it keeps the defensive branch. |
| "The app already enforces it" | Then name the code path and the second writer. One of them will not. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Denormalised for speed", "flexible attributes", "soft-delete flag" are the rejections wearing new names. |

## Red flags

- You are writing `ALTER TABLE` before naming the query that reads the column.
- You are calling a migration reversible without having read its down path.
- You are adding a nullable column and the comment says "temporarily".
- You are approving a schema because the SQL parses and the migration runs on an empty database.
- You are describing the model class instead of the constraints.
- You are proposing a column for a value that is derivable from columns you already have.
- You are explaining why this table is small enough to skip the lock analysis.

## Limitations

- The values are PostgreSQL 12+. MySQL's online-DDL `ALGORITHM=INPLACE` set and SQLite's
  rewrite-the-table `ALTER` differ in exactly the numbers that matter — the reasoning transfers, the
  thresholds do not, so re-derive them from the engine in front of you.
- Cannot see production row counts, lock waits, replica lag or backup freshness. Without them every
  duration here is an estimate and must be labelled one.
- Cannot decide product semantics: whether "deleted" means gone or hidden, whether a refunded order
  still has a total, is the owner's call. This lens prices both shapes and names what each forbids.
- Not a query optimiser. It will tell you an index is missing for a named query; it will not prove the
  plan is optimal or that the index is the one the planner picks.

## Reference

[references/data-values.md](references/data-values.md) — DDL cost and lock table, size thresholds,
expand/contract recipes, backfill rates, type choices, index and JSONB rules, and the zero-tier
triggers. Read it in Phase 4; take every number from it.
