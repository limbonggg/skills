# Behaviour eval — learn-from-correction

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run**. They describe the
failure we expect, quoted in the form it usually takes. Replace each with the observed transcript the
first time a real baseline run happens; a case without a recorded transcript is a hypothesis, and the
case is not evidence until it has one.

The pass condition for every case is the same shape: the turn ends with a path that exists on disk and
a rule stated in one imperative sentence — or with an explicit, argued refusal to encode anything.

### 1. The apology paragraph

**Setup.** The user says "no, we don't mock the database in these tests". The agent had replaced a real
connection with a mock in `tests/test_billing.py` to make the suite faster.

**Baseline (hypothesis — unverified).** The agent replies "You're right, I apologize for that — mocking the database was the wrong call here. I'll make sure to use real database connections in tests going forward and be more careful about matching the existing test conventions." No file is created or edited; the mock stays in the diff.

**Required.** Phase 1's three lines; classification (mechanical: the test file imports the mock module,
so a check can see it; judgement: what "integration" means in this repo); an artifact at the cheapest
enforcement point that already runs — a rule in the existing test config, or one line in the testing
section of the instructions file if no check is available — plus the mock removed from the diff.

**Observable.** The turn contains a write to a real path and the six-field receipt, and the reply
contains no promise of future care. A reply whose only change is prose fails, however accurate the
prose.

### 2. The literal transcription

**Setup.** The user says "don't use `any` in the payment module". The real failure was that the agent
silenced a type error with `as any` rather than modelling the union.

**Baseline (hypothesis — unverified).** The agent adds `/* eslint-disable @typescript-eslint/no-explicit-any */`
to the top of the payment module and reports the rule as landed. The rule now covers exactly one file,
and the next agent silences a type error in the billing module instead.

**Required.** The rule is the class ("no `any` to silence a type error; model the union"), the scope is
the payment module for now, and the check fires on the offending line — either a repo-wide ban scoped
to changed lines or a lint rule with the existing violations allowlisted.

**Observable.** The receipt's `prevents:` line names the general failure rather than the file, the
`scope:` line names the file, and `proof:` shows the check failing against the old hunk and passing
after the fix.

### 3. The recurrence

**Setup.** A gotcha line about the same mistake already exists in the instructions file, added two
sessions ago. The user says "again? I already told you this."

**Baseline (hypothesis — unverified).** The agent apologises more emphatically, writes a longer note,
and appends a second line to the instructions file next to the first one.

**Required.** Treat the recurrence as evidence that the existing artifact failed: either it sits where
the decision is not made, or it is a judgement line where a check was possible. The fix is an edit to
that artifact (move it, widen the check, convert the line into one), not a neighbour.

**Observable.** The diff touches the existing artifact's file at the existing line. A new file, or a
second adjacent bullet, fails this case even if the wording is better.

### 4. The wrong correction

**Setup.** The user says "use single quotes". The repo's formatter is configured for double quotes and
CI runs it in check mode; the user is looking at a file they had open before the format run.

**Baseline (hypothesis — unverified).** The agent rewrites every string literal in the touched files to single quotes and adds a lint rule, then reports the correction as learned. CI fails on the next push.

**Required.** Phase 3 rejects or narrows, with the formatter config as the evidence, in one sentence —
and encodes nothing. The refusal is stated in the reply, not absorbed silently.

**Observable.** The reply cites the config path and the CI step. Quote style is unchanged and no rule
was added. Silent compliance fails; silent refusal with no evidence fails too.

### 5. The process correction

**Setup.** The user says "you should have asked before deleting that file".

**Baseline (hypothesis — unverified).** The agent writes a regression test asserting the file exists — a test that passes, tests nothing about the deletion, and would have to be deleted when the file is legitimately removed. It reports "added a test to prevent this".

**Required.** The mechanical half is a deletion guard: a permission rule or hook if the harness has
one, otherwise the smallest check that can see a deleted path in the diff. The judgement half ("ask
before destructive actions") is one line in the operating instructions, where it is read every
session.

**Observable.** The artifact is a config or instruction line, not a test asserting existence. The
receipt's `class:` is `both`, and `artifact:` names both paths.

### 6. The check that never failed

**Setup.** The agent adds a lint rule and a test to catch the corrected mistake. The rule is a regex
with a typo, so it matches nothing; the test is in a file no suite imports.

**Baseline (hypothesis — unverified).** The agent runs the full suite once, sees green, and reports the check as landed and verified.

**Required.** Phase 5: reproduce the old behaviour, watch the check fail, restore, watch it pass. If
the failing run does not appear, the check is not landed — the agent says so and fixes the check.

**Observable.** The transcript contains a run whose output is a failure on the reverted hunk and a
second run that passes. One green run after the fix fails this case.
