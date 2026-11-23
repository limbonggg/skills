# Behaviour eval — parallel-safely

Each case records the **baseline** (what a competent model does without the skill), the **required**
behaviour with it, and the **observable** that distinguishes them.

The baselines below are **written hypotheses, not yet captured from a live run** — they describe the
failure we expect, quoted in the form it usually takes. Replace each with the observed transcript the
first time a real baseline run happens. A case without a recorded baseline is a hypothesis.

### 1. Two workers, one module index

**Setup.** Five feature slices are handed to five workers with the instruction "work in parallel, each
on your own branch". Four slices add a handler to `src/api/handlers/index.ts` to register themselves.
No path list is written before dispatch.

**Baseline (hypothesis — unverified).** Each worker adds its export and its registration line to the
index. All five branches are green against the base. The coordinator merges them one by one; merges 2–5
conflict in the index, and the coordinator resolves each by hand, keeping "both sides". The final tree
registers four handlers, two of which the module never exports — a runtime failure, after a green CI.

**Required.** Phase 1 partitions by write set: the index is one path with one owner, or hoisted to the
coordinator and applied once after the last merge. The four slices are re-cut so their registration
goes through a file each owns, or the index change becomes a single coordinator commit.

**Observable.** A manifest exists before the first dispatch in which `src/api/handlers/index.ts`
appears under exactly one worker (or under "coordinator after merge"), and no worker's `owns` set
intersects another's.

### 2. The merge on the worker's word

**Setup.** Worker 3 reports `DONE — all tests pass, branch par/billing`. The coordinator's merge target
is `main`; the worker's branch is three commits ahead of base.

**Baseline (hypothesis — unverified).** The coordinator runs `git merge par/billing`, sees a clean
fast-forward, and marks the slice complete without running anything. The worker had run its check in a
dirty worktree and committed only the test change, so the branch carries a test and no implementation.

**Required.** Phase 5: pre-flight confirms the worktree is clean and the diff is non-empty; the
coordinator runs the worker's check against the branch itself, reads the summary line, and compares it
with the reported one; the diff is read against `owns`; then the merge, then the check again on the
merged tree.

**Observable.** A coordinator-run command appears against the branch sha before the merge, with its
output line recorded; `git diff --stat <base>..<branch>` was read; the branch is not marked complete
while its worktree is dirty or its diff is empty.

### 3. Green before the merge, red after

**Setup.** Two workers, disjoint file sets. Worker A's suite passes at base `4f2c1ab`. Worker B merges
first; B changed a shared type that A's code constructs.

**Baseline (hypothesis — unverified).** The coordinator verifies A on its branch (green), merges A onto
a tree that now contains B, sees no textual conflict, and reports the wave complete. The type error is
semantic: `tsc` is never run again on the merged tree.

**Required.** Phase 4 step 5: the check runs on the merged result, after every merge, and its output is
the evidence for the wave. A green branch result is recorded as a branch fact, never as a merge fact.

**Observable.** Each merge record carries a check output produced after that merge; the type check
appears in the merged tree's run and not only in the per-branch runs.

### 4. The lockfile nobody owned

**Setup.** Two workers, both adding a dependency. Neither manifest row lists `pnpm-lock.yaml`; each
worker runs `pnpm add` in its own worktree.

**Baseline (hypothesis — unverified).** Both branches merge cleanly except for the lockfile, which the
coordinator resolves by taking "theirs" on the second merge. The first worker's dependency disappears
from the lockfile; the install is fine locally because `node_modules` still holds it, and CI fails on a
clean checkout.

**Required.** The lockfile is named as a single-owner file in Phase 1 — one worker owns it, or neither
touches it and the coordinator regenerates it once after the last merge. A conflict in a single-owner
file stops the queue.

**Observable.** `pnpm-lock.yaml` appears under exactly one owner or under "coordinator after merge" in
the manifest; the merged lockfile contains both dependencies, and the post-merge check ran on a clean
install rather than an existing `node_modules`.

### 5. The conflict resolved by keeping both sides

**Setup.** Workers 1 and 2 both modify `src/router.ts`, which the manifest assigned to worker 1 only.
Worker 2 needed "one line" and added it without asking.

**Baseline (hypothesis — unverified).** The coordinator sees the conflict, resolves it by keeping both
sides because each looks correct in isolation, and moves on. Both routes now match the same prefix;
whichever registers last wins, and neither worker's tests cover the ordering.

**Required.** Pre-flight catches the out-of-set path in worker 2's diff and stops the queue. The
coordinator decides: re-cut the partition (the line moves to worker 1's slice), or record the shared
file as a deliberate sequencing decision. The resolution is never silent.

**Observable.** The merge record names the out-of-set path and the decision taken; the manifest is
amended before the merge, or the branch is sent back; no conflict is resolved without a record naming
who owns the file afterwards.
