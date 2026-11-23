---
name: parallel-safely
description: Use when more than one worker will write to the same repository — "run these in parallel", "a worktree per task", "merge the branches", "the agents clobbered each other", or a coordinator about to trust a worker's "done". Not for one worker's contract or who does what (use dispatch-workers — this skill decides whether concurrent execution is safe for shared files, ports, and rate limits), the loop around a run (use run-autonomously), or whether parallelism pays at all (use make-the-call).
domain: orchestration
risk: writes
invocation: model
version: 0.1.0
metadata:
  form: discipline
  baseline: two-workers-one-file-and-merge-on-a-report
  eval: evals/
---

# Parallel Safely

Concurrency among agents belongs in git, not in the agent's head. This skill gives every parallel write exactly one declared owner, and makes every merge pass a check the coordinator ran itself.

```
NO PARALLEL WRITE WITHOUT A DECLARED OWNER; NO MERGE ON A WORKER'S WORD.
```

## When to use / when not to use

Use when:

- the user says "run these in parallel", "two agents on this repo at once", "a worktree per task", "merge the branches when they're done", "they share a database and a port"
- two or more agents, workers, sessions, or terminals will write to the same repository — even if you intend them to run at different times
- the symptom is already on screen: "the agents clobbered each other", a conflict in a file nobody meant to touch, a branch marked done that fails on merge, a red tree and nobody knows which branch did it
- you are the coordinator and you are about to merge a worker's branch
- a task graph's frontier has several ready slices and you are deciding what to hand out

Not when:

- one worker, one slice, one return — that is `dispatch-workers`; this skill starts when the count exceeds one
- the work is one unattended loop over a queue — that is `run-autonomously`; a loop is sequential by default, and parallelism is an optimisation you add inside it
- the question is whether parallelism is worth its cost — that is `make-the-call`; this skill executes a call that was already made
- the slices overlap in *purpose* — that is `split-by-frontier`; ownership partitions files, it does not repair a bad partition of work
- you need to check one claim about one change — that is `prove-it`; this skill is about claims made across branches you are about to merge

| if the situation is | use |
|---|---|
| "should we parallelise this at all?" | `make-the-call` |
| the graph has one ready slice | `dispatch-workers` |
| the graph has several ready slices and one repo | this skill |
| a worker's branch is ready and you are merging it | this skill, Phase 4 |
| the branch is merged and something is broken | `prove-it` on the merged tree |

## The process

The partition and the merge order are narrow bridges: write them down before any worker starts, because once work exists both are unrecoverable guesses. How a worker spends its slice is open field and belongs to `dispatch-workers`.

### Phase 1 — Partition by write set, not by feature

Two features in one module are not two write sets; they are one module. The unit of parallelism is a set of paths no other worker will touch, so build the manifest from the files each slice must change — read the imports, the router, the schema, the index — not from the feature names.

```
worker: w1
branch: par/auth-tokens
base: <the sha every worker branches from>
owns:   src/auth/**  migrations/003_*.sql
reads:  src/db/schema.ts
never:  src/db/schema.ts  package.json  pnpm-lock.yaml
check:  pnpm test src/auth
merge_order: 1
```

The shared files are the whole problem: lockfiles, `package.json`, the module index or router, the schema, generated code, the changelog, CI config. Every worker's diff wants them. Assign each to exactly one worker, or hoist it to the coordinator and apply it once after the last merge. A path with two owners is a sequencing decision you have not made yet.

If two slices genuinely need the same file, they are one slice or they are two waves. Say which, in the manifest, before dispatch.

**Done when:** every path any worker may write appears under exactly one worker, every shared file has a named owner or a "coordinator after merge" note, and no `owns` set intersects another.

### Phase 2 — Isolate the workspace, one writer per tree

Each worker gets its own worktree and branch, created from the same recorded base commit:

```
git worktree add ../wt/w1 -b par/auth-tokens <base>
```

The worker's working directory is its worktree. A worktree is one writer: two agents in one tree is the failure this phase exists to prevent, and file ownership does not save you once both can run a formatter or a codegen step. The coordinator's own tree stays clean and at the base — it is where merges land, and uncommitted coordinator edits are a merge conflict you wrote yourself.

Where worktrees are unavailable, the fallback is one clone per worker, not one tree with branch switching. A shared tree is one writer however its branches are named, and "we're on different branches" is the sentence that precedes a lost edit.

Record each worktree path and branch in the manifest as it is created.

**Done when:** every worker in the manifest has a distinct branch and worktree path, all created from the same base sha, and the coordinator's tree is clean.

### Phase 3 — Dispatch the ownership, not just the task

The dispatch carries the manifest row: the paths the worker owns, the paths it may read, the paths it must not touch, its check, and the rule for a file it needs outside the set. That rule is: stop and ask the coordinator. A worker that "just needs one line" in a file it does not own has found a partition error, and the coordinator fixes the partition — not the worker.

The worker commits on its own branch. Uncommitted work is in no branch, so the coordinator can neither merge it nor verify it.

**Done when:** each worker's dispatch names its owned paths and its check, and each completion claim arrives as a branch name plus a commit sha.

### Phase 4 — Merge serially, in the declared order

Order is written before dispatch — dependency order, or smallest diff first — never chosen from who finished first. Completion order is a race, and a race gives a red tree with no fixed culprit.

For each branch, in order:

1. **Pre-flight.** The branch has commits ahead of base (`git log --oneline <base>..<branch>` is non-empty), the worker's worktree is clean, and the touched files sit inside the manifest's `owns` set. A path outside the set is a manifest violation: stop and decide, even if the suite is green.
2. **Backup.** Tag the current merge target, so the rollback is a command rather than a reconstruction.
3. **Verify the branch as it stands** — the coordinator's own run of the worker's check at the branch head (Phase 5). A branch verified at a sha you are not merging is unverified.
4. **Merge.** Fast-forward when it applies, otherwise a merge commit. On conflict, stop: a conflict in a file with one owner means the manifest was wrong, and resolving it silently is a decision nobody priced.
5. **Re-run the check on the merged result.** This is the only run that is evidence about the tree everyone will use.

**Done when:** each branch has a merge record carrying the sha merged, the check's summary line after the merge, and the tag it rolls back to.

### Phase 5 — Verify the claim in the coordinator's own context

A worker's report is a claim from a context you did not watch, and a green branch is green against the base it branched from — not against the tree you are merging into. The coordinator verifies both itself:

- Run the worker's check against the branch. Compare the summary line to the reported one; a mismatch is a finding, not a rounding error.
- Read the diff against the manifest: `git diff --stat <base>..<branch>`. Paths outside `owns` are the violation a passing suite will never report.
- Confirm the work is in the commit rather than the worktree: `git status --porcelain` in the worker's tree is empty, and the diff is non-empty.
- Record the command, its output line, and the sha it ran against, in the merge record.

**Done when:** every merged branch has the coordinator's own command output and its sha, and every diff has been read against the manifest.

## Gotchas

- A lockfile is a single-owner file, not a shared one. Two workers each add a dependency and each branch's lockfile is valid; the merge is not, and the failure surfaces as a runtime import error after everything was green. One worker owns it, or the coordinator regenerates it once after the last merge.
- A green branch proves the branch against its base, not against the merge. Worker A's suite passed at `<base>`; after B merges, A's code has never run beside B's. The check that counts runs after each merge, on the merged tree.
- Git merges cleanly over semantic collisions. Two workers adding a case to different parts of one switch, or one adding a field while the other adds a default, produce no textual conflict and a broken program. Only the post-merge check finds it; "no conflicts" is a statement about text.
- Worktrees share the repository's refs and stash, not its index or HEAD. A branch already checked out in one worktree cannot be checked out in another, and a `git stash` pushed by one worker can be popped by another. One branch per worktree, and never a stash as the channel between them.
- Uncommitted work is invisible to the merge. A worker that ran its check in a dirty worktree, said "done", and never committed has a branch with nothing on it. `git status --porcelain` in the worker's tree plus a non-empty diff is the pre-flight, not a formality.
- Repo-wide tools are undeclared writers. `npm install`, `go mod tidy`, a formatter over the whole tree, or a codegen step rewrites files no manifest assigned. Run them in the merge phase, one at a time, or they collide under a partition that looked correct.
- A stale worktree blocks the next dispatch. `git worktree remove` refuses a dirty tree; deleting the directory with `rm -rf` leaves the entry behind, and the next `git worktree add` for that branch fails against a path that no longer exists. `git worktree prune` after any manual removal.
- Merging in completion order is not an order. It is a race whose winner changes the diff you get, so the same set of branches yields a different final tree and a red build with no reproducible culprit.
- Parallelism has a price and refactors pay it worst. Refactor-heavy slices touch many files and overlap by construction; test- and docs-heavy slices rarely do. If the manifest keeps wanting the same paths for two workers, reduce the worker count instead of adding merge machinery.
- A worker that "fixes" a failing test by editing the test file is invisible to a passing suite and visible in the diff against `owns`. Read the diff; the suite cannot report a violation of a rule it does not know about.

## Rationalizations

| Excuse | Reality |
|---|---|
| "They're working on different features, so they won't collide" | Features share a router, an index, a schema, and a lockfile by construction. Partition by paths; "different features" partitions intent. |
| "The worker said it's done and the tests pass" | That is a claim from a context you did not watch. Run the check against the branch yourself. |
| "Git will tell me if there's a conflict" | Git reports textual conflicts. Two clean merges can be semantically broken, and only the post-merge check tells you. |
| "The conflict is small, I'll resolve it" | A conflict in a file with one owner means the manifest was wrong. Fix the partition, or record the resolution as a decision — never make it silently. |
| "Worktrees are overhead; they can share the tree" | Then they share a write set, and the second worker's edit overwrites the first with no record of it. Serialise instead. |
| "The branch is green, merge it" | Green against which base? The run that counts happens after the merge. |
| "I'll merge in the order they finish" | That is a race. The same branches then produce different trees and a red build with no fixed owner. |
| "It's only the lockfile / package.json" | It is the file every worker touches and nobody owns. That is the collision, not an exception to it. |
| "The diff touched a file outside its set, but the tests pass" | The suite does not check the manifest. A passing violation is still a violation. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Swarm", "concurrent", and "hand these to N agents at once" are parallel writes; "it's basically a rebase" is a merge. |

## Red flags

- You are dispatching a second worker and no path list exists yet.
- You are merging a branch against which you have run nothing.
- The diff touches a path outside the worker's set and you are about to accept it because the suite is green.
- You chose the merge order after seeing who finished first.
- You are resolving a conflict in a file two workers touched and calling it a merge.
- You are telling yourself the workers "probably" touch different files.
- You are running `npm install` or a formatter in two worktrees at once.
- You are relaying a worker's "done" as your own completion.

## Limitations

- Ownership is only as good as the partition. Work whose boundary cannot be expressed as a path set — a cross-cutting rename, a type change through twenty modules — is not parallelisable this way; serialise it or split it further.
- Git cannot isolate shared mutable resources outside the repository: a staging database, a port, a package registry, a deployed environment. Two workers running migrations against one staging schema collide where no worktree protects them; serialise those steps or give each its own instance.
- Worktree isolation assumes git. On a tree without it, isolation degrades to directory copies and a diff you construct yourself, and the merge step has no tooling — the manifest and the verification still apply, the mechanism does not.
- Verification is as strong as the check the worker was given. The coordinator running a weak check proves that it ran, not that the work is correct.
- Cannot find semantic collisions that no check exercises. Two changes can be compatible in text and incompatible in behaviour while passing every test you have; that is a coverage problem, not a merge-ordering one.
- Does not decide whether parallelism pays. A manifest, N worktrees, N verifications, and a merge queue can cost more than the serial work; that comparison is `make-the-call`'s.
