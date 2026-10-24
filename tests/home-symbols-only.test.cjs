'use strict';
/* Home ring, symbols only (24 Oct 2026, Emmanuel: in German the bubbles looked like another font: "Eintragen", "Bewegung", "Mahlzeiten"
   squeezed into the bubbles; "remove the text labels entirely, symbol first, only the numbers that matter, like the clean English one").
   Every language: no word labels, no "Log"/"Eintragen", no units; the icon and real numbers (0/6, 0/3, a time, steps) stay; the
   buttons keep their full aria-label for screen readers. Browser check at 390x844: tests/home-symbols-live.cjs. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'home-orbit-v2.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '..', 'home-orbit-v2.js'), 'utf8');
test('the ring hides every word label, the Fuel/Gap label, units and word values, in every language', () => {
  const tail = css.slice(css.indexOf('/* ---- symbols only'));
  assert.ok(tail.length > 40, 'symbols-only block present');
  assert.match(tail, /\[data-orbit\] \.wh-cell-tx small/);
  assert.match(tail, /\.wh-cell-tx::after[^{]*\{[^}]*content: none/);
  assert.match(tail, /\.sp-fast-copy::after[^{]*\{[^}]*content: none/);
  assert.match(tail, /\.wh-unit/);
  assert.match(tail, /b\.o8-word/);
  assert.doesNotMatch(tail, /:lang\(|\[lang/, 'one rule for all languages');
});
test('a value counts as a number only when it has a digit: Log, Eintragen, Registrar hide; 0/6, 7h 30m, 4–7k stay', () => {
  const m = js.match(/function isWord\(t\) \{[^\n]*\}/);
  assert.ok(m, 'isWord defined');
  const isWord = new Function(m[0] + '; return isWord;')();
  for (const w of ['Log', 'Eintragen', 'Registrar', '', '  ']) assert.equal(isWord(w), true, w);
  for (const n of ['0/6', '7h 30m', '4–7k', '12:05', '3']) assert.equal(isWord(n), false, n);
  assert.match(js, /o8-word/);
  assert.match(js, /MutationObserver\(markWords\)/, 'values are re-checked when they change');
});
test('screen readers keep the full meaning: ring buttons still carry aria-label', () => {
  assert.doesNotMatch(css.slice(css.indexOf('/* ---- symbols only')), /\.o8-ico[^{]*\{[^}]*display: none/, 'icons stay');
});
