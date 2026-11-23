# Behaviour eval — write-a-skill

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The six baselines below are **written hypotheses, not yet captured from a live run** — they describe
the failure this skill exists to prevent, quoted in the form it usually takes. Replace each with the
observed transcript the first time a real baseline run happens. A case without a recorded baseline is
a hypothesis, and this skill's own Phase 5 says so.

### 1. The tutorial instead of an intervention

**Setup.** The user says "write a skill so the agent stops saying 'should work now' before it runs
anything." No failure transcript is supplied.

**Baseline (hypothesis — unverified).** The model writes a 60-line document titled "Verification Best
Practices", with sections "Why verification matters" and "General principles", a soft instruction to
"always verify your work", no Iron Law, no recorded baseline, and no `evals/` directory.

**Required.** The model asks for or produces the failing turn first, quotes the exact sentence the
model wrote ("Done — everything should work now"), applies the three tests in `docs/AUTHORING-STANDARD.md`
§1, classifies the failure as "skips a known rule under pressure", and writes the discipline form: a
trigger-spec description, one Iron Law, a rationalization table built from the quoted drift, and both
eval files with the baseline recorded.

**Observable.** `evals/behaviour.md` contains a verbatim quoted line from a run without the skill, and
the body contains no "why this matters" section; `metadata.baseline` names the failure in five words.
The distinguishing signal is the presence of a quote, not the presence of a table.

### 2. The persona card

**Setup.** The user says "make a senior-reviewer skill, so reviews stop being rubber stamps."

**Baseline (hypothesis — unverified).** The model writes "You are a seasoned staff engineer with 15
years of experience. You are meticulous, pragmatic, and you care deeply about quality. Approach every
review with rigour and empathy." The body is adjectives; there is no vocabulary, no rejection list, and
no verdict.

**Required.** The model routes the lens form to `docs/TAXONOMY.md` §2 and produces the five parts: a
locked vocabulary of 5–7 terms with `_avoid_` synonyms, a rejection list with a reason per entry, a
decision procedure with a hard zero tier, exact values or a stated refusal, and a verdict enum plus a
`Tier:` slot. The identity adjectives are deleted, not softened.

**Observable.** The body contains a vocabulary table with an `_avoid_` column, a "Rejects on sight"
list, and a zero-tier verdict; the model's reply names no adjective about the model's own character.

### 3. The description that summarises the workflow

**Setup.** The user says "write a skill for reviewing migrations."

**Baseline (hypothesis — unverified).** The description reads "Use when reviewing a migration: first
check the lock level, then the backfill batching, then the rollback path." The body repeats the same
three steps.

**Required.** The description becomes a trigger spec: literal words a user says ("review this
migration", "will this lock the table", "is this backfill safe"), one trigger per branch, and a
non-scope clause naming `judge-data` or `red-green` as appropriate. The lock/backfill/rollback
sequence stays in the body, where the workflow belongs.

**Observable.** The description contains no "first/then/step 1/you will/followed by" sequence, names at
least one adjacent skill in its non-scope, and the trigger eval contains a `should_not` query ("review
this schema change") routed to the adjacent skill.

### 4. The invented eval

**Setup.** The user says "add the evals so this can ship."

**Baseline (hypothesis — unverified).** The model writes twenty near-paraphrases of its own
description under `should:`, four vague `should_not` entries, and three behaviour cases whose Baseline
lines read "The model probably does X". No run is recorded, and no case says it is a hypothesis.

**Required.** Queries are drawn from how users phrase the problem, including near-misses routed to the
skill that should fire; the `should_not` set is at least as specific as the `should` set. Each
behaviour case carries Setup, Baseline, Required, and Observable, and every baseline is either a
quoted transcript or explicitly labelled a hypothesis — never an unlabelled guess presented as
observed.

**Observable.** The Baseline lines either quote a run or carry "hypothesis — unverified"; every
`should_not` entry names the skill that should fire; the validator's `evals-triggers-insufficient` and
`evals-behaviour-shape` rules produce no finding.

### 5. The skill for something a script can decide

**Setup.** The user says "write a skill so the agent always runs prettier before committing."

**Baseline (hypothesis — unverified).** The model writes a 40-line skill instructing the agent to run
the formatter, with a rationalization table about remembering.

**Required.** Phase 1's check test fires: a program can decide whether the formatter ran, so the
artifact is a pre-commit hook or a CI step, not a skill. The reply says no skill was written, names the
check it landed instead, and states that a skill for a decidable rule is a skill that gets skipped.

**Observable.** The deliverable is a script or CI entry plus the command that shows it failing before
the fix and passing after; the `skills/` tree is unchanged.

### 6. The revision that never fires

**Setup.** An existing skill exists and the user says "it never fires on how I actually ask."

**Baseline (hypothesis — unverified).** The model rewrites the body — shorter sections, clearer
phrasing, a new gotcha — and reports the skill improved. The description and `evals/triggers.yml` are
untouched.

**Required.** The model treats the description as the routing surface: it writes the phrasing the user
actually types as a `should` query, runs it against the current description, records the miss, edits
the description's literal words, and adds the near-miss that should still route elsewhere. The body
changes only after the trigger eval moves.

**Observable.** The diff shows `evals/triggers.yml` and the description changing before any body edit;
the reply cites the query that missed and the phrasing that now catches it.
