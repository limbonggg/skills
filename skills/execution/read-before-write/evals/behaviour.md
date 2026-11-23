# Behaviour eval — read-before-write

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, quoted in the form it usually takes. Replace each with the observed transcript the
first time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The plausible spot

**Setup.** A Python repo where `parse_amount(raw)` is called from `invoice.py:88`, `report.py:41`, and
`worker/retry.py:17`. The retry worker passes `None` for missing currency and relies on the function
returning `0` instead of raising. The test suite covers only invoice and report. The user says
"parse_amount should raise on bad input instead of returning 0 — just change the return".

**Baseline (hypothesis — unverified).** The model opens `parse_amount`, changes the `return 0` branch to
`raise ValueError`, runs the two test files it can see, and reports "now raises ValueError on bad
input". The next retry job crashes, and the crash is filed as a retry-worker bug.

**Required.** Phase 2 finds all three call sites and dispositions them; Phase 3 records the
postcondition "returns 0 on missing currency" and the caller that depends on it; the reply either
updates `worker/retry.py` or names the dependency and prices the behaviour change.

**Observable.** A note listing `worker/retry.py:17 → depends-on-current-behaviour` exists before the
diff, and the diff either touches that file or the reply states the behaviour change and its consumer.

### 2. The string caller

**Setup.** `config/settings.yml` sets `retry_max: 3`; `app/boot.rb:12` reads it with
`fetch("retry_max")`; `deploy/configmap.yaml` and a Helm template set the same key. The user says
"rename retry_max to max_retries".

**Baseline (hypothesis — unverified).** The model greps `retry_max`, finds the two Ruby hits, renames
them, and reports done. The ConfigMap still sets the old key, so production silently falls back to the
code default of 5 — no error, different behaviour.

**Required.** A literal search across config, templates, deploy manifests, schema, and migrations, and a
read of the entry point that loads settings. If the deploy manifest lives outside the repository, the
`Unknown` slot names it instead of assuming it is empty.

**Observable.** The search covers `*.yml`, `*.yaml`, `*.tmpl`, and the deploy directory, and the reply
either updates the ConfigMap or states that it is outside the repo and must change with the release.

### 3. The error contract

**Setup.** `fetch_user(id)` raises `NotFound`; five callers catch `NotFound` specifically; a sixth calls
it inside `except Exception: return None`. The user says "change fetch_user to return null instead of
raising — it's cleaner".

**Baseline (hypothesis — unverified).** The model changes the function and its docstring, updates the
two callers visible in the same file, and reports done. The broad-catch caller now returns `None`, and a
layer above does `user.email` — an `AttributeError` attributed to an unrelated module.

**Required.** Phase 3 counts the catch sites before changing the error contract, and every caller gets a
disposition. The change is made across all six callers or not made.

**Observable.** The note's `Contract: errors` slot names the catch sites, and the diff covers each
caller or the reply states the contract change and lists its consumers.

### 4. The invariant across the seam

**Setup.** `normalize_tags(tags)` sorts the argument list in place and returns it. `search.py:60` sorts
its own list once, then calls `normalize_tags` two hundred times in a loop and ignores the return value.
The user says "normalize_tags should return a sorted copy — in-place mutation is bad practice".

**Baseline (hypothesis — unverified).** The model changes the body to `return sorted(tags)`, the unit
tests pass because they compare the return value, and search results come back in input order in
production because `search.py` never used the return value.

**Required.** Phase 4 names the invariant "the argument is sorted in place" with its enforcement site,
and the note flags the caller that discards the return value before the diff.

**Observable.** The note's `Invariants` slot cites `search.py:60`, and the diff either keeps in-place
sorting or updates the caller.

### 5. The hurry

**Setup.** The user says "we ship in ten minutes, just change the default timeout to 30 and don't touch
anything else". The default is a module constant imported in fourteen places, and one test asserts the
value is 60.

**Baseline (hypothesis — unverified).** The model edits the constant and reports done. The test
asserting 60 fails in CI after the deploy window, and one importer that passed 60 explicitly now
behaves differently from the module default it claimed to follow.

**Required.** The map is still produced, compressed to the note, before the diff: the constant's readers
are dispositioned, and the test asserting the old value is found and updated or reported.

**Observable.** A caller list exists before the diff even under time pressure, and the test that asserts
the old default is named.

### 6. The map changes the seam

**Setup.** `charge(customer)` has forty call sites across six packages. The user says "add an
idempotency key parameter to charge".

**Baseline (hypothesis — unverified).** The model adds a required parameter and edits forty call sites,
guessing the key at each; half are wrong, and the diff is unreviewable.

**Required.** Phase 2's caller count is read as a finding about the seam: forty callers means the seam is
wrong. The reply names the level decision — an optional parameter with a default, a request struct, or a
wrapper — and routes the shape question to `judge-architecture` before any diff.

**Observable.** The caller count appears in the note before the diff, and the reply names the seam
decision rather than starting a forty-file edit.
