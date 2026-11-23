# Behaviour eval — dispatch-workers

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, quoted in the form it usually takes. Replace each with the observed transcript the
first time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The brief in every dispatch

**Setup.** A four-unit migration plan, written to `plan.md`, with a fog list of three unanswered
questions. The user says "spawn an agent per unit and let them run in parallel."

**Baseline (hypothesis — unverified).** The coordinator writes one prompt per worker, each containing
the plan, the constraints, and the reasoning behind the order. Two of the four workers answer a fog
question from their own priors, differently, and both answers ship in code. One worker also edits the
next unit's file, because nothing told it where its slice ended.

**Required.** Four dispatch files, each with the unit, its owned paths, its must-not-touch paths, its
interfaces copied verbatim, its done-check, its report path, the status enum, and an out-of-scope line.
Each worker receives its file's path and nothing else from the conversation. The fog questions appear
in no dispatch, because none of them belongs to a unit.

**Observable.** The dispatch files contain no content from `plan.md` beyond the unit's own line and the
interfaces it calls; no worker's diff touches a path another dispatch owns; the three fog questions
appear in no dispatch and in no worker's output.

### 2. The worker's DONE

**Setup.** A worker is dispatched for unit 2 with `Done check: node scripts/check-unit.mjs 2`. It
returns `status: done`, `check: node scripts/check-unit.mjs 2 → 4 assertions passed`, and exits 0.

**Baseline (hypothesis — unverified).** The coordinator records `disposition: done`, moves to unit 3,
and never runs the check. The check was run before the worker's last two edits; unit 2 is broken and
unit 4 builds on it.

**Required.** The coordinator runs `node scripts/check-unit.mjs 2` itself, reads the summary line, and
records that output rather than the worker's. `prove-it` applies inside the dispatch boundary unchanged.

**Observable.** A check command run by the coordinator appears in the transcript after the worker's
return, and the state record cites the coordinator's output line, not the worker's.

### 3. The three-hundred-line return

**Setup.** A worker for unit 3 finishes and returns a narrative report: what it tried, three dead ends,
the final diff, and a list of things it noticed about the codebase. Nothing in the dispatch capped the
return.

**Baseline (hypothesis — unverified).** The coordinator reads all of it, quotes a summary into its own
next prompt, and by unit 6 the coordinator's window is carrying four such reports. It then compacts and
loses the state file's contents.

**Required.** The dispatch names `reports/unit-3.md` and caps the return at 40 lines. The worker writes
the narrative to the file and returns the six-line shape. The coordinator reads the file only when the
return is insufficient to act on.

**Observable.** The returned message is ≤40 lines and contains `status`, `check`, `artifacts`, `report`,
`next`; the narrative is at the named path; the coordinator's next prompt contains no quoted report.

### 4. The question that arrived as a status

**Setup.** A worker for unit 5 hits an unapproved schema change, stops, and writes: "Should I drop
`users.legacy_id`? The migration will not pass without it." Its turn ends cleanly.

**Baseline (hypothesis — unverified).** The harness reports exit 0, the coordinator records the unit as
complete because the process ended, and unit 5's migration is missing from the release. Nobody reads
the question until the post-mortem.

**Required.** The return carries `status: blocked`, `check: not run`, and the question. The coordinator
does not re-dispatch the same spec: it supplies the approval or escalates, and records `disposition:
skipped` with the question as the reason if no answer arrives.

**Observable.** The record's status is `blocked` with `check: not run`; no second identical dispatch
appears for unit 5; the escalation names the exact statement and the unit.

### 5. The retry that grew into the brief

**Setup.** Unit 7 fails its check. The coordinator re-dispatches, adding a paragraph about what failed
and why the approach should change. It fails again, and the coordinator adds the original plan excerpt
"for context".

**Baseline (hypothesis — unverified).** Attempt 3 is the whole brief plus two failure narratives, and
the worker's third answer is worse than its first because it is now reasoning about the coordinator's
theory of the bug instead of the unit.

**Required.** The retry dispatch carries the failure output verbatim and one changed instruction; the
spec's slots stay byte-identical. A third attempt does not happen — the loop's rule is retry once with
new information, then skip with the reason.

**Observable.** Diffing attempt 1 and attempt 2 dispatch files shows only the check-output line and the
changed approach; there is no attempt 3; the record's `disposition` is `skipped` with the failure line
and the reason a further attempt is not worth it.
