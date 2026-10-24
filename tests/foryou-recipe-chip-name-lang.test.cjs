'use strict';
/* Oct 24, 2026 bug hunt (19:02): in German and Spanish, the recipe chip under every For You post said "Rezept" / "Receta"
   but kept the recipe's English name ("Rezept · Zucchini Ribbon Beef Ragout"), right under a caption that already said
   "Zucchini-Bänder mit Rinder-Ragout". The For You pane is data-noi18n (people's posts stay as written), so the chip has to ask
   LowiLang for the name itself, the same way it already did for the word "Recipe".
   The browser check is tools/hunt-recname-lang-1902.cjs de|es. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function chipSource() {
  const i = html.indexOf('class="fyv-rec"');
  assert.ok(i > 0, 'For You recipe chip not found');
  const line = html.slice(html.lastIndexOf('\n', i), html.indexOf('\n', i));
  return line;
}

function renderChip(t) {
  const line = chipSource();
  const body = line.slice(line.indexOf('return'));
  const esc = s => String(s);
  const fn = new Function('r', 'img', 'esc', 'IC', 'window', 'LowiLang', body);
  const LowiLang = { t };
  return fn({ id: 'zrr', n: 'Zucchini Ribbon Beef Ragout' }, () => '', esc, { book: '' }, { LowiLang }, LowiLang);
}

test('the For You recipe chip shows the recipe name in the app language', () => {
  const DE = { 'Recipe': 'Rezept', 'Zucchini Ribbon Beef Ragout': 'Zucchini-Bänder mit Rinder-Ragout' };
  const out = renderChip(s => DE[s] || s);
  assert.match(out, /Rezept/);
  assert.match(out, /Zucchini-Bänder mit Rinder-Ragout/, 'chip still shows the English recipe name: ' + out);
  assert.doesNotMatch(out, /Zucchini Ribbon Beef Ragout/);
});

test('without a translation the chip keeps the name as it is', () => {
  const out = renderChip(s => s);
  assert.match(out, /Zucchini Ribbon Beef Ragout/);
});
