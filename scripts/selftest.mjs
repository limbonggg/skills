// Self-test for validate-skills.mjs — generates a fixture corpus in a tempdir,
// runs the validator on it, asserts the expected rule ids. Cleans up in finally.
// Run: node scripts/selftest.mjs          (exit 0 = all assertions held)

import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const VALIDATOR = join(HERE, 'validate-skills.mjs');
// Sandboxed hosts may deny os.tmpdir(); /var/tmp is the usual fallback.
function makeTempRoot() {
  try {
    return mkdtempSync(join(tmpdir(), 'skill-selftest-'));
  } catch {
    return mkdtempSync(join('/var/tmp', 'skill-selftest-'));
  }
}
const ROOT = makeTempRoot();

const SECTION_LABELS = {
  'when-to-use': '## When to use / when not to use',
  process: '## The process',
  gotchas: '## Gotchas',
  rationalizations: '## Rationalizations',
  'red-flags': '## Red flags',
  limitations: '## Limitations',
};

const SECTIONS = `## When to use / when not to use

Use when the fixture asserts a rule. Not for anything real.

## The process

1. Do the thing.

## Gotchas

- First real gotcha.
- Second real gotcha.
- Third real gotcha.

## Rationalizations

| excuse | answer |
|---|---|
| different words so the rule does not apply | spirit over letter |

## Red flags

- A red flag.

## Limitations

- Fixtures only.
`;

const TRIGGERS = `# Split: \`# val\` marks the held-out validation split (~40%); unmarked rows are train.\n${Array.from({ length: 20 }, (_, i) => `- should: fixture query ${i + 1}${i >= 12 ? '   # val' : ''}`).join('\n')}`;
const BEHAVIOUR = [1, 2, 3]
  .map(
    (n) =>
      `### Case ${n}\n\n**Setup.** x\n\n**Baseline.** x\n\n**Required.** y\n\n**Observable.** z\n`,
  )
  .join('\n');

const FM = (name, extra = '') => `---
name: ${name}
description: Use when fixture-testing the validator rules.
domain: execution
risk: reads
invocation: model${extra}
version: 0.1.0
metadata:
  form: recipe
  baseline: fixture-baseline
  eval: evals/
---`;

function skill(dir, frontmatter, { iron = true, omit = [], bodyExtra = '', evals = {} } = {}) {
  const d = join(ROOT, 'skills', 'fixtures', dir);
  mkdirSync(join(d, 'evals'), { recursive: true });

  let body = `# ${dir}\n\nIntro.\n\n`;
  if (iron) body += '```\nNO CLAIM WITHOUT A RUN\n```\n\n';
  let sections = SECTIONS;
  for (const id of omit) {
    const label = SECTION_LABELS[id].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sections = sections.replace(new RegExp(`${label}[\\s\\S]*?(?=\\n## |$)`), '');
  }
  body += sections + bodyExtra;

  writeFileSync(join(d, 'SKILL.md'), `${frontmatter}\n\n${body}`);
  if (evals.triggers !== false) {
    const body = evals.triggersRaw ?? TRIGGERS;
    writeFileSync(join(d, 'evals', 'triggers.yml'), `queries:\n${body}\n`);
  }
  writeFileSync(
    join(d, 'evals', 'behaviour.md'),
    `# Behaviour\n\n${evals.behaviour ?? BEHAVIOUR}`,
  );
}

try {
  skill('ok-skill', FM('ok-skill'));
  skill('user-no-flag', FM('user-no-flag').replace('invocation: model', 'invocation: user'));
  skill('model-suppressed', FM('model-suppressed', '\ndisable-model-invocation: true'));
  skill(
    'user-no-codex',
    FM('user-no-codex', '\ndisable-model-invocation: true').replace(
      'invocation: model',
      'invocation: user',
    ),
  );
  // user + flag + openai.yaml WITHOUT the suppression policy -> still a gap
  skill(
    'user-weak-codex',
    FM('user-weak-codex', '\ndisable-model-invocation: true').replace(
      'invocation: model',
      'invocation: user',
    ),
  );
  mkdirSync(join(ROOT, 'skills', 'fixtures', 'user-weak-codex', 'agents'), { recursive: true });
  writeFileSync(
    join(ROOT, 'skills', 'fixtures', 'user-weak-codex', 'agents', 'openai.yaml'),
    'interface:\n  display_name: weak\n',
  );
  // map-form declared omission: `sections: [gotchas]` inside metadata
  skill(
    'declared-omission',
    FM('declared-omission').replace('  eval: evals/', '  eval: evals/\n  sections: [gotchas]'),
    { omit: ['gotchas'] },
  );
  skill('missing-section', FM('missing-section'), { omit: ['gotchas'] });
  // behaviour case stub: only 2 markers of 4
  skill('stub-case', FM('stub-case'), {
    evals: {
      behaviour: BEHAVIOUR + '### Case 4\n\n**Setup.** x\n\n**Required.** y\n',
    },
  });
  // description routes to a non-existent skill
  skill(
    'dead-crossref',
    FM('dead-crossref').replace(
      'the validator rules.',
      'the validator rules; use ghost-skill for routing.',
    ),
  );
  // body cites a references/ file that does not exist
  skill('dead-reference', FM('dead-reference'), {
    bodyExtra: '\nSee `references/values.md` for thresholds.\n',
  });
  // triggers with no declared train/validation split
  skill('no-split', FM('no-split'), {
    evals: {
      triggersRaw: Array.from({ length: 20 }, (_, i) => `- should: fixture query ${i + 1}`).join(
        '\n',
      ),
    },
  });
  // triggers that declare a split but hold out too few rows
  skill('split-skewed', FM('split-skewed'), {
    evals: {
      triggersRaw:
        '# Split: `# val` marks held-out rows.\n' +
        Array.from({ length: 20 }, (_, i) => `- should: fixture query ${i + 1}${i < 2 ? '   # val' : ''}`).join(
          '\n',
        ),
    },
  });
  // frontmatter with no metadata block at all
  skill('form-missing', `---
name: form-missing
description: Use when fixture-testing the validator rules.
domain: execution
risk: reads
invocation: model
version: 0.1.0
---`);
  // frontmatter with a form outside §6's closed vocabulary
  skill('form-invalid', FM('form-invalid').replace('form: recipe', 'form: structural-slot'));
  mkdirSync(join(ROOT, 'packs'), { recursive: true });
  writeFileSync(
    join(ROOT, 'packs', 'test-pack.yml'),
    'pack: test\nskills:\n  - skill: ok-skill\n  - skill: ghost-skill\n  - skill: ghost-two\n  - skill: ghost-three\n  - skill: ghost-four\n',
  );
  writeFileSync(
    join(ROOT, 'packs', 'big-pack.yml'),
    `pack: big\nskills:\n${Array.from({ length: 16 }, (_, i) => `  - skill: fake-skill-${i}\n`).join('')}`,
  );
  writeFileSync(
    join(ROOT, 'packs', 'tiny-pack.yml'),
    'pack: tiny\nskills:\n  - skill: ok-skill\n  - skill: ghost-skill\n',
  );

  const out = spawnSync('node', [VALIDATOR, 'skills', '--json'], { cwd: ROOT, encoding: 'utf8' });
  if (out.error) throw out.error;
  const result = JSON.parse(out.stdout);

  const rulesBySkill = {};
  for (const f of result.findings) {
    (rulesBySkill[f.skill] = rulesBySkill[f.skill] || []).push(`${f.severity}:${f.rule}`);
  }

  const EXPECT = {
    'ok-skill': { empty: true },
    'user-no-flag': { present: ['user-invocation-unenforced', 'codex-invocation-gap'] },
    'model-suppressed': { present: ['model-invocation-suppressed'] },
    'user-no-codex': {
      present: ['warning:codex-invocation-gap'],
      absent: ['user-invocation-unenforced'],
    },
    'user-weak-codex': { present: ['warning:codex-invocation-gap'] },
    'declared-omission': {
      present: ['section-omitted-declared'],
      absent: ['section-missing'],
    },
    'missing-section': {
      present: ['section-missing'],
      absent: ['section-omitted-declared'],
    },
    'stub-case': { present: ['evals-behaviour-shape', 'warning:pack-orphan'] },
    'dead-crossref': { present: ['description-crossref-unresolved', 'warning:pack-orphan'] },
    'dead-reference': { present: ['reference-mentioned-missing', 'warning:pack-orphan'] },
    'no-split': { present: ['warning:evals-triggers-no-split', 'warning:pack-orphan'] },
    'form-missing': {
      present: ['form-missing', 'baseline-missing', 'warning:pack-orphan'],
      absent: ['form-invalid'],
    },
    'form-invalid': { present: ['form-invalid', 'warning:pack-orphan'] },
    'split-skewed': { present: ['warning:evals-triggers-split-skewed', 'warning:pack-orphan'] },
    'test-pack': { present: ['pack-unresolved'], absent: ['pack-oversized', 'pack-undersized'] },
    'big-pack': { present: ['pack-oversized'] },
    'tiny-pack': { present: ['pack-undersized'] },
  };

  let failures = 0;
  for (const [sk, { present = [], absent = [], empty = false }] of Object.entries(EXPECT)) {
    const rules = rulesBySkill[sk] || [];
    if (empty && rules.length > 0) {
      console.error(`FAIL ${sk}: expected zero findings, got [${rules.join(', ')}]`);
      failures++;
      continue;
    }
    for (const r of present) {
      const candidates = r.includes(':') ? [r] : [`error:${r}`, `warning:${r}`];
      if (!candidates.some((c) => rules.includes(c))) {
        console.error(`FAIL ${sk}: expected ${r}, got [${rules.join(', ')}]`);
        failures++;
      }
    }
    for (const r of absent) {
      if (rules.some((x) => x.endsWith(`:${r}`))) {
        console.error(`FAIL ${sk}: unexpected ${r} in [${rules.join(', ')}]`);
        failures++;
      }
    }
  }

  if (failures === 0) {
    console.log(
      `selftest OK — ${result.skills} fixtures, ${result.findings.length} findings, all assertions held`,
    );
  } else {
    console.error(`${failures} assertion(s) failed`);
    process.exitCode = 1;
  }
} finally {
  rmSync(ROOT, { recursive: true, force: true });
}
