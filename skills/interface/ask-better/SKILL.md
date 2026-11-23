---
name: ask-better
description: Use when the request is underspecified and a wrong reading costs a rebuild — "build me a dashboard", "add auth", "make it faster", "I'm not sure what I want yet", "ask me what you need" — or when you are about to send a list of questions the repo could have answered. Not for choices that are yours and cheap to undo (use make-the-call), or facts that live in the code (search, do not ask).
domain: interface
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: interrogation-list-or-silent-assumption
  eval: evals/
---

# Ask Better

Every unknown is a fact, a decision, or an assumption, and each one has a different owner. This skill
makes the agent find the facts itself, put one decision to the human at a time with a recommendation
and its price, and write down what it assumed instead of burying it.

```
NO QUESTION YOU COULD HAVE ANSWERED YOURSELF — ONE DECISION PER TURN, WITH A RECOMMENDATION AND ITS CONSEQUENCE.
```

## When to use / when not to use

Use when:

- the request is one sentence and could mean three things: "build me a dashboard", "add auth", "make it
  faster", "clean up the tests", "add a search box"
- the user says "I'm not sure what I want yet", "ask me what you need", "let's figure out the
  requirements", "what do you need from me?", "help me think this through", "grill me on this"
- you catch yourself writing "assuming X" or "I'll go with X for now" anywhere in a plan
- you are about to send a numbered list of questions, or a "quick checklist to confirm"
- a correction lands — "that's not what I meant", "no, the other one", "why did you build that?" — and
  the follow-up is a better interview, not a faster rebuild
- the work is greenfield, or the decision lives outside the repo: who reads this, what "done" means,
  what it is called, who pays for it
- an unattended run hits a decision only the owner can make, and must leave it as one question for the
  handoff rather than a silent choice

Not when:

- the answer is in the repo, the docs, the config, or their first message — that is a search, and this
  skill forbids asking it
- the choice is yours and cheap to undo — that is `make-the-call`; asking spends a turn and buys
  nothing
- the request is clear and the work is large — that is `split-by-frontier`
- the claim under the decision is untested — `weigh-evidence` first; interviewing a human about a fact
  you could test is the most expensive way to be wrong
- the human is supplying data rather than choosing — a config dump, a field-by-field form, a bulk
  import. That is a questionnaire, and one question per turn is pure overhead
- nobody is there to answer — write the frontier into the handoff and rule on the reversible ones
  (`run-autonomously`, `make-the-call`)

Route each unknown by who owns it:

| if the unknown is | do |
|---|---|
| written down in the repo, the docs, the config, or this conversation | find it; ask nothing |
| a preference, a value, or an external commitment (deadline, budget, customer, legal) | ask it — this skill |
| yours to decide, two-way, cheap to undo | decide it, disclose the ruling (`make-the-call`) |
| not yet stateable because an earlier decision is still open | defer it; ask the earlier one |
| known only to the human (a verbal agreement, an unwritten constraint) | ask it as a decision, not as a lookup |

## The process

The output is a message, and the message has a fixed shape: one decision, a recommendation, its
consequence, and — only when the recommendation is not the only live option — the alternative and what
it costs. The phases exist to decide what goes into that message and to stop the two failures it
replaces: a list of questions the agent could have answered, and a guess nobody was told about.

The interview runs in rounds, and a round is one question wide. The answer is the only thing that moves
the frontier, so every question written before it arrives is written against a tree that no longer
exists.

### Phase 1 — Turn the request into a decision tree

Write the decisions the request actually contains, not the tasks it implies. "Build me a dashboard"
contains: who reads it, what question it answers, which data source, how fresh the data is, who may
see it. Each is a node. Draw the blocking edges — "how fresh" cannot be settled before "which data
source".

Facts are not nodes. Anything with one true answer that a file could hold is a lookup, and lookups
belong to Phase 2.

**Done when:** every unknown in the request appears once, either as a decision node with its blocking
edges or as a lookup with the place it is likely to live.

### Phase 2 — Harvest the facts yourself

Search before you ask. The repo, the docs, the config, the schema, the git history, the issue tracker,
the earlier messages in this conversation — and a read-only command where no file will settle it.

The search is the work. A question the repo answers reads as "I did not look", and it costs more trust
than the answer was worth.

When a lookup comes back empty, that is a finding, not a question. An absent fact is usually a
decision nobody has made yet, and it is only the human's if they own the value — a retention policy
nobody wrote is yours to default and disclose; a price nobody wrote is theirs.

**Done when:** every lookup has a written result — the value and where it came from, or "searched
`<places>`, not there". That written result is the artifact that opens Phase 3: no result, no question.

### Phase 3 — Cut to the frontier

The frontier is the set of decisions whose prerequisites are all settled — by a fact from Phase 2 or
by an answer already given. Everything else is fog: real, in scope, and not yet askable, because its
answer depends on one that is still open.

Asking fog returns an answer you will discard, and it teaches the human that your questions are
guesses.

**Done when:** exactly one node is on the frontier, and every deferred node names the decision that
blocks it.

### Phase 4 — Ask one, with a recommendation and its consequence

One decision per message. Word it as a proposal so "yes" accepts your recommendation — the human's
cheapest reply is the one that keeps the work moving.

```
Q:           <the decision, one sentence, answerable yes/no>
Recommend:   <the answer you would take>
Consequence: <what it commits to, what it rules out, what it costs to undo>
Alternative: <the other live option and what it costs>    (omit when there is only one)
```

Three rules make the shape work:

- **The recommendation is yours to defend.** It comes from the Phase 2 evidence and the defaults of
  the stack, not from "whatever you prefer". If you cannot say why, Phase 2 is not finished.
- **The consequence is the price of "yes".** Without it the human accepts a commitment nobody priced,
  and the exchange produces consent instead of a decision.
- **The alternative is live, or it is not a question.** If the only option you would accept is your
  recommendation, do not ask: do it and say so. A demand with a question mark spends a turn and
  returns nothing.

**Done when:** the message carries one decision, its recommendation, and its consequence — and every
other open item in it is labelled a fact, an assumption, or fog, never a question.

### Phase 5 — Take the answer, update the tree, ask the next

An answer is a premise, not a conclusion. Record it with its source ("they chose the flag"), then
re-derive the frontier: answers kill nodes they made moot, unblock nodes that were waiting on them, and
occasionally contradict a fact from Phase 2.

Check the answer against the repo before building on it. A human who says "we're on Node 18" while
`package.json` says 20 has given you a fact-shaped recollection; the tree is now wrong and the next
three questions inherit the error.

**Done when:** the answer is recorded with its consequence, the nodes it killed are dropped, the nodes
it unblocked are named, and the next frontier holds one node — or none.

### Phase 6 — Stop, and write down what you assumed

The frontier empties. Every remaining decision is now one of four things: found, answered by the
human, ruled by you, or assumed. Write the last two down, once, before the work starts.

```
Ruled:     <decision> — <why> — <undo>
Assumed:   <default> — <what would make it wrong> — <what changes if it is>
Not asked: <the decision you kept off their desk> — <why: mine to rule | one option | cheap to undo>
```

An assumption inside a paragraph is a silent assumption; it is disclosed only if it is in the list. The
list is also what makes the next correction cheap — it names the line that was wrong.

A **zero-question turn** is a legal and common ending: when every open node is a lookup you already
ran, a two-way call you own, or a default you can undo, the right message contains no question at all,
just the ruling and the assumption list.

**Done when:** every node from Phase 1 is accounted for as found, answered, ruled, or assumed — and the
message ends with that accounting rather than another question.

## Gotchas

- The user's first message usually answers half the tree. "Postgres — we already run it" buried in a
  two-paragraph request becomes a database question, and the interview now reads as not listening.
  Re-read the request before Phase 3 and strike every node it already settles.
- A question with a recommendation and no consequence is a leading question. The human says yes, the
  commitment lands, and the price arrives at the demo. The consequence line is the whole difference
  between consent and a decision.
- "What do you need from me?" is an invitation, not a licence. A fifteen-item list answers it and moves
  the thinking back to the human, who now has less context than you do.
- An answer can be stale or wrong. `package.json`, the schema, and the deploy config outrank a
  recollection, and a correction that arrives after three dependent questions costs three answers.
- Questions asked in a batch get answered in a batch, and the later answers were written against a
  tree the earlier answers already moved. That is how a set of decisions that sounded consistent
  contradicts itself at implementation time.
- One question per turn is expensive by design. A twenty-decision project is twenty round trips, which
  is why most of those decisions must die in Phase 2 (found) or Phase 6 (ruled) instead of being
  asked. The turn count is a budget, and the fact harvest is what keeps it small.
- The current code records what was decided, not why. `git log -S` and the issue tracker answer "why is
  it like this" when no comment does; asking the human instead of reading the log spends their turn on
  archaeology they already did.
- In an unattended run nobody answers. The frontier is still real, and it belongs in the handoff as an
  open question with its recommendation and consequence attached — never as a silent choice.

## Rationalizations

| Excuse | Reality |
|---|---|
| "I'll ask everything up front to save round trips" | A list is not an interview. Each answer moves the tree, so half the list is stale by the time it is read. |
| "It's faster to just ask" | Faster for you. It costs the human a full pass over a list they must think through, and it tells them you did not look. |
| "The user is the expert, so the questions are theirs" | They are the expert on their intent, not on their own repo. Facts are yours; intent is theirs. |
| "I'll pick something sensible and mention it at the end" | Mentioned at the end is not disclosed before it was built on. The assumption list is the disclosure. |
| "This decision is too small to bother them with" | Then do not ask — rule it, say so, make it undoable. "Too small to ask" is a reason to decide, not a reason to hide. |
| "I can't ask anything until I know X" | X is a lookup or a fog node, and neither blocks the rest of the frontier. Ask what is unblocked now. |
| "It's obvious from context" | Obvious is a hypothesis. One grep settles it, and a wrong obvious costs a rebuild. |
| "They said 'ask me what you need', so anything I'm unsure about is fair game" | "What you need" means what you cannot find, not what you have not looked for. |
| "The answer they gave is authoritative" | Authoritative about intent. About the repo it is a recollection, and the repo wins. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "A few things to confirm", "just to make sure", and "quick checklist" are question lists. |

## Red flags

- Your message contains a second question.
- You are asking something the repo, the docs, or their first message answers.
- Your question has no recommended answer.
- Your recommendation has no consequence line.
- You are about to build on an answer you did not check against the repo.
- Your question depends on a question you have not asked yet.
- You are writing "I'll assume…" mid-paragraph instead of in the assumption list.
- The human's answer changed nothing in your plan — that question was not a decision.
- You are asking a question you would have ruled on yourself.

## Limitations

- One decision per turn is the wrong shape when the human is supplying data rather than choosing: a
  config migration, a survey, a field-by-field import. There the questionnaire with defaults is
  correct, and this skill's turn budget is pure overhead.
- Cannot find an intent that exists nowhere. A verbal agreement, an unwritten constraint, and a
  preference nobody has stated are decisions from this skill's point of view, and it will spend a turn
  on each.
- The fact harvest is bounded by what the repo and the tools expose. A fact that lives in someone's
  memory is indistinguishable from a decision here, and will be asked as one.
- Assumes the human answers in the channel you asked in. On a slow channel — email, a ticket, an
  overnight run — the round count is the entire cost, and the only levers left are ruling more and
  assuming more, both of which move risk onto the work.
- Cannot make a bad question good. It forces the search, the recommendation, and the consequence; if
  the tree in Phase 1 is wrong, the interview is efficiently asking the wrong things.
