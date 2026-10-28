'use strict';
/* Sweep 2026-10-28 22:05 (Scan by name + typed meals).
   1) The app's own low-spike swaps were rated as spikes. Scan's Best swap for pasta says "zucchini noodles or shirataki" and
      for rice "cauliflower rice", but typing those (EN/DE/ES) gave a spike: the word table (NAMES) read "nudeln"/"spaghetti"/
      "rice"/"reis"/"arroz" inside "Zucchininudeln", "espaguetis de calabacín", "cauliflower rice", "arroz de coliflor", and
      the typed-meal engine read "noodles" in "zucchini noodles" / "konjac noodles" as pasta (also when logging
      "Lachs mit Zucchininudeln"). Master Knowledge v3 (food rules) already said these are vegetables (JA).
   2) "Tortellini"/"Tortelloni" got the sweets reason ("Sweets or dessert with sugar") because the cake word "torte" sits
      inside them; "ravioli", "Maultaschen" and Spanish "tallarines" (tagliatelle) got no verdict at all. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const K = require('../food-knowledge-core.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const block = mark => { const a = html.lastIndexOf('<script>', html.indexOf(mark)) + 8; return html.slice(a, html.indexOf('</script>', a)); };
const ctx = {module: {exports: {}}, console};
vm.createContext(ctx);
vm.runInContext(block('/* LOWiSPIKE meal library v1.1') + '\n' + block('/* LOWiSPIKE v2 rules engine'), ctx);
const {analyseMeal} = ctx.module.exports;
const meal = q => { const a = analyseMeal(q, {trig: []}); return a.ok ? a.r : 'unknown'; };
function fnBody(sig) {
  const i = html.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
  let depth = 0;
  for (let k = html.indexOf('{', i); k < html.length; k++) {
    if (html[k] === '{') depth++; else if (html[k] === '}') { depth--; if (!depth) return html.slice(i, k + 1); }
  }
  throw new Error('unterminated ' + sig);
}
const nkeyLine = html.match(/const nkey = s => [^\n]+/)[0];
const names = html.slice(html.indexOf('const NAMES = ['), html.indexOf('\n];', html.indexOf('const NAMES = [')) + 3);
/* the real rateName with the real Master Knowledge layer, as in the app */
const rateName = new Function('window', nkeyLine + '\n' + names + '\n' + fnBody('function rateName(name){') + '\nreturn rateName;')({LowiFoodKnowledge: K});
const nameV = q => { const r = rateName(q); return r ? r.verdict : null; };
const nameWhy = q => { const r = rateName(q); return r ? r.why[0].join(':') : null; };

const SWAPS = ['zucchini noodles', 'Zucchininudeln', 'Zucchini-Nudeln', 'fideos de calabacín', 'espaguetis de calabacín', 'zoodles',
  'shirataki noodles', 'Shirataki-Nudeln', 'fideos shirataki', 'konjac noodles', 'Konjaknudeln', 'fideos de konjac',
  'cauliflower rice', 'Blumenkohlreis', 'arroz de coliflor', 'broccoli rice', 'Brokkolireis', 'arroz de brócoli'];

test('the app\'s own veg swaps are not rated as spikes by the word table', () => {
  /* "zoodles" has no word-table entry (the meal engine rates it); it must just never read as pasta */
  for (const q of SWAPS) assert.equal(nameV(q), q === 'zoodles' ? null : 'ok', q + ' -> ' + nameWhy(q));
});

test('the typed-meal engine reads veg swaps as vegetables, also inside a meal', () => {
  for (const q of SWAPS) assert.equal(meal(q), 'ja', q);
  assert.equal(meal('Lachs mit Zucchininudeln'), 'ja');
  assert.equal(meal('salmon with zucchini noodles'), 'ja');
  assert.equal(meal('pollo con arroz de coliflor'), 'ja');
});

test('real pasta and rice stay spikes, also next to a vegetable', () => {
  for (const q of ['spaghetti', 'Nudeln', 'espaguetis', 'rice', 'Reis', 'arroz', 'pasta with zucchini', 'Nudeln mit Zucchini', 'arroz con brócoli', 'rice noodles'])
    assert.equal(nameV(q), 'spike', q);
  for (const q of ['pasta with zucchini', 'Nudeln mit Zucchini', 'chicken and rice']) assert.equal(meal(q), 'nein', q);
});

test('filled pasta is pasta, not sweets, and Spanish tallarines count like tagliatelle', () => {
  for (const q of ['tortellini', 'Tortelloni', 'ravioli', 'raviolis', 'Maultaschen', 'tallarines']) {
    assert.equal(nameV(q), 'spike', q);
    assert.equal(nameWhy(q), 'fk:policy.starch_staple', q);
    const f = K.rateFood(q);
    assert.ok(f.rules.includes('policy.starch_staple') && !f.rules.includes('policy.candy_dessert'), q + ' ' + f.rules);
  }
  assert.equal(nameWhy('tagliatelle'), nameWhy('tallarines'));
  for (const q of ['Torte', 'Sachertorte', 'tarta']) assert.ok(K.rateFood(q).rules.includes('policy.candy_dessert'), q + ' stays a cake');
  for (const q of ['tortellini', 'Maultaschen', 'ravioli', 'tallarines']) assert.equal(meal(q), 'nein', q);
});
