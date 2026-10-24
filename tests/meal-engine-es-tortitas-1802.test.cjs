'use strict';
/* Oct 24 code error sweep 18:02 (bug queue from the 16:02 sweep): Spanish "tortitas" (pancakes) typed in Scan got no verdict
   and no Best swap, because the typed-meal engine did not know the word; "gofres" (waffles) neither. "tortitas de arroz" (rice
   cakes) was read as a rice dish and got the curry-with-naan swap. Now each reads as its English word and gets the same
   verdict and swap as in English. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const block = mark => { const a = html.lastIndexOf('<script>', html.indexOf(mark)) + 8; return html.slice(a, html.indexOf('</script>', a)); };
const ctx = {module: {exports: {}}, console};
vm.createContext(ctx);
vm.runInContext(block('/* LOWiSPIKE meal library v1.1') + '\n' + block('/* LOWiSPIKE v2 rules engine'), ctx);
const {analyseMeal} = ctx.module.exports;
const read = t => { const a = analyseMeal(t, {trig: []}); return a.ok ? {r: a.r, swap: a.swap && a.swap.n} : null; };

test('tortitas, gofres and tortitas de arroz get the same verdict and Best swap as in English', () => {
  for (const [es, en] of [['tortitas', 'pancakes'], ['Tortita', 'pancake'], ['gofres', 'waffles'], ['tortitas con miel', 'pancakes with honey'],
    ['tortitas de arroz', 'rice cakes'], ['Tortitas de maíz', 'corn cakes']]) {
    const a = read(es), b = read(en);
    assert.ok(a, es + ' is read');
    assert.ok(b && b.swap, en + ' has a swap');
    assert.deepEqual(a, b, es);
  }
});

test('other Spanish reads do not change', () => {
  assert.equal(read('arroz con pollo').swap, read('chicken with rice').swap);
  assert.equal(read('palomitas').swap, read('popcorn').swap);
  assert.equal(read('pan con tomate').r, 'nein');
});
