# Taxonomy

Two layers. **Domains** are storage: eight, mutually exclusive, fixed. **Lenses** are navigation:
curated packs that cut across domains and answer "I am a staff engineer on a legacy system, what do I
load?".

The split exists because the evidence is unambiguous about what happens without it: sickn33's
catalog decayed 131 categories into a keyword index with 31 singletons and one topic spread across
11 buckets, while the browseable unit that survived at scale was the curated bundle of 5–20.
Categories are for filing. Lenses are for choosing.

---

## 1. The organising axis

**A skill lives in the domain where its output lands.** Not its topic, not its author, not the
technology it mentions. One question decides every boundary case:

> *When this skill finishes, what exists that did not exist before?*

| if the output is… | domain |
|---|---|
| a belief, with its evidence attached | `thinking` |
| a choice, with its reasoning and its cost | `judgement` |
| a structure of work | `decomposition` |
| a change to the repository | `execution` |
| a managed agent, iteration, or budget | `orchestration` |
| a noticing — something flagged that others would miss | `lenses` |
| a change to the agent's own operating setup | `meta` |
| a message to a person | `interface` |

Two consequences worth stating up front. A skill that produces *both* a structure and a change is two
skills; if it genuinely cannot be split, it belongs to the domain of its **final** output and
cross-references the other. And a skill whose output is "a better understanding" is not a skill — it
has no completion criterion, which is the defect that lets an agent invent a process and burn 100k
tokens.

---

## 2. The eight domains

### `thinking/` — how evidence is weighed

**Job:** change the reasoning *before* a conclusion exists.
**Admission test:** does the skill alter how a claim — or a plan's failure modes — is tested,
bounded, or falsified?
**Output:** a belief with its evidence attached, and the reasoning that connects them.

What belongs: hypothesis discipline (two-hypothesis rule, IS/IS-NOT bounding), claim-level diagnosis
and root-cause reasoning priced as a claim (`weigh-evidence`), assumption classification
(fact / convention / belief / interest), falsification, base rates, causal vs correlational
separation, uncertainty calibration, steelmanning, the pre-mortem (the plan's failure modes enumerated
and priced before the plan exists, `premortem`), the difference between "I verified" and
"I believe".

What does not: deciding what to do (that is `judgement`), breaking work up (`decomposition`),
checking your own work before claiming it (`execution`'s evidence gates).

Boundary note: the *diagnosis* discipline is `thinking` (`weigh-evidence` prices the claim). The full
debug loop — reproduce → isolate → mechanism → fix → verify — is `execution`
(`debug-systematically`): its deliverable is a change + proof, and its Iron Law (`no fix until the
failure reproduces on demand`) is the gate that prevents entering at the second half, which is the
failure mode a combined skill would otherwise invite.

---

### `judgement/` — how choices are made under uncertainty and cost

**Job:** produce a decision, and defend it.
**Admission test:** does the skill output a *choice* — do / don't / how much / when to stop / who
decides — with its cost and reversibility named?
**Output:** a choice, plus what it costs if wrong and how it would be undone.

What belongs: reversible vs irreversible bets, expected value vs expected utility, option value,
sunk-cost exclusion, prioritisation under scarcity, stopping rules, escalation thresholds, when to
ask a human vs rule and disclose ("rulings, not stalls"), risk acceptance, scope negotiation, the
"what would change my mind" test.

What does not: gathering evidence (`thinking`), planning the work (`decomposition`), writing the
report (`interface`).

This is the thinnest *real* category in the observed landscape. Scattered decision-adjacent skills
exist — `decision-navigator` collapses a problem space with branching questions but never makes or
defends a choice; `multi-advisor` collects panel opinions; `falsify`'s Stage 5 carries genuine
decision content — but none outputs a decision under uncertainty as a first-class artifact with a
cost and a reversal path, and no site's taxonomy has a slot that would hold one. It sits adjacent to
the single most-installed skill family, so the demand is proven and the content is unclaimed.

---

### `decomposition/` — problem → structure of work

**Job:** turn something too big to hold into something that can be executed, without inventing
certainty that isn't there.
**Admission test:** does the skill output a *structure* — a graph, a frontier, a boundary, a set of
slices — rather than an answer?
**Output:** a structure of work.

What belongs: task graphs and blocking edges, vertical tracer-bullet slices, the frontier (what is
unblocked now), fog of war (in scope but not yet specifiable) and its sharpness test, out-of-scope as
a permanent bucket, interfaces-before-implementations, sizing against a fresh context window,
decomposition into sub-questions with different *epistemic status* (the thing every corpus we read
fails to do — they all decompose into task lists).

What does not: choosing which slice to do first (`judgement`), executing a slice (`execution`),
dispatching agents (`orchestration`).

---

### `execution/` — doing the work well

**Job:** change what the agent produces in the repository during implementation.
**Admission test:** does the skill govern the act of building — test, refactor, migrate, verify,
commit?
**Output:** a change to the repository, plus the evidence it is correct.

What belongs: red-green-refactor, the failing-test-first law, refactoring under a green bar,
migration and expand/contract, evidence gates before claiming completion (run the command, read the
output, then speak), commit and branch discipline, worktree isolation, finishing a branch, the full
debug loop — reproduce, isolate, mechanism, fix, verify (`debug-systematically`), handling review
feedback as data rather than as a verdict on the author.

What does not: reviewing someone else's code as a lens (`lenses`), deciding whether to build it
(`judgement`), pricing a diagnosis as a contested claim (`thinking`'s `weigh-evidence`).

---

### `orchestration/` — managing agents, iterations, and budgets

**Job:** make multiple agents, or multiple iterations, produce more than one agent could.
**Admission test:** does the skill manage *other agents or later iterations* — their context, their
contracts, their budgets, their stop conditions?
**Output:** a managed agent run, iteration, or wave.

What belongs: delegation contracts (bounded output, status enum, report-to-file), context isolation as
the reason for subagents, parallel dispatch with non-overlapping ownership, the loop contract (disk as
memory, fresh context per iteration, byte-exact completion sentinel, retry→skip→abort), write-ahead
ownership so a crash is recoverable, per-run budgets, when to escalate to a human, and the brakes —
automated checks, automated review, human review — added one at a time.

What does not: deciding what to delegate (`judgement`), the work inside a worker (`execution`), the
task graph itself (`decomposition`).

Boundary note: the *contract* a worker is given is `orchestration`; the *discipline* the worker
follows is `execution`. They are separate skills because they are loaded by different agents.

---

### `lenses/` — expert perspective

**Job:** install a way of seeing, so the agent notices what a practitioner would notice.
**Admission test:** does the skill change *what gets noticed or flagged*, sourced from a named
discipline or practitioner, with the specific things that discipline rejects?
**Output:** a noticing — a flag, a verdict, a rejection, a redesign.

What belongs: senior/staff engineer judgement, architecture and seam placement, security review,
performance and frame budgets, reliability and failure modes, product thinking, design taste,
API design, data modelling, accessibility, cost engineering.

**How a lens is written** — this is the corpus's hardest-won lesson. A persona is *not* "you are a
senior engineer". A persona is:

1. **A locked vocabulary** — 5–7 terms with `_Avoid_` synonyms, so the agent thinks in the discipline's
   words and cannot escape into the generic one.
2. **A rejection list** — the specific things this discipline refuses, with the reason.
   emilkowalski's skills work because they encode dislikes ("avoid Inter, avoid purple gradients"),
   not because they assert a role. Anthropic's own frontend skill works the same way.
3. **A decision procedure with a hard floor** — the frequency→verdict table where "no animation. Ever."
   is a legal answer. Every lens needs its version of the zero tier.
4. **Exact values, never approximations** — numeric thresholds where the domain is decidable, named
   principles where it is arguable, an explicit refusal where it is perceptual.

5. **A shared verdict tier.** Every lens emits a domain verdict word from its own enum (the
   vocabulary is the point) plus one `Tier:` slot from a fixed scale: `pass | conditional | fix |
   redesign | refuse`. The tier is what a multi-lens review (`review-desk`) merges — highest tier
   wins — while the domain word keeps the finding readable to a practitioner. The zero tier maps to
   `pass` ("no new abstraction", "do not optimise this") or `refuse` ("do not add this endpoint"),
   never to silence: a lens that ran and found nothing still emits `pass` with what it checked.

Reference material for a lens (value tables, recipe catalogs, API references) lives in that lens's
`references/`, one level deep. There is no separate `craft/` domain: a domain-vertical reference
library with no lens attached is exactly the 3,055-skill landfill.

---

### `meta/` — the agent's own operating system

**Job:** change how the agent runs itself, across sessions.
**Admission test:** does the skill change the agent's own setup — its memory, its context, its skills,
its habits — rather than the work in front of it?
**Output:** a durable change to how the next session goes.

What belongs: retrospection and lesson classification (mechanical → build a check; judgement → write a
standard), memory discipline (recall-before / save-after triggers, supersede-don't-overwrite), context
management (what to compact, what to hand off, when to fork a subagent), skill authoring and skill
review, self-critique against a stated criterion, learning from a correction, the "what would have
prevented this" loop.

This is where *recursive self-improvement* lives, and the evidence says the loop must close on a
**checkable artifact** — a lint rule, a test, a gotcha line, a superseded memory entry — not on a
reflection. Every corpus we read has the loop open at exactly that point.

---

### `interface/` — the agent talking to a person

**Job:** change what the agent says to a human.
**Admission test:** does the skill govern a message — a question, a report, a disagreement, a handoff?
**Output:** a message to a person.

What belongs: interviewing and requirement elicitation (frontier-and-rounds, one question at a time,
a recommended answer per question, facts are the agent's job), writing for agents and for humans as
distinct registers, reporting with evidence and a stated confidence, disagreeing without
contrarianism, refusing to certify the uncertifiable, handoff documents, status under uncertainty,
asking for a decision vs asking for permission.

Why this is a domain and not a courtesy: the #5 most-installed skill in the entire market is a
one-line delegation to an interrogation loop, and the second is its sibling. The highest-leverage
thing an agent can do is ask a better question.

---

## 3. The admission tests, as one table

Use this when a new skill's domain is unclear. The first row that passes wins; if none passes, it is
not a skill.

| domain | one-line test | output |
|---|---|---|
| `thinking` | Does it change how a claim is tested? | a belief + evidence |
| `judgement` | Does it output a choice with its cost? | a decision |
| `decomposition` | Does it output a structure, not an answer? | a work structure |
| `execution` | Does it change the repository? | a change + proof |
| `orchestration` | Does it manage other agents or later iterations? | a managed run |
| `lenses` | Does it change what gets noticed, from a named discipline? | a flag or verdict |
| `meta` | Does it change the agent's own setup? | a durable habit |
| `interface` | Does it govern a message to a person? | a message |

**Rejection tests**, in order. Any hit means stop:

1. It composes from existing skills → no new skill.
2. It is enforceable by a lint rule, a type, or a script → build the check, not the skill.
3. It restates what a competent model does by default → cut it: would the agent get this wrong
   without this instruction?
4. It is a project convention, not a transferable discipline → the project's own instructions file.
5. It is a wrapper around one tool or vendor → it is a `lenses` reference at best.

---

## 4. Packs (the navigation layer)

A **pack** is a named, small, purpose-defined set of skills plus the order to load them. It is the
only browseable unit we publish. Packs are data (`packs/<name>.yml`), not prose, so they can be
validated, installed as a unit, and rendered into docs without a second source of truth.

A pack has: an `id`, a one-line "what your agent can do with this installed", 5–15 skill ids with a
reason per entry, and a "when not to use this" line. Anything larger is a category wearing a costume;
anything smaller is a todo list.

**The gate, stated plainly.** A pack entry whose `why` begins `only when` is a gate: a loader skips
that skill unless the stated condition holds. A conditionally-gated pack therefore lists more than it
loads — which is how `review-desk` carries nine lenses without loading nine lenses. The pack renderer
must mark those entries as gated, because the loaded set is smaller than the listed set. The ceiling is
15, not the earlier 12, and the bound is enforced by `pack-oversized` / `pack-undersized`.

(Terminology: `lenses/` is a *domain* — expert-perspective skills. A pack is a curated route through
many domains. The ecosystem calls both "lenses"; here only the domain keeps the word.)

Initial pack set (each maps to a real situation, not a job title):

| pack | situation | cuts across |
|---|---|---|
| `greenfield` | nothing exists yet; shape the thing before building it | thinking, decomposition, judgement |
| `legacy-rescue` | it works, nobody understands it, change is expensive | lenses, thinking, decomposition |
| `ship-it` | a decision is made; get it into production without lying about it | execution, judgement, orchestration |
| `autonomous-run` | hours of unattended work, and it must not drift | orchestration, meta, judgement |
| `review-desk` | judge someone else's work without becoming either a rubber stamp or a pedant | lenses, judgement, interface |
| `staff-engineer` | the hard part is what to *not* do | lenses, judgement, decomposition |
| `self-improve` | the same correction keeps happening | meta, interface |
| `hard-problem` | the answer is unknown and the obvious framing is wrong | thinking, decomposition, judgement |

---

## 5. Naming

**Form:** imperative, verb-first, hyphenated, ≤3 words. `weigh-evidence`, not `evidence-weighing`;
`split-by-frontier`, not `decomposition-strategy`. Consistency across a collection is an explicit
requirement in the platform guidance, and the ecosystem's own strongest performers are inconsistent
about it, which is a defect we don't inherit.

**Directory name = frontmatter `name`**, lowercase, `[a-z0-9-]`, no leading/trailing hyphen, no `--`,
≤64 chars. This is the intersection of every spec and vendor rule, and it is the only part of the
format that is mechanically enforced by all of them.

**A coined leading word is allowed** when it is stronger than any verb phrase and the model already
owns the concept (`falsify`, `wayfinder`, `frontier`). It must be defined on first use in the body.
A made-up word with no pretraining behind it is not allowed: you pay in definition tokens what a real
word gives free.

**Forbidden:** `helper`, `utils`, `tools`, `manager`, `assistant`, `-skill`, `-agent`, anything that
names the container instead of the act.

---

## 6. What a domain is not allowed to become

| failure | symptom | guard |
|---|---|---|
| landfill | a `misc/` or `meta/` bucket absorbing anything without a home | every skill must pass its domain's test; no bucket is a default |
| vertical sprawl | one author's domain templates filling a third of the corpus | a lens must be sourced from a named discipline and carry a rejection list |
| synonym drift | `seo`, `content-seo`, `technical-seo` as three domains | fixed domain count; a new domain requires deleting one |
| keyword index | categories generated from descriptions | domains are authored, never inferred |
| single-skill domain | a domain with one entry | a domain below three skills is named in the roadmap's breadth queue, and no pack is built *around* it (a single skill may still appear inside a wider pack) |

### Where the tree stands

A domain is admitted by its axis, not by its size — breadth is added on an observed failure, so a
domain can legitimately sit below three skills for a while. Current counts:

| domain | skills |
|---|---|
| `thinking` | 3 |
| `judgement` | 1 |
| `decomposition` | 2 |
| `execution` | 6 |
| `orchestration` | 5 |
| `lenses` | 9 |
| `meta` | 3 |
| `interface` | 5 |

Three guards hold whatever the counts, and each is checkable by CI or review: no new domain is added
without deleting one; no pack is built around a domain below three skills, though one of its skills may
still appear as a step inside a wider pack; a domain below three skills is named in the roadmap's
breadth queue rather than left implicit. A thin domain still passes every
admission test — it has simply not earned a pack of its own yet.
