---
name: migrate-safely
description: Use when code is being moved rather than fixed — "rewrite this module", "upgrade to v2", "migrate off the old library", "port this to Rust", "swap the framework", "replace the ORM", "big-bang refactor", "rip out the legacy path", "one PR that changes everything", "we'll fix the edge cases in prod". Not for schema or data moves (use judge-data), whether to migrate at all (use make-the-call), or making the change test-first (use red-green).
domain: execution
risk: destructive
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: big-bang-rewrite-merged-before-the-edge-cases
  eval: evals/
# pack membership is declared in packs/*.yml, not here — one skill lives in many packs
---

# Migrate Safely

A migration is a sequence of states the system can be deployed in, each one safe. This skill turns a
rewrite branch into expand → shadow → contract: the new path beside the old, both compared on real
inputs, traffic moved by a switch, and the old path deleted only when nothing reads it.

```
NO CUTOVER WITHOUT A SHADOW THAT AGREED ON REAL INPUTS; NO DELETION UNTIL THE OLD PATH HAS NO READERS.
```

## When to use / when not to use

Use when:

- the user says "rewrite", "migrate", "port", "upgrade", "swap", "replace", "move off", "rip out",
  "modernise", "get onto", "v2", or "big-bang refactor"
- the change replaces a path rather than fixing one: a library, a framework, an API version, a
  protocol, a vendor, a language runtime, an ORM, a queue, an auth provider
- the old path must keep serving while the new one is built — live traffic, other teams, published
  clients, a mobile app already in the wild
- a branch named `rewrite` or `v2` has been open for days, or the plan is "one PR that changes
  everything"
- a cutover date exists and no way to compare old and new output exists
- the upgrade compiles and the user asks whether it is safe to merge
- a rewrite already merged and the edge cases are arriving in production

Not when:

- schema, columns, backfills, or rows are moving — that is `judge-data`, which owns the data verdict;
  this skill owns code, API, library, and framework mechanics
- the change is a fix inside one path — that is `red-green`
- the question is whether to migrate at all — that is `make-the-call`; price the rewrite there,
  execute it here
- the question is whether the migration works — that is `prove-it`
- the deliverable is a compatibility verdict on a published API surface — that is `judge-api`; this
  skill runs the mechanics that verdict asks for
- the migration needs slicing into tickets — that is `split-by-frontier`

| if the situation is | use |
|---|---|
| the old and new code must both run for a while | this skill |
| the rows must move | `judge-data`, then this skill for the code around them |
| the clients must not break | `judge-api` for the contract, this skill for the rollout |
| the work is decided and one path changes | `red-green` |
| "is it safe to merge?" | this skill produces the evidence; `prove-it` states it |
| "should we rewrite it?" | `make-the-call` |

## The process

Five phases. Each ends in a state that can be deployed and rolled back — that is the whole difference
from the rewrite branch.

### Phase 1 — Write the parity contract

"Same behaviour" is not a test until it names an observable, a comparison, a tolerance, and an input
corpus. Write the sentence: *for inputs of this kind, the new path's X equals the old path's X, except
Y, which we accept because Z*.

The observable is what a consumer sees: response body, stored value, emitted event, status code, exit
code. Not the function's internal state, not a log line, not the shape of the code.

The corpus is where the differences hide. Production-shaped inputs: recorded requests, replayed queue
messages, exported rows, captured fixtures. A corpus of hand-written happy paths proves the new path
handles what you already thought of — the set the old path already handled.

**Done when:** one sentence names the observable, the comparison, the tolerance, and where the corpus
comes from, and every difference you have already chosen to accept is written down with its reason.

### Phase 2 — Expand: put the new path beside the old

Add the new path without removing, rewiring, or renaming anything the old path uses. Both paths must
be reachable in one deployable artifact. The new path is off by default, or unreachable from
production routes, but it is exercised — a test, an admin route, a dry-run entry point.

This is where the migration stops being a branch. The change lands in small commits against mainline
while the old path serves everything, so the merge conflicts you were going to discover at the end
happen now, one at a time, against real code.

Two things ship in this phase: the **switch** (a flag, a route, a cohort rule — one place that decides
which path serves a request) and the **sink** for the comparison (where old and new outputs are
recorded). A switch with no comparison is a cutover waiting for a date.

**Done when:** a deployable artifact contains both paths, the new one is reachable without serving
production traffic, and the switch is a single named place in the code.

### Phase 3 — Shadow: run both, compare, triage every difference

Run the new path on the same inputs as the old and compare the outputs against the parity contract.
The mechanism is chosen by what you have: an in-process branch that computes both and serves the old,
a replayed corpus through the new path offline, a mirrored read against the old, a canary cohort whose
responses are compared out of band.

The shadow is **read-only**. If the new path sends, charges, writes, publishes, or consumes quota,
those side effects are diverted to a sink or the shadow becomes a replay. A shadow that writes is a
second production path with no users watching it.

Every difference is triaged into exactly one bucket, and each gets a record:

| bucket | what it means | what happens |
|---|---|---|
| new path is wrong | the old behaviour was intended | fix the new path, re-run |
| old path is wrong | the new behaviour is the correction | the parity contract changes, with a reason, reviewed as a behaviour change |
| accepted difference | both are defensible; the difference is priced | written in the contract with its reason and its owner |
| undefined | neither path's behaviour was ever specified | decide it, record the decision, then it is one of the three above |

An unexplained difference is not noise. "We'll see if it matters in prod" moves the comparison to the
one environment where you cannot replay the input.

**Done when:** the difference count is zero except for accepted differences, every accepted difference
is in the contract with its reason, and the corpus covers the input distribution you expect in
production — not only its happy paths.

### Gate — the cutover record, before Phase 4

Phase 4 moves production traffic and Phase 5 deletes the old path, so neither starts until one
artifact exists: a **recorded approval** naming the first cohort the switch will move, the switch by
name, and the rollback action — written down and attributed to the person or channel that gave it. The
record is the gate. "We agreed to ramp it" with nothing behind it is not the artifact, and a gate that
says "do not proceed until you are sure" is not a gate either.

The operator produces the record; this skill stops at it.

**Done when:** the record names the cohort, the switch, and the rollback action, and carries an
attribution — a name, a ticket, or a message link — that someone other than the author can check.

### Phase 4 — Cut over behind the switch

Move traffic in cohorts the switch can express: one internal account, one region, one tenant, one
endpoint, a percentage. Each step is observable and reversible by flipping the switch back, not by
reverting a merge.

Exercise the rollback before the ramp finishes. A rollback nobody has run is a hope; a rollback run
once at the smallest cohort is a fact.

Watch the observable the contract names, plus the one thing parity cannot cover: the new path's cost —
latency, error rate, resource use. A migration that is behaviourally identical and four times slower
has not passed.

**Done when:** the new path serves the target cohort, the rollback has been executed at least once and
is a switch flip, and the metric the contract names is compared against the pre-cutover baseline at
the final cohort size — once the old path serves nothing, that baseline is the only comparison left.

### Phase 5 — Contract: delete the old path, and prove it is gone

Deletion has three readers to satisfy: the code (grep the symbol, the route, the flag name across the
repo and its infrastructure config), the runtime (telemetry or logs showing no calls on the old path
for a full traffic cycle), and the switch (the flag deleted from the flag store, not set to false).

Then delete in one change: the old path, its tests, its config, its dead branches, its documentation.
Characterization tests that pin the old behaviour go with it — updating them to pass against the new
path is how two behaviours become one untested one.

A flag set to false is not a deleted path. The code, the test, the config, and the next reader's
understanding of the system all still contain it.

**Done when:** grep for the old symbol, route, and flag name returns nothing outside the migration
record, the flag is gone from the flag store, and the removal shipped as its own change after the
switch's cohort reached 100%.

## Gotchas

- A feature flag is a second code path forever. `if (newPath)` with a false default reads as "removed"
  to everyone except the compiler and the next reader; delete the flag from the store, then the branch.
- Dual-writing to two stores without a reconciliation job is two sources of truth with no owner. One
  side is authoritative; the other is compared against it, and the comparison has a report someone
  reads.
- Shadowing on live mutable state compares two racing reads. Both paths read a row that is updated
  between them, and the diff is the write, not the migration. Copy the input first, or accept the
  noise and say so.
- Serialised-output comparison catches shape and misses meaning: key order, float formatting,
  timestamps, generated ids, locale, and whitespace all differ without a behavioural difference.
  Compare the parsed value under a normaliser, or you will triage noise until you stop triaging.
- A major-version bump is a semantics change before it is an API change. Sort stability, default
  timeouts, error types, null handling, rounding, and timezone behaviour live in the changelog's
  "changed" section, and the codemod does not read it. Compile-green is not behaviour-green.
- Two versions of the library in the dependency graph means part of the system never migrated.
  `npm ls <pkg>`, `go mod graph`, `pip show`, or the lockfile shows the second copy; the "upgrade" is
  partial until it is gone.
- A canary finds errors proportional to volume; rare inputs need a replay corpus. One percent of
  traffic for an hour exercises the common path and almost none of the edge cases the rewrite was
  going to discover in prod.
- The switch is read in more places than the file you edited: middleware, background jobs, cron, admin
  routes, cached client bundles, older SDK versions. Grep the flag name across the repo and the deploy
  config before you believe the cohort is what you set.
- Flag defaults differ per environment. A flag on in staging and off in prod makes a finished cutover
  look like a staging-only one, and nobody notices until the release note.
- Deleting the old path breaks its tests first, and those tests are the only record of what the old
  path was for. Read them before deleting; a behaviour only they assert is a behaviour you are about
  to drop.
- A codemod that touches every call site in one commit is a rewrite with a compiler. It is safe
  exactly when the compiler proves the change — renames, imports, type-only moves — and unsafe the
  moment it claims a semantic change.
- Vendor swaps move the data, not only the calls. The last mile of an auth, payments, or storage
  migration is a row migration, and that is `judge-data`'s verdict.

## Rationalizations

| Excuse | Reality |
|---|---|
| "It's a rewrite — the old code is the spec, so I'll port it all and test at the end." | The old code is a spec nobody has read in full. The shadow is how you find out what it actually does. |
| "A feature branch keeps main clean." | Main is where the real inputs are. A branch open for weeks is a merge you have not done, and its conflicts arrive with the edge cases. |
| "Keeping both paths is duplication; I'll just replace it." | Duplication for one deploy window is the price of a comparison. The alternative is finding the differences in production, with no oracle. |
| "The types match, so the behaviour matches." | A type is a shape, not a semantics. Sorting, rounding, null, timezone, and error types all type-check. |
| "The tests pass on the new path." | Tests assert what you thought to assert. The shadow asserts what production actually sends. |
| "We'll delete the old path in a follow-up." | The follow-up has no ticket and the flag becomes the architecture. Deletion is a phase, not a wish. |
| "The flag is off, so it's gone." | Off is a state; deleted is a fact. Grep is the test. |
| "Shadow traffic is too expensive." | Then the corpus is a replay, a fixture, or a read-only mirror at the smallest cohort. The alternative's cost is discovered in production. |
| "It's the same library, just a major version." | Major means removed and changed, by the definition of the version number. Read the removed list. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Strangler fig", "parallel run", "blue/green", "canary", and "codemod" are either these three states or they are the big bang with a better name. |

## Red flags

- You are about to open a branch that changes more than one deployable unit, or whose name is
  `rewrite`.
- You are deleting the old path in the change that adds the new one.
- You have no comparison between old and new output, only a reading of the new code.
- Your shadow writes, sends, charges, or consumes quota.
- Your parity contract says "same behaviour" and names no observable.
- You are updating the old path's tests to pass against the new path instead of deleting them with it.
- You are setting the flag to false and calling the old path deleted.
- You are explaining why this migration is too small or too simple for a shadow.

## Limitations

- Assumes the old path can still run: one deployable artifact, one process, or a replayable corpus of
  its inputs. When the old path is a vendor you are leaving, the comparison is a recorded corpus, and
  the final data move is `judge-data`.
- Cannot make an intentional semantics change safe by comparison. If the new behaviour is meant to
  differ — new pricing, new rounding, a stricter parser — parity is not the oracle; the spec is, and
  the difference is reviewed as a behaviour change rather than triaged as a bug.
- The shadow costs real compute, reads, and quota, and this skill cannot tell you whether that cost is
  worth paying. Price it in `make-the-call`; execute it here.
- Cannot verify that the corpus represents production. A clean shadow over unrepresentative inputs is
  a clean read of the wrong inputs, and only traffic composition answers that.
- Not a codemod catalogue. Mechanical, compiler-checkable moves are enforced by the compiler and the
  linter; this skill governs the sequence around them, not the transform itself.
- Stops at the cutover record. It does not move traffic itself: the switch flip against the named
  cohort is an operator action, and the recorded approval is where this skill's authority ends.
