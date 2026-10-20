'use strict';
/* Oct 20 2026 food audit (journey E, simulated iPhone, mocked Open Food Facts answer for a milk chocolate): the scan card said
   "Liquid sugar, 56 g per 100 ml: it reaches the blood fastest". catOf()'s drink test matched "cola" inside choCOLAte and
   "water" inside WATERmelon, so every chocolate (OFF tag en:chocolates) and every watermelon was a drink, and a drink with
   more than 5 g sugar is a spike: 85 % dark chocolate (14 g sugar) and fresh watermelon (6 g) were "Likely spikes". */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const S = require('../spike-core.js');
// the real catOf and nkey from index.html
const nk = html.match(/^const nkey = .*$/m)[0];
const a = html.indexOf('function catOf('), b = html.indexOf('\n}', a) + 2;
const src = html.slice(a, b);
const catOf = new Function(nk + '\n' + src + '\nreturn catOf;')();

test('chocolate and watermelon are not drinks', () => {
    assert.equal(catOf(['en:snacks', 'en:sweet-snacks', 'en:cocoa-and-its-products', 'en:chocolates', 'en:dark-chocolates'], 'Excellence 85% Cocoa'), 'sweets');
    assert.equal(catOf([], 'Milk chocolate'), 'sweets');
    assert.equal(catOf(['en:plant-based-foods', 'en:fruits', 'en:watermelons'], 'Wassermelone'), 'other');
    assert.notEqual(catOf([], 'Watermelon'), 'drink');
});

test('real drinks stay drinks', () => {
    for (const [tags, name] of [[['en:beverages', 'en:sodas', 'en:colas'], 'Coca-Cola'], [[], 'Coca Cola Zero'], [['en:waters', 'en:mineral-waters'], 'Gerolsteiner'], [[], 'Sparkling water'], [[], 'Orangensaft juice'], [[], 'Zitronen Limonade'], [['en:coconut-water'], 'Coconut water'], [[], 'Cold brew coffee'], [['en:sodas'], 'Fanta']]) assert.equal(catOf(tags, name), 'drink', name);
});

test('85 % dark chocolate from Open Food Facts is not a liquid-sugar spike any more', () => {
    const p = { cat: catOf(['en:chocolates', 'en:dark-chocolates'], 'Dark chocolate 85%'), facts: { c: 19, s: 14, f: 12, p: 10, fat: 46 }, ingredients: 'Kakaomasse, Kakaobutter, Zucker' };
    const r = S.assess(p);
    assert.ok(!r.why.some(w => w[0] === 's_liquid'), 'no "Liquid sugar" reason');
    assert.equal(r.verdict, 'ok');
});

test('meal-photo: a chocolate dessert is not counted as a sugary drink', () => {
    const M = require('../meal-photo.js');
    const choc = M.bloodSugar({ carbs: 10, sugar: 20, protein: 3, fat: 20, fiber: 4 }, [{ name: 'Dark chocolate', portion: '40 g' }]);
    const cola = M.bloodSugar({ carbs: 35, sugar: 35 }, [{ name: 'Cola', portion: '330 ml' }]);
    assert.notEqual(choc.level, 'high', 'chocolate is judged on its numbers');
    assert.equal(cola.level, 'high');
});
