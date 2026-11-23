# Behaviour eval — frame-the-problem

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

Every baseline below is a **written hypothesis, not a captured run** — it states the failure we expect
and the form it usually takes. Replace each with the observed transcript the first time a real
no-guidance run is recorded. A case without a captured baseline is a hypothesis, and the trigger set
does not become evidence of improvement until it is.

### 1. The solution-shaped request

**Setup.** The user says "we need to add a cache in front of the read API". Nobody has measured the
latency. The repo is available to read.

**Baseline (hypothesis — unverified).** The model produces a caching design: key strategy, invalidation,
TTL, a `redis` client, and a list of endpoints to cache. The 4s p95 is never located, so the cache is
sized and keyed against a guess. If asked why, it says the user asked for a cache.

**Required.** Phase 1 rewrites the request as a state ("p95 read latency is 4s against a 500ms budget")
and names the observation that would show it fixed. Phase 2 types it `research` with the falsifier "if
the profile shows one query at 3.8s, this is known-solution". Phase 3's first sub-question is where the
time goes, marked `findable` with the action (run the profile) and its cost. No cache design appears
until the profile has been read.

**Observable.** The reply contains a sentence about state with no solution verb in it, and a named type
appears before any implementation step. A caching plan with no measurement of the 4s is a fail.

### 2. The decision disguised as research

**Setup.** The user asks "should we use Postgres or DynamoDB?" No access patterns, volume, or team
constraints have been stated.

**Baseline (hypothesis — unverified).** The model produces a two-column comparison of features, pricing,
and scaling characteristics, then recommends one. The recommendation rests on weights it invented and
did not state, so the user cannot disagree with the reasoning, only the conclusion.

**Required.** The model types this `decision` (or `requirements` if the access patterns are the missing
input), states that there is no fact of the matter until the weights are set, and names the value
question — consistency versus operational burden, or whatever the real trade is — before any comparison.
If it still compares, it does so only along the criteria it has named, and hands off to `make-the-call`.

**Observable.** Either the reply names the criteria as the missing thing and asks for them, or it states
the type as decision with the value question written down. A feature table followed by an
unqualified recommendation is a fail.

### 3. The task list for an unframed goal

**Setup.** The user says "we want to improve onboarding conversion, break it down". No funnel data has
been looked at. The analytics dashboard exists.

**Baseline (hypothesis — unverified).** The model returns eight tickets — "add a progress bar", "reduce
form fields", "add social login", "improve empty states" — ordered by plausible impact. None of them is
a question, and nothing in the list would tell you whether the drop-off is at signup, verification, or
first use.

**Required.** The model notices the goal is unframed, types it `research`, and refuses the ticket list
until one question is answered: where the funnel loses people. That question is `findable` with a named
action (query the funnel by step) and a cost. If tickets follow, they follow the answer, and each one
traces to the step the data named.

**Observable.** The first artifact is a question with a measurement attached, not a ticket list. A
breakdown whose items would be identical for any onboarding funnel is a fail.

### 4. The fourth experiment

**Setup.** Three experiments have been run on "why does the importer fail on large files": a memory
profile, a log review, and a reproduction at 2x the file size. All three came back inconclusive, and the
question has not narrowed.

**Baseline (hypothesis — unverified).** The model proposes a fourth experiment — a longer profile, a
larger file, more logging — and calls the investigation ongoing. Nothing in the plan explains why this
one will resolve what the first three did not.

**Required.** The model treats three unresolved attempts as evidence that the type is wrong, says so,
and re-types: either `design` (there is no single cause; the importer's shape cannot survive large
files) or `decision` (accept a size limit and enforce it). It writes the observation that would have
distinguished the two, and stops running experiments.

**Observable.** The turn contains an explicit re-type or a statement that the type call was wrong. A
fourth experiment with no explanation of why it will resolve what three did not is a fail.

### 5. The flattened unknowns

**Setup.** The model has produced a plan with an "open questions" section: "performance under load",
"whether the vendor supports webhooks", "user demand for the feature", "which region to deploy in".

**Baseline (hypothesis — unverified).** All four sit in one list, in the same register, and the plan
proceeds as if they are the same kind of thing. The vendor question is one email away; the demand
question has no procedure at all; the performance question will only be answered by building it.

**Required.** Each entry carries one of the four statuses and its companion: the vendor question is
`findable` with the action (read the API docs, then email support) and a cost; performance is
`resolve-by-doing` with the smallest spike and a fallback for each outcome; demand is `unknowable` and
goes to `make-the-call` or to a design that survives either answer; region is `known` and gets fetched
now instead of listed.

**Observable.** Every open question is followed by a status word and the thing that status requires
(action, spike, or destination). A single undifferentiated "open questions" list is a fail.

### 6. The ceremony guard

**Setup.** The user says "add a retry with backoff to the payments client — three attempts, exponential,
jitter". The file and the client library are known.

**Baseline (hypothesis — unverified).** With a framing skill over-applied, the model writes a problem
statement, a type call, and a sub-question table before touching the code — three paragraphs of process
for a twenty-line change, and the user's actual request is still not done.

**Required.** The skill does not fire. The type is obvious and the request is one unambiguous
instruction, so the model makes the change, and says what it changed. The framing artifact appears only
if the change turns out to hide a real question (the client already retries, and the retries multiply).

**Observable.** No type call and no sub-question table appear; the code changes. A framing document
ahead of a specified small change is a fail, and it is the failure this skill's non-scope list exists to
prevent.
