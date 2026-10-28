'use strict';
/* Oct 25 sweep 06:02 (queued by the 03:01 bug hunt): typed in Scan or as a meal, Spanish "fruta deshidratada" (dried fruit) was
   rated Small portion as plain fruit, while "dried fruit" and "Trockenobst" are Skip it (sweet fruit, Master Knowledge v3).
   "frutas secas" and "orejones" got no verdict, and plain "judías" (beans) got none while "beans" / "Bohnen" are Small portion.
   Checks both layers: the food rules (LowiFoodKnowledge.rateFood) and the typed-meal engine (ES_PHRASE), which picks the swap. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const K = require('../food-knowledge-core.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const block = mark => { const a = html.lastIndexOf('<script>', html.indexOf(mark)) + 8; return html.slice(a, html.indexOf('</script>', a)); };
const ctx = {module: {exports: {}}, console};
vm.createContext(ctx);
vm.runInContext(block('/* LOWiSPIKE meal library v1.1') + '\n' + block('/* LOWiSPIKE v2 rules engine'), ctx);
const {analyseMeal} = ctx.module.exports;
const rule = q => { const f = K.rateFood(q); return f && f.verdict ? f.verdict : null; };
const meal = q => { const a = analyseMeal(q, {trig: []}); return a.ok ? a.lvl + '/' + a.r : 'unknown'; };

test('Spanish dried fruit gets the same verdict as dried fruit and Trockenobst', () => {
  assert.equal(rule('dried fruit'), 'NEIN');
  assert.equal(rule('Trockenobst'), 'NEIN');
  for (const es of ['fruta deshidratada', 'Frutas deshidratadas', 'fruta seca', 'frutas secas', 'orejones'])
    assert.equal(rule(es), 'NEIN', es);
  for (const es of ['fruta deshidratada', 'frutas secas', 'fruta seca', 'orejones'])
    assert.equal(meal(es), meal('dried fruit'), es);
});

test('plain fruit, nuts and fresh fruit keep their verdicts', () => {
  assert.equal(rule('fruta'), 'SELTEN');
  assert.equal(rule('naranja'), rule('orange'));
  assert.equal(meal('frutos secos'), meal('nuts'), 'frutos secos are nuts, not dried fruit');
  assert.notEqual(meal('frutos secos'), meal('dried fruit'));
});

test('judías are beans, judías verdes are green beans, in both layers', () => {
  for (const es of ['judías', 'judias', 'judía']) {
    assert.equal(rule(es), rule('beans'), es);
    assert.equal(meal(es), meal('beans'), es);
  }
  for (const es of ['judías verdes', 'judias verdes']) {
    assert.equal(rule(es), rule('green beans'), es);
    assert.equal(meal(es), meal('green beans'), es);
  }
  assert.equal(rule('judías verdes'), 'JA', 'green beans stay Everyday, the legume rule must not make them stricter');
});
