# Behaviour eval — migrate-safely

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, quoted in the form it usually takes. Replace each with the observed no-skill
transcript the first time a real baseline run happens. Every case is run twice, with and without the
skill; the without-arm is the control that makes the wording claim testable. A case whose two arms
look the same is a case the skill does not earn.

### 1. The rewrite request

**Setup.** A 900-line payments module. The user says "rewrite this against the new client, the old one
is unmaintainable". The module has tests, a scheduler, and one consumer service.

**Baseline (hypothesis — unverified).** The model creates a branch named `payments-v2`, rewrites the
module against the new client, ports the existing unit tests, runs them green, and reports the
migration complete. Differences from the old behaviour surface when production sends inputs the unit
tests never modelled.

**Required.** Phase 1 writes a parity contract naming the observable and a corpus of recorded
production requests. Phase 2 lands the new path beside the old behind a switch. Phase 3 shadows the
new path over the corpus and triages every difference into a bucket. Phase 4 moves a cohort and runs
the rollback once. Phase 5 deletes the old path only after a reader census and a full traffic cycle.

**Observable.** The transcript contains a change that adds the new path without deleting the old, a
difference report whose rows are each classified, and a deletion change that comes after the cohort
reached 100% — not one commit that replaces the module.

### 2. The major-version bump

**Setup.** `moment` is replaced by `date-fns` across 60 call sites. A codemod rewrites the imports and
the obvious calls; the suite is green.

**Baseline (hypothesis — unverified).** The model runs the codemod, fixes the compile errors, runs the
suite, and merges. Locale formatting and week-start differences appear in production reports weeks
later.

**Required.** Read the changelog's removed and changed sections before the codemod. Build a corpus of
real date inputs — timezones, DST boundaries, locale formats, week starts, invalid dates — compare
formatted output under a normaliser, and classify each difference. Cut over only when the differences
are explained or accepted.

**Observable.** The transcript cites the removed/changed list and a comparison over named edge inputs
(DST, locale, week start), not only a green suite.

### 3. The shadow that writes

**Setup.** An email-sending path is being migrated. The model proposes mirroring 5% of production
traffic to the new path to compare rendered output.

**Baseline (hypothesis — unverified).** The model enables live mirroring and compares the rendered
templates. The new path sends the same message a second time, and recipients receive duplicates.

**Required.** Identify the side effects first — send, charge, publish, consume quota — and divert them
to a sink, or replace live mirroring with a replay of recorded inputs. A shadow that writes is a second
production path with no users watching it.

**Observable.** The shadow configuration in the transcript has outbound delivery disabled, or the
corpus is recorded input; the comparison output contains no outbound send.

### 4. Delete it now

**Setup.** The cutover finished, the cohort has been at 100% for a day, and the user says "remove the
old code".

**Baseline (hypothesis — unverified).** The model deletes the old path and its tests in one change,
flips the flag default to the new path, and reports the migration done. One behaviour only the deleted
tests asserted turns out to matter a week later.

**Required.** Run the reader census first: grep the old symbol, route, and flag name across the repo
and the infrastructure config; check telemetry for calls over a full traffic cycle; delete the flag
from the flag store. Ship the deletion as its own change, with the characterization tests removed
alongside the code they pinned rather than rewritten to pass.

**Observable.** The transcript contains grep and telemetry output plus the flag-store removal before
the deletion diff, and the deletion diff removes tests instead of editing them.

### 5. The intentional difference

**Setup.** A pricing path is being migrated. Finance asked for tax to round differently in the new
implementation, and the shadow reports the difference on every invoice input.

**Baseline (hypothesis — unverified).** The model treats the difference as a defect in the new path,
"fixes" it to match the old rounding so the shadow goes clean, and ships a migration that silently
discards the requested change.

**Required.** An intentional difference is a contract change: written in the parity contract with its
reason and its owner, reviewed as a behaviour change, and preserved. The old path is what gets deleted;
the correction is not.

**Observable.** The parity contract records the accepted difference with its reason, the new path keeps
the new rounding, and the record names who asked for it.

### 6. The flag that was never deleted

**Setup.** A migration shipped months ago. The code contains `if (config.useNewParser)`, the flag store
still holds `useNewParser`, and the new path serves all traffic.

**Baseline (hypothesis — unverified).** The model reads the flag's default as the new path, concludes
the migration is finished, and changes nothing — or removes the `if` but leaves the flag in the store
and the old branch's dead helpers in place.

**Required.** Off is a state, deleted is a fact. Remove the flag from the store, delete the branch and
the helpers it kept alive, delete the tests that pin the old path, and grep for the flag name to prove
nothing reads it.

**Observable.** Grep for the flag name returns no hits outside the migration record, the flag store
listing no longer contains it, and the diff deletes the old branch rather than defaulting to the new
one.
