---
name: write-handoff
description: Use when a context boundary is coming — "write a handoff", "hand this off", "pick this up tomorrow", "brief the next session", "I'm out of context", "leave a status file", "the run stopped" — or before compaction, reassignment, or the end of an unattended run. Not for the evidence report or release note (use report-with-evidence), and not for planning what remains (use split-by-frontier).
domain: interface
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: structural slot
  baseline: summary-that-keeps-the-narrative-and-drops-the-decisions
  eval: evals/
---

# Write Handoff

A handoff is not a summary of the session. It is the file a stranger executes, and the decisions are the
first thing a summary drops.

```
NO HANDOFF WITHOUT EVERY DECISION NAMED, THE CURRENT STATE IN POINTERS, AND ONE NEXT ACTION WITH ITS COMMAND.
```

## When to use / when not to use

Use when:

- the user says "write a handoff", "hand this off", "pick this up tomorrow", "catch up the next session",
  "leave a status file", "I'm out of context", "brief whoever takes over", "save the state before you
  compact", "you're being reassigned"
- a context boundary is visible: compaction is imminent, the session is ending, the budget is nearly
  spent, a worker is being replaced
- an unattended run stops — complete, blocked, or out of budget — and a later iteration must resume
- work moves between people, agents, or machines: a reassignment, a shift change, a reviewer taking over
  a branch
- a decision was made this session and the next reader will otherwise re-litigate it from scratch

Not when:

- the reader wants to know whether the work is done — that is `report-with-evidence`; the evidence
  report is read once, the handoff is executed
- the message is a release note, a PR description, or a review response — `report-with-evidence`
- the remaining work is not yet structured — `split-by-frontier`; a handoff with a three-item "next
  steps" list is a plan pretending to be a resume point
- the run needs a ruling on whether to continue — `stop-or-escalate`
- the question is "where are we?" inside the same session, with the transcript still in hand — answer
  it; a file adds nothing
- you are writing documentation for users of the system — that is docs, not a handoff

| if the reader will | write |
|---|---|
| execute the next step in a fresh context | this skill |
| decide whether the work is acceptable | `report-with-evidence` |
| plan what remains | `split-by-frontier` |
| rule on whether to keep going | `stop-or-escalate` |

## The process

The slots are fixed; the sentences inside them are not. The template is the skill — every phase exists
to fill one slot and to stop the omission that slot exists for.

```
# Handoff — <slug> · <YYYY-MM-DD> · <in-progress | blocked | complete>

Reader: <who resumes, with what access>

## Decisions
- D1: <what was chosen> | rejected: <alternative> — <why it lost> | because: <the reason this won>
  | lives at: <path#Lnn | commit SHA | issue link>

## State
- Tree: <branch> @ <SHA>; <dirty paths | clean>; <unpushed commits | none>
- Verified: `<command>` → "<summary line, verbatim>"
- Known broken: <what fails, with its error line verbatim>

## Next
<one imperative sentence> — run: `<command>`

## Pointers
- `<path | SHA | URL>` — <one clause: what it is and why the reader needs it>

## Open
- <question> — answered by: <person or source> — blocks: <what>

## Not done
- <thing deliberately left out> — <why it is not in Next>
```

Every slot is filled or marked `none: <reason>`. An empty slot reads as "nothing to say" when it means
"not checked".

### Phase 1 — Name the reader and the boundary

The reader decides what goes in Pointers and how much state has to be inline. One line: who resumes,
with what access, from where — "the next session, same machine, same branch"; "the on-call engineer,
read-only, no repo checkout".

**Done when:** the header carries the slug and the status, and the Reader line names who resumes with
what access.

### Phase 2 — Harvest the decisions, including the ones that were reversed

Walk the session for every point where the plan, a file, or a belief changed. Each one is either a
decision or it is not work. For each: what was chosen, what it beat, why, and where the evidence lives.

A decision with no rejected alternative is a fact, not a decision. Either name what it beat, or move it
to State. A decision that was reversed mid-session goes in the same slot — record the reversal, or the
next reader proposes the thing you already killed.

**Done when:** every turn that changed a plan, a file, or a belief is either in Decisions with a
rejected alternative, or in Not done with a reason.

### Phase 3 — Record state as pointers, plus one verified command

Branch at SHA, dirty paths, unpushed commits; the command that was run and its summary line verbatim;
what is known broken with its error line. No pasted file bodies, no pasted diffs, no pasted logs — a
path and a line range carry more, cost a line, and cannot go stale in the reader's hands.

**Done when:** every claim about state is a path, a SHA, or a command with its observed output, and the
file contains no block copied out of the repository.

### Phase 4 — Name exactly one next action

One imperative sentence and the command that starts it. If three things look like next steps, choosing
between them is a decision (Phase 2) or the other two belong in Not done. A list in Next is a decision
nobody made.

**Done when:** Next holds one action and one command, and every other candidate appears in Decisions or
Not done.

### Phase 5 — Write it to a path, and make the message point at it

The handoff goes to disk at a path the next context reads — the run's state file, `.handoff.md`, the
path the harness already scans — never into the chat alone, because the chat is the thing that ends.
The closing message's first line is that path.

**Done when:** the file exists, every slot is filled or marked `none: <reason>`, and the message names
the path before anything else.

### Phase 6 — Cold-read it

Read only the file — no transcript, no memory of the session — and start Next from it. Any step that
needs something the file does not name is a missing pointer or a missing decision; add it. With a fresh
subagent available, give it the path and nothing else; that is the real test.

**Done when:** the next action can be started from the file alone, or the file says what the reader must
ask for and whom.

## Gotchas

- A summary keeps what was discussed; a handoff keeps what was decided. Compaction summaries, recaps, and
  "here's what we did" messages preserve the narrative and drop the alternatives considered — the one
  part the next session cannot reconstruct from the code.
- Pasted content displaces decisions under a token budget. Every line of pasted file is a line that is
  not a decision, and it is wrong after the next edit. A path and a line range are cheaper and stay
  true.
- A branch name is not a state. "on feature/parser" resumes at whatever HEAD is there tomorrow, which
  may be someone else's commit. Name the SHA, and say whether the branch has moved since.
- Uncommitted work is the most common casualty. A dirty tree with no note reads as leftovers, so the next
  agent stashes or commits it blind. List every dirty path and say keep or discard.
- A decision reversed mid-session gets re-proposed if only the winner is recorded. Write the reversal in
  the same slot: "D3: chose X; Y was rejected earlier because…".
- "Tests pass" in a handoff is a claim nobody will re-check, because the next reader trusts the file more
  than they trust the original. Cite the command and its summary line, or write `unverified`.
- A handoff written at the end is written by the context that is about to die, from its memory of the
  beginning. Write it while you can still see the boundary, or regenerate it from the state file.
- A file the next context cannot find is not a handoff. `.handoff.md` in a busy repo root competes with
  everything; use the path the run contract or the harness already reads.
- A handoff crosses tool surfaces. Name actions, not tool names: "run the suite" survives a harness
  change, "use the Bash tool" does not.

## Rationalizations

| Excuse | Reality |
|---|---|
| "The transcript is still here, I'll summarise it" | A summary of a transcript preserves what was said. The next context needs what was decided and what was rejected. |
| "I'll paste the files so they have full context" | Pasted content is stale after the next edit and spends the lines the decisions need. Path plus line range. |
| "The next step is obvious from the diff" | The diff shows what changed, not what remains or why the half-finished function is half-finished. |
| "Nothing important was decided" | Then either the session did no work worth handing off, or the decision is hiding inside a code change. Look; if there is truly none, write `Decisions: none — <why>`. |
| "The user already knows what we decided" | The reader is not the user. The user has the session; the reader has the file. |
| "I'll write it at the end, when I know the whole shape" | The end is where the context is thinnest. Write it at the boundary you can still see across. |
| "It's just a status update" | A status update is read; a handoff is executed. If nobody executes it, it is `report-with-evidence`. |
| "Everything passes, I'll just say so" | Cite the command and its output line, or the next reader inherits a claim with no owner. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Notes for tomorrow", "context dump", and "resume point" are handoffs. |

## Red flags

- You are writing paragraphs under a heading instead of filling a slot.
- You are pasting a file, a diff, or a log into the handoff.
- Next holds more than one action, or an action with no command.
- A decision appears without the alternative it beat.
- The handoff exists only in the chat message.
- You are reconstructing decisions from the start of the session without checking the end.
- You are calling the compaction summary a handoff.
- You are filling a slot with "N/A" where the reader needs to know what you checked.

## Limitations

- Cannot reconstruct a decision nobody recorded. It can force the slot; where the reason is gone, write
  `why: unknown — re-derive before relying on it`, which is honest and costs one line.
- Pointers assume the reader can reach the same filesystem. In a sandbox that will be destroyed, or a
  log-only harness, inline exactly the lines Next needs and say why — the exception is the reader's
  access, never convenience.
- SHAs do not survive a rebase or a squash. The handoff names history; it cannot pin it.
- Does not verify the state it records — that is `prove-it`. A handoff citing an unverified claim
  propagates it with more authority than the original.
- Assumes one next action is the right shape. Work that genuinely forks into two independent tracks
  needs `split-by-frontier` first; the handoff can record the fork, not resolve it.
- Written by the same context it is meant to outlive, so it inherits that context's blind spots. The
  cold read in Phase 6 catches missing pointers, not a decision the session never noticed making.
