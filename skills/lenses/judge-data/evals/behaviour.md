# Behaviour eval — judge-data

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not captured transcripts** — they describe the failure we
expect, quoted in the form it usually takes. Replace each with the observed transcript the first time a
real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The additive column that rewrites the table

**Setup.** A 40M-row `orders` table. The request: "add a `public_id` column, `NOT NULL DEFAULT
gen_random_uuid()`, so the API can expose opaque ids." The migration is one `ALTER TABLE` statement.

**Baseline (hypothesis — unverified).** The model approves it: "This is additive and safe — `ADD COLUMN`
with a default is metadata-only in modern Postgres, and `NOT NULL` with a default backfills
automatically." No lock is discussed, no rewrite is mentioned.

**Required.** The model identifies `gen_random_uuid()` as a volatile default, so the statement rewrites
the table under `ACCESS EXCLUSIVE` for its full duration, and gives the expand/contract path: add the
column nullable with no default, backfill in batches, then `SET NOT NULL` via a validated `CHECK`. The
verdict is `fix-before-merge`, not `ship`.

**Observable.** The reply names the rewrite and the lock, and its `Migration` slot contains at least
three ordered steps with a batch size. A reply that says "additive" and stops fails this case.

### 2. The down migration that restores the shape

**Setup.** A migration drops `legacy_status` from `orders`, and ships a `down` that re-adds the column
`TEXT NULL`. The user asks "it has a down migration, so we're fine, right?"

**Baseline (hypothesis — unverified).** The model confirms: "Yes — the down migration re-adds the
column, so this is reversible." It reads the presence of `down` as reversibility.

**Required.** The model reads what the down path restores: the column exists again, the values do not.
It states that this is a one-way change unless a verified backup exists and has been restored at least
once, and that the verdict is `reject` or `fix-before-merge` depending on the backup evidence.

**Observable.** The `Reversal` slot names the lost rows explicitly ("the down path restores the column,
not its values"), and the verdict is not `ship`.

### 3. The JSON blob

**Setup.** "We want to store product attributes as JSON so we can add fields without migrations." The
consumer list includes a filter by `attributes->>'colour'` and a sort by `attributes->>'size'`.

**Baseline (hypothesis — unverified).** The model agrees and adds a `jsonb` column plus a GIN index,
calling it flexible and future-proof.

**Required.** The model names the queries, promotes the fields those queries touch (`colour`, `size`)
to columns with constraints, and leaves only the genuinely opaque remainder in JSONB with a
`schema_version`. If the whole attribute set is queried, the verdict is `redesign`, not "JSONB with an
index".

**Observable.** At least one field is moved out of the blob, and the reply names one thing JSONB cannot
enforce (a foreign key, a `NOT NULL` on a key, a type, or a migration path for its shape).

### 4. The zero tier

**Setup.** "Add `invoice_total_cents` to `invoices`." `invoices` has `order_id`, and `orders` already
carries `total_cents`; every invoice has exactly one order and the total never diverges.

**Baseline (hypothesis — unverified).** The model writes the migration and adds a note: "remember to
keep this in sync with `orders.total_cents` when the order changes."

**Required.** The verdict is `keep`. The model refuses the column, names the duplication, and offers the
view or generated-column alternative (with the note that a stored generated column rewrites the table).
No DDL is produced.

**Observable.** The verdict is `keep`, the `Refused` slot names the duplicated total, and the turn
contains no `ALTER TABLE`.

### 5. The constraint that passes on NULL

**Setup.** A review of a payments table. `amount_cents` is nullable and has
`CHECK (amount_cents > 0)`. The user asks whether the money column is constrained.

**Baseline (hypothesis — unverified).** The model answers "yes — there is a `CHECK` on it", and moves on.

**Required.** The model states that `CHECK` passes on `NULL`, so the table admits a payment with no
amount, and that `NOT NULL` is a second constraint the column does not have. The verdict is
`fix-before-merge` with the two-step add (`CHECK ... NOT VALID`, validate, then `SET NOT NULL`) named
for a live table.

**Observable.** The reply distinguishes "the check holds for non-null rows" from "the column is
required", and the fix list contains both constraints.

### 6. The nullable-everything review

**Setup.** A schema where every column except `id` is nullable, there are no foreign keys, and status
values are free text. The user asks "is this fine? the app validates it."

**Baseline (hypothesis — unverified).** The model says the schema is workable, notes that validation
lives in the application, and lists a couple of "consider adding" suggestions.

**Required.** The verdict is `redesign`. The model writes the invariants as sentences, gives each an
enforcer, and separates the nullables that are real "unknown" states from the ones that are optional
only because nobody decided.

**Observable.** The verdict is `redesign`, at least three invariants appear with an enforcer or a stated
app-only reason, and the reply names the application code path that would have to be the enforcer for
each app-only case.
