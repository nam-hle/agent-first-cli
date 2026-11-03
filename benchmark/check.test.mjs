import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import {
  CATEGORIES,
  parsePage,
  checkPage,
  checkPartition,
  categoryScore,
  checkTotals
} from './check.mjs';

const CHECK = fileURLToPath(new URL('./check.mjs', import.meta.url));
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const scoreBlock =(max) => {
  const half = Math.ceil(max / 2);
  const lines = ['### How to score', '', '- **0:** nothing.'];
  if (max > 1) lines.push(`- **About half (${half}):** some.`);
  lines.push(`- **Maximum (${max}):** all.`);
  lines.push('- **Not applicable when:** no input.', '- **Evidence:** run `acme list`.');
  return lines.join('\n');
};

const pageText = (id, category, max, extra = '') =>
  `---\nid: ${id}\ncategory: ${category}\nmax: ${max}\n---\n\n# ${id}\n\n` +
  `${scoreBlock(max)}\n${extra}`;

const page = (id, category, max, extra = '') =>
  parsePage(`sections/x/${id}.md`, pageText(id, category, max, extra));

test('parsePage reads id, category, max and the How to score block', () => {
  const parsed = parsePage('sections/output/x.md', pageText('x', 'Output', 5));
  assert.equal(parsed.id, 'x');
  assert.equal(parsed.category, 'Output');
  assert.equal(parsed.max, 5);
  assert.notEqual(parsed.howToScore, null);
  assert.equal(parsed.gate, false);
});

test('checkPage requires the three anchors', () => {
  const missingHalf = parsePage(
    'sections/output/x.md',
    pageText('x', 'Output', 5).replace('- **About half (3):** some.\n', '')
  );
  assert.ok(checkPage(missingHalf).some((p) => p.includes('About half (3)')));

  assert.deepEqual(checkPage(page('y', 'Output', 1)), []);
  assert.deepEqual(checkPage(page('z', 'Output', 5)), []);

  const wrongMax = parsePage(
    'sections/output/x.md',
    pageText('x', 'Output', 5).replace('Maximum (5)', 'Maximum (4)')
  );
  assert.ok(checkPage(wrongMax).some((p) => p.includes('Maximum (5)')));
});

test('checkPage rejects a max outside 1, 2, 3, 5, 8', () => {
  const bad = parsePage('sections/output/x.md', pageText('x', 'Output', 4));
  assert.ok(checkPage(bad).some((p) => p.includes('max')));
});

test('gate practices must carry a Gate line', () => {
  const gates = {
    'no-yes-or-force': 'Effects',
    'no-secrets-in-flags': 'Input',
    'sanitise-service-text': 'Output'
  };
  for (const [id, category] of Object.entries(gates)) {
    assert.ok(checkPage(page(id, category, 5)).some((p) => p.includes('Gate')), id);
    const gated = page(id, category, 5, '- **Gate:** caps at half.\n');
    assert.deepEqual(checkPage(gated), []);
  }
  assert.deepEqual(checkPage(page('other', 'Output', 5, '- **Gate:** extra.\n')), []);
});

test('partition fails on duplicate or missing practice', () => {
  const dup = checkPartition([page('a', 'Output', 5), page('a', 'Input', 5)]);
  assert.ok(dup.some((p) => p.includes('duplicate')));
  const unknown = checkPartition([page('b', 'Nonsense', 5)]);
  assert.ok(unknown.some((p) => p.includes('Nonsense')));
  assert.deepEqual(checkPartition([page('a', 'Output', 5), page('b', 'Input', 5)]), []);
});

test('category totals must match the entry page table', () => {
  const pages = [
    page('a', 'Command surface', 8),
    page('b', 'Command surface', 5),
    page('c', 'Command surface', 5)
  ];
  const table = (n) =>
    `| Category | Practices | Possible |\n| --- | --- | --- |\n| Command surface | 3 | ${n} |\n`;
  assert.ok(checkTotals(pages, table(19)).some((p) => p.includes('Command surface')));
  assert.deepEqual(checkTotals(pages, table(18)), []);
});

test('categoryScore returns null with nothing possible or mostly N/A', () => {
  assert.equal(categoryScore(0, 0, 0), null);
  assert.equal(categoryScore(5, 10, 0.6), null);
  assert.equal(categoryScore(11, 18, 0), 61);
});

const runCheck = (...args) =>
  spawnSync(process.execPath, [CHECK, '--root', ROOT, ...args], { encoding: 'utf8' });

test('--category rejects an unknown or missing value', () => {
  const unknown = runCheck('--category', 'Nonsense');
  assert.equal(unknown.status, 1);
  assert.match(unknown.stdout, /unknown category "Nonsense"/);
  const missing = runCheck('--category');
  assert.equal(missing.status, 1);
  assert.match(missing.stdout, /--category needs a value/);
});

const EXPECTED_TOTALS = {
  'Command surface': 18,
  Input: 30,
  Output: 37,
  Errors: 29,
  Effects: 38,
  Discoverability: 17,
  Maintainability: 18
};

test('there are seven categories with the expected totals across the real pages', () => {
  assert.equal(CATEGORIES.length, 7);
  assert.deepEqual([...CATEGORIES].sort(), Object.keys(EXPECTED_TOTALS).sort());
  const pages = [];
  for (const dir of readdirSync(join(ROOT, 'sections'), { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const file of readdirSync(join(ROOT, 'sections', dir.name))) {
      const path = join(ROOT, 'sections', dir.name, file);
      pages.push(parsePage(path, readFileSync(path, 'utf8')));
    }
  }
  assert.equal(pages.length, 47);
  const totals = Object.fromEntries(CATEGORIES.map((name) => [name, 0]));
  for (const p of pages) {
    assert.ok(CATEGORIES.includes(p.category), `${p.id}: ${p.category}`);
    totals[p.category] += p.max;
  }
  assert.deepEqual(totals, EXPECTED_TOTALS);
});

test('--category accepts each of the seven valid names', () => {
  for (const name of CATEGORIES) {
    const result = runCheck('--category', name);
    assert.equal(result.status, 0, `${name}: ${result.stdout}`);
  }
});
