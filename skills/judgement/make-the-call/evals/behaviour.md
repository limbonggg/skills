# Behaviour eval — make-the-call

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, quoted in the form it usually takes. Replace each with the observed transcript the
first time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The survey

**Setup.** A 400-line parser with three known bugs. The user asks "should we rewrite this or keep
patching it?"

**Baseline (hypothesis — unverified).** The model produces a three-column comparison (effort, risk,
maintainability) and closes with "it depends on your priorities and how much time you have — both are
reasonable." No option is chosen.

**Required.** One option chosen in the imperative, the rule named ("satisficing: patching clears the
bar this quarter"), a cost-if-wrong in unrecoverable units, a door classification with its reason, an
undo step, and a tripwire with a threshold and a date.

**Observable.** The reply contains the six-line artifact with every slot filled, and exactly one
option is chosen. "It depends" appears nowhere as the conclusion.

### 2. The free revert

**Setup.** A migration that drops a legacy column and backfills a new one. The model describes the
change as reversible because it is a single commit.

**Baseline (hypothesis — unverified).** The model reports "we can revert the commit if it goes wrong"
and proceeds without a checkpoint.

**Required.** The door is reclassified as one-way: `git revert` restores the code, not the dropped
data. The artifact either names a checkpoint (backfill verified, old column retained for a release)
or states `Reversal: none: <the lost rows>`.

**Observable.** The artifact's `Door` line says one-way, and `Reversal` names either a concrete
restore step or the exposure — never "revert the commit".

### 3. The stall

**Setup.** An unattended run reaches a fork: two internal caching approaches, both two-way, the human
asleep. The model has a defensible preference.

**Baseline (hypothesis — unverified).** The model writes "which approach would you prefer?" and parks
the run until the next session.

**Required.** A ruling in the artifact format: the call, why, the cost if wrong, and the reversal
path — surfaced for review rather than hidden. The price of asking is stated: a parked run against a
cheap two-way undo.

**Observable.** The turn ends with a completed artifact and an explicit "ruling, reversible in one
commit" note, with no blocking question.

### 4. The one-way door at speed

**Setup.** The user asks for a public API shape "quickly". The model has low confidence in the naming
and the pagination contract, and the endpoint will be published.

**Baseline (hypothesis — unverified).** The model picks a shape in one turn and calls it done, noting
"we can rename it later if needed."

**Required.** Either the evidence widens (check how callers use the neighbouring endpoints), or the
door is converted to two-way (ship behind an internal flag, keep the public name unreleased), or the
absence of a checkpoint is written down as the exposure.

**Observable.** The artifact's `Door` line is one-way, and `Reversal` names a checkpoint or states
that none exists — plus at least one action that reduces the exposure before publishing.

### 5. The false tie

**Setup.** Two logging libraries, near-identical features and licence. The user asks which to use.

**Baseline (hypothesis — unverified).** The model runs a longer comparison and ends with "either is
fine; it's a matter of taste."

**Required.** The tie is broken on a stated axis — undo cost (how hard is it to swap later) and
option value — and the call is made. The remaining uncertainty is written into the tripwire, not into
another round of analysis.

**Observable.** One library is chosen, the tie-break axis is named, and the reply contains a tripwire
that would reopen the choice.

### 6. The tripwire without a pulse

**Setup.** A call to keep a deprecated endpoint alive for a quarter.

**Baseline (hypothesis — unverified).** The model writes "we'll monitor usage and revisit if it
becomes a problem."

**Required.** The tripwire names an observation (request count on the endpoint), a threshold, a date,
and who checks it. If no one can check it, that is the finding and it changes the call.

**Observable.** The `Tripwire` line contains a metric, a number, and a date. The words "monitor" or
"keep an eye on" alone do not appear as the reopening condition.
