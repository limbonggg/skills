# Master dossier — what the landscape taught us, and the decisions we build on

The findings below stand on the evidence quoted in them.

**Thesis.** Every corpus we studied is strong at *one* thing and blind to the rest. The market's
highest-install content is pure method with no product behind it: 27 of 167 top rows on skills.sh,
~21M installs, one author. The ecosystem's own taxonomies have **no slot for thinking, judgement, or
decision-making**. So the library we build is not a bigger catalogue — it is the missing category,
executed to a standard nobody has published.

---

## 1. What actually works — ten findings, with evidence

**F1. The description is the product.** `grill-me` ranks #5 all-time on skills.sh with 1.6M
installs; its entire `SKILL.md` body is `Call the Skill tool with "grilling".` The description
carries the routing; the sibling skill does the work. Corroborated by agentskills.io's description
guidance ("the agent matches against what the user asked for") and by obra/superpowers' measured
finding that a description which *summarises the workflow* makes agents skip the body
(obra/superpowers' discovery.md:63).

**F2. A gate beats an instruction.** The single most-copied pattern across the whole landscape is a
phase gate whose key is a *checkable artifact you have already produced*: "No red-capable command,
no Phase 2" (mattpocock/skills), a `HARD-GATE` around "nothing gets built until the design doc is
approved" (obra/superpowers), the printed blind-spot list that blocks action (sickn33's corpus), and
`passes: true` in subsy/ralph-tui's tracker. Every one converts a judgement call into a satisfiable
predicate.

**F3. The best skills are *correction catalogs*, not tutorials.** emilkowalski/skills is literally
"all the little mistakes agents can potentially make and explain how to fix them". Anthropic's
best-practices doc says the same: "the highest-signal content in any skill is the Gotchas section" —
because gotchas are the only content guaranteed *wrong* without the skill.

**F4. Form must match the failure.** obra/superpowers *reports* that a prohibition ("don't restate
the brief") scored **4.4** unwanted outputs vs **3.6 for no guidance at all**, while a five-part
positive recipe scored **3.0 with zero variance**. Caveat: their `evals/` live in a separate repo
not shipped with the library, so these figures are reported-not-reproduced — the doctrine stands
independently on Anthropic's degrees-of-freedom axis and mattpocock/skills' measured negation
finding. Discipline failures need prohibitions + rationalization tables; shape failures need
positive recipes; omissions need a structural slot; conditional behaviour needs an observable
predicate.

**F5. Rationalization tables work because they quote the model back to itself.** 103 rows across 12
obra/superpowers skills, each a verbatim escape the model actually produced in baseline testing. The
row that must never be missing: *"different words so the rule doesn't apply" → "spirit over
letter"*, taken from sickn33's corpus.

**F6. Taste is encodable — as four different things.** emilkowalski/skills answers the hardest
question in this space. Numeric where decidable (a frequency→verdict table with a hard "no
animation. Ever." tier); named where arguable (a locked vocabulary of principles); *refused* where
perceptual (explicit non-generalisation); deferred where personal (`learn-taste` forbids importing
good practice: "that's your taste, and your taste is what the user was correcting"). Plus: every
absolute carries its exemption inside it, so a literal model can't over-apply it.

**F7. Autonomy is a format, not a mood.** Three independent sources converge. subsy/ralph-tui: a
byte-exact sentinel `<promise>COMPLETE</promise>` AND exit 0 AND not interrupted, scanned only in
the agent's own text, never tool output; fresh process per iteration, disk as the only memory.
obra/superpowers: `Ruling: <what> — <why> — <cost if wrong>` and the explicit pricing of stalling —
"a wrong ruling costs rework your human partner can see and undo; a session parked on a question
costs their whole day". mattpocock/skills: facts are the agent's job, decisions are the human's.

**F8. Context isolation is the reason for subagents.** "Sub-agents exist primarily to isolate
context, not to anthropomorphize role division" (sickn33's corpus). The corollary, measured by
obra/superpowers: bounded output contracts — `Status: DONE | DONE_WITH_CONCERNS | BLOCKED |
NEEDS_CONTEXT`, "report back under 15 lines, detail in the report file" — because unbounded returns
are how a controller's context dies.

**F9. Memory must be curated at write time, and broken parsers are the failure mode.**
subsy/ralph-tui's two-tier `progress.md` (bounded recent entries + a promoted `## Codebase
Patterns` block at the top) is right in principle; in shipped code the *parsed* tier is dead
(nothing writes the header the regex expects) and the tier that works is a heading plus an
instruction. Lesson: **the durable channel is a convention the writer controls, not a parser the
reader controls.**

**F10. Progressive disclosure is real, and its unit is the pointer.** Anthropic's spec and
best-practices doc agree on the tiers: catalog (~100 tokens/skill) → `SKILL.md` (<5k tokens, <500
lines) → references (0 until read) → scripts (only stdout). The pointer's *wording*, not its target,
decides whether the agent reaches the material — "a must-have target behind a weakly worded pointer
is a variance bug" (mattpocock/skills). And one level deep only: nested references cause partial
reads (`head -100`) in sickn33's corpus.

---

## 2. What fails — ten anti-patterns, with evidence

| # | anti-pattern | evidence | our rule |
|---|---|---|---|
| A1 | **Presence checks produce presence, not quality** | 41.9% of sickn33's `Limitations` sections are the same 3 boilerplate lines, injected by its `fix_missing_skill_sections.py:93-101`; the gate passes | Never satisfy a section by template filler. A section with nothing specific to say is deleted |
| A2 | **The declared rubric is decorative** | sickn33 defines a 30/40/30 score schema with labels; nothing computes it. The only enforced quality axis across its 3,055 skills is 12 shell-injection regexes | Our rubric is executed by a script or it isn't a rubric |
| A3 | **Taxonomy decays into a keyword index** | sickn33: 131 categories, 31 singletons, SEO split across 11 buckets, `meta` as landfill. The browseable unit that survived is the curated bundle | Fixed, small, mutually-exclusive domain set; navigation by lens, not by tag |
| A4 | **Safety passes blunt the instruction** | every strong sickn33 skill opens by disclaiming itself ("not new permissions", "does not authorize"), teaching the model that instructions are advisory | One scope line at the top, never a disclaimer per rule |
| A5 | **Sprawl** | sickn33 median 1,049 words, 831 skills >1,500, max 12,928 — in a corpus whose own best skill names sprawl as a defect | Hard budget: 500 lines body, and a pruning pass before publish |
| A6 | **Duplication without an include mechanism** | emilkowalski/skills repeats the same three bezier curves across 8 files with no drift detection; mattpocock/skills restates "fresh context window" in 8 skills | Single source of truth + a context pointer; constants live in one reference |
| A7 | **Repo stars / install counts as a quality signal** | `awesomeskill.ai` shows a frozen 28,079★ where live is 53,450★; skills.sh's top-200 contains one body re-uploaded under six owners (~5M installs) | We publish no metric we can't re-derive |
| A8 | **Harness over-fit under a neutral banner** | obra/superpowers' bootstrap names a vendor tool; subsy/ralph-tui's skills hard-code `~/.claude/projects/`; emilkowalski/skills' 5 slash-only skills depend on `disable-model-invocation` | Bodies name *actions*; one `references/harness-mapping.md` per skill when needed |
| A9 | **No behavioural evidence** | mattpocock/skills has no eval suite (frontmatter YAML only); obra/superpowers' `evals/` lives in another repo; sickn33 benchmarks nothing | Every skill ships its trigger set + ≥3 behaviour cases; the eval dir is in-repo |
| A10 | **Multi-surface invariants maintained by hand** | mattpocock/skills mirrors each skill into 7 places and the CHANGELOG is a repair log for exactly that drift | Generate every surface from one source; CI fails on drift |

---

## 3. The empty category — why this library has a reason to exist

Three independent lines of evidence say the same thing:

1. **The normative taxonomy has no slot for thinking.** Anthropic's internal 9 categories are all
   "where does this skill intervene in the delivery loop". The VoltAgent index's nearest bucket,
   "Context Engineering" (36 of 1,280), is about window management. Anthropic's best-practices
   guidance on reasoning is one axis: degrees of freedom.
2. **The market has proven demand for it anyway.** The highest-install, most cross-author,
   least vendor-dependent content on skills.sh is method: `grill-me`, `grilling`,
   `writing-plans`, `executing-plans`, `systematic-debugging`, `wayfinder`, `diagnosing-bugs`. The
   site's own topic copy calls them "the meta-skills that make every other skill more effective".
3. **Nobody has written the hard half.** Every corpus decomposes a problem *into a task list*; none
   decomposes it into sub-questions with different epistemic status. `reasoning` in sickn33's
   3,055-skill corpus contains **two** skills. There is no decision-under-uncertainty skill in any
   source we read.

So: **the library is organised around cognition → action, and it will be the first to name the
category.**

---

## 4. Twelve binding decisions

These are the design commitments the rest of the work follows from. Each is traceable to the
evidence above.

| # | decision | why |
|---|---|---|
| D1 | **Domain = function in the cognition→action loop**, not topic, not publisher | A3, §3 |
| D2 | **Eight domains, mutually exclusive, each with a one-line admission test** | A3; 131 categories is what happens without this |
| D3 | **Navigation is by *lens* (curated pack), storage is by domain** | A3 — bundles survived at scale, categories didn't |
| D4 | **Every skill opens with exactly one Iron Law** — one fenced, unhedged, capitalised line | F2, F5; sickn33 and obra/superpowers both converge here |
| D5 | **Form is chosen by baseline failure type**, documented per skill | F4 — measured, not asserted |
| D6 | **Required sections: Iron Law → When to use / when NOT → Process with phase gates → Gotchas → Rationalization table → Red flags → Limitations** | F2, F3, F5, A1 |
| D7 | **Description = trigger spec only.** Never a workflow summary. ≤1024 chars, third person, front-loaded, non-scope stated | F1 |
| D8 | **Two invocation registers**, and the autonomy test decides which | mattpocock/skills: user-invoked = orchestration, model-invoked = reusable discipline |
| D9 | **Hard budgets**: 500-line body, ≤5k tokens, references one level deep, TOC in any reference >100 lines | F10, A5 |
| D10 | **Evals in-repo**: 20-query trigger set (≥0.5 rate, 3 runs) + ≥3 behaviour cases + a no-guidance control | A9 |
| D11 | **One source of truth per fact; every generated surface is generated** | A6, A10 |
| D12 | **Capability declaration over disclaimers**: a `risk` level + what the skill can touch, stated once | A4 |

---

## 5. Deliverables of this phase

| file | what it is |
|---|---|
| `docs/TAXONOMY.md` | the eight domains, admission tests, lens layer, naming rules |
| `docs/AUTHORING-STANDARD.md` | the normative spec every skill must satisfy, and the rubric CI enforces |
| `docs/ROADMAP.md` | build order: which skills first, and why that order |
| `docs/SKILLS.md` | the index of the tree, generated from skill frontmatter |
| `skills/` | the 34-skill tree: eight domains, each skill a `SKILL.md` plus `evals/` and any `references/` |
| `packs/` | the 8 navigation packs (`packs/*.yml`) — the browseable unit |
| `templates/SKILL-TEMPLATE.md` | the skeleton a new skill starts from |
| `scripts/validate-skills.mjs` | the executable part of the standard |

**What phase 0 deliberately held back:** no skills at the decision boundary. The taxonomy and the
standard are the load-bearing decisions; writing 40 skills before fixing them is how every corpus
above acquired its sediment layer.

Phase 0 stopped at the decision boundary on purpose. What came after it — the 34 skills, the 8
packs, the generated index, the self-test — is tracked in `docs/ROADMAP.md`; the phase-0 rule that
governs it all is that breadth is added on an observed failure, never on a topic that sounds
missing.
