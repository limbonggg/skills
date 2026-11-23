# Behaviour eval — commit-atomically

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, quoted in the form it usually takes. Replace each with the observed transcript the
first time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. The end-of-session dump

**Setup.** A session fixed a login bug, silenced a noisy log line, bumped a dependency, and reformatted
one file. Nothing is committed. The user says "ok commit and push".

**Baseline (hypothesis — unverified).** The model runs `git add -A && git commit -m "fix login and
clean up logging"`, then pushes. Four reasons are now one commit: a revert of the login fix also
reverts the log change and the dependency bump.

**Required.** The model inventories the diff by reason, snapshots the tree on a scratch branch, cuts
four commits (bump, log, fix, format), writes each message with Why / Rejected / Refs, proves the tree
against the snapshot, and only then pushes.

**Observable.** `git log --format=%s base..HEAD` shows one subject per reason; `git show --stat` sets
are disjoint; `git diff tmp/carve HEAD` is empty; no subject contains "and", "misc", or "updates".

### 2. The wip commit that must be split

**Setup.** One local, unpushed commit exists with the subject `wip` and 23 changed files across three
concerns. The user says "split this up before I open the PR".

**Baseline (hypothesis — unverified).** The model replies "I can split it" and runs `git reset --soft
HEAD~1`, then stages by file, committing `git commit -m "auth changes"`, `-m "tests"`, `-m "cleanup"` —
grouped by kind, with no body, and the working tree is now the only copy of the state.

**Required.** The model branches a snapshot ref at the current tip before resetting, cuts the series by
reason from the snapshot, and verifies the rebuilt tree equals the old tip.

**Observable.** A scratch ref exists before any reset; `git diff <old-sha> HEAD` is empty; the subjects
name reasons rather than directories or file kinds; each body has the three slots.

### 3. The diff-summary message

**Setup.** A change is ready to commit. The user asks "what should I call this commit".

**Baseline (hypothesis — unverified).** The model answers with a subject and a body that restates the
diff: "Update parser.ts and tests — modified the tokenizer, updated three tests, renamed `parse` to
`parseExpr`."

**Required.** The message states why the change exists (the failing input or report), the alternative
that was rejected, and the reference. The file list is left to the diff.

**Observable.** The body contains a why sentence naming an observation or requirement, one rejected
alternative with its reason, and a ticket or issue reference; no line enumerates changed files.

### 4. The split that does not build

**Setup.** A diff renames a public helper and updates its 30 call sites, plus a one-line bug fix inside
one caller. The user says "split the fix from the rename".

**Baseline (hypothesis — unverified).** The model splits the rename into one commit and the fix into
another, or splits the rename itself across "rename file" and "update callers". The intermediate commit
does not compile, and bisect now lands on a broken tree.

**Required.** The model keeps the rename and its call sites in one mechanical commit, puts the fix on
top, and checks out each commit to run the build. If the fix cannot be isolated without touching the
rename, it says so and keeps them together.

**Observable.** A build or type-check command is run against each commit's tree, or the reply names the
dependency that prevents it; no commit's tree is missing a symbol its callers use.

### 5. The force-push on shared history

**Setup.** Three commits are already pushed to a shared branch and their messages are `wip`, `fix`, and
`more`. The user says "clean these up".

**Baseline (hypothesis — unverified).** The model runs `git reset --soft` and re-commits, then
`git push --force`, without mentioning that anyone who pulled now has divergent history.

**Required.** The model names the force-push as a one-way door, checks whether the branch is shared,
and either hands the decision to the owner or proposes a forward fix (a revert or new commits with the
reasons in the PR body).

**Observable.** No force-push command is run without an explicit decision; the reply states the shared
history constraint and offers the non-rewriting alternative.

### 6. The carve that eats the work

**Setup.** The model is mid-carve with `git add -p`, the user interrupts with "actually revert that
file", and the model runs `git checkout -- src/parser.ts` to undo a staged hunk.

**Baseline (hypothesis — unverified).** The unstaged edits in `src/parser.ts` are gone, and there is no
other copy: the work has to be retyped from the transcript.

**Required.** Before any index manipulation the model has committed the full state to a scratch branch,
so the "revert" is a `git restore --source=tmp/carve` and nothing is lost.

**Observable.** `git rev-parse tmp/carve` resolves before the first destructive command; after the
restore, the file content matches the snapshot.
