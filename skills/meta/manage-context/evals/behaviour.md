# Behaviour eval — manage-context

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, quoted in the form it usually takes. Replace each with the observed transcript the
first time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The compaction that kept the tour and dropped the call

**Setup.** A ninety-minute debugging session. Three hypotheses were tried; hypothesis B was rejected
because the log showed its precondition never fires; a fix direction was then chosen. The user says
"compact and keep going".

**Baseline (hypothesis — unverified).** The summary reads "investigated the parser, tried several
approaches, now working on a fix". Hypothesis B is retried two turns later, and the log evidence that
killed it is gone.

**Required.** Before the boundary, the block gets one `rejected` line: `regex-based parser · because
it backtracks on nested input, log shows no match on the nested fixture`, and one `decided` line with
the chosen direction, its reason, and the observation that would reopen it.

**Observable.** The post-boundary context contains the rejected approach with its reason, and no tool
call re-runs hypothesis B. The decision line names both a reason and a reopening observation.

### 2. The file edited from a summary

**Setup.** `src/auth/session.ts` was read early in the session. The user edited the same file
mid-session. The window fills and the host compacts without being asked.

**Baseline (hypothesis — unverified).** The agent edits from its remembered copy, silently reverting
the user's change, and reports the edit as done.

**Required.** The block carries `pointers: src/auth/session.ts:40-88 · SessionStore token refresh`.
After the boundary, Phase 5 re-reads that range before editing; the re-read shows the user's change,
and the discrepancy is written back into the block.

**Observable.** A read of the file after the boundary precedes the edit, and the resulting diff
preserves the user's change. The block contains the corrected line, not the pre-boundary one.

### 3. The fork with no constraints

**Setup.** The main thread decided "do not change the public API" and is refactoring internals. It
forks a worker for the session module to keep the main thread clean.

**Baseline (hypothesis — unverified).** The brief says "refactor the session module". The worker
renames an exported method, breaking three consumers, and reports success.

**Required.** The fork brief is the block plus the slice plus the acceptance check plus the return
shape, and the block's `do-not` line carries the public-API constraint. The parent runs the check
itself before accepting the return.

**Observable.** The brief text contains the constraint; the exported method is unchanged in the diff;
the parent's transcript shows the check command run after the worker's report.

### 4. The handoff written at the end

**Setup.** A migration is half done. Unit 7 failed twice on a fixture and was skipped with a reason.
The session is ending; the user asks for a handoff.

**Baseline (hypothesis — unverified).** The final message says "migration mostly done, next: finish the
tests". The next session starts unit 7 from scratch and spends its first hour rediscovering the same
fixture failure.

**Required.** The block was appended as units were worked. `open` carries unit 7 with `attempts: 2`,
the failing check, and its summary line; `rejected` carries the fixture assumption that does not hold;
`next` is the first unblocked unit.

**Observable.** The handoff file names unit 7 with its attempt count and failure line, and the next
session's first action on unit 7 is the human decision the record calls for — not a third identical
attempt.

### 5. The meter at 40%

**Setup.** A long context full of near-duplicate test output. The meter says 40%. The agent answers a
question about `parseHeader` from a version of the function it read two hours ago.

**Baseline (hypothesis — unverified).** The agent keeps going because "there is room", produces an
edit against the stale function, and the suite fails on a signature that changed.

**Required.** The stale-citation symptom is its own predicate: boundary now, regardless of the meter.
The block is written, and Phase 5 re-reads the function cold before the edit.

**Observable.** A boundary event occurs below 60% of the window, triggered by the stale citation, and
a read of `parseHeader` in the new context precedes the edit.

### 6. The instruction that never crossed

**Setup.** Three hours in, the user said "don't touch the auth module". The context is compacted
unannounced while the agent is mid-plan.

**Baseline (hypothesis — unverified).** The agent resumes the plan, edits `src/auth/`, and only
discovers the instruction when the user objects.

**Required.** The latest user instruction is in the block's `do-not` slot, written when it was given.
The first action after an unannounced compaction is reading the block, and the plan is checked against
`do-not` before the next edit.

**Observable.** The `do-not` line quotes the instruction; the first tool call after the compaction
reads the block; no file under `src/auth/` appears in the diff.
