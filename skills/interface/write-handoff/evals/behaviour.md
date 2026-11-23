# Behaviour eval — write-handoff

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure the structural slot exists to prevent, quoted in the form it usually takes. Replace each with
the observed transcript the first time a real baseline run happens. A case without a recorded baseline
is a hypothesis.

The failure class is **omission**: the model produces a handoff, and the handoff is missing a required
element. That is why the intervention is a template with named slots rather than a prohibition — the
slot is the thing that cannot be silently skipped.

### 1. The decisions dropped

**Setup.** A session that (a) chose Postgres over SQLite for the job queue, (b) rejected Redis because
the deployment has no managed Redis, and (c) deferred the retry policy to a later ticket. Then: "I'm
out of context — write the handoff."

**Baseline (hypothesis — unverified).** The model writes "What we did: set up the job queue, added the
worker skeleton, tests pass. Next: implement retries." The queue choice appears as a fact; Redis never
appears; the deferral is lost, so the next session re-proposes Redis.

**Required.** All three appear in `## Decisions`, each with the alternative it beat and why, and each
with a pointer to where the evidence lives (the ADR path, the commit SHA, the ticket).

**Observable.** The count of decisions in the handoff equals the count of decisions made in the
session, and every entry contains a `rejected:` clause. The words "Redis" and "deferred" appear with
their reasons, not only the winner.

### 2. The paste

**Setup.** A session that edited a 200-line CI config and a 40-line Dockerfile. The model is asked to
hand off to the next session.

**Baseline (hypothesis — unverified).** The model inlines both files "so the next session has full
context", then closes with a two-sentence summary that names no decision and no SHA.

**Required.** `## State` names branch at SHA, the dirty paths, and the command run with its summary
line. The files themselves are pointers: `ci/build.yml:40-58` with one clause saying what is there.

**Observable.** The handoff contains no fenced block copied from the repository, and every file the
session touched appears as a path (optionally with a line range). Handoff length falls, and the
decision count rises, against the baseline.

### 3. The next action that is a list

**Setup.** Three plausible continuations: finish the parser, add the missing fixture, fix a flaky test
noticed along the way.

**Baseline (hypothesis — unverified).** The model writes "Next steps: 1. finish the parser 2. add the
fixture 3. look at the flaky test."

**Required.** Exactly one action in `## Next`, with the command that starts it. Choosing among the
three is either a recorded decision or an entry in `## Not done` with the reason it is not next.

**Observable.** `## Next` contains one imperative sentence and one command. The other two candidates
are present elsewhere in the file with a stated disposition, or are absent and the handoff says why.

### 4. The handoff that lives in the chat

**Setup.** The session is ending. The model is asked to leave the next session what it needs.

**Baseline (hypothesis — unverified).** The model replies with a well-formatted handoff as the final
message. No file is written. The next context starts with no way to reach it.

**Required.** The handoff is written to a path the next context reads, and the closing message's first
line is that path.

**Observable.** A file exists at the named path containing the template, and the message's first line
is the path. If the harness cannot write files, the handoff says so and inlines the minimum — it does
not silently assume the chat survives.

### 5. The inherited claim

**Setup.** The session ran `npm test` early, saw it green, then made three more edits. The handoff is
being written.

**Baseline (hypothesis — unverified).** The model writes "Tests pass; build is green."

**Required.** `## State` carries `Verified: <command> → "<summary line>"` produced after the last
edit, or the word `unverified` plus what would verify it. The three later edits are named.

**Observable.** Every verification claim in the file is a command plus an observed output line, and
the handoff either ran the check after the last edit or marks the claim unverified.

### 6. The reversal that comes back

**Setup.** Early in the session the model chose a Redis cache; two hours later it was replaced with an
in-process LRU because the deployment has no managed Redis. The handoff is written.

**Baseline (hypothesis — unverified).** The model records "cache: in-process LRU" and nothing about
Redis. The next session, seeing a slow path, proposes Redis.

**Required.** The reversal is in `## Decisions` with both halves: what was chosen, what it replaced,
and why the earlier choice lost.

**Observable.** Searching the handoff for the abandoned option finds it, attached to the reason it was
abandoned. A reader cannot re-propose it without contradicting the file.
