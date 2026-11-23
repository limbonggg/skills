# Behaviour eval — premortem

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, quoted in the form it usually takes. Replace each with the observed transcript the
first time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The plan with only a happy path

**Setup.** The user pastes a six-week plan with milestones, owners, and dates, and says "we kick off
Monday". There is no risks section and no failure path.

**Baseline (hypothesis — unverified).** The model replies "The plan looks solid. A few risks to keep
in mind: scope creep, resourcing, and vendor delays. Worth monitoring as you go." No obituary, no
owner, no threshold.

**Required.** The model writes the obituary in the past tense — six weeks after the date, the project
is dead — generates causes from the plan's load-bearing claims, and gives every cause one disposition:
a mitigation with its cost and owner, a tripwire with a threshold and a date, or an acceptance with a
name. It names the kill shot and whether it is mitigated or accepted.

**Observable.** An artifact with all six slots filled; every cause is a past-tense event with an actor;
no cause contains "might", "could", or "if"; every disposition carries its artifact (cost and date,
all five tripwire parts, or a name and price).

### 2. The category list

**Setup.** The user asks "what are the risks?" and the model's first list is "scope creep,
communication, key-person risk, vendor delays".

**Baseline (hypothesis — unverified).** The model presents the four categories as the deliverable and
adds "we should monitor these closely" as the action.

**Required.** The model rewrites each category into a mechanism with an actor and an event, or drops
it. "Scope creep" becomes "the client added a second region in week 4 and the estimate did not move";
"key-person risk" becomes "the only person who can run the migration is on leave during the window".
Each rewritten cause then gets a disposition.

**Observable.** No cause in the final list is a bare category; each names an actor and an event; each
has an earliest observation; every disposition is one of the three, with its artifact.

### 3. The premortem after the point of no return

**Setup.** The launch date has been announced, the vendor contract is signed, and the migration is
scheduled for tomorrow. The user asks "any risks I should know about?".

**Baseline (hypothesis — unverified).** The model produces a risk list and concludes "most of these are
acceptable given the timeline" — acceptances with no names and no prices.

**Required.** The model says plainly which levers are already fixed and that the remaining dispositions
are tripwires and stop conditions, not mitigations. Each acceptance names a person and a price, and a
kill shot with no named acceptance is stated as a reason not to proceed.

**Observable.** The reply names the fixed lever, and every acceptance in the artifact carries a person,
a price, and a date; a kill shot without an acceptance is called out rather than absorbed into "risks".

### 4. The mitigation avalanche

**Setup.** The plan has three days of slack. The premortem produces nine causes, and the model proposes
a mitigation for all nine that adds roughly three weeks.

**Baseline (hypothesis — unverified).** The model presents the longer plan as the improved plan and
keeps the original date.

**Required.** The model prices the mitigations against the slack, states that the plan no longer fits,
and routes the choice — cut scope, move the date, or accept a cause by name — to a decision rather than
silently extending the timeline.

**Observable.** The reply contains the slack arithmetic and a decision request; the artifact's
dispositions are not all "mitigate", and the date is not quietly abandoned.

### 5. The stale premortem

**Setup.** A premortem was written at kickoff. Since then the date moved two weeks and a new
dependency was added. The user asks "are we still fine on the risks?".

**Baseline (hypothesis — unverified).** The model cites the kickoff premortem as current and says "the
risks are unchanged".

**Required.** The model notices the plan version changed, names which causes the change invalidates and
which it creates, and either re-runs the premortem or marks the old artifact stale with the trigger
that fired.

**Observable.** The reply names the changed plan element and the re-run trigger; no old disposition is
reused without being checked against the new plan.

### 6. The intention with no plan

**Setup.** The user says "we should probably do something about onboarding — what could go wrong?".
There is no date, no success measure, and no owner.

**Baseline (hypothesis — unverified).** The model invents a project — a redesign, a tutorial, an email
sequence — and writes failure modes for the project it invented.

**Required.** The model says there is no plan to stress, names what is missing (what ships, by when,
and the number that says it worked), and asks for it or routes to framing the problem before writing
any obituary.

**Observable.** No obituary or cause list is written against an unspecified plan; the reply names the
missing plan elements and the next skill.
