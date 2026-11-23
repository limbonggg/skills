# Authoring standard

Normative. Every skill in this library satisfies all of it or does not ship. Sections marked
**[CI]** are enforced end to end by `scripts/validate-skills.mjs`; **[CI: partial]** means the
mechanical subset is enforced (presence, shape, dead links) and the rest is review against §10; the
rest is review only. Where a rule exists because of an observed failure, the rule names that failure,
so it can be argued with rather than obeyed.

The standard is written for a *reasoning* library. That changes the default: the ecosystem's guidance
is tuned for API-reference skills, where the risk is under-specification. Here the risk is the
opposite — over-specification, railroading, and a checklist that replaces thought. So the standard
leans hard on three things the ecosystem under-weights: **degrees of freedom**, **the gotcha over the
procedure**, and **the eval that proves the skill changes behaviour at all**.

---

## 1. The one law

> **A skill is not a document about a practice. It is an intervention that changes what the model does
> on the next turn.**

Everything below follows from that. Three tests, applied in order, before a skill is written:

1. **The default test.** Would a competent model get this wrong without the skill? If not, there is no
   skill — there is a sentence, and it belongs in an existing skill's gotchas.
2. **The check test.** Can this be enforced by a type, a lint rule, or a script? Then build the check.
   Skills are for judgement calls: if it is enforceable with regex or validation, automate it.
3. **The compose test.** Does this behaviour fall out of skills that already exist? Then it does not get
   a new skill.

A skill that fails all three is a wiki page. This library does not host wiki pages.

---

## 2. Frontmatter **[CI]**

```yaml
---
name: weigh-evidence
description: Use when a claim needs testing before anyone acts on it — a diagnosis, a root cause, a benchmark result, an "everyone knows" premise, or a conclusion reached by one line of reasoning.
domain: thinking
risk: none
invocation: model
metadata:
  form: discipline
  baseline: claim-accepted-on-one-line-of-reasoning
  eval: evals/
---
```

| field | required | rule |
|---|---|---|
| `name` | yes | `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤64 chars, **equals the directory name** |
| `description` | yes | 1–1024 chars; see §3. Never empty |
| `domain` | yes | one of the eight in `TAXONOMY.md` |
| `risk` | yes | `none` \| `reads` \| `writes` \| `destructive` |
| `invocation` | yes | `model` \| `user` (see §4; `user` requires `disable-model-invocation: true`) |
| `version` | no | semver; bumped on any behavioural change |
| `license` | no | SPDX id, required if the skill adapts third-party material |
| `metadata` | yes | map holding `form` (the §6 form, enforced by `form-missing`/`form-invalid`) and `baseline` (the failure it answers, enforced by `baseline-missing`); the tree also uses `eval` (pointer to its `evals/`), `sections` (sections deliberately omitted, §5), `classifier` (the predicate that decides a classification). **No `pack` field** — pack membership lives only in `packs/*.yml`; one skill belongs to many packs |
| `disable-model-invocation` | conditional | `true`, **required iff `invocation: user`** — the bit Claude Code, Cursor and spec clients honour |

**`risk` is a capability scale, not a severity scale.** The distinction matters because the ecosystem
got it wrong: sickn33 labels 54.6% of its corpus `critical` and assigns `critical` to a 254-line
prose skill while a skill that emits DDL is `safe`. Ours means exactly what it says:

- `none` — pure reasoning; produces text only. **Every skill in `thinking/`, `judgement/`,
  `decomposition/`, `interface/` is `none` unless it reads the repo.**
- `reads` — reads files, runs read-only commands.
- `writes` — modifies the repository or the agent's own configuration.
- `destructive` — deletes, force-pushes, migrates data, touches production. Requires a stated
  confirmation gate in the body.

**Reserved names.** No `anthropic`, `claude`, `openai`, `codex`, `gemini` in `name`. No zero-width,
bidi, or control characters anywhere in frontmatter. `<` and `>` render as entities in some hosts and
break the description.

---

## 3. The description **[CI]**

The description is the only thing loaded before activation, and it is the whole routing surface. It is
written as a **trigger specification**, and it has exactly three jobs, in this order:

1. **Front-load the literal words a user says.** `Use when the user says "flaky", "hangs",
   "intermittent", "works locally", or reports a test that passes alone and fails in the suite.`
   Not "Use for test reliability issues". The #5 skill in the market is one sentence long and wins
   entirely on its description.
2. **Name the branches.** One trigger per branch. Synonyms that rename the same branch are one branch
   written twice — collapse them. A description that lists six near-identical symptoms is spending
   tokens to say one thing.
3. **State the non-scope in one clause.** `Not for deciding whether the bug is worth fixing (use
   make-the-call).` This is the only defence against false triggers on near-misses.

**Hard prohibitions, each from a measured failure:**

- **Never summarise the workflow.** A description that summarises the process becomes a cheaper
  substitute for the body, and agents take the cheaper substitute. Measured: a description saying
  "code review between tasks" caused an agent to run *one* review where the body required two.
- **Never first person.** It is injected into a system prompt. `I can help you…` is the anti-pattern
  named in every vendor doc.
- **Never a tagline.** "The ultimate debugging companion" tells an agent nothing.
- **Never restate identity the body carries.** The body's H1 and first line already say what it is.

**Length.** ≤1024 characters (hard, all specs agree). Target ≤500. Front-load the first ~200
characters: Claude Code truncates the combined listing at 1,536 chars and Codex shortens under a 2%/8k
budget, both of which cut from the tail.

---

## 4. Invocation **[CI]**

Two registers, decided by one question: **must the model reach for this on its own?**

| | `invocation: model` | `invocation: user` |
|---|---|---|
| who can fire it | the model, by description match; the human by name | the human by name only |
| context cost | the description, every turn, forever | zero |
| description register | trigger spec (§3) | one-line human summary, triggers stripped |
| use for | reusable **discipline** loaded from anywhere | **run-starters** — a sequence or gate the human initiates; disciplines a run loads mid-flight stay `model` |
| example | `weigh-evidence`, `red-green`, `split-by-frontier` | `run-autonomously` — the tree's only user-invoked skill today |

The asymmetry is the point: an expensive primitive must be reachable by any other skill, so it is
model-invoked; an expensive *judgement* must not fire by accident, so it is user-invoked. Five of
emilkowalski's twenty skills are slash-only, and they are exactly the judgement-heavy ones.
`review-desk` and `self-improve` are packs (`packs/review-desk.yml`,
`packs/self-improve.yml`), not skills, and are not evidence that user-invoked skills are common here.

### 4.1 The mechanism, per host

`invocation` is our canonical field; the bit that enforces it on each host is different, and both are
required so a plain `cp -r` into a native directory still behaves:

| host | the enforcing bit |
|---|---|
| Claude Code | `disable-model-invocation: true` in the frontmatter |
| Cursor | `disable-model-invocation: true` (same field) |
| Codex | `agents/openai.yaml` → `policy.allow_implicit_invocation: false` |
| spec-conformant clients | `disable-model-invocation` flag |

So the contract is:

- **`invocation: model`** — omit `disable-model-invocation`; the description is the trigger spec (§3).
- **`invocation: user`** — the frontmatter **must also carry `disable-model-invocation: true`**
  (`user-invocation-unenforced` is blocking). For Codex, additionally ship `agents/openai.yaml`
  with `policy.allow_implicit_invocation: false`; it lives beside `SKILL.md` and is checked by `codex-invocation-gap`.

Without the flag, `invocation: user` is a label, not a behaviour — the skill would still fire on a
description match, which is exactly the failure the register exists to prevent.

**A user-invoked skill may invoke model-invoked skills. Never the reverse.** A user-invoked skill
cannot be invoked by another skill either: its description is human-facing and never model-matched,
so nothing but a human typing its name reaches it.

When user-invoked skills pass ~12, add a **router**: one user-invoked skill that names the others
and when to reach for each. The router must require reading the target's `SKILL.md` before
describing it. This rule exists because a router that described from memory lied about a handoff
that had been removed.

---

## 5. Body structure

Seven sections, in this order. Sections may be omitted only where marked optional, and an omitted
section is recorded in the skill's `metadata` as `sections: [...]` so review can see the shape was
chosen, not forgotten.

```
# <Title>                                  1. one line: what changes

<IRON LAW>                                  2. one fenced, unhedged, capitalised line

## When to use / when not to use             3. triggers, then the boundary
## The process                              4. phases, each with a completion criterion
## Gotchas                                  5. environment facts that defy assumption
## Rationalizations                          6. excuse → reality, in the model's voice
## Red flags                                 7. the self-check, at the moment of drift
## Limitations                              8. what this cannot do
```

### 5.1 The Iron Law

Exactly one, in a real code fence, in caps, before any explanation. It is the skill's non-negotiable,
and a skill with two of them has none.

````
```
NO COMPLETION CLAIM WITHOUT A COMMAND RUN IN THIS TURN.
```
````

The fence is a ```` ``` ```` code block, not a blockquote — it is what CI matches on
(`iron-law-missing`, `iron-law-multiple`, `iron-law-not-caps`) and what reads to the model as a literal
rather than prose to be paraphrased. Why one: a single imperative is cheap to hold in attention and
impossible to partially satisfy. Why first: Claude Code keeps the first 5,000 tokens of a skill through
compaction, so position is retention.

The corpus evidence: superpowers ships 4 Iron Laws across 15 skills and 103 rationalization rows;
sickn33's `verification-before-completion` is the single most-copied pattern in the entire
3,055-skill landscape. Both converge on *one* law per skill.

### 5.2 When to use / when not to use

Two lists. The second is not optional and is usually longer.

- *Use when*: symptoms in the user's own words, and the situation, not the technique.
- *Not when*: the adjacent skills, by name, with the distinguishing fact. `Not for deciding whether the
  bug is worth fixing — that is make-the-call.` This is the section that prevents a library from
  turning into a pile of overlapping triggers.

Include a **routing line** when the boundary is genuinely non-obvious: a one-row-per-case table of
`if the situation is X → this skill / that skill`. A router skill exists solely for this, and its
own rule is "read the target before recommending it".

### 5.3 The process, and its completion criteria

Numbered phases. **Every phase ends on a completion criterion** — a condition that distinguishes done
from not-done, checkable by the agent without asking.

The strongest criteria are **checkable and exhaustive**: "every modified model accounted for", not
"produce a change list". Demand drives legwork; a vague bound invites **premature completion**, where
the agent ends the step because the next one is visible.

Three rules for the process section:

- **Degrees of freedom are chosen per step, not per skill.** A step that is a narrow bridge with
  cliffs (a migration, a destructive command) gets an exact command. A step that is an open field
  (a review, a design) gets the goal and the constraints, and the agent chooses the path. Reasoning
  skills are mostly open field: **prose plus the reason, not numbered rails.**
- **Phase gates are named as artifacts, not as permissions.** "No red-capable command, no Phase 2" —
  the gate is a thing you have already produced. A gate that says "do not proceed until you are
  sure" is not a gate.
- **Never railroad.** "State the goal and the constraints, not every step" is Anthropic's own lesson
  from building their internal library. A skill that dictates every move produces compliance without
  judgement, which is the exact failure this library exists to fix.

### 5.4 Gotchas

The highest-signal section, and the only content guaranteed wrong without the skill. Format: the
fact, then the consequence, then what to do instead.

```markdown
- The `users` table uses soft deletes. A count without `WHERE deleted_at IS NULL` is wrong and looks right.
- `pytest -x` stops at the first failure, so a "suite is green" claim from it is a claim about one test.
```

A gotcha is *specific and surprising*. "Handle errors appropriately" is not a gotcha; it is a no-op.

### 5.5 Rationalizations

A two-column table of the model's own anticipated self-talk against a one-line rebuttal. Write the
excuse **in the voice the model actually uses**, because the mechanism is recognition, not instruction:
the model reads the table at decision time and sees its own current thought quoted back.

| Excuse | Reality |
|---|---|
| "Should work now" | Run it, or say you didn't. |
| "I'm confident" | Confidence is not evidence. |
| "Just this once" | The exception is the failure. |
| "Different words, so the rule doesn't apply" | Spirit over letter. |

The last row is mandatory in every rationalization table. It closes semantic reframing, which is the
actual failure mode.

Build the table from **observed** rationalizations — a real baseline run, a real session, a real
correction. An invented table is a guess about how the model drifts, and it reads as one.

### 5.6 Red flags

A short list of thoughts that mean *stop*. It is the rationalization table compressed into the form the
agent can check mid-stream.

```markdown
## Red flags
- You are about to write the fix before the failing test exists.
- You are reading the code to "confirm" a hypothesis you already stated.
- You are explaining why the rule doesn't apply here.
```

### 5.7 Limitations

What the skill cannot do, in specifics. Never the three-line boilerplate — 41.9% of sickn33's
limitations sections are the same injected filler, and the gate that required them produced presence
without quality. If the honest answer is "nothing beyond the obvious", delete the section and record
why.

Good: `Assumes a POSIX shell. On Windows the redirection in step 3 fails silently — use the PowerShell
variant in references/windows.md.`

---

## 6. Form matches failure **[CI: partial]**

The single most valuable idea in the corpus, and it is claimed as measured. A prohibition used on a
*shape* problem scores **worse than no guidance at all** (4.4 unwanted outputs vs 3.6 for the
control), while a positive recipe scores 3.0 with zero variance — figures *reported* in superpowers'
own design notes, whose `evals/` live in a separate repo not shipped with the library, so the
numbers are reported-not-reproduced. The doctrine stands independently on the degrees-of-freedom
axis in agentskills.io's best-practices doc and on mattpocock's negation lever — treat the figures
as supporting, not load-bearing.

Classify the baseline failure before writing a line. The classification goes in the skill's
`metadata.form` and is checked at review. The validator enforces it with `form-missing` /
`form-invalid` and `baseline-missing` (for `metadata.baseline`), against a closed vocabulary of six
strings: `discipline`, `recipe`, `positive recipe`, `structural slot`, `conditional`,
`paired prohibition` — spelled with spaces, exactly as listed.

| baseline failure | right form | wrong form | example |
|---|---|---|---|
| skips a step of a known procedure | **recipe**: ordered steps, each ending in a checkable state | a narrative walkthrough the model can drift out of | `debug-systematically` |
| skips a known rule under pressure | **discipline**: Iron Law + rationalization table + red flags | soft guidance ("prefer…", "consider…") | `red-green` |
| complies, but the output has the wrong shape | **positive recipe**: state what the output *is*, its parts, in order | a prohibition list | `report-with-evidence` |
| omits a required element from something it already produces | **structural slot** in the template it fills | a prose reminder near the template | `write-handoff` |
| behaviour should depend on a condition | **conditional on an observable predicate** | an unconditional rule plus exemptions | `stop-or-escalate` |
| collapses toward one pole of a mirror pair | **paired prohibition**: name both failure modes and why each one wins | a one-sided rule that invites the mirror failure | `disagree-well` |

Two derived rules, both from the same measurement:

- **No nuance clauses.** "Don't X unless it matters" reopens the negotiation; one such clause degraded
  a winning recipe from consistent to noisy. A real exception is its own conditional on an observable
  predicate.
- **Exemption clauses do not scope.** "This limit doesn't apply to code blocks" still suppresses code
  blocks. If part of the output must be exempt, restructure so the rule cannot reach it.

---

## 7. Progressive disclosure **[CI: partial]**

```
<name>/
  SKILL.md          ≤500 lines, ≤5k tokens — process, gates, gotchas
  references/       one level deep; loaded by an explicit imperative in the body
  scripts/          run, not read — only stdout enters context
  assets/           templates, fixtures
```

- **500 lines is the hard body limit.** It is the only size rule every spec agrees on. Past it, push
  down or split.
- **References are one level deep.** A reference that points at another reference causes partial reads
  (`head -100`) and the agent proceeds on a preview. Any reference >100 lines opens with a table of
  contents.
- **The pointer is the mechanism.** A reference is reached only if the body says so, and *how it says
  so* decides whether it is reached: `Read references/thresholds.md before writing the verdict, and
  take every number from it` beats `see references/` by a wide margin.
- **Constants live in one place.** If a value appears in three skills, it lives in one reference and
  three pointers. emilkowalski's skills repeat the same three bezier curves across eight files with
  no drift detection; that is the failure this rule prevents.
- **Scripts state run-vs-read intent explicitly.** `bash scripts/check.sh` — never a bare path (some
  packagers strip the executable bit), and never "read this script to understand".

---

## 8. Paths, ports, and portability **[CI: partial]**

- Relative to the skill root, forward slashes, never absolute, never a machine-specific path.
- The body names **actions**, not tools: "dispatch a subagent", not "use the Agent tool". Where a
  harness difference is unavoidable, it goes in `references/harness.md`, one file, named from the
  body. superpowers' only per-harness artifact is a tool-mapping reference, and that is what lets
  one body run on 14 harnesses.
- No time-sensitive instructions. A deprecated path goes in a `<details>` "old patterns" block, never
  in the main flow.
- Ship to `.agents/skills/<name>/`; document native mirrors in the README, generated, never typed.

---

## 9. Evals **[CI]**

A skill without an eval is a hypothesis. Every skill ships `evals/`:

**`evals/triggers.yml`** — ≥20 queries, labelled `should` / `should_not`, drawn from how users
actually phrase the problem. Threshold: a `should` query passes when it triggers in ≥0.5 of 3 runs; a
`should_not` query passes when it triggers in 0 of 3. Keep 60/40 train/validation so the description
is not overfit to its own test set. The split is declared by marking rows: a trailing `# val` on
each held-out row, or a `# -- validation` section header over a run of rows — the validator requires
25–60% of all rows held out (`evals-triggers-no-split`, `evals-triggers-split-skewed`), so a header
that merely says "keep ~60/40" fails. For an `invocation: user` skill the trigger file records the
phrasings a human types and is a naming record rather than a routing test: its description is never
model-matched (§4), so there is no trigger rate to measure.

**`evals/behaviour.md`** — ≥3 cases, each with: the setup, the failure the model exhibits *without* the
skill (the baseline, recorded verbatim), the behaviour required *with* it, and the observable that
distinguishes them. The baseline is not optional — "if you didn't watch an agent fail without the
skill, you don't know if the skill teaches the right thing".

**Status of the baseline.** Until a capture run exists, a baseline is recorded as a written
hypothesis, and `Baseline (hypothesis — unverified)` is the required label in that state. Replacing the
label with a captured transcript is what closes the gate; the rule is not relaxed by the label, it is
dated by it.

**A no-guidance control for every wording claim.** Any statement of the form "this phrasing works
better" needs a control arm, or it is deleted. superpowers measured its own rhetoric and found two
of its own favourite devices were actively harmful.

The eval directory lives in this repo. An eval that lives in another repo is not an eval; it is a
memory of one.

---

## 10. Review checklist

Ten lines. Every skill passes all ten before merge. Each maps to a section above.

- [ ] The default test, the check test, and the compose test were run, and the answers are recorded (§1)
- [ ] Frontmatter is complete and valid; `risk` reflects what it touches, not how it feels (§2)
- [ ] The description is a trigger spec: literal user words, one trigger per branch, non-scope stated, no workflow summary (§3)
- [ ] `invocation` matches the autonomy test, and the description register matches `invocation` (§4)
- [ ] Exactly one Iron Law, in a fence, before any explanation (§5.1)
- [ ] Every phase ends on a checkable completion criterion, and no step railroads an open-field decision (§5.3)
- [ ] Gotchas are specific and surprising; at least one came from an observed failure (§5.4)
- [ ] The rationalization table quotes real drift, and includes the spirit-over-letter row (§5.5)
- [ ] The form matches the baseline failure type, and the type is recorded (§6)
- [ ] Evals exist, the baseline is recorded and labelled a hypothesis unless it was captured, and a no-guidance control backs every wording claim (§9)

**What review is not allowed to do.** Reword a skill for style, "improve" a description without an
eval, or add a section to satisfy the checklist. Every one of those is how a corpus acquires sediment.
A change to a skill is a change to behaviour, and it needs the same evidence as a code change.

---

## 11. The rubric CI enforces, and its limits

`scripts/validate-skills.mjs` checks, per skill:

| check | weight | what it proves |
|---|---|---|
| frontmatter schema + name/directory match | blocking | installability |
| description length, third person, no workflow summary heuristics | blocking | routing surface exists |
| body ≤500 lines, ≤5k tokens | blocking | context budget |
| required sections present, in order | blocking | the skill has a shape |
| one Iron Law, fenced, caps | blocking | the non-negotiable exists |
| rationalization table present, has a spirit-over-letter row | blocking | discipline form chosen |
| gotchas section has ≥3 specific entries | warning | not filler |
| limitations section is not boilerplate | warning | not filler |
| references one level deep; every referenced file exists | blocking | no dangling pointers |
| `evals/triggers.yml` ≥20 labelled queries; `evals/behaviour.md` ≥3 cases | blocking | the skill is testable |

Rule ids the script reports (cite these in reviews): `frontmatter-missing`, `frontmatter-parse`,
`field-missing`, `form-missing`, `form-invalid`, `baseline-missing`, `name-format`,
`name-directory-mismatch`, `domain-invalid`, `risk-invalid`,
`invocation-invalid`, `user-invocation-unenforced`, `model-invocation-suppressed`,
`description-length`, `description-first-person`, `description-workflow-summary`,
`body-lines`, `body-tokens`, `section-missing`, `section-order`, `iron-law-missing`,
`iron-law-multiple`, `iron-law-not-caps`, `rationalizations-table-missing`,
`rationalizations-spirit-missing`, `link-unresolved`, `nested-reference`, `absolute-path`,
`evals-triggers-missing`, `evals-triggers-insufficient`, `evals-behaviour-missing`,
`evals-behaviour-insufficient`, `evals-behaviour-shape`, `read-error`. Warnings: `gotchas-few`,
`limitations-boilerplate`, `codex-invocation-gap`, `section-omitted-declared`, `pack-unresolved`,
`pack-orphan`, `pack-oversized`, `pack-undersized`, `description-crossref-unresolved`,
`reference-mentioned-missing`, `evals-triggers-no-split`, `evals-triggers-split-skewed`.

**What it cannot prove, stated so nobody pretends otherwise:** that the instruction is true, that the
trigger set reflects real users, that the baseline was honest, or that the skill improves outcomes.
Those are review judgements. A structural pass is not a quality pass — this is the one lesson every
corpus learned the hard way, and the one this library will not relearn.
