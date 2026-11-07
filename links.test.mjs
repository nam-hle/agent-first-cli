import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

// The template's links are written for a page copied into sections/<area>/, not for its own place.
const SKIPPED = new Set(['sections/template.md']);

const trackedMarkdown = () =>
  spawnSync('git', ['ls-files', '--', '*.md'], { cwd: ROOT, encoding: 'utf8' })
    .stdout.split('\n')
    .filter((file) => file && !SKIPPED.has(file));

// Code blocks and inline code hold example links that are not meant to resolve.
const stripFences = (text) => text.replace(/^(```|~~~)[\s\S]*?^\1/gm, '');
const stripCode = (text) => stripFences(text).replace(/`[^`\n]*`/g, '');

// GitHub's heading anchor: lowercase, drop punctuation, spaces to dashes, number duplicates.
const anchorsOf = (text) => {
  const seen = new Map();
  const anchors = new Set();
  for (const [, heading] of stripFences(text).matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const base = heading
      .toLowerCase()
      .replace(/[`*_[\]]|\]\([^)]*\)/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s/g, '-');
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  for (const [, id] of text.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) anchors.add(id);
  return anchors;
};

const linksOf = (text) =>
  [...stripCode(text).matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)].map((m) => m[1]);

test('every relative link and anchor in tracked markdown resolves', () => {
  const files = trackedMarkdown();
  assert.ok(files.length > 0, 'no tracked markdown found');
  const broken = [];
  for (const file of files) {
    const source = join(ROOT, file);
    for (const link of linksOf(readFileSync(source, 'utf8'))) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(link)) continue;
      const [path, anchor] = link.split('#');
      const target = path ? resolve(dirname(source), decodeURI(path)) : source;
      if (!existsSync(target)) {
        broken.push(`${file}: ${link} (no such file)`);
        continue;
      }
      if (!anchor || statSync(target).isDirectory() || !target.endsWith('.md')) continue;
      if (!anchorsOf(readFileSync(target, 'utf8')).has(decodeURIComponent(anchor))) {
        broken.push(`${file}: ${link} (no such heading)`);
      }
    }
  }
  assert.deepEqual(broken, []);
});
