---
name: report-with-evidence
description: Use when a claim is going to a person — "what did you find", "status", "how did it go", "summarise what changed", "write the PR description", "release note", "report back", "how confident are you", "what's still unverified" — or when ending a task, relaying a worker's result, or posting a review finding. Not for deciding whether the claim is true (use prove-it or weigh-evidence), nor for the message that must survive a context boundary (use write-handoff).
domain: interface
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: positive recipe
  baseline: prose-completion-without-slots
  eval: evals/
---

# Report With Evidence

A claim that reaches a person is a report with seven filled slots, not a paragraph. This skill makes
the reader able to check the claim without re-running anything and without asking what is missing.

```
EVERY CLAIM CARRIES ITS COMMAND, ITS OUTPUT, ITS CONFIDENCE, AND ITS GAP.
```

## When to use / when not to use

Use when:

- the user says "what did you find", "status", "how did it go", "did it work", "summarise what
  changed", "write the PR description", "the release note", "post an update", "report back"
- you are about to end a task, and the last thing you say is a claim about state
- a worker or subagent returned and its result has to reach a human
- a review finding has to reach an author: what breaks, where, and how you know
- the user asks "how confident are you" or "what's still unverified"
- an incident, a migration, or a release is being described and someone will act on the description

Not when:

- nothing has been run and the question is whether it works — that is `prove-it`; this skill shapes
  the sentence and cannot supply the observation
- the fact itself is in doubt and needs testing before it is reported — that is `weigh-evidence`
- the message is a question rather than a report — that is `ask-better`
- the message must survive a context boundary — that is `write-handoff`, which carries decisions and
  state; this carries claims
- the message is a refusal or a disagreement — that is `disagree-well`
- the output is a choice with its cost — that is `make-the-call`

| if the message is | use |
|---|---|
| a claim about what the system does | this skill |
| a claim that has not been tested | `prove-it` first, then this |
| a claim whose evidence is contested | `weigh-evidence`, then this |
| a finding in someone else's change | this skill, one block per finding |
| the state a stranger resumes from | `write-handoff` |

## The process

The slots are fixed; what goes in them is yours. Five phases, and the last one is the artifact.

### Phase 1 — List the claims the message makes

Every sentence about state is a claim: "it works", "the migration ran", "no other callers", "the
config is unchanged". Write them out, one line each, before writing prose. A status message usually
carries three to six.

**Done when:** every state-asserting sentence you intend to send is on the list, and each is one
claim — a sentence carrying two claims is split into two.

### Phase 2 — Attach the observation to each claim

The observation is the thing you saw, not the thing you concluded. It is a command and its output, a
file read and the line, or a person's words and the quote — and the report says which:

| the claim is about | the observation that can verify it | the slot carries |
|---|---|---|
| behaviour — it runs, it passes, it returns | the command, run this session | command + summary line |
| configuration — the flag is set, the column exists | the file or query, with the line | path:line + the quoted line |
| a person's intent or a decision | the person's own words | the quote, and who said it |
| external state — it is deployed, it is reachable | a probe against the live surface | request + response |
| absence — no other callers, nothing else reads it | the search, with its scope | pattern + scope + count |

No observation, no slot. A claim you cannot attach an observation to is either reworded into one you
can, or marked `unverified` with the gap named. A read is the command of a claim about configuration:
`Ran` names the path and the line the way it would name a command and its flags.

**Done when:** each claim carries an observation of the right kind, quoted rather than summarized.

### Phase 3 — Bound what the observation covers

Two lines, and the second one is the one that gets skipped:

- **Covers** — what the output establishes about the claim.
- **Does not** — what the claim asserts that the output does not touch.

`pytest tests/test_parser.py` covers the parser's unit tests; it does not cover the rendered
component, the integration path, or the other four hundred tests. The gap is not a caveat you add if
asked — it is a slot, and an empty one is visible.

**Done when:** `Does not` names a specific surface, or says "nothing: the observation exercises the
claim as written" and you can defend that sentence.

### Phase 4 — Set the confidence from the weakest slot

`prove-it`'s three registers, bound to the slots so the two skills cannot drift apart. Decided by the
observation, never by your belief:

| confidence | true when |
|---|---|
| `verified` | an observation ran this turn and `Does not` is empty for the claim as written |
| `partial` | an observation ran and `Does not` names a real gap |
| `unverified` | no observation ran, or the one that ran does not distinguish true from false |

A report's overall confidence is its weakest line. Nine verified claims and one unverified claim is a
partial report, and readers average — so the confidence word goes at the top, not in the last
paragraph.

**Done when:** every claim's confidence follows from its `Does not` line, and the report's overall
word is the minimum.

### Phase 5 — Render the block: claim written last, printed first

Fill slots 2 through 7, then write `Claim` at the strength the slots support, then print it first.
The claim is written last because it is a conclusion; it is printed first because it is what the
reader aims the evidence at.

```
Claim:      <one sentence, at the strength the slots support>
Ran:        <the exact command or read, with its flags and path>
Showed:     <the summary line, verbatim>
Covers:     <what that output establishes>
Does not:   <the surface it leaves untouched>
Confidence: verified | partial | unverified — <the reason, one clause>
Unknown:    <what is still open, and what would close it>
```

Legal variants, same slots, no omissions:

- **One claim, one sentence** — the compressed form: the command in backticks, the output line
  quoted, the confidence word, the gap clause, in that order. "Unit tests pass — `npm test`, 87
  passed / 3 skipped this turn; integration not run, so partial, gap = integration."
- **Many claims, one table** — one row per claim, columns `Claim | Ran | Showed | Confidence | Gap`.
  A blank `Gap` cell is a defect; `none known` is an entry.
- **A review finding** — the same block, with `Ran` carrying the file:line you read and `Showed`
  quoting the line.

**Done when:** every claim from Phase 1 appears with all seven slots present — a reader can point at
each one — and no slot is blank.

## Gotchas

- A paraphrase of an output is a different artifact from the output. "All tests passed" written from
  `87 passed, 3 skipped` is a claim the run did not make, and the skipped tests are usually the ones
  the change touches. Paste the summary line.
- The flags are the scope. `pytest tests/test_parser.py -x -k "handles null"` becomes "tests pass" in
  prose, and the path, the filter, and the `-x` disappear with it. Copy the command with its flags.
- The confidence word is the part the reader remembers. A correct `partial` buried in the fourth
  paragraph has become `verified` by the time it is acted on. Put it in the block, and put the block
  first.
- A green run of the change's own tests says nothing about the code the change did not touch. Without
  a `Does not` line the reader assumes the whole system was checked — that assumption is the report's
  fault, not theirs.
- Prose hides omission; a slot exposes it. A missing caveat inside a paragraph reads as a judgement
  call; an empty `Does not` line reads as what it is.
- Relaying a worker's report adds a layer of drift. If the worker ran it and you did not, `Ran` says
  so — "worker: `npm test` (not re-run)" — because a first-person `Ran` you did not execute is a
  fabricated observation.
- Numbers acquire confidence in prose. "About eighty tests" becomes "the suite passes" two sentences
  later. Quote the count the tool printed.
- A clean `git status`, a green CI badge, and an exit code of 0 are each a claim by a tool, not an
  observation of the behaviour. They enter `Ran` only with what they actually establish.

## Rationalizations

| Excuse | Reality |
|---|---|
| "They just want the answer, not a log" | The slots are shorter than the paragraph you would write to justify skipping them. |
| "I said what I ran earlier in the session" | The report is read on its own. A reader who has to scroll up is a reader you failed. |
| "The details are noise at this level" | The command and the count *are* the claim. Remove them and you have an opinion. |
| "It obviously works, I watched it pass" | Then the command and the line are in your context. Paste them. |
| "I'll mention the gap if they ask" | They cannot ask about a gap they do not know exists. |
| "The block is overkill for one line" | Then use the one-sentence form. Compression is not omission. |
| "Prose reads better" | A report is read to be acted on. A block is skimmable; a paragraph is not. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Looks good", "should be fine", "ready to go", and "all set" are claims, and they carry the slots. |

## Red flags

- You are writing "done" and there is no `Ran` line in the message.
- Your `Showed` is a paraphrase of output you did not paste.
- Your `Does not` line is empty and the claim touches anything you did not run.
- You are describing the diff instead of the observation.
- You are drafting the report before the command, filling `Showed` from expectation.
- You are writing `Ran: <command>` for something a worker ran.
- Your confidence word is stronger than the `Does not` line admits.

## Limitations

- Shapes the message, not the observation. A report with seven filled slots and a worthless command is
  a well-formed bad report; choosing the command is `prove-it`'s job.
- Cannot report what was never observed. When the evidence does not exist, the honest output is
  `unverified` plus what would close it — the format makes that legible, not acceptable to the reader.
- Judgement claims fit the slots badly. "This is the right design" has no command, so the report can
  only say `Confidence: unverified — judgement`, and the reader must treat it as an opinion wearing a
  report's clothes.
- Assumes a reader who was not in the session. Where the reader was, the one-sentence form is the
  right size — but all seven slots still have to be pointable, because the shared context is the first
  thing the reader loses.
- Does not detect a false observation. A fabricated `Showed` line is well formed; the format makes it
  checkable by the reader, not impossible.
