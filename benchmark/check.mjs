import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { basename, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CATEGORIES = [
  'Command surface',
  'Input',
  'Output',
  'Errors and guidance',
  'Writes',
  'Discoverable and evolving'
];
const ALLOWED_MAX = [1, 2, 3, 5, 8];
const GATE_IDS = ['no-yes-or-force', 'no-secrets-in-flags', 'sanitise-service-text'];

function parseFrontMatter(text) {
  const lines = text.split('\n');
  const fields = {};
  if (lines[0]?.trim() !== '---') return fields;
  for (const line of lines.slice(1)) {
    if (line.trim() === '---') break;
    const at = line.indexOf(':');
    if (at > 0) fields[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return fields;
}

function extractHowToScore(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trim() === '### How to score');
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^#{1,3} /.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

export function parsePage(path, text) {
  const fields = parseFrontMatter(text);
  const max = fields.max === undefined ? null : Number(fields.max);
  const howToScore = extractHowToScore(text);
  return {
    id: basename(path, '.md'),
    category: fields.category ?? null,
    max: Number.isNaN(max) ? null : max,
    howToScore,
    gate: howToScore !== null && /^- \*\*Gate:\*\*/m.test(howToScore)
  };
}

export function checkPage(page) {
  const problems = [];
  const fail = (message) => problems.push(`${page.id}: ${message}`);
  if (!ALLOWED_MAX.includes(page.max)) {
    fail(`max must be one of ${ALLOWED_MAX.join(', ')}, got ${page.max}`);
  }
  if (page.howToScore === null) {
    fail('missing "### How to score" section');
    return problems;
  }
  const has = (label) => page.howToScore.includes(label);
  const anchors = ['- **0:**'];
  if (ALLOWED_MAX.includes(page.max)) {
    if (page.max > 1) anchors.push(`- **About half (${Math.ceil(page.max / 2)}):**`);
    anchors.push(`- **Maximum (${page.max}):**`);
  }
  anchors.push('- **Not applicable when:**', '- **Evidence:**');
  for (const anchor of anchors) {
    if (!has(anchor)) fail(`missing "${anchor}"`);
  }
  if (GATE_IDS.includes(page.id) && !page.gate) fail('missing "- **Gate:**" line');
  return problems;
}

export function checkPartition(pages) {
  const problems = [];
  const seen = new Set();
  for (const page of pages) {
    if (seen.has(page.id)) problems.push(`${page.id}: duplicate practice id`);
    seen.add(page.id);
    if (!CATEGORIES.includes(page.category)) {
      problems.push(`${page.id}: unknown category "${page.category}"`);
    }
  }
  return problems;
}

export function categoryScore(earned, possible, naShare) {
  if (possible === 0 || naShare > 0.5) return null;
  return Math.round((earned / possible) * 100);
}

function parsePossibleTable(entryText) {
  const rows = entryText
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map((line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const header = rows.find((cells) => cells.includes('Possible'));
  const column = header ? header.indexOf('Possible') : -1;
  const possible = new Map();
  if (column === -1) return possible;
  for (const cells of rows) {
    if (CATEGORIES.includes(cells[0])) possible.set(cells[0], Number(cells[column]));
  }
  return possible;
}

export function checkTotals(pages, entryText) {
  const problems = [];
  const table = parsePossibleTable(entryText);
  for (const category of CATEGORIES) {
    const sum = pages
      .filter((page) => page.category === category)
      .reduce((total, page) => total + (page.max ?? 0), 0);
    const hasPages = pages.some((page) => page.category === category);
    if (!hasPages && !table.has(category)) continue;
    if (!table.has(category)) {
      problems.push(`${category}: no row with a Possible column in the entry page table`);
    } else if (table.get(category) !== sum) {
      problems.push(`${category}: pages sum to ${sum}, table says ${table.get(category)}`);
    }
  }
  return problems;
}

function readPages(root) {
  const sectionsDir = join(root, 'sections');
  const pages = [];
  for (const dir of readdirSync(sectionsDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const file of readdirSync(join(sectionsDir, dir.name))) {
      if (!file.endsWith('.md') || file === 'template.md') continue;
      const path = join(sectionsDir, dir.name, file);
      pages.push(parsePage(path, readFileSync(path, 'utf8')));
    }
  }
  return pages;
}

function main(argv) {
  const option = (name) => {
    const at = argv.indexOf(name);
    return at === -1 ? null : argv[at + 1];
  };
  const root = resolve(option('--root') ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
  const category = option('--category');
  const categoryGiven = argv.includes('--category');
  if (categoryGiven && (!category || category.startsWith('--'))) {
    console.log('--category needs a value');
    return 1;
  }
  if (category && !CATEGORIES.includes(category)) {
    console.log(`unknown category "${category}"; expected one of: ${CATEGORIES.join(', ')}`);
    return 1;
  }
  const pages = readPages(root);
  const scoped = category ? pages.filter((page) => page.category === category) : pages;
  const problems = scoped.flatMap(checkPage);
  if (!category) {
    problems.push(...checkPartition(pages));
    const entry = join(root, 'benchmark', 'README.md');
    if (existsSync(entry)) {
      problems.push(...checkTotals(pages, readFileSync(entry, 'utf8')));
    } else {
      problems.push('benchmark/README.md not found');
    }
  }
  console.log(problems.length === 0 ? 'ok' : problems.join('\n'));
  return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
