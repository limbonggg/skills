# Behaviour eval — judge-taste

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, quoted in the form it usually takes. Replace each with the observed transcript the
first time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The premium transition

**Setup.** A settings dialog with `transition: all 500ms ease-in-out`. The author says it "feels
premium" and asks whether to keep it.

**Baseline (hypothesis — unverified).** The model agrees the timing is a matter of taste, suggests
"maybe 300ms would feel snappier", and leaves `all` and `ease-in-out` in place.

**Required.** The 500ms easing is named as a rejection-list hit, and so is `all`. The verdict is
`tighten`: 200–300ms on `transform` and `opacity` only, standard curve
`cubic-bezier(0.2, 0, 0, 1)`, and the named property list replacing `all`. The artifact's `Motion`
line carries the frequency and the budget.

**Observable.** `Rejects` contains the 500ms transition and the `all` shorthand; `Values` contains
`transition: all 500ms` → `transform 240ms cubic-bezier(0.2, 0, 0, 1), opacity 240ms`. The reply does
not contain "it's subjective" or "either is fine".

### 2. The three primaries

**Setup.** A hero with three filled, same-size, same-colour buttons: "Start free trial", "Book a
demo", "Read the docs". The user asks "does this look right?"

**Baseline (hypothesis — unverified).** The model calls the layout "clean" and suggests differentiating
the buttons with colour, without saying which one is primary or why.

**Required.** One primary is chosen with a stated rule (the action the page's job requires), the other
two are demoted to secondary and tertiary, and the verdict is `recut` with a merge gate of "do not
merge". If the three actions are genuinely equal, the finding is that the screen has three jobs.

**Observable.** `Primary` names exactly one element; `Rejects` contains "competing primaries"; `Fix`
says which button keeps the filled treatment and what the other two become. "Make one a different
colour" without naming it is a failure.

### 3. The drifting ramp

**Setup.** A card component using 13px, 14px, 15px, 16px, 18px, and 22px type, with no stated roles.
The user says "the type sizes are all over the place".

**Baseline (hypothesis — unverified).** The model says "consider establishing a type scale" and does
not count, name, or replace anything.

**Required.** The ramp is counted (six sizes), named as a rejection-list hit (more than two without a
hierarchy rationale), and replaced with a legal ramp from `references/taste-values.md` —
12/14/16/20/24 is the default here — with a role attached to each step that survives. Verdict:
`tighten`.

**Observable.** `Values` lists every off-scale size with its replacement and the role it serves, and
the proposed sizes satisfy the 1.2× adjacent-step rule. The words "consider a type scale" appear
nowhere as the conclusion.

### 4. The decoration request

**Setup.** The user asks to add a hover lift, a gradient border, and a glow to every row in a data
table "so it feels more modern".

**Baseline (hypothesis — unverified).** The model implements the three effects, or proposes a fourth,
and describes the result as "more polished".

**Required.** The deletion verdict is applied: each effect is asked what job it does, none answers, and the
verdict is `strip` with "no animation. Ever." on the row surface. The legitimate need behind the
request — rows are hard to scan — is answered with a spacing or alignment step, not with motion.

**Observable.** `Verdict` is `strip`; `Motion` says `table row: none`; `Fix` changes a spacing step or
a border, and contains no transform, gradient, or shadow.

### 5. The floor breach

**Setup.** A form with `#9a9a9a` placeholder text on `#ffffff`, and icon buttons whose 16px glyphs sit
in 28px hit areas.

**Baseline (hypothesis — unverified).** The model notes that "accessibility could be improved" and
moves on, or calls the contrast "acceptable for placeholder text".

**Required.** Both pairs are measured: the placeholder is 2.8:1 against 4.5:1 (a placeholder is
text), and the 28px target is below the 44px touch floor. The verdict is `tighten` with the exact
replacement values: a placeholder colour that reaches 4.5:1, and a 44px hit area around the 16px
glyph.

**Observable.** `Floors` names the failing pair, the measured ratio, and the floor it misses; `Fix`
gives replacement values from the table. "Could be improved" is not a finding.

### 6. The beautiful screenshot with no job

**Setup.** A screenshot of a landing page, no stated audience, no stated action, with the question
"what do you think?"

**Baseline (hypothesis — unverified).** The model praises the palette and the whitespace, invents an
audience, and offers three "nice to have" suggestions.

**Required.** No primary can be named because no job was given, so the model either refuses the
verdict and asks for the one fact that would unlock it (what the page is for, and the 375px view), or
issues `reject` on the evidence present — while stating that beauty is not what it rules on.

**Observable.** The reply contains no claim about whether the page is beautiful, and `Primary` is
either a named element or `none` with the missing fact stated. Inventing a target audience is a
failure.
