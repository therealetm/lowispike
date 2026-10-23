'use strict';
/* Bloom labels (Oct 24 2026, Lisa via Emmanuel: "Flasch" on one line, "e" on the next).
   The orb labels may wrap only between words. A single word that is too wide for its orb shrinks instead, never below 10px.
   Browser check at 390x844: tests/bloom-labels-live.cjs. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const core = require('../home-blooms-v2.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'home-blooms-v2.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'home-blooms-v2.css'), 'utf8');

function labelRule() {
  const m = css.match(/\.hb2-tx b\s*\{([^}]*)\}/);
  assert.ok(m, '.hb2-tx b rule exists');
  return m[1];
}

test('orb labels never break inside a word (no overflow-wrap:anywhere, no break-all)', () => {
  const r = labelRule();
  assert.doesNotMatch(r, /overflow-wrap\s*:\s*anywhere/, 'overflow-wrap:anywhere splits "Flasche" into "Flasch" + "e"');
  assert.doesNotMatch(r, /word-break\s*:\s*break-all/);
  assert.doesNotMatch(r, /hyphens\s*:\s*auto/, 'no automatic hyphenation either');
  assert.match(r, /overflow-wrap\s*:\s*normal/);
  assert.match(r, /word-break\s*:\s*normal/);
});

test('labelSize keeps the base size when the longest word fits', () => {
  assert.strictEqual(core.labelSize(40, 50), 12.5);
  assert.strictEqual(core.labelSize(50, 50), 12.5);
});

test('labelSize shrinks a word that is too wide, in proportion, never below 10px', () => {
  const s = core.labelSize(55, 50);
  assert.ok(s < 12.5 && s >= 10, 'shrinks: ' + s);
  assert.ok(55 * s / 12.5 <= 50 + 0.01, 'the word then fits: ' + s);
  assert.strictEqual(core.labelSize(200, 50), 10, 'floor is 10px');
});

test('labelSize is safe with missing or zero sizes', () => {
  assert.strictEqual(core.labelSize(0, 50), 12.5);
  assert.strictEqual(core.labelSize(40, 0), 12.5);
  assert.strictEqual(core.labelSize(NaN, NaN), 12.5);
  assert.strictEqual(core.labelSize(60, 50, 14, 11), Math.max(11, Math.floor(14 * 50 / 60 * 2) / 2));
});

test('both bloom paths fit their labels after the orbs are in the page', () => {
  const appends = src.split('D.body.appendChild(ov);').length - 1;
  assert.ok(appends >= 2, 'one bloom and the all-bubbles bloom');
  const fits = (src.match(/D\.body\.appendChild\(ov\);\s*(?:try \{ )?fitLabels\(ov\)/g) || []).length;
  assert.strictEqual(fits, appends, 'fitLabels(ov) runs right after every append');
  assert.match(src, /function fitLabels\(ov\)/);
});
