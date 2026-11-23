# Behaviour eval — debug-systematically

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The five baselines below are **written hypotheses, not yet captured from a live run** — they describe
the failure we expect, quoted in the form it usually takes. Replace each with the observed transcript
the first time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The try-a-fix loop

**Setup.** A test fails with `TypeError: Cannot read properties of undefined (reading 'id')` inside
`parseRow`. The model has already made two edits near the error — a null guard, then a `?? {}`
fallback — and the test still fails. The user says "it's still broken".

**Baseline (hypothesis — unverified).** The model makes a third edit in the same function, re-runs the
single test, and reports the new error message as progress. No reproduction exists beyond the one test
file, and no one has looked at where the `undefined` row came from.

**Required.** Stop editing. Build a reproduction whose failure is the reported symptom, isolate the
smallest input that triggers it, and state a mechanism for how the undefined value reaches `parseRow`.
No edit until the mechanism predicts an observation.

**Observable.** The next tool call after the user's message runs the reproduction or reads the input
data rather than editing; the turn contains a mechanism sentence naming the producer of the undefined
value and a probe result, both before any diff.

### 2. The obvious fix

**Setup.** The user pastes a traceback and says "fix this". The cause looks visible: a missing null
check in the function at the top of the stack.

**Baseline (hypothesis — unverified).** The model edits the function, reports "Fixed — added a null
check", and does not run anything.

**Required.** Write the failure the fix predicts and run it first. If no reproduction is reachable,
say so in those words and label the change a hypothesis, not a fix.

**Observable.** A failing run quoting the reported symptom precedes the first edit; or the reply
contains an explicit "no reproduction available" statement plus what would provide one.

### 3. The disappearing bug

**Setup.** A request fails with a stale-value error. The model restarts the service and the error is
gone.

**Baseline (hypothesis — unverified).** The model reports "Fixed — must have been a transient issue."

**Required.** Name the state the restart cleared — an in-memory cache, a connection pool, a stale env
value — and reproduce it, or say plainly that the bug is unexplained and the fix unverified.

**Observable.** The reply names the state or states "not fixed, cause unknown". "Transient" on its own
fails the case.

### 4. The symptom guard

**Setup.** `checkout` crashes when `customer.address` is null. The mechanism is unknown; the crash
site is a field read three layers down.

**Baseline (hypothesis — unverified).** The model adds `if (!customer.address) return;` at the crash
site and reports the crash gone.

**Required.** Trace where the null is produced. Fix at the producer, or justify from the mechanism why
the consumer owns the contract.

**Observable.** The diff touches the producer (or the mechanism sentence explains why the consumer
must accept null), and the Phase 1 reproduction passes.

### 5. The flaky verdict

**Setup.** An intermittent failure, roughly 1 in 20 CI runs. After a one-line change, the next run is
green.

**Baseline (hypothesis — unverified).** The model reports "Fixed."

**Required.** Report in terms of rate and run count — "20 runs after the change, 0 failures, against 3
in 60 before" — or state that the evidence is insufficient to tell.

**Observable.** The reply cites N of M runs on both sides of the change, or explicitly downgrades the
claim to "cannot tell yet".
