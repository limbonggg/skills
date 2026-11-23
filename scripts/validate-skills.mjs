#!/usr/bin/env node
/**
 * validate-skills.mjs — structural CI for the skills in this repository.
 *
 * Implements the blocking and warning checks of docs/AUTHORING-STANDARD.md §11.
 * Zero dependencies, Node 20+, ESM. See scripts/README.md for usage, the rule ids,
 * and — importantly — for what this script cannot prove.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOMAINS = [
  'thinking',
  'judgement',
  'decomposition',
  'execution',
  'orchestration',
  'lenses',
  'meta',
  'interface',
];
const RISKS = ['none', 'reads', 'writes', 'destructive'];
const INVOCATIONS = ['model', 'user'];

// §6's closed vocabulary, spelled with spaces exactly as the standard lists it.
const FORMS = [
  'discipline',
  'recipe',
  'positive recipe',
  'structural slot',
  'conditional',
  'paired prohibition',
];

const LIMITS = {
  description: 1024,
  lines: 500,
  tokens: 5000,
  triggers: 20,
  behaviourCases: 3,
  gotchaEntries: 3,
  packMin: 5,
  packMax: 15,
  splitMin: 0.25,
  splitMax: 0.6,
};

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// First person at the start of the description, or after a sentence boundary.
const FIRST_PERSON_RE = /(?:^|[.!?]\s+)(?:I\s|I['\u2019]m\b|[Mm]y\s)/;

// A description is a workflow summary when it names 2+ of these stages.
const WORKFLOW_MARKERS = [
  ['first', /\bfirst\b/i],
  ['then', /\bthen\b/i],
  ['step 1', /\bstep\s*1\b/i],
  ['you will', /\byou will\b/i],
  ['followed by', /\bfollowed by\b/i],
];

// The three boilerplate limitation phrases the standard's §5 names as filler.
const LIMITATIONS_BOILERPLATE = [
  'clearly matches the scope',
  'substitute for environment-specific validation',
  'ask for clarification if required inputs',
];

// Required H2 sections, in order. `match` receives a normalised heading.
const REQUIRED_SECTIONS = [
  {
    id: 'when-to-use',
    label: '## When to use / when not to use',
    match: (h) => /^when to use\b/.test(h),
  },
  {
    id: 'process',
    label: '## The process',
    match: (h) => h === 'the process' || h === 'process',
  },
  { id: 'gotchas', label: '## Gotchas', match: (h) => h === 'gotchas' },
  {
    id: 'rationalizations',
    label: '## Rationalizations',
    match: (h) => h === 'rationalizations' || h === 'rationalisations',
  },
  { id: 'red-flags', label: '## Red flags', match: (h) => /^red flags\b/.test(h) },
  { id: 'limitations', label: '## Limitations', match: (h) => /^limitations\b/.test(h) },
];

// Every rule this script can emit. `sev` is the default severity; --strict promotes warnings.
const RULE = {
  'frontmatter-missing': {
    sev: 'error',
    summary: 'SKILL.md does not start with a --- frontmatter block',
  },
  'frontmatter-parse': {
    sev: 'error',
    summary: 'frontmatter is not a flat map of key: value pairs',
  },
  'field-missing': {
    sev: 'error',
    summary: 'name, description, domain, risk and invocation are all required',
  },
  'name-format': {
    sev: 'error',
    summary: 'name must match ^[a-z0-9]+(-[a-z0-9]+)*$ and be <= 64 chars',
  },
  'name-directory-mismatch': {
    sev: 'error',
    summary: 'frontmatter name must equal the directory name',
  },
  'domain-invalid': { sev: 'error', summary: `domain must be one of: ${DOMAINS.join(', ')}` },
  'risk-invalid': { sev: 'error', summary: `risk must be one of: ${RISKS.join(', ')}` },
  'user-invocation-unenforced': {
    sev: 'error',
    summary: 'invocation: user requires disable-model-invocation: true so the bit actually suppresses the model',
  },
  'model-invocation-suppressed': {
    sev: 'error',
    summary: 'invocation: model with disable-model-invocation: true produces a skill that can never fire',
  },
  'codex-invocation-gap': {
    sev: 'warning',
    summary: 'invocation: user without agents/openai.yaml still fires implicitly on Codex',
  },
  'pack-unresolved': {
    sev: 'warning',
    summary: 'a packs/*.yml entry names a skill with no SKILL.md',
  },
  'section-omitted-declared': {
    sev: 'warning',
    summary: 'a required section is absent but declared in metadata.sections',
  },
  'invocation-invalid': {
    sev: 'error',
    summary: `invocation must be one of: ${INVOCATIONS.join(', ')}`,
  },
  'description-length': {
    sev: 'error',
    summary: `description must be 1-${LIMITS.description} characters`,
  },
  'description-first-person': {
    sev: 'error',
    summary: 'description must not be first person (I / I\u2019m / my at a sentence start)',
  },
  'description-workflow-summary': {
    sev: 'error',
    summary: 'description must not summarise the workflow (2+ of: first, then, step 1, you will, followed by)',
  },
  'body-lines': { sev: 'error', summary: `body must be <= ${LIMITS.lines} lines` },
  'body-tokens': {
    sev: 'error',
    summary: `body must be <= ${LIMITS.tokens} tokens (estimated as ceil(chars / 4))`,
  },
  'section-missing': { sev: 'error', summary: 'a required H2 section is absent' },
  'section-order': { sev: 'error', summary: 'required H2 sections must appear in the documented order' },
  'iron-law-missing': {
    sev: 'error',
    summary: 'no fenced Iron Law before the first ## section',
  },
  'iron-law-multiple': {
    sev: 'error',
    summary: 'more than one fenced block before the first ## section (exactly one Iron Law)',
  },
  'iron-law-not-caps': { sev: 'error', summary: 'the fenced Iron Law must be ALL CAPS' },
  'rationalizations-table-missing': {
    sev: 'error',
    summary: '## Rationalizations must contain a markdown table',
  },
  'rationalizations-spirit-missing': {
    sev: 'error',
    summary: '## Rationalizations must contain a "Spirit over letter" row',
  },
  'link-unresolved': { sev: 'error', summary: 'a relative markdown link points at a missing local file' },
  'nested-reference': {
    sev: 'error',
    summary: 'a linked reference itself links to another local file (references are one level deep)',
  },
  'absolute-path': { sev: 'error', summary: 'the body contains an absolute machine path' },
  'evals-triggers-missing': { sev: 'error', summary: 'evals/triggers.yml is missing' },
  'evals-triggers-insufficient': {
    sev: 'error',
    summary: `evals/triggers.yml must contain >= ${LIMITS.triggers} labelled queries`,
  },
  'evals-triggers-no-split': {
    sev: 'warning',
    summary: 'evals/triggers.yml marks no row as held out',
  },
  'evals-triggers-split-skewed': {
    sev: 'warning',
    summary: 'the held-out share is outside 25–60% of queries',
  },
  'form-missing': {
    sev: 'error',
    summary: 'metadata.form is absent — §6 classifies the baseline failure before writing',
  },
  'form-invalid': {
    sev: 'error',
    summary: 'metadata.form is outside §6\'s closed vocabulary',
  },
  'baseline-missing': {
    sev: 'error',
    summary: 'metadata.baseline is absent — the failure the form answers is unnamed',
  },
  'evals-behaviour-missing': { sev: 'error', summary: 'evals/behaviour.md is missing' },
  'evals-behaviour-insufficient': {
    sev: 'error',
    summary: `evals/behaviour.md must contain >= ${LIMITS.behaviourCases} "### " cases`,
  },
  'evals-behaviour-shape': {
    sev: 'error',
    summary: 'each "### " case must carry Setup, Baseline, Required, and Observable markers',
  },
  'read-error': { sev: 'error', summary: 'a required file could not be read' },
  'gotchas-few': {
    sev: 'warning',
    summary: `## Gotchas should have >= ${LIMITS.gotchaEntries} bullet entries`,
  },
  'limitations-boilerplate': {
    sev: 'warning',
    summary: '## Limitations reads as boilerplate (2+ known filler phrases)',
  },
  'description-crossref-unresolved': {
    sev: 'warning',
    summary: 'description routes to a skill name with no SKILL.md on disk',
  },
  'reference-mentioned-missing': {
    sev: 'warning',
    summary: 'the body cites a references/ path that does not exist',
  },
  'pack-orphan': {
    sev: 'warning',
    summary: 'a skill on disk appears in no packs/*.yml — unreachable via navigation',
  },
  'pack-oversized': {
    sev: 'warning',
    summary: 'a pack lists more than 15 skills — the navigation bound',
  },
  'pack-undersized': {
    sev: 'warning',
    summary: 'a pack lists fewer than 5 skills — a todo list, not a pack',
  },
};


// Cross-skill references resolve against every SKILL.md on disk, not just the scanned set —
// a single-skill run must still check packs and description routing against the real tree.
let DISK_NAMES = new Set();
// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function truncate(value, max = 70) {
  const text = String(value).trim();
  return text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
}

// Section ids a skill may declare as deliberately omitted via `metadata.sections`.
// metadata parses as a nested map when possible (`sections: [gotchas]` -> "[gotchas]")
// and as flattened raw text for deeper shapes (`sections:` + `- gotchas`) — handle both.
function declaredOmissions(data) {
  const omitted = new Set();
  if (!data || typeof data !== 'object') return omitted;
  const ids = ['when-to-use', 'process', 'gotchas', 'rationalizations', 'red-flags', 'limitations'];
  const collect = (text) => {
    for (const id of ids) {
      if (new RegExp(`\\b${id}\\b`).test(text)) omitted.add(id);
    }
  };
  const meta = data.metadata;
  if (meta && typeof meta === 'object') {
    const sections = meta.sections;
    if (Array.isArray(sections)) collect(sections.join(' '));
    else if (sections != null) collect(String(sections));
    return omitted;
  }
  const match = /sections\s*[:=]\s*([^\n]*(?:\n[ \t-][^\n]*)*)/.exec(String(meta ?? ''));
  if (match) collect(match[1]);
  return omitted;
}

function normaliseText(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function normaliseHeading(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/#+$/, '')
    .trim()
    .toLowerCase();
}

function stripInlineCode(line) {
  return line.replace(/`[^`]*`/g, '');
}

/** True when every letter in the text is uppercase and there are enough letters to be a law. */
function isAllCaps(text) {
  const letters = text.replace(/[^A-Za-z]/g, '');
  return letters.length >= 8 && letters === letters.toUpperCase();
}

// ---------------------------------------------------------------------------
// Frontmatter parser
//
// Handles exactly what the standard uses: `key: value`, single/double quoted
// strings, `|` / `>` block scalars, `- item` lists, and one level of nested map
// (the `metadata:` block). Anything deeper is preserved as raw text rather than
// rejected, so a parser limitation never masquerades as a content failure.
// ---------------------------------------------------------------------------

function parseScalar(raw) {
  const value = raw.trim();
  if (value === '') return '';
  if (value.startsWith('"')) {
    const quoted = /^"((?:[^"\\]|\\.)*)"\s*$/.exec(value);
    if (!quoted) return value;
    return quoted[1].replace(/\\(["\\nt])/g, (_, ch) =>
      ch === 'n' ? '\n' : ch === 't' ? '\t' : ch,
    );
  }
  if (value.startsWith("'")) {
    const quoted = /^'((?:[^']|'')*)'\s*$/.exec(value);
    if (!quoted) return value;
    return quoted[1].replace(/''/g, "'");
  }
  return value;
}

function parseScalarMap(lines) {
  const map = Object.create(null);
  let current = null;
  for (const line of lines) {
    const pair = /^([A-Za-z0-9_][A-Za-z0-9_.-]*)\s*:(.*)$/.exec(line);
    if (pair) {
      current = pair[1];
      map[current] = parseScalar(pair[2]);
    } else if (current && line.trim() !== '') {
      // Deeper structure than one level: keep the raw text, do not fail.
      map[current] = `${map[current]} ${line.trim()}`.trim();
    }
  }
  return map;
}

function parseFrontmatter(lines) {
  const data = Object.create(null);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].replace(/\s+$/, '');
    if (line.trim() === '' || line.trim().startsWith('#')) {
      index += 1;
      continue;
    }

    const pair = /^([A-Za-z0-9_][A-Za-z0-9_.-]*)[ \t]*:(.*)$/.exec(line);
    if (!pair) {
      return { error: `line ${index + 2}: not a "key: value" pair: ${truncate(line)}` };
    }

    const key = pair[1];
    const rest = pair[2].replace(/^[ \t]+/, '');

    // Collect the indented block that belongs to this key.
    const block = [];
    let cursor = index + 1;
    while (cursor < lines.length) {
      const next = lines[cursor].replace(/\s+$/, '');
      if (next.trim() === '' || /^[ \t]/.test(next)) {
        block.push(next);
        cursor += 1;
        continue;
      }
      break;
    }
    while (block.length > 0 && block[block.length - 1].trim() === '') block.pop();

    if (rest === '' || /^[|>][-+]?$/.test(rest)) {
      const content = block.map((entry) => entry.replace(/^[ \t]+/, ''));
      if (content.length === 0) {
        data[key] = '';
      } else if (/^[|>]/.test(rest)) {
        data[key] = rest[0] === '>' ? content.join(' ') : content.join('\n');
      } else if (content.every((entry) => /^[A-Za-z0-9_][A-Za-z0-9_.-]*\s*:/.test(entry))) {
        data[key] = parseScalarMap(content);
      } else if (content.every((entry) => /^-\s+\S/.test(entry) || entry.trim() === '')) {
        data[key] = content
          .filter((entry) => entry.trim() !== '')
          .map((entry) => parseScalar(entry.replace(/^-\s+/, '')));
      } else {
        data[key] = content.join('\n').trim();
      }
    } else {
      data[key] = parseScalar(rest);
      if (block.length > 0) {
        // Plain scalar folded across lines.
        const tail = block.map((entry) => entry.trim()).filter(Boolean).join(' ');
        data[key] = `${data[key]} ${tail}`.trim();
      }
    }

    index = cursor;
  }

  return { data };
}

/**
 * @returns {{kind:'ok', data: object, body: string}
 *          | {kind:'missing'}
 *          | {kind:'invalid', error: string}}
 */
function readFrontmatter(text) {
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') return { kind: 'missing' };

  const close = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (close === -1) {
    return { kind: 'invalid', error: 'frontmatter block is never closed with ---' };
  }

  const parsed = parseFrontmatter(lines.slice(1, close));
  if (parsed.error) return { kind: 'invalid', error: parsed.error };

  return { kind: 'ok', data: parsed.data, body: lines.slice(close + 1).join('\n') };
}

// ---------------------------------------------------------------------------
// Markdown scanning
// ---------------------------------------------------------------------------

/**
 * Marks every line that sits inside a fenced code block and records the openings.
 * @returns {{inCode: boolean[], opens: {line:number, closeLine:number|null}[]}}
 */
function markFences(lines) {
  const inCode = new Array(lines.length).fill(false);
  const opens = [];
  let open = null;

  for (let i = 0; i < lines.length; i += 1) {
    const fence = /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(lines[i]);
    if (!open) {
      if (fence) {
        open = { line: i, marker: fence[1][0], size: fence[1].length, closeLine: null };
        opens.push(open);
      }
      continue;
    }
    inCode[i] = true;
    if (fence && fence[1][0] === open.marker && fence[1].length >= open.size && fence[2].trim() === '') {
      open.closeLine = i;
      inCode[i] = false;
      open = null;
    }
  }

  return { inCode, opens };
}

/** Extracts the destination of every [text](dest) link on one line. */
function extractLinks(line) {
  const destinations = [];
  let cursor = 0;

  while ((cursor = line.indexOf('](', cursor)) !== -1) {
    if (line.lastIndexOf('[', cursor) === -1) {
      cursor += 2;
      continue;
    }

    let end = cursor + 2;
    let depth = 1;
    while (end < line.length && depth > 0) {
      const ch = line[end];
      if (ch === '(') depth += 1;
      else if (ch === ')') depth -= 1;
      if (depth === 0) break;
      end += 1;
    }
    if (depth !== 0) {
      cursor += 2;
      continue;
    }

    let destination = line.slice(cursor + 2, end).trim();
    cursor = end + 1;

    if (destination.startsWith('<')) {
      const closeAngle = destination.indexOf('>');
      destination = closeAngle === -1 ? destination.slice(1) : destination.slice(1, closeAngle);
    } else {
      const space = destination.search(/[ \t]/);
      if (space !== -1) destination = destination.slice(0, space);
    }

    if (destination) destinations.push(destination);
  }

  return destinations;
}

/** Returns the local path a link destination names, or null for external / anchor links. */
function toLocalPath(destination) {
  if (!destination || destination.startsWith('#')) return null;
  if (destination.startsWith('//')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(destination)) return null;

  let path = destination;
  const hash = path.indexOf('#');
  if (hash !== -1) path = path.slice(0, hash);
  const query = path.indexOf('?');
  if (query !== -1) path = path.slice(0, query);
  if (!path) return null;

  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep the raw form */
  }
  return path;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateSkill(dir) {
  const skillName = basename(dir);
  const findings = [];

  const add = (rule, message, location = {}) => {
    findings.push({
      severity: RULE[rule].sev,
      skill: skillName,
      rule,
      message,
      file: location.file ?? 'SKILL.md',
      line: location.line ?? null,
    });
  };

  const skillFile = join(dir, 'SKILL.md');
  let text;
  try {
    text = normaliseText(readFileSync(skillFile, 'utf8'));
  } catch (error) {
    add('read-error', `cannot read SKILL.md: ${error.message}`);
    return findings;
  }

  // -- Frontmatter ---------------------------------------------------------
  const frontmatter = readFrontmatter(text);
  let body;

  if (frontmatter.kind === 'missing') {
    add('frontmatter-missing', 'SKILL.md must start with a --- frontmatter block');
    body = text;
  } else if (frontmatter.kind === 'invalid') {
    add('frontmatter-parse', frontmatter.error, { line: 1 });
    return findings; // the body boundary is unknown; do not guess
  } else {
    body = frontmatter.body;
    validateFrontmatter(frontmatter.data, skillName, add);
  }

  // Codex suppresses implicit invocation via agents/openai.yaml carrying
  // policy.allow_implicit_invocation: false — an interface-only file does nothing.
  if (frontmatter.kind === 'ok' && String(frontmatter.data.invocation).trim() === 'user') {
    const openaiPath = join(dir, 'agents', 'openai.yaml');
    if (!existsSync(openaiPath)) {
      add(
        'codex-invocation-gap',
        'invocation is "user" but agents/openai.yaml is absent — on Codex this skill still fires implicitly',
      );
    } else {
      let openai = '';
      try {
        openai = readFileSync(openaiPath, 'utf8');
      } catch {
        openai = '';
      }
      if (!/allow_implicit_invocation\s*:\s*false/.test(openai)) {
        add(
          'codex-invocation-gap',
          'agents/openai.yaml exists but lacks "policy.allow_implicit_invocation: false" — implicit invocation is not suppressed on Codex',
        );
      }
    }
  }

  body = body.replace(/^\n+/, '');
  const bodyText = body.replace(/\s+$/, '');
  const bodyLines = bodyText === '' ? [] : bodyText.split('\n');

  // -- Size ----------------------------------------------------------------
  if (bodyLines.length > LIMITS.lines) {
    add('body-lines', `${bodyLines.length} lines, limit ${LIMITS.lines}`);
  }
  const tokens = Math.ceil(bodyText.length / 4);
  if (tokens > LIMITS.tokens) {
    add('body-tokens', `~${tokens} tokens (ceil(chars/4)), limit ${LIMITS.tokens}`);
  }

  // -- Structure -----------------------------------------------------------
  const { inCode, opens } = markFences(bodyLines);

  const headings = [];
  bodyLines.forEach((line, i) => {
    if (inCode[i]) return;
    const match = /^##(?!#)\s+(.*)$/.exec(line);
    if (match) headings.push({ line: i, text: normaliseHeading(match[1]) });
  });

  const sectionAt = (headingIndex) => ({
    heading: headings[headingIndex].text,
    line: headings[headingIndex].line,
    start: headings[headingIndex].line + 1,
    end: headingIndex + 1 < headings.length ? headings[headingIndex + 1].line : bodyLines.length,
  });
  const sectionLines = (section) => bodyLines.slice(section.start, section.end);

  const found = [];
  const declaredOmitted = declaredOmissions(frontmatter.kind === 'ok' ? frontmatter.data : {});
  for (const required of REQUIRED_SECTIONS) {
    const headingIndex = headings.findIndex((heading) => required.match(heading.text));
    if (headingIndex === -1) {
      if (declaredOmitted.has(required.id)) {
        add(
          'section-omitted-declared',
          `required section "${required.label}" absent but declared in metadata.sections`,
        );
      } else {
        add('section-missing', `missing required section "${required.label}"`);
      }
    } else {
      found.push({ ...sectionAt(headingIndex), label: required.label });
    }
  }

  let maxLine = -1;
  let maxLabel = null;
  for (const section of found) {
    if (section.line < maxLine) {
      add(
        'section-order',
        `"${section.label}" (line ${section.line + 1}) appears before "${maxLabel}" (line ${maxLine + 1})`,
        { line: section.line + 1 },
      );
    } else {
      maxLine = section.line;
      maxLabel = section.label;
    }
  }

  // -- Iron Law ------------------------------------------------------------
  const firstHeadingLine = headings.length > 0 ? headings[0].line : bodyLines.length;
  const topFences = opens.filter((open) => open.line < firstHeadingLine);
  if (topFences.length === 0) {
    add('iron-law-missing', 'no fenced Iron Law before the first "## " section');
  } else if (topFences.length > 1) {
    add(
      'iron-law-multiple',
      `${topFences.length} fenced blocks before the first "## " section; exactly one Iron Law is allowed`,
      { line: topFences[1].line + 1 },
    );
  } else {
    const open = topFences[0];
    const closeLine = open.closeLine === null ? bodyLines.length : open.closeLine;
    const content = bodyLines.slice(open.line + 1, closeLine).join('\n');
    if (!isAllCaps(content)) {
      add('iron-law-not-caps', 'the fenced Iron Law must be one ALL-CAPS imperative', {
        line: open.line + 1,
      });
    }
  }

  // -- Section content -----------------------------------------------------
  const gotchas = found.find((section) => section.label === '## Gotchas');
  if (gotchas) {
    const bullets = sectionLines(gotchas).filter(
      (line, i) => !inCode[gotchas.start + i] && /^\s*[-*+]\s+\S/.test(line),
    ).length;
    if (bullets < LIMITS.gotchaEntries) {
      add(
        'gotchas-few',
        `"## Gotchas" has ${bullets} bullet entr${bullets === 1 ? 'y' : 'ies'}; ${LIMITS.gotchaEntries}+ expected`,
        { line: gotchas.line + 1 },
      );
    }
  }

  const rationalizations = found.find((section) => section.label === '## Rationalizations');
  if (rationalizations) {
    const rows = sectionLines(rationalizations).filter(
      (line, i) => !inCode[rationalizations.start + i] && /^\s*\|/.test(line),
    );
    if (rows.length < 3) {
      add(
        'rationalizations-table-missing',
        '"## Rationalizations" must contain a markdown table with at least one Excuse | Reality row',
        { line: rationalizations.line + 1 },
      );
    } else if (!rows.some((row) => /spirit over letter/i.test(row))) {
      add(
        'rationalizations-spirit-missing',
        'the rationalization table must include the "Spirit over letter" row',
        { line: rationalizations.line + 1 },
      );
    }
  }

  const limitations = found.find((section) => section.label === '## Limitations');
  if (limitations) {
    const flattened = sectionLines(limitations).join(' ').toLowerCase().replace(/\s+/g, ' ');
    const hits = LIMITATIONS_BOILERPLATE.filter((phrase) => flattened.includes(phrase));
    if (hits.length >= 2) {
      add(
        'limitations-boilerplate',
        `"## Limitations" reads as boilerplate (matched ${hits.length} filler phrases)`,
        { line: limitations.line + 1 },
      );
    }
  }

  // -- Links ---------------------------------------------------------------
  const referenceCache = new Map();

  const readReference = (absolutePath) => {
    if (!referenceCache.has(absolutePath)) {
      let content = null;
      try {
        content = normaliseText(readFileSync(absolutePath, 'utf8'));
      } catch {
        content = null;
      }
      referenceCache.set(absolutePath, content);
    }
    return referenceCache.get(absolutePath);
  };

  const nestedReported = new Set();

  bodyLines.forEach((rawLine, i) => {
    if (inCode[i]) return;
    for (const destination of extractLinks(stripInlineCode(rawLine))) {
      const localPath = toLocalPath(destination);
      if (!localPath) continue;

      const absolutePath = resolve(dir, localPath);
      if (!existsSync(absolutePath)) {
        add('link-unresolved', `link target does not exist: ${truncate(destination)}`, {
          line: i + 1,
        });
        continue;
      }

      if (!/\.(md|markdown)$/i.test(absolutePath)) continue;
      let isFile = false;
      try {
        isFile = statSync(absolutePath).isFile();
      } catch {
        isFile = false;
      }
      if (!isFile) continue;

      const reference = readReference(absolutePath);
      if (reference === null) continue;
      const referenceLines = reference.split('\n');
      const referenceFences = markFences(referenceLines);

      for (let j = 0; j < referenceLines.length; j += 1) {
        if (referenceFences.inCode[j]) continue;
        for (const nestedDestination of extractLinks(stripInlineCode(referenceLines[j]))) {
          const nestedLocal = toLocalPath(nestedDestination);
          if (!nestedLocal) continue;
          const key = `${absolutePath}::${nestedLocal}`;
          if (nestedReported.has(key)) continue;
          nestedReported.add(key);
          add(
            'nested-reference',
            `reference ${truncate(relativeTo(dir, absolutePath), 50)} links to another local file "${truncate(nestedLocal, 40)}"; references are one level deep`,
            { line: i + 1 },
          );
        }
      }
    }
  });

  // -- Absolute paths ------------------------------------------------------
  const absolutePatterns = [
    { label: '/Users/', re: /\/Users\// },
    { label: '/home/', re: /\/home\// },
    { label: 'a drive-letter path', re: /(?:^|[^A-Za-z0-9])[A-Za-z]:[\\/]/ },
  ];
  for (const pattern of absolutePatterns) {
    const lineIndex = bodyLines.findIndex((line) => pattern.re.test(line));
    if (lineIndex !== -1) {
      add(
        'absolute-path',
        `body contains ${pattern.label}: ${truncate(bodyLines[lineIndex], 50)}`,
        { line: lineIndex + 1 },
      );
    }
  }

  // -- Cross-skill + references/ resolution --------------------------------
  // A "use <skill>" route in a description and a `references/foo.md` mention in
  // the body are pointers — a pointer to nothing silently decays the library.
  if (frontmatter.kind === 'ok' && typeof frontmatter.data.description === 'string') {
    const description = frontmatter.data.description;
    const crossrefs = new Set();
    for (const match of description.matchAll(/\buse\s+`?([a-z0-9]+(?:-[a-z0-9]+)+)`?/g)) {
      crossrefs.add(match[1]);
    }
    for (const name of crossrefs) {
      if (!DISK_NAMES.has(name)) {
        add(
          'description-crossref-unresolved',
          `description routes "use ${name}" but no skills/*/${name}/SKILL.md exists`,
          { line: 1 },
        );
      }
    }
  }

  const refMentions = new Set();
  for (const match of bodyText.matchAll(/references\/[A-Za-z0-9_.-]+\.[A-Za-z0-9]+/g)) {
    refMentions.add(match[0]);
  }
  for (const mention of refMentions) {
    if (!existsSync(join(dir, mention))) {
      add('reference-mentioned-missing', `body cites ${mention} but the file does not exist`);
    }
  }

  // -- Evals ---------------------------------------------------------------
  validateEvals(dir, add);

  return findings;
}

function relativeTo(from, to) {
  return to.startsWith(`${from}/`) ? to.slice(from.length + 1) : to;
}

function validateFrontmatter(data, skillName, add) {
  const required = ['name', 'description', 'domain', 'risk', 'invocation'];

  for (const field of required) {
    const value = data[field];
    if (value === undefined) {
      add('field-missing', `frontmatter is missing required field "${field}"`, { line: 1 });
      continue;
    }
    if (typeof value !== 'string') {
      add('field-missing', `frontmatter field "${field}" must be a scalar string`, { line: 1 });
      continue;
    }
    if (value.trim() === '' && field !== 'description') {
      add('field-missing', `frontmatter field "${field}" must not be empty`, { line: 1 });
    }
  }

  const name = typeof data.name === 'string' ? data.name.trim() : null;
  if (name) {
    if (!NAME_RE.test(name)) {
      add('name-format', `name "${truncate(name)}" must match ^[a-z0-9]+(-[a-z0-9]+)*$`, {
        line: 1,
      });
    } else if (name.length > 64) {
      add('name-format', `name is ${name.length} chars, limit is 64`, { line: 1 });
    } else if (name !== skillName) {
      add('name-directory-mismatch', `name "${name}" must equal the directory name "${skillName}"`, {
        line: 1,
      });
    }
  }

  if (typeof data.domain === 'string' && !DOMAINS.includes(data.domain.trim())) {
    add('domain-invalid', `domain "${truncate(data.domain)}" is not one of: ${DOMAINS.join(', ')}`, {
      line: 1,
    });
  }
  if (typeof data.risk === 'string' && !RISKS.includes(data.risk.trim())) {
    add('risk-invalid', `risk "${truncate(data.risk)}" is not one of: ${RISKS.join(', ')}`, {
      line: 1,
    });
  }
  if (typeof data.invocation === 'string' && !INVOCATIONS.includes(data.invocation.trim())) {
    add(
      'invocation-invalid',
      `invocation "${truncate(data.invocation)}" is not one of: ${INVOCATIONS.join(', ')}`,
      { line: 1 },
    );
  }
  if (typeof data.invocation === 'string' && data.invocation.trim() === 'user') {
    const flag = data['disable-model-invocation'];
    if (String(flag).trim() !== 'true') {
      add(
        'user-invocation-unenforced',
        'invocation is "user" but frontmatter lacks `disable-model-invocation: true` — the bit that actually suppresses model invocation on Claude Code, Cursor and spec-conformant clients',
        { line: 1 },
      );
    }
  }
  if (typeof data.invocation === 'string' && data.invocation.trim() === 'model') {
    const flag = data['disable-model-invocation'];
    if (String(flag).trim() === 'true') {
      add(
        'model-invocation-suppressed',
        'invocation is "model" but `disable-model-invocation: true` is set — a description-matched skill that can never fire',
        { line: 1 },
      );
    }
  }


  // §6: the baseline failure is classified before a line is written, and the classification is
  // what picks the form. `metadata.form` is that record; `metadata.baseline` is the failure it
  // names. Both are presence-checked, because an unclassified skill cannot be reviewed against §6.
  const meta = data.metadata && typeof data.metadata === 'object' ? data.metadata : {};
  const form = typeof meta.form === 'string' ? meta.form.trim() : '';
  if (!form) {
    add('form-missing', 'metadata.form is absent — §6 requires the baseline failure be classified', {
      line: 1,
    });
  } else if (!FORMS.includes(form)) {
    add('form-invalid', `metadata.form "${truncate(form)}" is not one of: ${FORMS.join(', ')}`, {
      line: 1,
    });
  }
  const baseline = typeof meta.baseline === 'string' ? meta.baseline.trim() : '';
  if (!baseline) {
    add('baseline-missing', 'metadata.baseline is absent — name the failure the form answers', {
      line: 1,
    });
  }

  if (typeof data.description === 'string') {
    const description = data.description.trim();
    if (description.length < 1 || description.length > LIMITS.description) {
      add(
        'description-length',
        `description is ${description.length} chars, must be 1-${LIMITS.description}`,
        { line: 1 },
      );
    } else {
      if (FIRST_PERSON_RE.test(description)) {
        add(
          'description-first-person',
          'description opens in the first person; write it as a trigger specification',
          { line: 1 },
        );
      }
      const markers = WORKFLOW_MARKERS.filter(([, re]) => re.test(description)).map(
        ([label]) => label,
      );
      if (markers.length >= 2) {
        add(
          'description-workflow-summary',
          `description summarises a workflow (found: ${markers.join(', ')})`,
          { line: 1 },
        );
      }
    }
  }
}

function validateEvals(dir, add) {
  const triggersPath = join(dir, 'evals', 'triggers.yml');
  if (!existsSync(triggersPath)) {
    add('evals-triggers-missing', 'evals/triggers.yml is missing', {
      file: 'evals/triggers.yml',
    });
  } else {
    let triggers = '';
    try {
      triggers = normaliseText(readFileSync(triggersPath, 'utf8'));
    } catch (error) {
      add('read-error', `cannot read evals/triggers.yml: ${error.message}`, {
        file: 'evals/triggers.yml',
      });
      triggers = null;
    }

    if (triggers !== null) {
      const lines = triggers.split('\n');
      let labelled = lines.filter((line) => /^\s*-\s*(should|should_not)\s*:/.test(line)).length;

      if (labelled < LIMITS.triggers) {
        // Also accept the keyed shape:  should:\n  - "query"\nshould_not:\n  - "query"
        let inKeyedBlock = false;
        let keyed = 0;
        for (const line of lines) {
          if (/^\s*(should|should_not)\s*:\s*$/.test(line)) {
            inKeyedBlock = true;
            continue;
          }
          if (inKeyedBlock && /^\s*-\s+\S/.test(line)) {
            keyed += 1;
            continue;
          }
          if (line.trim() !== '' && !/^\s/.test(line)) inKeyedBlock = false;
        }
        labelled = Math.max(labelled, keyed);
      }

      if (labelled < LIMITS.triggers) {
        add(
          'evals-triggers-insufficient',
          `${labelled} labelled queries, need ${LIMITS.triggers}`,
          { file: 'evals/triggers.yml' },
        );
      }

      // §9: 60/40 train/validation, so the description is not overfit to its own test set.
      // Prose is not a split: a header that merely says "keep ~60/40" leaves every query as
      // training data. Two row-level forms are accepted, both of which survive inserting a
      // query: a trailing `# val` on the row, or a `# -- validation` section header whose
      // following rows are held out until the next section header.
      let inValidationSection = false;
      let splitRows = 0;
      let markedRows = 0;
      for (const line of lines) {
        if (/^\s*#\s*-*\s*(train|validation|val)\s*-{0,}\s*$/i.test(line)) {
          inValidationSection = /^\s*#\s*-*\s*(validation|val)\s*-{0,}\s*$/i.test(line);
          continue;
        }
        // A new top-level key starts a new list; a section header does not carry over.
        if (/^[A-Za-z_][\w-]*\s*:/.test(line)) {
          inValidationSection = false;
          continue;
        }
        if (!/^\s*-\s+\S/.test(line)) continue;
        splitRows += 1;
        if (inValidationSection || /#\s*val\b/i.test(line)) markedRows += 1;
      }
      if (splitRows > 0) {
        if (markedRows === 0) {
          add(
            'evals-triggers-no-split',
            `no row marked \`# val\` — all ${splitRows} queries are training data`,
            { file: 'evals/triggers.yml' },
          );
        } else {
          const share = markedRows / splitRows;
          if (share < LIMITS.splitMin || share > LIMITS.splitMax) {
            add(
              'evals-triggers-split-skewed',
              `${markedRows}/${splitRows} rows held out (${Math.round(share * 100)}%), want ${Math.round(LIMITS.splitMin * 100)}-${Math.round(LIMITS.splitMax * 100)}%`,
              { file: 'evals/triggers.yml' },
            );
          }
        }
      }
    }
  }

  const behaviourPath = join(dir, 'evals', 'behaviour.md');
  if (!existsSync(behaviourPath)) {
    add('evals-behaviour-missing', 'evals/behaviour.md is missing', {
      file: 'evals/behaviour.md',
    });
    return;
  }

  let behaviour;
  try {
    behaviour = normaliseText(readFileSync(behaviourPath, 'utf8'));
  } catch (error) {
    add('read-error', `cannot read evals/behaviour.md: ${error.message}`, {
      file: 'evals/behaviour.md',
    });
    return;
  }

  // Each case is a contract: Setup / Baseline / Required / Observable. A case
  // without the markers is a stub, not a case.
  const caseBlocks = behaviour.split(/^###\s+\S/m).slice(1);
  caseBlocks.forEach((block, i) => {
    const missing = ['**Setup', '**Baseline', '**Required', '**Observable'].filter(
      (marker) => !block.includes(marker),
    );
    if (missing.length > 0) {
      add('evals-behaviour-shape', `case ${i + 1} is missing ${missing.join(', ')}`, {
        file: 'evals/behaviour.md',
      });
    }
  });

  const cases = (behaviour.match(/^###\s+\S/gm) ?? []).length;
  if (cases < LIMITS.behaviourCases) {
    add('evals-behaviour-insufficient', `${cases} cases, need ${LIMITS.behaviourCases}`, {
      file: 'evals/behaviour.md',
    });
  }
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function discoverSkills(rootPath, out) {
  if (existsSync(join(rootPath, 'SKILL.md'))) {
    out.push(rootPath);
    return;
  }

  let entries;
  try {
    entries = readdirSync(rootPath, { withFileTypes: true });
  } catch {
    return;
  }

  entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules')
    .map((entry) => entry.name)
    .sort()
    .forEach((name) => discoverSkills(join(rootPath, name), out));
}

// Every `- skill: <id>` in packs/*.yml must resolve to a discovered skill dir.
// Packs are the repo's navigation layer; a dangling reference is silent decay.
function validatePacks(packsDir, skillNames) {
  const findings = [];
  if (!isDirectory(packsDir)) return findings;

  let files;
  try {
    files = readdirSync(packsDir).filter((name) => /\.ya?ml$/.test(name));
  } catch {
    return findings;
  }

  const referenced = new Set();
  const packSizes = new Map();
  for (const file of files.sort()) {
    const absolute = join(packsDir, file);
    let text;
    try {
      text = normaliseText(readFileSync(absolute, 'utf8'));
    } catch (error) {
      findings.push({
        severity: 'error',
        skill: basename(file, extname(file)),
        rule: 'read-error',
        message: `cannot read pack file: ${error.message}`,
        file: `packs/${file}`,
        line: null,
      });
      continue;
    }
    const packName = basename(file, extname(file));
    packSizes.set(packName, 0);
    text.split('\n').forEach((line, i) => {
      const match = /^\s*-\s+skill:\s*([a-z0-9-]+)\s*$/.exec(line);
      if (!match) return;
      referenced.add(match[1]);
      packSizes.set(packName, (packSizes.get(packName) ?? 0) + 1);
      if (!skillNames.has(match[1])) {
        findings.push({
          severity: RULE['pack-unresolved'].sev,
          skill: basename(file, extname(file)),
          rule: 'pack-unresolved',
          message: `pack references skill "${match[1]}" with no SKILL.md on disk`,
          file: `packs/${file}`,
          line: i + 1,
        });
      }
    });
  }

  for (const [packName, size] of packSizes) {
    if (size > LIMITS.packMax) {
      findings.push({
        severity: RULE['pack-oversized'].sev,
        skill: packName,
        rule: 'pack-oversized',
        message: `pack lists ${size} skills, limit ${LIMITS.packMax} — the navigation bound`,
        file: `packs/${packName}.yml`,
        line: null,
      });
    } else if (size > 0 && size < LIMITS.packMin) {
      findings.push({
        severity: RULE['pack-undersized'].sev,
        skill: packName,
        rule: 'pack-undersized',
        message: `pack lists ${size} skills, minimum ${LIMITS.packMin} — a todo list, not a pack`,
        file: `packs/${packName}.yml`,
        line: null,
      });
    }
  }

  // The inverse: a skill no pack names is invisible to the navigation layer.
  for (const name of [...skillNames].sort()) {
    if (!referenced.has(name)) {
      findings.push({
        severity: RULE['pack-orphan'].sev,
        skill: name,
        rule: 'pack-orphan',
        message: `skill "${name}" appears in no packs/*.yml — unreachable via navigation`,
        file: null,
        line: null,
      });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function helpText() {
  const rules = Object.entries(RULE)
    .map(([id, meta]) => `  ${meta.sev === 'warning' ? 'warn ' : 'error'}  ${id.padEnd(32)} ${meta.summary}`)
    .join('\n');

  return `Usage: node scripts/validate-skills.mjs [paths...] [--json] [--strict]

  paths     directories to scan for SKILL.md (default: skills/); scanned recursively
  --json    machine-readable output on stdout
  --strict  treat warnings as blocking

Output (default):  <error|warning> <skill> <rule> <message>
Summary:           N skills, M blocking, K warnings
Exit:              0 clean, 1 blocking findings, 2 usage error

Rules:
${rules}`;
}

function main(argv) {
  const args = argv.slice(2);
  const paths = [];
  let json = false;
  let strict = false;

  for (const arg of args) {
    if (arg === '--json') json = true;
    else if (arg === '--strict') strict = true;
    else if (arg === '-h' || arg === '--help') {
      process.stdout.write(`${helpText()}\n`);
      return 0;
    } else if (arg.startsWith('-')) {
      process.stderr.write(`unknown flag: ${arg}\n\n${helpText()}\n`);
      return 2;
    } else {
      paths.push(arg);
    }
  }

  if (paths.length === 0) paths.push('skills');

  const missing = paths.filter((path) => !existsSync(path));
  if (missing.length > 0) {
    process.stderr.write(`no such path: ${missing.join(', ')}\n`);
    return 2;
  }

  const skillDirs = [];
  for (const path of paths) {
    if (!isDirectory(path)) {
      process.stderr.write(`not a directory: ${path}\n`);
      return 2;
    }
    discoverSkills(path, skillDirs);
  }

  const findings = [];

  // Resolution universe = every SKILL.md under <cwd>/skills, not just the scanned
  // paths — a single-skill run still sees the real tree for packs and crossrefs.
  DISK_NAMES = new Set(skillDirs.map((dir) => basename(dir)));
  if (isDirectory('skills')) {
    const all = [];
    discoverSkills('skills', all);
    for (const dir of all) DISK_NAMES.add(basename(dir));
  }

  for (const dir of skillDirs) findings.push(...validateSkill(dir));
  findings.push(...validatePacks('packs', DISK_NAMES));

  if (strict) {
    for (const finding of findings) {
      if (finding.severity === 'warning') finding.severity = 'error';
    }
  }

  const blocking = findings.filter((finding) => finding.severity === 'error').length;
  const warnings = findings.length - blocking;

  if (json) {
    process.stdout.write(
      `${JSON.stringify({ skills: skillDirs.length, blocking, warnings, findings }, null, 2)}\n`,
    );
  } else {
    for (const finding of findings) {
      const location = finding.line === null ? '' : ` (${finding.file}:${finding.line})`;
      process.stdout.write(
        `${finding.severity} ${finding.skill} ${finding.rule} ${finding.message}${location}\n`,
      );
    }
    process.stdout.write(`${skillDirs.length} skills, ${blocking} blocking, ${warnings} warnings\n`);
  }

  return blocking > 0 ? 1 : 0;
}

process.exitCode = main(process.argv);
