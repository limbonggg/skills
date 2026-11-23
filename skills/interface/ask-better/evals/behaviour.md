# Behaviour eval — ask-better

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

**Protocol.** Every case runs twice on the same prompt: a control arm with the skill not loaded, and a
treatment arm with it loaded. The `Observable` is the discriminator, and the control arm is what makes
any wording claim in this skill falsifiable — a phrasing that does not move the observable is a
phrasing this skill does not get to keep.

**The baselines below are written hypotheses, not captured transcripts.** They describe the failure we
expect, quoted in the form it usually takes. Replace each with the observed transcript the first time a
real baseline run happens; until then, the case is a hypothesis about drift, and it should be read as
one.

### 1. The interrogation list

**Setup.** A repo with a `web/` app, a `package.json` naming React 18 and Vite, an existing
`src/pages/` directory, and a README with a deployment section. The user writes: "build me a
dashboard".

**Baseline (hypothesis — unverified).** The model replies with a numbered list of twelve to fifteen
questions: which framework, which charting library, whether there is an API, what the data shape is,
who the users are, whether it needs auth, what the deployment target is. Half of them are answered by
`package.json`, the README, and the existing pages, and none carries a suggested answer.

**Required.** Phase 2 runs first: the framework, the build tool, the existing page conventions, and the
deploy target are read out of the repo and stated as facts with their source. The remaining open
decisions are cut to the frontier, and the reply asks exactly one — with a recommendation and its
consequence — while the deferred ones are named as blocked.

**Observable.** The reply contains at most one question, every repo-answerable item appears as a fact
with a file cited, and the recommendation has a consequence line. A twelve-item list is a fail even if
every item is well worded.

### 2. The silent assumption

**Setup.** "Make the export faster." The repo has a `reports/export.py` that streams a 2M-row CSV, and
no pagination anywhere. The user's intent could be "finish sooner" or "start sooner".

**Baseline (hypothesis — unverified).** The model picks the throughput reading, rewrites the export to
batch its writes, and closes with "I assumed you meant total export time — let me know if you meant
time-to-first-byte." The assumption is real, load-bearing, and disclosed only after the work exists.

**Required.** The ambiguity is recognised as a decision node before any code. It is not answerable from
the repo (both readings are consistent with what is there), so it goes to the human as one question
with a recommendation and the consequence of each reading — or, if the model judges it two-way and
cheap, it rules and the ruling appears in the `Ruled:` list before the change.

**Observable.** Either a single question with a recommendation and a consequence, or a `Ruled:` line
naming the reading, the reason, and the undo — present *before* the diff, not after it.

### 3. The question with no recommendation

**Setup.** A greenfield CLI. The user says "ask me what you need". The model needs to know whether the
tool reads from stdin or a file path.

**Baseline (hypothesis — unverified).** The model writes "How would you like the tool to receive its
input?" — an open question with no default. The user, who has less context on the trade-offs than the
model now does, answers with a preference formed on the spot, and the model inherits a decision nobody
priced.

**Required.** The question is a proposal: "Should the tool read from stdin and accept a path as a
fallback?" — with the recommendation, what it commits to (pipes work; interactive use needs the
fallback), what it rules out (a config-file default), and the undo cost. "Yes" is a complete answer.

**Observable.** The question can be answered with "yes", and the message states what "yes" costs and
what it rules out. An open-ended "how would you like…" is a fail.

### 4. The fog question

**Setup.** "Add an endpoint that lists orders." The public-or-internal status of the API is not decided
yet, and the user has not said. Pagination style depends on it.

**Baseline (hypothesis — unverified).** The model asks both at once — "should this be public, and do
you want cursor or offset pagination?" — so the pagination answer is written against a public/private
assumption the user had not made yet, and is usually discarded one turn later.

**Required.** Only the unblocked node is asked: public or internal, with a recommendation and its
consequence (a public surface is a one-way door; an internal one can change). Pagination is named as
fog, blocked on that answer, and asked in the next round — or never, if the answer settles it.

**Observable.** The reply names the blocked decision as blocked rather than asking it. Zero questions
about pagination in the first turn.

### 5. The stale answer

**Setup.** The user answers "we're on Node 18, so use the built-in fetch". `package.json` and `.nvmrc`
say Node 20, and the repo already depends on a fetch polyfill.

**Baseline (hypothesis — unverified).** The model treats the answer as authoritative, drops the
polyfill, and writes Node-18-compatible code. The mismatch surfaces at CI, three decisions later.

**Required.** The answer is checked against the repo before it becomes a premise. The conflict is
raised as a fact with its source — "`.nvmrc` says 20; do you want 18 support or should I target 20?" —
and the tree is repaired before anything is built on it.

**Observable.** The reply quotes the contradicting file and asks the smaller question the conflict
creates, rather than adopting the answer silently.

### 6. The zero-question turn

**Setup.** "Add a `--verbose` flag to the CLI." The repo has an existing flag parser, a `--quiet` flag,
and a documented flag-naming convention. Nothing about the request is a business commitment.

**Baseline (hypothesis — unverified).** The model asks "what should `--verbose` print?" — a question it
could answer from the existing logging calls — or, in the opposite failure, picks a format and never
says which.

**Required.** Phase 2 answers it from the existing log lines and the `--quiet` implementation. The
frontier is empty, so the message contains no question: the ruling and the assumption list carry the
turn, and the work proceeds.

**Observable.** Zero questions, at least one `Ruled:` or `Assumed:` line naming the log format and its
undo. This is the control case for over-asking: a model that asks here has failed the same way as the
model in case 1.
