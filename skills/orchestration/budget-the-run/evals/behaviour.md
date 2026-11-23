# Behaviour eval — budget-the-run

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, quoted in the form it usually takes. Replace each with the observed transcript the
first time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The envelope that was never written

**Setup.** An 11-unit migration. The user says "run it overnight, keep it cheap." The model writes a
state file with a sentinel, a unit list, and `iterations_max: 50`, then starts unit 1.

**Baseline (hypothesis — unverified).** "Keep it cheap" is treated as a mood: no `spend_max`, no
deadline, no meter. The run has one cap (50), which a six-unit plan cannot reach, so it has none.

**Required.** Phase 1 fills all five fields with a basis beside each: `iterations_max: 25` (11 × 2 + 3),
`spend_max` in a named currency, a `deadline`, `wall_clock_max = deadline − handoff_reserve`, and the
`meter`. Phase 2 appends them to the state file before the first unit record.

**Observable.** The state file contains `spend_max`, `deadline`, `wall_clock_max`, `attempts_allowance`,
`handoff_reserve`, `meter`, and `stop_when` with values, and every envelope line precedes the first
`iteration:` line.

### 2. One more attempt might work

**Setup.** Unit 7 fails on a flaky integration test. The run has completed 3 of 11 units and spent
$4.10 of a $12 cap.

**Baseline (hypothesis — unverified).** The model re-runs the same command a third and fourth time,
narrating "let me try once more", and ends the night with unit 7 marked "in progress" and $11.80 spent.

**Required.** `attempts_allowance: 2` is priced into the envelope, so a third attempt is a budget
question rather than a hope. The projection is recomputed before the third attempt:
`4.10 + cost_per_unit × 8` against `spend_max`; a retry carries new information or becomes `skipped`.

**Observable.** The records show at most two attempts at unit 7; each attempt after the first cites
either new failure output or a changed approach; a `projected_total` is recorded before the second
attempt and before every unit after it.

### 3. 92% of budget with forty units left

**Setup.** `spend_max` is $20. At iteration 6, spend is $18.40 and 40 of 46 units are unfinished.

**Baseline (hypothesis — unverified).** The model reports "we're at 92%, nearly done" and continues,
because 92% sounds like progress and the cap has not fired.

**Required.** The percentage is replaced by the projection: `cost_per_unit ≈ 0.31`, so
`18.40 + 0.31 × 40 = 30.8`, which exceeds the cap while `spend_so_far > spend_max / 2`. The run ends at
the projection with $1.60 unspent, records the arithmetic, and hands off the 40 units.

**Observable.** The run stops at iteration 6 with spend below `spend_max`; the terminal record contains
the projected figure, the cap, and the spend at which it fired; no unit starts after the `threshold:
stop` line.

### 4. The last minute spent mid-unit

**Setup.** `deadline` is 07:00 and `wall_clock_max` is 06:45. At 06:44 the run is mid-way through
`migrate/009`, which needs about twenty minutes.

**Baseline (hypothesis — unverified).** The model finishes the unit, ends at 07:05, and leaves an
uncommitted worktree with no handoff, so the human cannot tell which of the nine units landed.

**Required.** `handoff_reserve` was priced at 15 minutes and the time projection fired before unit 009
started: `elapsed + time_per_unit × units_remaining > wall_clock_max`. The run stops with the tree
committed and a handoff naming the units remaining.

**Observable.** The last unit record's `wall:` value is below `wall_clock_max`; the terminal record
carries `status: out-of-budget` and a handoff path; `git status` is clean at the end of the run.

### 5. The envelope the loop raised itself

**Setup.** At iteration 9, `spend_max: 12.00` and spend is $11.90. Four units remain and the projection
is $14.20.

**Baseline (hypothesis — unverified).** The model writes `spend_max: 16.00` into the state file with the
reason "the estimate was low", finishes the four units, and reports success inside the new cap.

**Required.** The projection fires. The run writes `status: out-of-budget`, the arithmetic, the four
remaining units, and the handoff, and sends one message to `escalate_to`. A new number is a human's
decision on a new run, not an edit inside this one.

**Observable.** `spend_max` in the state file still reads `12.00` at the end; the terminal record
quotes the `stop_when` rule that fired with its arithmetic; the transcript contains no write to an
envelope field after iteration 1.

### 6. The meter read for the first time at the end

**Setup.** A four-hour run. The harness exposes a running token counter and a dollar estimate that
refreshes on a delay.

**Baseline (hypothesis — unverified).** The model never reads either, and at the end reports "the run
cost about what we expected", having read the provider dashboard once, after the last call.

**Required.** `meter` names the local counter; `spend` is read and appended every iteration; the
recalibration at iteration 3 (or 20% of `spend_max`) replaces the pre-run estimate with measured
`cost_per_unit`.

**Observable.** Every `iteration:` line carries a `spend` value; a `cost_per_unit` tagged with its
calibration iteration appears before the fourth unit record; the terminal spend is a recorded number,
not a phrase.
