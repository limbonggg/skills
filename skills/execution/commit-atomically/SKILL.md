---
name: commit-atomically
description: Use when about to commit, amend, or push — "commit this", "just commit everything", "wip", "misc fixes", "fix stuff" — or when the history is already one big commit and someone says "split this up", "squash it", "write a better message", "make this reviewable", "why is this commit so big". Not for whether the change is correct or tested (use red-green, prove-it), for slicing work that does not exist yet (use split-by-frontier), or for the state file a stranger resumes from (use write-handoff).
domain: execution
risk: writes
invocation: model
version: 0.1.0
metadata:
  form: positive recipe
  baseline: one-wip-commit-mixing-unrelated-changes
  eval: evals/
---

# Commit Atomically

A commit is the unit a stranger bisects, reverts, and reviews. This skill makes the agent cut the diff
by reason before it stages a line, and write the why into the message instead of the diff.

```
ONE COMMIT, ONE REASON TO CHANGE — ITS REVERT TAKES THAT REASON AND NOTHING ELSE, AND THE MESSAGE SAYS WHY.
```

## When to use / when not to use

Use when:

- you are about to commit, amend, or push — at the end of a long task, after a subagent lands, or when
  the user says "commit this", "push it", "save the work"
- the user says "wip", "misc fixes", "fix stuff", "various", "updates", or asks what to call the commit
- the diff already exists as one commit and someone says "split this up", "squash it", "make this
  reviewable", "clean up the history", "rebase these into something sensible"
- a revert is needed and nobody can tell which of the last five commits to revert
- `git bisect` landed on a commit whose subject does not say what broke
- you are writing a commit message for a diff you did not author
- a reviewer says "I can't tell what changed here" or "why is this in this commit"

Not when:

- the change is not written yet and needs ordering — that is `red-green` for the change and its
  failing test, `split-by-frontier` for the plan's slices; this skill starts when the diff exists
- the question is whether the change works — that is `prove-it`; this skill never certifies behaviour,
  only the unit and its record
- a schema or migration needs a safety review — that is `judge-data`; the commit is not where a lock
  is discovered
- the artifact is a PR body, a release note, or the file a stranger resumes from — that is
  `report-with-evidence` and `write-handoff`
- the history is pushed and shared and the question is whether to rewrite it — that is a `make-the-call`
  decision on a one-way door; this skill prices it, the owner rules
- you are reviewing someone else's commits rather than authoring the unit — that is `judge-risk` or
  `judge-taste`

| if the situation is | use |
|---|---|
| the diff exists and must become commits | this skill |
| the diff exists and its correctness is unknown | `prove-it`, then this skill |
| the work is unstarted and needs slicing | `split-by-frontier` |
| the series is pushed and cleaning it needs a force-push | `make-the-call` on the rewrite, then this skill for new commits |
| the change touches a schema under load | `judge-data` before the commit that carries it |

## The process

### Phase 1 — Inventory the diff by reason, not by file

Read `git diff <base>` — the diff, not your memory of the session. The session remembers a coherent
story; the diff is the actual set of changes, including the debug print, the formatting pass, and the
file you touched twice.

For each hunk, write the reason it exists as a sentence a reader would accept as a subject: "reject
empty passwords at signup", "stop logging the session token", "bump the parser to 3.2". A hunk with
no reason is either noise (delete it) or a reason you have not named yet.

Do not group by path or by kind. All tests in one commit and all source in another is two commits that
are each half a reason, and neither can be reverted.

**Done when:** every changed hunk is assigned to exactly one named reason, or deleted, or listed as
noise with what it is.

### Phase 2 — Snapshot the working state before touching the index

Carving a diff means moving content between the worktree and the index. A `git reset`, a
`git checkout -- .`, or a failed `add -p` at the wrong moment destroys work that exists nowhere else.
`git stash` is not the answer: a stash is a ref outside your branches, easy to drop, and a `stash pop`
conflict is resolved by hand.

Record the whole state as a commit on a scratch branch first. This is the one place to copy the
commands exactly:

```
git switch -c tmp/carve          # from wherever the work is
git add -A && git commit -m snapshot
git switch -c rebuild <base>     # <base> = the commit the series should start from
```

Look at `git status --porcelain` before the snapshot: a secret file staged onto a scratch branch is one
`git push` from being shared. `tmp/carve` now holds the complete state, and every later step reads
from it and can be redone.

**Done when:** `git status --porcelain` is empty after the snapshot commit, and `git rev-parse
tmp/carve` resolves.

### Phase 3 — Cut the series

One question per boundary: if this half turns out wrong, would you revert it without the other half?

- **Merge** when the halves cannot stand alone: a rename with its call sites, a signature change with
  its implementations, an expand migration with the code that reads the new column, a dependency bump
  with its lockfile. Splitting these produces commits that do not build and a bisect that lands on a
  broken tree. The contract step that drops the old column ships in a later deploy, and it is its own
  commit.
- **Separate** when each half would be reverted for a different reason: a bug fix and the refactor it
  enabled, a feature and a formatting pass, a dependency bump and the API migration it forces, a
  behaviour change and the debug logging added while finding it.
- **Order by dependency, mechanical first**: no-behaviour refactor, then behaviour, then cleanup and
  docs. A formatting pass over a file that also changes behaviour hides the behaviour in whitespace.
- **Tests travel with the behaviour they pin.** A test-only commit is a red commit in bisect unless it
  characterizes code that already exists. A test that asserts a new behaviour and the code providing it
  are one reason.
- **Size is a symptom, not a rule.** A generated lockfile is one reason at two thousand lines; a
  thirty-line diff touching auth, logging, and config is three.

Write the plan as one line per commit — subject, the hunks or paths, the reason. The plan is the
artifact this phase produces; a series you are "roughly going to do" is how the debug line reaches the
auth commit.

**Done when:** every reason from Phase 1 appears in exactly one planned commit, the order is fixed, and
no planned commit needs a later one to build.

### Phase 4 — Build the commits from the snapshot

Pull each commit's content out of `tmp/carve`, never out of the current worktree:

```
git restore --source=tmp/carve --staged --worktree -- <paths>
git restore --source=tmp/carve --staged --worktree -p -- <path>   # hunk by hunk
git diff --cached --stat    # exactly the planned set, nothing else
git commit
```

After each commit, `git show --stat` must match that commit's line in the plan. Stray files are the
commonest defect: an editor swap file, a generated artifact, a fixture belonging to the next commit.

At the end the series must reproduce the snapshot tree exactly:

```
git diff tmp/carve HEAD --stat    # empty
git status --porcelain            # only untracked noise you chose not to commit
```

An empty diff is the proof that carving changed history and not content. A non-empty one means a hunk
was dropped, and the working feature is now missing a line.

**Done when:** the tree diff against `tmp/carve` is empty, the commit count matches the plan, and every
commit's `--stat` matches its planned set.

### Phase 5 — Write the message as why, not what

The diff is in the commit; the message is the only place the reason can live. Write the body before the
subject: the subject is the reason compressed, and compressing first produces "update auth".

```
<area>: <imperative change, at most 72 chars>

Why: <the observation, incident, or requirement that made this necessary>
Rejected: <the alternative, and the one clause on why it lost>
Refs: <ticket, issue, design doc, or the commit this depends on>
```

- **Why** is the world before the commit: the failing case, the report, the deadline, the audit
  finding. "Refactor parser" has no why; "the parser accepted `--flag=` as an empty value, which the
  CLI spec forbids" does.
- **Rejected** is the alternative you did not take and why it lost. It is what stops the next reader
  from re-proposing it, and it is the one slot that cannot be reconstructed from the code.
- **Refs** is the ticket or the evidence. A message with no reference is a message whose context died
  with the author's tab.

Follow the repo's subject convention if it has one — Conventional Commits, a ticket prefix, a
language. Read `git log -20` and match it; the body slots do not change. Use the trailer token the
platform acts on: `Fixes: #123` closes an issue, `Refs:` does not.

**Done when:** every body answers "why does this exist" and "what did it reject" without the reader
opening the diff, and `git log --format=%s` reads as a list of reasons with no "wip", "misc", "fixes",
or "updates" in it.

### Phase 6 — Prove each commit stands alone, then land the series

Three checks per commit, cheapest first:

1. **The diff is only its reason.** `git show <sha>` contains no hunk the plan did not assign to it.
   This is the check that catches the debug line.
2. **It builds and tests where the repo allows.** Check out each commit in a scratch worktree and run
   the command `prove-it` would demand. Where the repo cannot check per commit — a slow suite, a
   service dependency — say so: "the series is checked at the tip only" is a limitation to state, not
   to hide.
3. **A plausible revert applies clean.** On a scratch branch at the tip, `git revert --no-commit <sha>`.
   A clean revert is proof the reason is removable alone. A conflict is a finding: if it reaches a hunk
   belonging to another reason, the two are entangled — merge them. If it reaches only a later commit
   that builds on this one, the dependency is real: that later commit's body carries `Depends-on: <sha>`,
   so the revert is understood as this reason plus its dependents.

Rehearse the revert for the commits someone would actually revert — the feature, the config change, the
dependency bump — not the mechanical refactor everything sits on.

Delete the scratch branch only after the tree check, and push once. If the series is rejected mid-flight,
the snapshot still exists.

**Done when:** every commit's diff is exactly its reason, every revert candidate applies clean, and the
series is pushed or handed over with its scratch ref removed.

### When the diff is already one commit

Unpushed: rebuild it. `git branch tmp/carve` at the current tip, `git switch -c rebuild <base>`, then
run Phases 3–6 from the snapshot. The old tip stays reachable on the scratch branch until you are
satisfied.

Pushed and shared: do not rewrite. A force-push is a one-way door for everyone who has pulled; take it
to `make-the-call` and the owner. The alternatives are a revert commit that names the reason, or a new
series on top with the reasons in the PR body.

Squash-merge platforms collapse the series at the remote, so the atomic units exist only locally. Put
the per-commit subjects and their whys in the PR body, or the only record of the reasons is one
squashed subject.

## Gotchas

- `git add -A` and `git add .` stage untracked files: `.env`, build output, a local script with a token
  in it. The commit's contents are whatever `git status` showed when you added, not what you meant. Read
  `git diff --cached --stat` before every commit.
- `git commit -a` stages tracked modifications and misses new files. The new file stays untracked and
  the commit looks complete.
- A rename is a delete plus an add in the tree. Split across two commits, the first tree has no file and
  the second has no history; keep a rename and its call sites together and let `git show -M` display it.
- `git stash create` makes a commit object that no ref points at. It is garbage-collectable and absent
  from `git stash list`; a branch is the only snapshot you can find after a crash.
- A commit that leaves the suite red is a bisect landmine. If a test must land before the code, mark the
  commit with the repo's skip token only if CI honours it, and say in the body that it is intentionally
  red.
- Reverting a merge commit needs `-m 1` and reverts the whole branch, not one reason. A series landed as
  one merge commit has already lost its atomicity at the merge; check what the platform actually lands.
- Pre-commit hooks run once per commit, so a five-commit series runs the hook five times. A flaky hook
  fails mid-series; the snapshot is what lets you resume instead of starting over.
- Line-ending and formatter filters can change a file between `git restore` and the commit. If the tree
  diff is non-empty on a file you did not touch, read `.gitattributes` and the formatter config before
  hunting a lost hunk.
- A version bump in the same commit as a fix means reverting the fix also reverts the version, and the
  next deploy reads it. Version and release metadata are their own reason.
- Generated files and lockfiles belong with the reason that produced them. A lockfile diff from a
  dependency bump is part of the bump, not a separate commit that reverts independently.
- Trailer tokens are parsed, not read. `Fixes: #123` closes an issue and `Refs: #123` does not; the
  wrong token leaves the ticket open and the commit's reason unlinked.

## Rationalizations

| Excuse | Reality |
|---|---|
| "I'll commit it all now and split it later" | Splitting after the push rewrites history someone already pulled. The split is cheapest before the first push, which is now. |
| "The diff is self-documenting" | The diff says what changed. The next reader has the diff and still cannot recover why, what was rejected, or which ticket. |
| "It's all one feature" | Then it has one subject. If the body needs "also" twice, it is three reasons wearing one subject. |
| "wip is fine, I'll squash it" | The squash keeps one message, and "wip" is the message unless you write the reasons into the PR body. The why exists in your head now and nowhere later. |
| "Splitting takes too long" | The cost moves to whoever bisects or reverts, at the worst hour, without your context. Ten minutes now against an hour then. |
| "The user said just commit it" | They asked for a commit, not an unreadable one. Carve by reason and say what you did; if they asked for a single commit, every reason goes in the body. |
| "I'll describe it in the PR" | The PR is a wrapper on a hosting platform. `git log` and `git bisect` read commits, and they outlive the PR. |
| "The message doesn't matter, the code does" | The code is read once; the message is read at every bisect, revert, and review for the life of the repository. |
| "It's only my branch" | The branch is what gets merged, squashed, or cherry-picked. It is a staging area for shared history, not a private notebook. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Checkpoint", "save point", "snapshot", "misc", and "various" are commits someone will read and try to revert. |

## Red flags

- You are about to type `git add -A` or `git add .` and commit in the same breath.
- Your subject contains "and", "misc", "various", "wip", "fixes", "stuff", or "updates".
- You are writing the body by reading the diff instead of remembering the reason.
- Your body is a list of files.
- You are splitting a rename from its call sites, or a schema change from the code that reads it.
- You are amending or force-pushing a commit someone else has pulled.
- The series plan exists only in your head.
- You are carving the diff and no snapshot ref exists yet.
- You are calling a commit "atomic" because it is small.

## Limitations

- Atomicity is bounded by the deploy unit. A commit that changes a schema and the code reading it is one
  commit, but a rollback still sequences the deploy; history-level atomicity does not make the rollout
  atomic.
- Cannot make a series bisectable if the build is flaky or the suite needs a service that is not up. It
  forces the per-commit check and makes you state its absence; it cannot supply the environment.
- Does not decide whether the change should ship or whether it is correct. `make-the-call`,
  `red-green`, and `prove-it` own those; this skill packages what they produced.
- Cannot clean history that is already shared without a force-push, and does not authorize one. The
  rewrite is a one-way door for every clone; the owner rules, and the alternatives are a revert or a new
  series.
- Squash-merge platforms, Gerrit-style change-ids, and monorepo release tooling each collapse or rewrite
  the series at landing. The local units are as atomic as the platform lets them be; check what actually
  lands.
