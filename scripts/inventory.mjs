/**
 * inventory.mjs — renders docs/SKILLS.md from skills/ and packs/*.yml.
 * Every cell is projected from a SKILL.md frontmatter, its body summary, or a
 * pack file, so the index cannot drift from the tree. `--check` is the CI gate.
 * Exit: 0 ok, 1 docs/SKILLS.md out of date, 2 usage or read error.
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const TARGET = 'docs/SKILLS.md';
const SUMMARY_MAX = 120;
// TAXONOMY.md §2, in published order.
const DOMAINS = ['thinking', 'judgement', 'decomposition', 'execution', 'orchestration', 'lenses', 'meta', 'interface'];

// Tolerant scalar-map reader in the shape of validate-skills.mjs, narrowed to
// what the index reads: flat keys plus one nested map (`metadata:`). A line it
// cannot parse is skipped — structural errors are the validator's job.
function parseScalar(raw) {
  const value = raw.trim();
  const double = /^"((?:[^"\\]|\\.)*)"$/.exec(value);
  if (double) return double[1].replace(/\\(["\\nt])/g, (_, ch) => ({ n: '\n', t: '\t' })[ch] ?? ch);
  const single = /^'((?:[^']|'')*)'$/.exec(value);
  return single ? single[1].replace(/''/g, "'") : value;
}

function parseFrontmatter(text) {
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  if (lines[0].trim() !== '---') return null;
  const close = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (close === -1) return null;
  const data = Object.create(null);
  let map = data;
  for (const line of lines.slice(1, close)) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const pair = /^([ \t]*)([A-Za-z0-9_][A-Za-z0-9_.-]*)[ \t]*:(.*)$/.exec(line);
    if (!pair) continue;
    const [, indent, key, raw] = pair;
    const value = parseScalar(raw);
    if (indent !== '') {
      if (map !== data) map[key] = value; // a block scalar's body or a deeper list: unused
    } else if (/^[|>]/.test(value)) {
      data[key] = '';
      map = data;
    } else if (value === '') {
      map = data[key] = Object.create(null);
    } else {
      map = data;
      data[key] = value;
    }
  }
  return { data, body: lines.slice(close + 1).join('\n') };
}

// The summary is the first sentence of the paragraph under the H1. Authors wrap
// that paragraph, so it is joined before the sentence is cut: one physical line
// would end mid-word.
function firstSentence(text) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  const match = /^.*?[.!?]["')\]]*(?=\s|$)/.exec(flat);
  return (match ? match[0] : flat).trim();
}

function summarise(body, description) {
  const lines = body.split('\n');
  const heading = lines.findIndex((line) => /^#\s+/.test(line));
  const rest = heading === -1 ? '' : lines.slice(heading + 1).join('\n').trim();
  const paragraph = rest.split(/\n[ \t]*\n/)[0].replace(/\s+/g, ' ').trim();
  return clip(firstSentence(paragraph) || firstSentence(description));
}

function clip(text, max = SUMMARY_MAX) {
  const flat = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  // Prefer a sentence boundary; otherwise a word boundary. Never cut mid-sentence and
  // decorate it with a period — that reads as if the skill itself were clipped.
  const sentence = flat.match(/^.*?[.!?](?=\s|$)/);
  if (sentence && sentence[0].length > 40) return sentence[0];
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > max / 2 ? space : max).replace(/[,;:.]$/, '')}\u2026`;
}

function cell(value) {
  const text = String(value ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
  return text === '' ? '\u2014' : text;
}

const isDirectory = (path) => existsSync(path) && statSync(path).isDirectory();

function readSkills(root) {
  const skillsDir = join(root, 'skills');
  if (!isDirectory(skillsDir)) return null;
  const skills = [];
  for (const domain of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!domain.isDirectory() || domain.name.startsWith('.')) continue;
    for (const entry of readdirSync(join(skillsDir, domain.name), { withFileTypes: true })) {
      const file = join(skillsDir, domain.name, entry.name, 'SKILL.md');
      if (!entry.isDirectory() || !existsSync(file)) continue;
      const parsed = parseFrontmatter(readFileSync(file, 'utf8'));
      const data = parsed?.data ?? Object.create(null);
      skills.push({
        name: data.name ?? entry.name,
        domain: data.domain ?? domain.name,
        risk: data.risk ?? '',
        invocation: data.invocation ?? '',
        version: data.version ?? '',
        form: data.metadata?.form ?? '',
        baseline: data.metadata?.baseline ?? '',
        summary: summarise(parsed?.body ?? '', data.description),
      });
    }
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

function readPacks(root) {
  const packsDir = join(root, 'packs');
  const packs = new Map();
  if (!isDirectory(packsDir)) return packs;
  for (const file of readdirSync(packsDir).filter((name) => /\.ya?ml$/.test(name)).sort()) {
    const listed = new Set();
    for (const line of readFileSync(join(packsDir, file), 'utf8').split(/\r?\n/)) {
      const match = /^\s*-\s+skill:\s*([a-z0-9-]+)\s*$/.exec(line);
      if (match) listed.add(match[1]);
    }
    packs.set(basename(file, extname(file)), listed);
  }
  return packs;
}

function build(root) {
  const skills = readSkills(root);
  if (skills === null) throw new Error('no skills/ directory next to scripts/');
  if (skills.length === 0) throw new Error('no skills/<domain>/<name>/SKILL.md found');
  const packs = readPacks(root);
  const packNames = [...packs.keys()].sort();
  for (const skill of skills) skill.packs = packNames.filter((pack) => packs.get(pack).has(skill.name));
  const order = [...DOMAINS, ...new Set(skills.map((skill) => skill.domain))].filter(
    (domain, index, all) => all.indexOf(domain) === index,
  );
  const sections = order
    .map((domain) => ({ domain, skills: skills.filter((skill) => skill.domain === domain) }))
    .filter((section) => section.skills.length > 0);
  return {
    total: skills.length,
    packCount: packNames.length,
    counts: sections.map((section) => `${section.domain} ${section.skills.length}`),
    sections,
    skills,
  };
}

function render(model) {
  const lines = [
    '# Skill index',
    '',
    'Generated by `node scripts/inventory.mjs`; edit skills, not this file.',
    '',
    `${model.total} skills · ${model.sections.length} domains · ${model.packCount} packs — ${model.counts.join(', ')}.`,
    '',
  ];
  for (const section of model.sections) {
    lines.push(`## ${section.domain}`, '', '| skill | what it changes | invocation | risk | packs |', '|---|---|---|---|---|');
    for (const skill of section.skills) {
      const packs = cell(skill.packs.join(', '));
      lines.push(`| ${cell(skill.name)} | ${cell(skill.summary)} | ${cell(skill.invocation)} | ${cell(skill.risk)} | ${packs} |`);
    }
    lines.push('');
  }
  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

function asJson(model) {
  const domains = Object.fromEntries(model.sections.map((section) => [section.domain, section.skills.length]));
  return `${JSON.stringify({ skills: model.total, packs: model.packCount, domains, entries: model.skills }, null, 2)}\n`;
}

function usage(message) {
  process.stderr.write(`${message}\n\n${helpText()}\n`);
  return 2;
}

function helpText() {
  return `Usage: node scripts/inventory.mjs [--check] [--json]

  --check  compare docs/SKILLS.md with a fresh render; exit 1 if stale
  --json   print the inventory as JSON instead of writing the file

Exit: 0 ok, 1 docs/SKILLS.md out of date, 2 usage error`;
}

function main(argv) {
  const flags = new Set(argv.slice(2));
  const known = ['--check', '--json', '-h', '--help'];
  const unknown = [...flags].find((flag) => !known.includes(flag));
  if (unknown !== undefined) return usage(`unknown flag: ${unknown}`);
  if (flags.has('-h') || flags.has('--help')) {
    process.stdout.write(`${helpText()}\n`);
    return 0;
  }
  const check = flags.has('--check');
  const json = flags.has('--json');
  if (check && json) return usage('--check and --json are exclusive');

  let model;
  let expected;
  try {
    model = build(ROOT);
    expected = render(model);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 2;
  }
  if (json) {
    process.stdout.write(asJson(model));
    return 0;
  }
  if (!check) {
    writeFileSync(join(ROOT, TARGET), expected);
    process.stdout.write(`wrote ${TARGET} (${model.total} skills, ${model.packCount} packs)\n`);
    return 0;
  }

  const target = join(ROOT, TARGET);
  if (!existsSync(target)) {
    process.stderr.write(`${TARGET} is missing \u2014 run node scripts/inventory.mjs\n`);
    return 1;
  }
  const actual = readFileSync(target, 'utf8');
  if (actual !== expected) {
    const left = actual.split('\n');
    const right = expected.split('\n');
    const spans = Math.max(left.length, right.length);
    let differing = 0;
    for (let index = 0; index < spans; index += 1) if (left[index] !== right[index]) differing += 1;
    process.stderr.write(`${TARGET} is out of date: ${differing} line(s) differ (file ${left.length - 1} lines, expected ${right.length - 1}) \u2014 run node scripts/inventory.mjs\n`);
    return 1;
  }
  process.stdout.write(`${TARGET} is in sync (${model.total} skills, ${model.packCount} packs)\n`);
  return 0;
}

process.exitCode = main(process.argv);
