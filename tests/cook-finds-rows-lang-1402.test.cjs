'use strict';
/* Code error sweep 24 Oct 14:02 (bug queue a2 from the 12:02 sweep): in Cook's category lists the featured and rebuild recipes
   showed one text node "sub · N finds" ("Breakfast without the granola · 6 finds", "Rebuild of Toast with Nutella · 7 finds").
   The page translator matches whole text nodes, so those rows stayed English in German and Spanish. The count now sits in its own
   span, and the translator knows "N finds" and "Rebuild of <meal>" (with the meal's own de/es name). */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const lines = html.split('\n');
const tStart = lines.findIndex(l => l.startsWith('const T = [') && lines.slice(Math.max(0, lines.indexOf(l) - 5), lines.indexOf(l)).some(x => /LANG_KEY = "lowispike\.lang"/.test(x)));
function block(from, head) { const i = lines.findIndex((l, k) => k >= from && l.startsWith(head)); let j = i; while (lines[j] !== '];') j++; return { src: lines.slice(i, j + 1).join('\n').replace(/^const \w+ = /, 'return '), end: j }; }
const T = block(tStart, 'const T = ['), Pb = block(T.end, 'const P = [');
const DICT = { de: {}, es: {} };
new Function(T.src)().forEach(r => { DICT.de[r[0]] = r[1]; DICT.es[r[0]] = r[2]; });
const meal = html.match(/\["Toast with Nutella", "([^"]+)", "([^"]+)"\]/);
if (meal) { DICT.de['Toast with Nutella'] = meal[1]; DICT.es['Toast with Nutella'] = meal[2]; }
const P = new Function('DICT', Pb.src)(DICT);
function tr(en, lang) {
  const key = en.trim(); if (!key) return null; let out = DICT[lang][key];
  if (out === undefined) { const col = lang === 'de' ? 1 : 2; for (const p of P) { if (p[0].test(key)) { out = key.replace(p[0], p[col]); break; } } }
  if (out === undefined) { const m = key.match(/^([·•–—|]\s*)(\S.*)$/); if (m) { const r = tr(m[2], lang); if (r !== null) out = m[1] + r; } }
  return out === undefined ? null : en.replace(key, out);
}

test('the finds count is its own text node, not glued to the recipe line', () => {
  assert.ok(!/esc\(r\.sub \|\| ""\) \+ " · " \+ n \+ " find"/.test(html), 'old glued row is gone');
  assert.match(html, /esc\(r\.sub \|\| ""\) \+ '<span class="sh-nf"> · ' \+ n \+ " find" \+ \(n === 1 \? "" : "s"\) \+ "<\/span>"/);
});

test('" · N finds" is translated', () => {
  assert.strictEqual(tr(' · 6 finds', 'de'), ' · 6 Funde');
  assert.strictEqual(tr(' · 6 finds', 'es'), ' · 6 hallazgos');
  assert.strictEqual(tr(' · 1 find', 'de'), ' · 1 Fund');
  assert.strictEqual(tr(' · 1 find', 'es'), ' · 1 hallazgo');
  assert.strictEqual(tr('15 finds', 'de'), '15 Funde');
});

test('the featured recipe lines have their own de/es rows', () => {
  for (const en of ['Grilled pepper halves instead of the bun', 'One pan, fifteen minutes', 'Crispy cheese, big salad', 'Breakfast without the granola']) {
    const m = html.match(new RegExp('\\["' + en + '",\\s*"([^"]+)",\\s*"([^"]+)"\\]'));
    assert.ok(m && m[1] !== en && m[2] !== en, 'row for ' + en);
    assert.ok(tr(en, 'de') === m[1] && tr(en, 'es') === m[2], 'translator finds ' + en);
  }
});

test('"Rebuild of <meal>" uses the meal name in the language', () => {
  assert.ok(meal, 'Toast with Nutella has a de/es row');
  assert.strictEqual(tr('Rebuild of Toast with Nutella', 'de'), 'Neu gebaut: ' + meal[1]);
  assert.strictEqual(tr('Rebuild of Toast with Nutella', 'es'), 'Rehecho: ' + meal[2]);
  assert.strictEqual(tr('Rebuild of Some Unknown Dish', 'de'), 'Neu gebaut: Some Unknown Dish');
});
