---
name: write-a-skill
description: Use when authoring or revising a skill — "write a skill", "turn this into a skill", "add a skill", "skillify this", "make this reusable", "the skill never fires", "the agent ignored the skill", "this skill changed nothing", "review this skill", or the same correction keeps recurring. Not for landing one correction in an existing check or standard (use learn-from-correction), testing whether the failure is real (use weigh-evidence), or what a skill costs per turn (use manage-context).
domain: meta
risk: writes
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: tutorial-or-persona-prose-instead-of-an-intervention
  eval: evals/
# pack membership is declared in packs/*.yml, not here — one skill lives in many packs
---

# Write a Skill

A skill is an intervention, not a document. This skill makes the author record the failure first, let
the failure pick the form, and ship the eval that says the skill fired.

```
NO SKILL WITHOUT A RECORDED FAILURE, AND NO LINE THAT DOES NOT CHANGE WHAT THE MODEL DOES.
```

The paths this skill cites — `docs/AUTHORING-STANDARD.md`, `docs/TAXONOMY.md`,
`templates/SKILL-TEMPLATE.md`, `scripts/validate-skills.mjs` — are relative to the library checkout this
skill ships in, not to the skill directory. A reader who installed this skill alone has none of them on
disk. Treat the rules as stated here as the contract and ignore the paths.

## When to use / when not to use

Use when:

- the user says "write a skill", "add a skill", "turn this into a skill", "skillify this", "make this
  reusable", "save this as a skill"
- the user says "the skill never fires", "the agent ignored the skill", "this skill changed nothing",
  "why didn't it load", "the description isn't triggering"
- the user says "review this skill", "is this skill any good", "does it meet the standard"
- a correction recurred and `learn-from-correction` produced "the next session needs a standard it
  reads at the decision point"
- a pack cannot be assembled because a skill it needs does not exist
- you are about to edit an existing skill's description, body, or evals

Not when:

- one correction needs a landing place and the question is check versus standard — that is
  `learn-from-correction`; come here only when the answer is "a skill"
- the failure might not be real, or happened once — that is `weigh-evidence`; one instance is an
  anecdote, and an anecdote becomes a gotcha line, not a skill
- the question is what the skill costs in context, or how to compact around it — that is
  `manage-context`
- the artifact is a one-run instruction to a worker — that is `dispatch-workers`; a brief dies with
  the run, a skill changes the next one
- a type, a lint rule, or a script can decide it — build the check; a skill for something a program
  can decide is a skill that will be skipped
- you are writing documentation for a library, an API, or a team — documentation describes the
  system; a skill changes what the agent does with it

| if the situation is | use |
|---|---|
| the failure happened once | a gotcha line in the governing skill |
| the correction recurs and needs a durable rule | `learn-from-correction`; this skill when the artifact is a skill |
| the rule is decidable by a program | the check — `learn-from-correction` Phase 4 |
| a worker needs the rule for this run | `dispatch-workers` |
| an existing skill is close but misses the case | this skill, revision path |
| the skill is a lens for a named discipline | this skill, plus the lens recipe in `docs/TAXONOMY.md` §2 |

## The process

Six phases, plus the revision path below. The order is the skill: each phase produces the artifact the
next one is written against, and the template's fill order is Phase 4.

### Phase 1 — Record the failure before the skill exists

Run the task without the skill and keep what happens: the sentence the model writes, the artifact it
produces, the point a reviewer would stop it. That is the baseline, and it goes into
`evals/behaviour.md` verbatim.

Then the three tests, in this order (`docs/AUTHORING-STANDARD.md` §1):

1. **Default test** — would a competent model get this wrong without the skill? If not, it is a
   sentence, and the sentence belongs in an existing skill's gotchas.
2. **Check test** — can a type, a lint rule, or a script decide it? Then build the check.
3. **Compose test** — does the behaviour fall out of skills that already exist? Then it does not get a
   new skill.

"It forgets to run the tests" is not a baseline. The quoted "Done — everything should work" is. A
baseline you cannot quote is a belief about the model, and an eval built on it tests the belief.

**Done when:** `evals/behaviour.md` holds a verbatim line of the model failing without the skill, and
the three tests have a one-line answer each. No transcript, no skill — say so and file the hypothesis.

### Phase 2 — Classify the failure, and let the class pick the form

Read `docs/AUTHORING-STANDARD.md` §6 and pick one row. Form is not a style choice: a prohibition
applied to a shape problem scores worse than no guidance at all.

| the baseline failure | the form | what it looks like |
|---|---|---|
| skips a known rule under pressure | discipline | one Iron Law, a rationalization table, red flags |
| complies, but the output has the wrong shape | positive recipe | state what the output is, its parts, in order |
| omits a required element it already produces | structural slot | a slot in the template it fills |
| behaviour should depend on a condition | conditional predicate | the observable that decides, not a rule plus exemptions |

Record the class as `metadata.form` and the failure as `metadata.baseline`, as a short hyphenated
slug. A skill marked "discipline" because it happens to contain a table has classified nothing: the
table is the form's consequence, not its evidence.

**Done when:** one row is named, the body's shape follows from it, and `metadata.form` plus
`metadata.baseline` are written.

### Phase 3 — Write the description first, as a trigger spec

The description is the only part loaded before activation, and it is the whole routing surface. Write
it from the words in the baseline transcript — the user's phrasing and the failure's vocabulary — not
from the skill's name. Three jobs, in this order (`docs/AUTHORING-STANDARD.md` §3):

1. Front-load the literal words a user says.
2. One trigger per branch; synonyms that rename one branch are that branch written twice.
3. One clause of non-scope, naming the adjacent skill by its exact `name`.

Test every branch by its near-miss: write the query that should *not* fire it, and name the skill that
should. A branch with no near-miss will steal another skill's trigger, and the description is the only
place that can be fixed.

Then the two frontmatter fields that decide reach and capability. `invocation` — `model` when the model
must reach for it on its own, `user` for a run-starter or a judgement gate the human initiates, which
also requires `disable-model-invocation: true` and the suppression shim `agents/openai.yaml` carrying
`policy.allow_implicit_invocation: false` (`docs/AUTHORING-STANDARD.md` §4). `risk` — what it touches,
not how alarming it sounds: `none` for text only, `writes` for anything that edits the repository or the
agent's own configuration.

**Done when:** each branch is a distinct situation, every named non-scope skill exists on disk, no
sentence summarises the workflow, the description is under 500 characters, and `invocation` carries
its enforcing bit.

### Phase 4 — Fill the body in the template's order

`templates/SKILL-TEMPLATE.md` is the order; `docs/AUTHORING-STANDARD.md` §5 is the reason for each
section. Fill in this order, because each choice constrains the next:

1. **Iron Law** — one fenced, all-caps imperative, before any explanation. Two means none.
2. **When not to use** — the boundary is harder than the trigger: name the adjacent skill and the
   distinguishing fact.
3. **Process** — phases, each ending on an artifact an agent can check without asking. A narrow bridge
   (a destructive command, a migration) gets the exact command; an open field (a review, a diagnosis)
   gets the goal, the constraints, and the reason.
4. **Gotchas** — the fact, the consequence, what to do instead. At least one comes from the baseline.
5. **Rationalizations** — the model's own words, quoted from the baseline, plus the spirit-over-letter
   row.
6. **Red flags** — the table compressed into thoughts that mean stop.
7. **Limitations** — specific, or deleted and declared in `metadata.sections`.

The form from Phase 2 decides which sections carry the weight: for a discipline, the table is the
skill; for a recipe, the output block is the skill. Everything else supports the part that does the
work.

**Done when:** every section is present in order, every phase ends on a checkable condition, and every
gotcha is specific enough to be wrong.

### Phase 5 — Write the evals, then run the repo's own check

Two files, and they are the contract, not paperwork (`docs/AUTHORING-STANDARD.md` §9):

- `evals/triggers.yml` — at least 20 labelled queries. A `should` query passes at a trigger rate of
  0.5 or more over three runs; a `should_not` at zero. Keep a 60/40 train/validation split, and route
  every near-miss to the skill that should fire in a comment.
- `evals/behaviour.md` — at least three cases, each with Setup, Baseline, Required, and Observable.
  The baseline is quoted from Phase 1 or labelled a hypothesis. It is never upgraded to "observed"
  without the run that observed it.

Then run `node scripts/validate-skills.mjs skills/<domain>/<name>`. Zero findings is the shape gate,
not the quality gate: the script cannot prove the instruction is true, the baseline honest, or the
trigger set real (`docs/AUTHORING-STANDARD.md` §11).

**Done when:** the eval files meet the thresholds, the validator reports zero findings for this skill,
and every claim that one phrasing beats another carries the run that shows it — or is cut.

### Phase 6 — Cut every line that does not change an action

Read the finished body and ask of each line: what does the model do differently because of this?
Explanations, definitions of things the model already knows, persona adjectives, and "consider…" all
fail the question. Delete them.

Then apply the skill to itself: a second Iron Law, a body over 500 lines, a reference that points at a
reference, or a gotcha that could have been written without running anything are the finding, not a
detail.

**Done when:** every line survives the question, and the skill passes the same review it demands of
the next one.

### Revision path — when the skill already exists

Treat the edit as a new baseline. What does the model do with the current version, and what should it
do? For a skill that never fires, the defect is in the description: diff `evals/triggers.yml` against
the phrasing users actually type before touching the body. For a skill that fires and still fails, the
defect is in the form: re-run Phase 2. A change to a skill is a change to behaviour, so it carries the
same evidence as a new one.

**Done when:** the trigger eval has run against the new phrasing before any body edit lands, and for a
form defect the re-chosen Phase 2 row is named with the baseline quoted against the current body.

## Gotchas

- `scripts/validate-skills.mjs` passes a tutorial. It checks the shape — sections, one law, eval
  counts — and never the truth, the baseline, or whether the triggers are real (§11). A green run is
  the floor, not the finish.
- The workflow-summary heuristic catches "first", "then", "step 1", "you will", "followed by". A
  description that says "walks you through the process" passes CI and still becomes the cheaper
  substitute for the body.
- `metadata.form` is free text; nothing validates it. "Discipline" because the skill has a
  rationalization table is circular — the table is what the form produces.
- The validator resolves `use <skill>` routes in the description against every `SKILL.md` on disk. A
  renamed skill leaves a dangling route that reports as a warning, and a warning is not a pass.
- A `references/` path named in the body is checked for existence, never for being read. A reference
  no phase names is dead weight: the pointer is the mechanism.
- A body that names tools rather than actions — "use the Bash tool" — passes review and breaks on the
  next harness. The validator catches a home-directory path or a drive letter; it cannot catch a tool
  name. Name the action: run the suite, read the file.
- Pack membership lives only in `packs/*.yml`. A finished skill with no entry is unreachable, and
  `pack-orphan` stays a warning until the pack owner wires it — that edit is not part of authoring the
  skill.
- Trigger evals run three times per query for a reason. One run is noise, and a description that fires
  once in three on a `should` query is a coin flip, not a pass.
- The body budget is 500 lines and about 5,000 tokens, estimated as characters divided by four. A skill
  that needs three references is usually two skills.
- The register to copy is the repo's own: `skills/execution/prove-it/` and
  `skills/judgement/make-the-call/` are short, imperative, and every section earns its place. Copy the
  register, not the words.

## Rationalizations

| Excuse | Reality |
|---|---|
| "This would be a useful skill" | Useful to which turn? Name the failure or it is a wiki page. |
| "I'll capture the baseline after I see it work" | After is a description of the skill you wrote, and it can only agree with it. |
| "The model already knows this, so it will follow it" | Knowing is what it already does; the failure is doing. If knowing were enough, there would be no baseline. |
| "It's a short tutorial; it sets context" | Context that changes no action is what the description already pays for every turn. |
| "The validator is green" | It checks shape. It cannot check truth, the baseline, or the triggers (§11). |
| "I'll add the evals later" | An eval written after the skill describes it; it does not test it. |
| "Persona framing makes it sound senior" | A persona is a locked vocabulary plus a rejection list, not an adjective (`docs/TAXONOMY.md` §2). |
| "It's only a small change to the description" | The description is the routing surface. A wording change without a trigger eval is a guess about behaviour. |
| "Different words, so the rule doesn't apply" | Spirit over letter. A "playbook", a "guide", a "checklist doc", and a "prompt" are skills; the law applies. |

## Red flags

- You are writing a sentence that explains a concept the model already knows.
- You are writing the skill and the transcript of the failure does not exist.
- Your description lists the steps, or has more synonyms than branches.
- Your gotchas could have been written without running anything.
- Your rationalization table is invented rather than quoted.
- You are writing "consider", "prefer", "be thorough", or "where appropriate".
- You are adding a skill because a pack has a hole, not because a failure happened.
- You are adding a second Iron Law because the first did not cover everything.
- You are about to say the skill works and no eval has run.

## Limitations

- Cannot prove a skill improves outcomes. Trigger evals measure firing, behaviour evals measure one
  required output, and neither is the counterfactual; a passing eval is not a quality pass.
- Cannot produce a baseline in a host that will not run the model without the skill. The case then
  carries a labelled hypothesis and the skill ships unproven — say so rather than dressing the guess as
  an observation.
- Trigger sets overfit. Twenty queries written by the author of the description share its blind spots;
  the train/validation split mitigates, it does not fix.
- Cannot make a description both broad and precise. Every branch buys false triggers on near-misses,
  and the price is paid in another skill's silence.
- Handles judgement calls only. Anything a program can decide belongs in a check, and Phase 1's check
  test is the first move, not an afterthought.
- Cannot test against a future model. A description tuned to today's phrasing drifts as users change
  how they ask; the eval is a snapshot, not a guarantee.
- Cannot decide whether the discipline itself is right — only whether the skill intervenes. A
  well-formed skill for a bad rule is a well-formed bad rule.
