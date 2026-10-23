'use strict';
/* Bug hunt 23 Oct 2026: in German and Spanish the Shuffle "Your pick" card and the Swipe deck card showed the kind and time
   in English ("Sweet · 5 min + chill", "Drink · 5 min"), and the recipe sheet said "about 5 min + chill".
   The page translator only matches whole text nodes, so the card meta now puts each part in its own span, and the
   translator knows the kinds and the "+ chill / + freeze / about" times. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const lines = html.split('\n');
const tStart = lines.findIndex(l => l.startsWith('const T = [') && lines.slice(Math.max(0, lines.indexOf(l) - 5), lines.indexOf(l)).some(x => /LANG_KEY = "lowispike\.lang"/.test(x)));
function block(from, head) { const i = lines.findIndex((l, k) => k >= from && l.startsWith(head)); let j = i; while (lines[j] !== '];') j++; return { src: lines.slice(i, j + 1).join('\n').replace(/^const \w+ = /, 'return '), end: j }; }
const T = block(tStart, 'const T = ['), Pb = block(T.end, 'const P = [');
const rows = new Function(T.src)(), P = new Function(Pb.src)();
const DICT = { de: {}, es: {} }; rows.forEach(r => { DICT.de[r[0]] = r[1]; DICT.es[r[0]] = r[2]; });
function tr(en, lang) { const key = en.trim(); let out = DICT[lang][key]; if (out === undefined) { const col = lang === 'de' ? 1 : 2; for (const p of P) { if (p[0].test(key)) { out = key.replace(p[0], p[col]); break; } } } return out === undefined ? null : en.replace(key, out); }

test('the four kinds are translated', () => {
  assert.deepStrictEqual(['Meal', 'Snack', 'Sweet', 'Drink'].map(k => tr(k, 'de')), ['Mahlzeit', 'Snack', 'Süß', 'Getränk']);
  assert.deepStrictEqual(['Meal', 'Snack', 'Sweet', 'Drink'].map(k => tr(k, 'es')), ['Comida', 'Tentempié', 'Dulce', 'Bebida']);
});
test('chill / freeze / about times are translated', () => {
  assert.strictEqual(tr('5 min + chill', 'de'), '5 min + kalt stellen');
  assert.strictEqual(tr('5 min + chill', 'es'), '5 min + enfriar');
  assert.strictEqual(tr('10 min + freeze', 'de'), '10 min + einfrieren');
  assert.strictEqual(tr('15 min + 30 min chill', 'es'), '15 min + 30 min de frío');
  assert.strictEqual(tr('about 5 min + chill', 'de'), 'ca. 5 min + kalt stellen');
  assert.strictEqual(tr('about 20 min', 'es'), 'unos 20 min');
});
test('From <name> is translated, sentences starting with From are left alone', () => {
  assert.strictEqual(tr('From Anna', 'de'), 'Von Anna');
  assert.strictEqual(tr('From Anna K.', 'es'), 'De Anna K.');
  assert.strictEqual(tr('From profile', 'de'), null);
  assert.strictEqual(tr('From Open Food Facts', 'de'), null);
});
test('the pick card and the deck card put kind and time in separate spans', () => {
  assert.match(html, /function fMetaHTML\(f\)\{[^\n]*\n[^\n]*map\(x => "<span>" \+ esc\(x\) \+ "<\/span>"\)\.join\(" · "\)/);
  assert.ok(!/esc\(fMeta\(f\)\)/.test(html), 'no card renders the joined meta as one text node');
  assert.strictEqual((html.match(/fMetaHTML\(f\)/g) || []).length, 3, 'definition + pick card + deck card');
});
