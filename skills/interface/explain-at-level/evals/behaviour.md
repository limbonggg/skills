# Behaviour eval — explain-at-level

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not captured from a live run** — they describe the shape
failure this skill targets, quoted in the form it usually takes. Replace each with the observed
transcript the first time a real baseline run happens. A case without a recorded baseline is a guess.

### 1. The mechanism answer to the funding question

**Setup.** A schema migration slipped by two weeks because a backfill hit lock contention. The VP of
engineering asks "why did the migration slip?" and the next thing she does is decide whether to move the
launch date.

**Baseline (hypothesis — unverified).** "The backfill was doing batched updates in a single transaction,
which held row locks long enough that the write path started queuing; we moved to chunked commits with a
throttle, but each chunk re-reads the index, so the wall-clock cost went up roughly threefold."

**Required.** Rung 1 first: the launch moves or it does not, by how much, and what it costs — "the
launch date holds; the migration needs two more nights of the window, no feature work lost." The
mechanism from the baseline belongs to rung 2, offered in one clause. Every internal term ("backfill",
"chunked commits") is either replaced or defined in one clause.

**Observable.** The first sentence names the decision the listener owns (date, cost, risk), and no
internal mechanism appears before it. A reply whose first sentence contains a storage or transaction
term fails; a reply that states the consequence and offers the mechanism passes.

### 2. The condescending peer answer

**Setup.** An engineer who has owned the payments service for two years asks "how does the retry storm
interact with the idempotency key?" The model explains: "When a request fails, the system tries again.
To avoid charging twice, each request has a unique key…"

**Baseline (hypothesis — unverified).** The definition-first answer above — correct, complete, and
pitched at someone who has never seen the service. It teaches the listener their own vocabulary and
never reaches the interaction they asked about.

**Required.** Mechanism first, in the domain's terms: the retry reuses the key, so the dedupe window —
not the retry count — is the thing that bounds duplicate charges, and the window is shorter than the
retry budget. No sentence defines "retry", "idempotency key", or "request".

**Observable.** The answer's first sentence addresses the interaction (window vs retry budget) rather
than either component, and contains no definition of a term the question already used. A reply that
defines a term from the question fails.

### 3. The newcomer and the analogy that does not map

**Setup.** A new hire asks "ELI5 what the message queue is for in this system" on their second day.

**Baseline (hypothesis — unverified).** Either a bare mechanism ("it's a Kafka topic the ingest workers
produce to and the enrichment service consumes from, with a consumer group per shard") or an analogy
with no limit ("it's like a mailbox").

**Required.** One analogy that maps the load-bearing property — work waits instead of being lost when a
consumer is slow — followed by the plain mechanism, and the analogy's break point stated: "unlike a
mailbox, the same message can be read by more than one reader group."

**Observable.** The reply contains exactly one analogy, the mechanism in terms that do not presuppose
Kafka, and an explicit sentence naming where the analogy stops being true. An analogy with no break
point, or jargon with no analogy, fails.

### 4. "Just the gist" answered with a page

**Setup.** The user says "just the gist — why did p99 latency double last night?" after an investigation
that produced five candidate causes.

**Baseline (hypothesis — unverified).** A three-paragraph answer walking the five candidates, the
dashboard that ruled each in or out, and a closing caveat that the last one is still unconfirmed — with
the actual cause stated in the second paragraph.

**Required.** Rung 1 only: the cause and what it means — "a connection-pool exhaustion during the
traffic spike; fixed by raising the pool, no data lost." Rung 2 (the evidence that ruled out the other
four) is offered in one clause or linked, not pasted.

**Observable.** The delivered message is one line plus an offer, and the answer appears in the first
sentence. A reply containing the candidate list fails; a reply with the cause first and one offer line
passes, even if it is longer than one sentence.

### 5. The ladder that restates instead of adding

**Setup.** The user asks for "the one-line version, then the paragraph, then the detail" of a caching
decision for a design doc read by peers.

**Baseline (hypothesis — unverified).** A one-line answer, then a paragraph that repeats it with
adjectives, then a page that repeats the paragraph with headings — three lengths, one piece of content,
and rung 1 that only makes sense after reading rung 3.

**Required.** Rung 1 is true alone (the decision and its consequence). Rung 2 adds the mechanism that
makes it credible — the invalidation strategy and the failure it prevents. Rung 3 adds the alternatives
considered and the caveat a maintainer needs. No rung repeats a sentence from the one above.

**Observable.** Rung 1 contains no forward reference ("as below", "see the detail") and no term defined
only in a later rung; rung 2 contains at least one fact absent from rung 1; rung 3 contains at least one
fact absent from rung 2. A ladder whose rungs are supersets by repetition fails.
