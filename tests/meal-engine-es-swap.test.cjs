'use strict';
/* Oct 24 bug hunt: a food name typed in Spanish in Scan got a verdict but no "Best swap". The swap comes from the typed-meal
   engine (mealRead -> analyseMeal), which did not know palomitas, espaguetis, cruasán, batata or "barrita de proteína", so it
   returned nothing and the swap row was left out. Now each reads as its English word and gets the same swap as in English. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const block = mark => { const a = html.lastIndexOf('<script>', html.indexOf(mark)) + 8; return html.slice(a, html.indexOf('</script>', a)); };
const ctx = {module: {exports: {}}, console};
vm.createContext(ctx);
vm.runInContext(block('/* LOWiSPIKE meal library v1.1') + '\n' + block('/* LOWiSPIKE v2 rules engine'), ctx);
const {analyseMeal, parseMeal} = ctx.module.exports;
const read = t => { const a = analyseMeal(t, {trig: []}); return a.ok ? {r: a.r, swap: a.swap && a.swap.n} : null; };

test('Spanish food names get the same verdict and Best swap as their English words', () => {
  for (const [es, en] of [['barrita de proteína', 'protein bar'], ['Barritas de proteínas', 'protein bar'], ['barrita de cereales', 'cereal bar'],
    ['palomitas', 'popcorn'], ['espaguetis', 'spaghetti'], ['macarrones', 'macaroni'], ['cruasán', 'croissant'], ['batata', 'sweet potato'],
    ['boniato', 'sweet potato'], ['magdalenas', 'muffins'], ['gominolas', 'gummy bears']]) {
    const a = read(es), b = read(en);
    assert.ok(a, es + ' is read');
    assert.ok(b && b.swap, en + ' has a swap');
    assert.deepEqual(a, b, es);
  }
});

test('English, German and earlier Spanish reads do not change', () => {
  assert.equal(parseMeal('pan fried salmon').foods.some(f => f.food.id === 'bread'), false);
  assert.equal(read('pan con tomate').r, 'nein');
  assert.equal(read('cereales con leche').r, 'nein');
  assert.equal(read('Proteinriegel').r, read('protein bar').r);
  assert.equal(read('Süßkartoffel').swap, read('sweet potato').swap);
});
