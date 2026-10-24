'use strict';
/* Code error sweep 24 Oct 12:02 (bug queue from the 11:02 hunt): 23 recipe lines in Cook ('Burger craving, rebuilt with nori
   instead of a bun.', ...) had no German or Spanish line, so they stayed English in de/es. Every Recipe Book blurb needs an
   [en, de, es] row that the translator can find. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function bookSubs() {
  const start = html.indexOf('const RECIPE_BOOK = [');
  assert.ok(start > 0, 'RECIPE_BOOK found');
  const end = html.indexOf('\n];', start);
  const body = html.slice(start, end);
  return [...body.matchAll(/sub:"((?:[^"\\]|\\.)*)"/g)].map(m => m[1]);
}
function rowOf(en) {
  const esc = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = html.match(new RegExp('\\["' + esc + '",\\s*"((?:[^"\\\\]|\\\\.)*)",\\s*"((?:[^"\\\\]|\\\\.)*)"\\]'));
  return m ? { de: m[1], es: m[2] } : null;
}

test('every Recipe Book line has a German and a Spanish row', () => {
  const subs = bookSubs();
  assert.ok(subs.length >= 30, 'found the recipe lines (' + subs.length + ')');
  const missing = subs.filter(s => !rowOf(s));
  assert.deepStrictEqual(missing, []);
});

test('the rows are real translations, not the English line copied', () => {
  for (const s of bookSubs()) {
    const r = rowOf(s); if (!r) continue;
    assert.ok(r.de && r.de !== s, 'de differs: ' + s);
    assert.ok(r.es && r.es !== s, 'es differs: ' + s);
    assert.ok(r.de !== r.es, 'de and es differ: ' + s);
  }
});

test('the ones the hunt named are in German and Spanish', () => {
  assert.deepStrictEqual(rowOf('Burger craving, rebuilt with nori instead of a bun.'), { de: 'Lust auf Burger, neu gebaut mit Nori statt Brötchen.', es: 'Antojo de hamburguesa, rehecho con nori en lugar de pan.' });
  assert.ok(rowOf('Creamy pasta craving without pasta.'));
  assert.ok(rowOf('Pizza craving, rebuilt inside sweet pepper halves.'));
});
