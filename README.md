# Skills

<a href="https://github.com/limbonggg/skills/actions/workflows/validate.yml">
<img alt="validate"
     src="https://github.com/limbonggg/skills/actions/workflows/validate.yml/badge.svg">
</a>

A library of agent skills for **how to think, decide, and work** — not for how to call an API.

Reasoning, judgement, and decision-making are the category nobody publishes as a library: the
popular content is either pure method with no product behind it, or a wrapper around a library's
surface. This library is that category, executed to a published standard.

**34 skills · 8 domains · 8 packs · one normative standard · CI that enforces it.**

## What this is, and what it is not

A skill is not a document about a practice. It is an intervention that changes what the model does
on the next turn. Three rules follow, and they are the whole design:

- **If a competent model gets it right without the skill, there is no skill** — just a sentence that
  belongs in an existing skill's gotchas.
- **If a lint rule, a type, or a script can enforce it, build the check.** Skills are for judgement.
- **It is method, not a wrapper.** Nothing here explains a library's surface; each skill governs how
  a decision is reached, tested, and defended.

## Install

Skills follow the open Agent Skills format: a directory with a `SKILL.md`, installable by any client
that reads it. Nothing is client-specific — no harness names in a body, no per-vendor forks.

```sh
# any client that reads .agents/skills/
npx skills add limbonggg/skills --skill prove-it

# or by hand
git clone https://github.com/limbonggg/skills && cd skills && \
  cp -r skills/execution/prove-it ~/.agents/skills/

# or take a whole pack's worth — the nine skills in packs/greenfield.yml
git clone https://github.com/limbonggg/skills && cd skills && \
  for s in decomposition/frame-the-problem interface/ask-better thinking/weigh-evidence \
           judgement/make-the-call thinking/premortem lenses/judge-architecture \
           lenses/judge-api decomposition/split-by-frontier execution/red-green; do
    cp -r "skills/$s" ~/.agents/skills/
  done
```

Native locations differ by client — `.claude/skills/`, `.cursor/skills/`, `.gemini/skills/`,
`.github/skills/`. `.agents/skills/` is the interop convention and the one this repo targets.

One skill is `invocation: user` — `run-autonomously` — shipping `disable-model-invocation: true` and
`agents/openai.yaml`. It fires only when a human types its name: starting an unattended run is a
human decision, not a description match.

## The library

A skill lives where its **output** lands — not its topic, not its author. Thirty-four skills,
eight domains; the full index is [`docs/SKILLS.md`](docs/SKILLS.md).

| domain | skills | what it produces |
|---|---|---|
| [`thinking`](skills/thinking/) | 3 | evidence and beliefs: a claim tested before it is acted on |
| [`judgement`](skills/judgement/) | 1 | a decision, with its cost and its reversal path |
| [`decomposition`](skills/decomposition/) | 2 | a structure of work, not an answer |
| [`execution`](skills/execution/) | 6 | a change to the repo, plus proof it works |
| [`orchestration`](skills/orchestration/) | 5 | a managed run across agents and iterations |
| [`lenses`](skills/lenses/) | 9 | review lenses that change what gets noticed |
| [`meta`](skills/meta/) | 3 | the agent's own setup and durable habits |
| [`interface`](skills/interface/) | 5 | what the agent says to a person |

## Packs

The browseable unit is a pack: 5–15 skills plus the order to load them, named for a situation rather
than a job title. Each file lists its skills, why each one is there, and when *not* to take it.

| pack | take it when |
|---|---|
| [`greenfield`](packs/greenfield.yml) | idea exists, nothing built — shape before building |
| [`legacy-rescue`](packs/legacy-rescue.yml) | system exists and nobody fully understands it |
| [`ship-it`](packs/ship-it.yml) | a change is decided and must reach production truthfully |
| [`hard-problem`](packs/hard-problem.yml) | answer unknown, obvious framing wrong |
| [`autonomous-run`](packs/autonomous-run.yml) | hours unattended, stops for the right reasons |
| [`review-desk`](packs/review-desk.yml) | someone else's work: neither a stamp nor a pedant |
| [`staff-engineer`](packs/staff-engineer.yml) | deciding what not to do, and defending it |
| [`self-improve`](packs/self-improve.yml) | a repeated correction should become a check |

## The standard

Every skill satisfies [`docs/AUTHORING-STANDARD.md`](docs/AUTHORING-STANDARD.md) — a normative spec,
not a style guide — and CI enforces the executable part of it. `scripts/validate-skills.mjs` runs 46
rule ids and blocks on any violation; `scripts/selftest.mjs` proves the validator catches what it
claims to catch (14 fixtures, 51 findings). A skill needs an observed baseline failure recorded
verbatim, and a change to a skill is a change to behaviour, so it needs the same evidence as a code
change.

| doc | the question it answers |
|---|---|
| [SKILLS.md](docs/SKILLS.md) | every skill, what it changes, which packs load it (generated) |
| [TAXONOMY.md](docs/TAXONOMY.md) | which domain a skill belongs to, and its admission test |
| [AUTHORING-STANDARD.md](docs/AUTHORING-STANDARD.md) | the spec, the CI rubric, §10 checklist |
| [ROADMAP.md](docs/ROADMAP.md) | build order, and why it is that order |
| [00-MASTER-DOSSIER.md](docs/00-MASTER-DOSSIER.md) | findings, anti-patterns, decisions |

```sh
npm test          # selftest + strict validation + index in sync
npm run validate  # blocking checks only
npm run inventory # regenerate docs/SKILLS.md after adding or moving a skill
```

## Status

**34 skills across 8 domains**: thinking 3, judgement 1, decomposition 2, execution 6,
orchestration 5, lenses 9, meta 3, interface 5. All validator-clean (`34 skills, 0 blocking,
0 warnings`, strict mode included); every pack resolves against the tree with no orphans. Limits,
stated because the standard requires it:

- **Behaviour evals are hypotheses, not measurements.** Every `evals/behaviour.md` records the
  failure the skill exists to prevent, and every baseline in the library is a written hypothesis
  labelled `Baseline (hypothesis — unverified)` — written from reasoning about how models fail, not
  from a recorded run. No capture run exists anywhere in this repo yet; the Phase-5 wave is simply
  the group whose labels were written last, and the Phase-1 spine is equally uncaptured. The M2/M5
  gates in `docs/ROADMAP.md` are where they become measurements.
- **The trigger sets are unrun.** `evals/triggers.yml` is a labelled query set, not a scored one; no
  harness in this repo fires them at a model.
- **A structural pass is not a quality pass.** The validator proves installability, shape, and that
  the files it points at exist. It cannot prove an instruction is true.

## License

MIT — see [`LICENSE`](LICENSE).
