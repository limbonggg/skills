---
name: manage-context
description: Use when the context window is filling or a session is ending — "running out of context", "compact", "summarize where we are", "start a fresh session", "carry this context into a new session", "fork a subagent for this", or the agent has started repeating itself or forgetting a decision. Not for writing the handoff document itself (use write-handoff) or a single worker's contract (use dispatch-workers).
domain: meta
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: structural slot
  baseline: summary-that-keeps-the-narrative-and-drops-the-decisions
  eval: evals/
---

# Manage Context

A context boundary is a lossy copy made at the worst possible moment. This skill decides what is
allowed to be lost: the reasoning and the file copies die on the near side, the decisions, the open
state, and the pointers cross.

```
WRITE THE CARRY-FORWARD BLOCK BEFORE THE WINDOW DIES — DECISIONS AND OPEN STATE CROSS, REASONING AND COPIES DO NOT.
```

## When to use / when not to use

Use when:

- the user says "you're running out of context", "compact", "summarize where we are", "start a fresh
  session", "continue this in a new chat", "carry this context into the next session", "fork a
  subagent for this", "spin up an agent to crawl this so the thread stays clean"
- the harness reports the window filling, or fires a compaction nobody asked for
- the agent repeats a step it already ran, cites a file version that has changed, or says "as we
  discussed" with nothing to point at
- a phase just closed and the next one is a large read
- the session is ending and tomorrow's agent must continue the work
- a search, log crawl, or exploration would flood the main thread with material nobody will act on

Not when:

- the artifact is the handoff document itself — that is `write-handoff`; this skill decides when a
  boundary is needed and what qualifies to cross it
- one bounded slice is being delegated and the contract is the question — that is `dispatch-workers`
- the run must survive hours unattended — that is `run-autonomously`; its state file is the memory,
  and the transcript is not
- the window is fine and the task is mid-phase — keep going; a boundary costs fidelity and buys nothing
- the question is whether to stop or escalate — that is `stop-or-escalate`
- the plan is wrong — that is `frame-the-problem` or `split-by-frontier`; compacting a wrong plan only
  makes it shorter

| if the situation is | use |
|---|---|
| the same agent continues and the window is filling | this skill, compact |
| a different session, agent, or human continues later | this skill, then `write-handoff` for the carrier |
| a noisy, checkable slice would flood this thread | this skill, fork; `dispatch-workers` for the contract |
| the work is an unattended loop | `run-autonomously` |
| the question is whether the work is correct | `prove-it` |

## The process

### Phase 1 — Choose the boundary from an observable, not from anxiety

Read the meter if the host has one, then read the symptoms. Quality degrades before the window fills,
so the symptom is what tells you the context is already rotten rather than merely large.

Take 60% as the planning threshold and 80% as forced. Both are policy defaults; a host that
auto-compacts overrides them by firing first, which is why the block is maintained continuously
(Phase 2) rather than written at the last moment.

| what you observe | transition |
|---|---|
| repeating an action already done, citing a stale file version, "as discussed" with no referent, answering from an earlier draft | boundary now, at any meter |
| meter ≥80%, or the next read is larger than the space left | boundary now |
| the process is ending, another context continues, or the host will not let you write the post-compaction message | hand off |
| meter ≥60%, the same agent continues, and a phase is closing | compact |
| the next slice is separable, noisy, and checkable, and this thread must stay clean | fork — a shape decision, legal at 10% |
| none of the above | keep going — no boundary |

The three transitions are not interchangeable. **Compact** keeps the same agent and spends fidelity.
**Hand off** crosses to a different context and spends a carrier that must outlive the process.
**Fork** protects this context by pushing a slice into a child. Hand off when the context is not yours
to keep; compact when it is.

**Done when:** one transition is named, with the row of the table that fired it.

### Phase 2 — Write the carry-forward block while the material is live

The block is the only thing that crosses. It is written from the live context, before the boundary,
and appended as decisions happen — never reconstructed afterwards from a summary. Every slot is
mandatory; a short block is short lines, not fewer slots.

```
task:      <one sentence: what is being done and why>
decided:   <decision> · because <reason> · reopen if <observation>
rejected:  <approach> · because <reason>            # one line per dead end
done:      <item> · proved by <check run and its summary line>
open:      <question or blocker> · owner <who> · settles on <observation>
next:      <one imperative action>
pointers:  <path:line-range | command | commit | URL> · why
do-not:    <constraint, approval, or forbidden action that must survive>
```

A slot with nothing to say is written `none`; it is never removed, because its emptiness is
information — `rejected: none` says no dead end was found, while a missing line says nobody looked.

What qualifies for each column:

| crosses the boundary | dies at the boundary | re-read cold, never summarized |
|---|---|---|
| decisions, with reason and tripwire | the reasoning that produced a decision, once the decision is written | the file you are about to edit, in the version on disk |
| rejected approaches, with why | file contents and tool output that a pointer reproduces | the current check output, verbatim |
| open items, owner, settling observation | superseded plans and exploratory dead ends past their one line | exact identifiers: signatures, config keys, schema, commit SHAs |
| constraints, approvals, the latest instruction | restated requirements and duplicated context | the user's latest message |
| pointers precise enough to re-read cheaply | conversational filler, and anything you would not act on | the block itself, as the first read of the new context |
| the next action | — | — |

Two rules make the block worth more than the summary it replaces:

- **A decision is not a topic.** "We decided on the session refactor" is a label. "Rename
  `SessionStore` to `SessionCache`, because three call sites already treat it as a cache; reopen if a
  fourth consumer needs eviction" is a decision. Only the second constrains a future action.
- **`done` needs its check.** "Tests pass" is a claim; "`node --test src/session`, 41 passing, after
  the last edit" is a record. A completion with no run behind it is unresolved state wearing a
  checkmark.

**Done when:** every slot is filled, every decision line names a reason and a reopening observation,
and every pointer resolves — the path exists, the symbol is there, the command has been run.

### Phase 3 — Test the block cold, then delete what it does not need

Read only the block and answer five questions: what is being done, which decisions constrain the next
action, what is unresolved and who owns it, what is the next action, and what must not be redone. If
any answer needs the old transcript — "as discussed", a pronoun with no referent, an option label whose
options are not written out — the block fails and goes back to Phase 2.

Then apply the deletion test to every line: if dropping it would not change the next action, and a
pointer reproduces it, drop it. The test prunes lines, never slots. A block that grows to the size of
the work it summarizes has bought a second copy, not a boundary.

**Done when:** the five questions are answerable from the block alone, no prunable line survives, and
every empty slot says `none`.

### Phase 4 — Cross, and make the new context start from the block

**Compact.** The block is the first content after the boundary. If the host injects its own summary,
the block goes above it and the summary is treated as a paraphrase trusted for nothing — it has no
pointers and no reasons.

**Hand off.** Write the block to a file in `write-handoff`'s shape and name it in the first line of the
new context. The block is the content; the file is the carrier that outlives the process.

**Fork.** The brief is the block, plus the slice, plus the acceptance check, plus the return shape. The
child inherits the conversation's conclusions only because they are in the block; it does not inherit
the conversation. If the slice has no check the parent can run, do not fork — an unverifiable fork is a
rumour with a token bill.

If the boundary already happened and no block exists, rebuild it from the artifacts — the working
tree, the state file, the last check's output, the user's messages — and mark every line you cannot
resolve to a pointer as `unverified`. A block reconstructed from the summary alone is the summary.

**Done when:** the first action in the new context read the block, and the first claim made there cites
a block line or a pointer that was re-read — not the old transcript.

### Phase 5 — Re-read cold before the next substantive action

The block is a claim about the world, and the world may have moved. Before the next edit or check,
re-read the cold column of the table: the file, the current output, the exact identifiers, the user's
latest message. Where the block and the disk disagree, the disk wins, and the correction is written
back into the block so the next boundary does not inherit the error.

**Done when:** every cold-list item the next action depends on has been read in the new context, and
any disagreement with the block has been resolved in favour of the disk and written back.

## Gotchas

- Compression eats conclusions first. A summary keeps "we investigated the parser for a while" and
  reduces "we rejected the regex approach because it backtracks on nested input" to nothing — the
  exploration is a paragraph, the decision is a clause. Write decisions as their own lines, one per
  decision, or the next context re-runs the dead end.
- A summary of a file is a claim about a version. If the file changed after it was read — by you, the
  user, or a formatter — the summary is confidently wrong. The pointer is the only part that stays
  true.
- There is no guaranteed compaction boundary. Some hosts keep the last turns verbatim, some summarize
  the middle, some fire unannounced mid-tool-call. "It was in the last message" is not storage;
  anything that must survive goes in the block.
- A fork inherits the brief and nothing else — including none of the constraints you stated in the
  parent. A worker will delete the file you decided to protect because "don't touch X" never crossed.
  The `do-not` list belongs in every brief.
- The meter reads the prompt, not the turn about to happen. A large tool result can arrive after the
  reading, and cached prefixes may not be counted. Read the trend and the size of the next read, not
  the last number.
- A block maintained only at phase gates is up to a phase stale when auto-compaction fires. Append
  decision lines as they are made; the block is a ledger, not a report.
- A handoff written in the final message is written from memory, which is exactly the faculty that is
  failing. If the block does not exist before the last message, the handoff is a summary of a summary.
- Precise pointers are the economics of the whole skill: `src/auth/session.ts:40-88` costs fifty lines
  to re-read; "the session code" costs a search and then the file. Record the range and the symbol.
- A stale block can outrank the disk. If the block says "the migration is unapplied" and the disk says
  otherwise, the block is wrong; write the correction back so the next boundary does not inherit it.
- The block can grow into the transcript it replaced. If it approaches the size of the work, the
  boundary bought nothing. Run the deletion test on every line before crossing.

## Rationalizations

| Excuse | Reality |
|---|---|
| "I'll remember the important parts" | Memory is the faculty the boundary replaces. If it is not in the block, it does not cross. |
| "The summary already covers it" | Read the summary for a decision: it says "we discussed the approach". Decisions are the first thing compression eats. |
| "I'll compact when it's actually full" | At full, the material to write the block from is already truncated. The block is written before the boundary, not during it. |
| "Re-reading the file wastes tokens" | The stale copy costs an edit against a version that no longer exists, plus the re-read afterwards. |
| "It's a small task, it doesn't need a block" | Then the block is four lines. The slots do not disappear; the lines get shorter. |
| "The subagent already has the context" | It has the brief. No fork inherits the parent's transcript. |
| "I'll write the handoff at the end, when it's coherent" | The end is where memory is worst. Append while working; the boundary is a promotion, not a writing session. |
| "This decision is obvious, it doesn't need a line" | The next context was not in the room. Obvious to you is unstated to it. |
| "Different words, so the rule doesn't apply" | Spirit over letter. A "brief", a "summary", and a "recap" are all the block, and all of them need the decisions. |

## Red flags

- You are summarizing the session and no decision appears in the summary.
- You are about to edit a file you have not read since the boundary.
- Your next action depends on a detail you can only describe as "as discussed".
- The window is nearly full and the block does not exist yet.
- You are forking a worker without writing the constraints it must obey.
- You are re-reading a file to remember a conclusion instead of reading the block.
- The boundary already fired and you are rebuilding state from the summary it left.
- You are explaining why this compaction is safe without the cold-read test.

## Limitations

- In a host that compacts automatically and does not let you write the first post-compaction message,
  the block cannot be injected. It degrades to a file whose first read is the new context's first
  action — which works only if the host does not also clear file reads.
- Without a meter, Phase 1 runs on symptoms, and symptoms are late: the agent is already answering
  from a stale version before it notices. The 60/80 thresholds are a policy, not a measurement.
- Cannot make a lossy summary lossless. The block bounds the loss to reasoning and re-readable
  content; a decision that was never written down is gone, and no wording recovers it.
- Fork economics depend on the harness actually isolating context. Where a "subagent" shares the
  parent's window, the fork adds a brief and the parent still pays for the child's output.
- The cold-read test is a judgement made by the same model that wrote the block. It catches missing
  slots and unresolved references; it cannot catch a decision that was wrong when it was recorded.
- A block written in the model's own compressed register can hide a gap behind a confident phrase.
  The pointers are the check — if a line cannot be resolved to a path, command, or quote, it is a
  belief, not a record.
