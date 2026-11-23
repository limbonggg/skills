# scripts/

Structural CI for every skill in this repo. Node 20+, ESM, no dependencies. It implements the
blocking and warning rows of the rubric in [`docs/AUTHORING-STANDARD.md`](../docs/AUTHORING-STANDARD.md) §11.

Three files: `validate-skills.mjs` enforces the standard on every `SKILL.md`; `selftest.mjs` builds
a 14-fixture skill tree in a temp dir and asserts the validator catches exactly what it claims to;
`inventory.mjs` regenerates `docs/SKILLS.md` from the live tree (`--check` fails CI on drift,
`--json` emits the model). CI runs all three.

## Run

```bash
node scripts/validate-skills.mjs                      # scan skills/ (recursively)
node scripts/validate-skills.mjs skills/thinking      # scan any directory or skill directory
node scripts/validate-skills.mjs /tmp/fixtures --json # machine-readable
node scripts/validate-skills.mjs --strict             # warnings become blocking
```

One line per finding, then a summary:

```
error weigh-evidence description-first-person description opens in the first person ... (SKILL.md:1)
warning weigh-evidence gotchas-few "## Gotchas" has 2 bullet entries; 3+ expected (SKILL.md:41)
7 skills, 1 blocking, 1 warnings
```

Exit codes: `0` clean, `1` blocking findings (any warning too, under `--strict`), `2` usage error
(unknown flag, missing path). Under `--strict` a warning is reported as `error` and counted as blocking.

`--json` prints `{ skills, blocking, warnings, findings: [{ severity, skill, rule, message, file, line }] }`
and nothing else; the exit code is unchanged.

## What it checks

Blocking (`error`):

| rule id | check |
|---|---|
| `frontmatter-missing` | `SKILL.md` starts with `---` |
| `frontmatter-parse` | frontmatter is a flat `key: value` map (scalars, quoted strings, `\|`/`>`, one nested `metadata:` map); the block is closed |
| `field-missing` | `name`, `description`, `domain`, `risk`, `invocation` present and non-empty |
| `name-format` | `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤64 chars |
| `name-directory-mismatch` | `name` equals the directory name |
| `domain-invalid` | one of thinking, judgement, decomposition, execution, orchestration, lenses, meta, interface |
| `risk-invalid` | `none` \| `reads` \| `writes` \| `destructive` |
| `invocation-invalid` | `model` \| `user` |
| `description-length` | 1–1024 chars |
| `description-first-person` | no `I ` / `I'm` / `my ` at a sentence start |
| `description-workflow-summary` | fewer than 2 of: `first`, `then`, `step 1`, `you will`, `followed by` |
| `user-invocation-unenforced` | `invocation: user` requires `disable-model-invocation: true` |
| `model-invocation-suppressed` | `invocation: model` must not carry `disable-model-invocation: true` — a dead skill |
| `body-lines` | body ≤ 500 lines |
| `body-tokens` | body ≤ 5000 tokens, estimated as `Math.ceil(chars / 4)` |
| `section-missing` | required H2 sections present |
| `section-order` | they appear in the documented order |
| `iron-law-missing` / `iron-law-multiple` | exactly one fenced block before the first `##` |
| `iron-law-not-caps` | that block is ALL CAPS |
| `rationalizations-table-missing` | `## Rationalizations` holds a markdown table |
| `rationalizations-spirit-missing` | the table has a row matching `/spirit over letter/i` |
| `link-unresolved` | every relative local link resolves |
| `nested-reference` | a linked `.md` reference does not itself link to another local file |
| `absolute-path` | no `/Users/`, `/home/`, or drive-letter paths in the body |
| `evals-triggers-missing` / `evals-triggers-insufficient` | `evals/triggers.yml` with ≥20 labelled queries (`- should:` / `- should_not:` bullets, or `should:` / `should_not:` key blocks) |
| `evals-triggers-no-split` / `evals-triggers-split-skewed` | the file declares a real split: ≥25% and ≤60% of rows marked `# val` or inside a `# -- validation` section |
| `form-missing` / `form-invalid` / `baseline-missing` | `metadata.form` carries one of §6's six forms and `metadata.baseline` names the failure it answers |
| `evals-behaviour-missing` / `evals-behaviour-insufficient` / `evals-behaviour-shape` | `evals/behaviour.md` with ≥3 `### ` cases, each carrying `**Setup` / `**Baseline` / `**Required` / `**Observable` |
| `read-error` | a required file is readable |

Warning (`warning`, blocking under `--strict`):

| rule id | check |
|---|---|
| `gotchas-few` | `## Gotchas` has fewer than 3 bullet entries |
| `limitations-boilerplate` | `## Limitations` matches 2+ of the three known filler phrases |
| `codex-invocation-gap` | `invocation: user` lacks `agents/openai.yaml` with `allow_implicit_invocation: false` |
| `section-omitted-declared` | required section absent but listed in `metadata.sections` |
| `pack-unresolved` | a `packs/*.yml` `- skill:` entry has no `SKILL.md` on disk |
| `pack-orphan` | a skill on disk appears in no `packs/*.yml` — unreachable via navigation |
| `pack-oversized` / `pack-undersized` | a pack lists 5–15 skills (the navigation bound) |
| `description-crossref-unresolved` | a `use <skill-name>` route in a description has no `skills/*/` dir on disk |
| `reference-mentioned-missing` | a `references/<file>` mention in the body has no file on disk |

## What it cannot check

Stated so nobody pretends otherwise (same list as §11): it cannot prove that the instruction is
**true**, that the trigger set reflects **real users**, that the recorded baseline was **honest**, or
that the skill **improves outcomes**. A structural pass is not a quality pass. Those are review
judgements against the §10 checklist.

Two implementation notes: the token count is an estimate (`ceil(chars / 4)`), not a tokeniser, and the
first-person / workflow-summary checks are heuristics over the description string, not an
interpretation of it.
