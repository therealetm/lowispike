'use strict';
/* Oct 24 sweep: the Best swap in Scan links a Recipe Book recipe when the swap names none. It took the first recipe that
   shared any 5+ letter word with the swap line, so popcorn ('Cucumber and pepper sticks & a palm of protein') linked
   Frischkäse Pepper Pizza Boats, fries ('Parmesan zucchini fries') the Zucchini Turkey Burger Melt and granola
   ('Greek yogurt with a nut-and-seed crunch') the Konjak Sushi Crunch Bowl, in every language. Now it needs at least two
   shared words and takes the recipe that shares the most. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const block = mark => { const a = html.lastIndexOf('<script>', html.indexOf(mark)) + 8; return html.slice(a, html.indexOf('</script>', a)); };
const eng = {module: {exports: {}}, console};
vm.createContext(eng);
vm.runInContext(block('/* LOWiSPIKE meal library v1.1') + '\n' + block('/* LOWiSPIKE v2 rules engine'), eng);
const {analyseMeal} = eng.module.exports;

// RECIPE_BOOK as the page has it (its notes use page constants; any text will do here)
const a = html.indexOf('const RECIPE_BOOK = ['), b = html.indexOf('\n];', a);
const src = html.slice(a + 'const RECIPE_BOOK = '.length, b + 2), g = {W: {full: ''}};
let RECIPE_BOOK;
for (let i = 0; i < 50 && !RECIPE_BOOK; i++) { try { RECIPE_BOOK = vm.runInNewContext(src, g); } catch (e) { const m = /(\w+) is not defined/.exec(e.message); if (!m) throw e; g[m[1]] = ''; } }

const fn = html.slice(html.indexOf('function nameSwap(p){'), html.indexOf('\nfunction nameSwapHTML'));
const ctx = {RECIPE_BOOK, D: {comm: {}}, CAT_E: {}, pkey: x => x.name, norm: s => String(s).toLowerCase().trim(),
  mealRead: q => { const m = analyseMeal(String(q), {trig: []}); return m && m.ok ? m : null; }};
vm.createContext(ctx);
vm.runInContext(fn + ';this.nameSwap=nameSwap;', ctx);
const pick = name => { const s = ctx.nameSwap({name, verdict: 'spike'}); return s && s.rb ? s.rb.n : null; };

test('a swap that shares one word with a recipe links no recipe', () => {
  assert.equal(pick('popcorn'), null, 'popcorn: not Pepper Pizza Boats');
  assert.equal(pick('nachos'), null);
  assert.equal(pick('fries'), null, 'fries: not the Turkey Burger Melt');
  assert.equal(pick('granola'), null, 'granola: not the Sushi Crunch Bowl');
  assert.equal(pick('lasagne') === 'Zucchini Turkey Burger Melt', false);
  assert.equal(pick('nutella'), null, 'breakfast board: not the Turkey Burger Melt');
});

test('a swap built on a recipe still links it, and named recipes stay', () => {
  assert.equal(pick('pancakes'), 'Cottage Cheese Pancake Bites');
  assert.equal(pick('rice cakes'), 'Smoked Salmon Cucumber Bites');
  assert.equal(pick('grapes'), 'Frozen Yogurt Berry Bark');
  assert.equal(pick('pizza'), 'Frischkäse Pepper Pizza Boats');
  assert.equal(pick('burger'), 'Nori Smash Burger Stack');
  assert.equal(pick('spaghetti'), 'Zucchini Ribbon Beef Ragout');
});
