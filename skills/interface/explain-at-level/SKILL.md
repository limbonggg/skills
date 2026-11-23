---
name: explain-at-level
description: Use when the same answer has to land with a particular listener — "explain this to the execs", "pitch it to the board", "ELI5", "for a non-technical audience", "just the gist", "in plain English", "go deeper", "too much jargon", "write it for the new hire", or an answer that was correct but pitched at the wrong depth. Not for the evidence report (use report-with-evidence), the verdict (use disagree-well), or state that must survive a context boundary (use write-handoff).
domain: interface
risk: none
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: correct-answer-at-the-wrong-altitude
  eval: evals/
---

# Explain At Level

The same answer pitched at the wrong altitude is a wrong answer for that reader. This skill makes the
agent name the listener, enter where that listener enters, and carry one load-bearing concept until it
lands — with the rest offered, never front-loaded.

```
ANSWER AT THE LISTENER'S ALTITUDE: ONE ENTRY POINT, ONE LOAD-BEARING CONCEPT — DETAIL ON DEMAND, NEVER FRONT-LOADED.
```

## When to use / when not to use

Use when:

- the user says "explain this to the execs", "pitch it to the board", "ELI5", "explain it like I'm
  new", "for a non-technical audience", "in plain English", "just the gist", "the one-line version",
  "go deeper", "walk me through it", "too much jargon", "write it for the new hire"
- the same content has to reach two audiences — the decision-maker and the implementer — and one draft
  is being asked to serve both
- an explanation was correct and still failed: the exec asked "so what", the engineer asked "why are
  you telling me this", the newcomer nodded and then did the wrong thing
- you are writing a doc, a code comment, an ADR, an incident summary, or a release note that a named
  reader will act on
- you catch yourself explaining the mechanism to someone who asked whether to fund it, or explaining
  what a queue is to someone who has been on call for a year

Not when:

- the content is a claim about what the system does and the question is what evidence it carries — that
  is `report-with-evidence`; this skill pitches the content, it does not supply the proof
- the message is a verdict on someone's work — that is `disagree-well`
- the message is a question — that is `ask-better`
- the state must survive a context boundary and be executed by a stranger — that is `write-handoff`;
  this skill explains to a reader who is present
- the window is filling and what must cross the boundary is the question — that is `manage-context`;
  this skill compresses an explanation, it does not decide what survives a session
- the reader needs to know whether the claim is true — that is `weigh-evidence` or `prove-it`
- the ask is a literal translation or a style edit with no reader in mind — that is editing, not
  altitude
- the explanation is a general-knowledge answer with no listener to pitch to ("how does TCP work") —
  answer it; there is no altitude to choose

| if the situation is | use |
|---|---|
| the answer is right and the reader still did not get it | this skill |
| the reader needs the command, the output, the gap | `report-with-evidence` |
| the reader is deciding whether the work is sound | `disagree-well` for the verdict, a lens for the finding |
| the reader is a future context resuming the work | `write-handoff` |
| the question is still open | `ask-better` or `weigh-evidence` |

## The process

The output is a ladder of three rungs and one delivered rung. The phases exist to fix the audience, the
entry point, and the single concept before a sentence is written — because the default is to explain
the way you understand it, which is the one altitude the listener does not share.

### Phase 1 — Name the listener and the action they take next

Altitude is not seniority and it is not job title. It is what the reader will do with the answer, and
that is visible in the question they asked and the next question they will ask.

| listener | what they do next | the tell in their question |
|---|---|---|
| exec | fund it, cut it, escalate it, or stop asking | "what does it cost", "when will it be done", "why should I care" |
| peer | review it, build on it, or break it | "how does the retry work", "what happens under load", "where is the seam" |
| newcomer | decide whether to trust it, then learn it | "what is a…", "why does this exist", "ELI5" |
| self, later | resume or maintain it from the artifact | "why is this here", a code comment, a doc, a decision record |

A title is a bad proxy: a VP who wrote the parser wants the invariant, and a junior who owns the
on-call rota wants the consequence and the runbook line. Read the next action, not the org chart.

**Done when:** one line names the listener, the action they take next, and the vocabulary they already
own — the terms you may use without defining.

### Phase 2 — Enter where that listener enters

The entry point is the first thing the listener can accept, not the first thing that is true, and not
the most important thing.

- **Exec — conclusion first.** The answer, what it means for them, and the facts that carry it. Cost
  and risk are content at this altitude, not caveats: an exec who does not hear the cost assumes there
  is none.
- **Peer — mechanism first.** The invariant, the data flow, the failure mode, in the domain's own
  terms. The jargon is the shared shorthand; expanding it spends their time on what they already know.
- **Newcomer — one analogy, then the mechanism.** The analogy is a loan against their understanding,
  so it ships with its break point: "like a queue at a till — except the till serves people in any
  order".
- **Self, later — the reason and the pointer.** Why this exists, what it replaced, and the exact
  identifier or path. The narrative of how you got here is not content.

**Done when:** you can name the entry point you chose and point at the sentence that is it.

### Phase 3 — Hold one load-bearing concept

An explanation lands one thing. Name the concept the listener's next action depends on, in one
sentence. Every other true thing is either support for that sentence or a later rung.

If two concepts both feel load-bearing, the listener's next action decides which one this message
carries; the other becomes the next message. Sending both is how a correct explanation becomes a page
nobody finishes.

**Done when:** one sentence states the load-bearing concept, and every sentence of the draft either
advances it or is scheduled into a later rung.

### Phase 4 — Write the ladder, each rung standing alone

```
Rung 1 — one line:      the answer, and what it means for this listener
Rung 2 — one paragraph: rung 1 plus the mechanism or evidence that makes it credible, at the entry point
Rung 3 — one page:      rung 2 plus the alternatives, the caveats, and the detail a maintainer needs
```

Each rung is written to be read alone: a listener who reads only rung 1 has a true, complete-enough
answer for their action, not a teaser. Each rung adds; none restates the one above it in longer words.
A "TL;DR" stapled to the original is not a ladder — it is the original with a summary on top.

**Done when:** all three rungs exist, rung 1 is true and sufficient for the listener's action, and no
rung contradicts another.

### Phase 5 — Ship one rung, offer the next, and read it as the listener

The delivered message is the rung the listener's action requires: rung 1 by default, rung 2 when the
action is a review or a build, rung 3 when it was asked for. The rest is offered in one clause — "the
mechanism is below if you want it", or a pointer to the page — because detail the reader did not ask
for is a cost, not a courtesy.

Then reread as the listener and check the two altitude failures:

- **Jargon to the exec** — a term they do not own, an internal name, a mechanism where a consequence
  was asked for. They will not say "I don't understand"; they will ask the same question again.
- **Condescension to the engineer** — a sentence explaining something they demonstrably know. It reads
  as not knowing the domain, and it buries the one thing they could not derive.

The test for every sentence: does this teach the listener something they already know, or assume
something they do not? Both are the same error — a sentence written at your altitude instead of theirs.

**Done when:** every term is either in the listener's vocabulary or defined in one clause, no sentence
explains what the listener demonstrably knows, and the next rung is offered in one clause or the
message says there is none.

## Gotchas

- The exec's question is never "how does it work". It is "what does it cost me and what do I do". A
  mechanism-first answer is a non-answer at that altitude, and the exec asks again in different words —
  which reads as you not answering, not as them not understanding.
- Dropping jargon for a peer is not clarity, it is condescension. Answering "the retry storm" with
  "when the system tries again many times" spends their time on their own vocabulary and signals you
  do not know the domain you are explaining.
- An analogy is a loan that accrues interest. Every analogy that does not map leaves a wrong model the
  listener will act on; one analogy with its break point stated is worth three that are merely vivid.
- Altitude is not job title. A VP who wrote the parser wants the invariant; a junior on the on-call
  rota wants the consequence and the runbook line.
- A summary is not a ladder. "TL;DR" above the full text doubles the length, and the reader takes the
  short one and ignores the rest — so the long rung was written for nobody.
- Pasting all three rungs is the one-page version with a summary on top. It reads as thorough to the
  writer and as unanswered to the reader, who has to find the answer inside it.
- "Explain X" from someone who has already read the code is a request for the one thing they could not
  derive, not for the whole model. Answer the gap they named, not the topic they named.
- More context is not more credible. Evidence belongs at the rung whose action needs it; a page of
  proof under a one-line answer buries the answer, and the reader stops at the proof.

## Rationalizations

| Excuse | Reality |
|---|---|
| "More detail can't hurt" | It can. Detail is the reader's cost, and it hides the answer they asked for. |
| "They asked how it works, so I'll explain how it works" | The words of the question are not the altitude. "How does it work" from an exec usually means "what happens if it breaks". |
| "Better to over-explain than under-explain" | Over-explaining to a peer is condescension; under-explaining to a newcomer is jargon. Both are altitude errors, and the volume dial fixes neither. |
| "I don't know who is reading" | Answer at rung 1 and offer the next. A too-short answer is corrected in one turn; a page nobody needed is not read at all. |
| "The analogy makes it clearer" | For a listener who shares it. An analogy they do not share is a second thing to learn, and one that does not map installs a wrong model. |
| "They'll ask if they want more" | They cannot ask about a rung they do not know exists. Offer it in one clause. |
| "I need to show my work" | Then the evidence goes at the rung whose action needs it — and when the claim is the point, that is `report-with-evidence`. |
| "This is the version I would want" | You already have the model. That is exactly the altitude the listener does not share. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "ELI5", "in plain English", "just the gist", "for a non-technical audience", and "deep dive" are all altitude requests. |

## Red flags

- Your first paragraph is context and the answer is in the third.
- You are writing the mechanism for someone who asked whether to fund it.
- You are defining a term the listener used first.
- Two concepts are competing in one message and neither has landed.
- All three rungs are pasted into one message.
- You cannot say in one sentence what the listener should do differently after reading.
- Your analogy has no stated break point.
- You are choosing the explanation you would want, not the one they asked for.

## Limitations

- Cannot know a listener's vocabulary without a signal. In a one-shot message to an unknown reader — a
  public issue, a README, a stranger's inbox — the altitude is a guess: answer at rung 1 and offer the
  rest.
- Pitches the answer; it does not make the answer true. A well-levelled wrong explanation is still
  wrong, and the truth of it is `weigh-evidence`'s job.
- Cannot replace the question the listener asked. If they asked "is it safe" and the honest answer is
  "here is how it works", the altitude is right and the answer is still missing — say so.
- The ladder is written by the mind that holds the full model, so rung 1 tends to smuggle in the
  mechanism it cannot unsee. The check is a reader who has not seen rungs 2 and 3.
- Cannot serve two listeners in one message without splitting it. An exec and an engineer reading the
  same paragraph enter at different points; write two rung-1s, not one compromise.
