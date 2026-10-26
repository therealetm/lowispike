'use strict';
/* 26 Oct 2026 (Products Shuffle release check): WebKit on an iPhone 13 threw "null is not an object (evaluating 'nb.dataset')"
   on every Home paint once world-home.js's Today sheet (#whToday) had been taken off the page. The sheet holds Home's
   .sp-status (with the .sp-next button) and .sp-log, so spirit.js paint() found no .sp-next and threw, and the rest of
   the paint (log rows, habit dots, fast bubble, tiles, colours) never ran again. paint() must survive missing pieces and
   ensure() must put fresh ones back so world-home wraps them into a new sheet.
   These tests read the source and run on GitHub's checks. The WebKit repro is tests/spirit-paint-missing-today-live.cjs
   (node --test tests/spirit-paint-missing-today-live.cjs, LIVE_URL=https://therealetm.github.io/lowispike/ for the live site). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'spirit.js'), 'utf8');

function body(name) {
  const i = SRC.indexOf('function ' + name + '() {'); assert.ok(i >= 0, name + '() exists');
  let d = 0, j = SRC.indexOf('{', i);
  for (let k = j; k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}' && --d === 0) return SRC.slice(j, k + 1); }
  throw new Error('unbalanced ' + name);
}

test('spirit.js paint(): never reads .dataset / innerHTML of a Home node it did not check', () => {
  const p = body('paint');
  assert.ok(!/\bnb\.dataset\.sp\s*!==/.test(p.replace(/if \(nb\) \{?\s*if \(nb\.dataset/g, '')), 'paint() reads nb.dataset without checking nb');
  for (const v of ['nb', 'lr', 'dots']) assert.match(p, new RegExp('if \\(' + v + '\\)|' + v + ' &&'), 'paint() checks ' + v + ' before using it');
});

test('spirit.js ensure(): puts back Home\'s Today pieces (.sp-status, .sp-log) when they are gone', () => {
  const e = body('ensure');
  assert.match(e, /querySelector\('\.sp-status'\)/, 'ensure() looks for .sp-status');
  assert.match(e, /querySelector\('\.sp-log'\)/, 'ensure() looks for .sp-log');
});
