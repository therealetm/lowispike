'use strict';
/* 23 Oct 2026: the scanner, the food list and the shopping list point at the 38-recipe book, and milk follows the portion rule
   everywhere (a splash JA, a glass SELTEN), matching Master Knowledge v3. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const master = fs.readFileSync(path.join(__dirname, '..', 'data/food-policy/master-knowledge.v3.md'), 'utf8');
const P = require('../food-policy-core.js');

const book = (() => { const st = html.indexOf('const RECIPE_BOOK = ['); return [...html.slice(st, st + 400000).matchAll(/\{c:"[a-z]+", n:"([^"]*)"/g)].map(m => m[1]); })();
const rbs = [...html.matchAll(/rb:"([^"]+)"/g)].map(m => m[1]);
const NEW13 = ['Garlic Yogurt Chicken Box', 'Zucchini Ribbon Beef Ragout', 'Cauliflower Egg Wok Fry', 'Shirataki Broth Bowl', 'Spiced Beef Lettuce Shells', 'Smoky Kale Crunch', 'Chicken Caesar Lettuce Boats', 'Smoked Salmon Cucumber Bites', 'Espresso Cottage Cream Cups', 'Lemon Ricotta Berry Cups', 'Strawberry Skyr Freeze Pops', 'Ginger Lemon Fizz', 'Iced Cardamom Spice Tea'];

test('the recipe book has 38 recipes and every swap link points at one of them', () => {
  assert.strictEqual(book.length, 38);
  for (const r of rbs) assert.ok(book.includes(r), r);
});

test('each of the 13 new recipes is reachable from a scan or food-list swap, and the master prompt names them', () => {
  for (const n of NEW13) { assert.ok(rbs.includes(n), n + ' linked from a swap'); assert.ok(master.includes(n), n + ' in the master prompt'); }
});

test('a food-list tap keeps the recipe link, so the scan card can open the recipe and fill the shopping list', () => {
  assert.match(html, /swap:\{n:m\.s\.n, e:m\.s\.e, r:m\.s\.r, rb:m\.s\.rb \|\| ""/);
  assert.match(html, /rb: hero\.s\.rb \|\| ""/);
});

test('new cravings are found by the meal logger: tiramisu, ice lolly, Caesar wrap, lemonade, chai latte, tacos', () => {
  for (const k of ['m:"tiramisu"', 'm:"icelolly"', 'm:"caesarwrap"', 'm:"lemonade"', 'm:"chailatte"', '"taco","tacos"']) assert.ok(html.includes(k), k);
});

test('milk portion rule: a splash is JA, a glass is SELTEN, by name and by grams, in three languages', () => {
  for (const n of ['milk, a splash', 'Splash of milk', 'Schuss Milch', 'Chorrito de leche', 'coffee with milk', 'Kaffee mit Milch', 'Caf\u00e9 con leche', 'Latte macchiato']) assert.strictEqual(P.rateName(n).verdict, 'JA', n);
  for (const n of ['milk', 'Milch', 'Leche', 'Glass of milk', 'Glas Milch', 'Vaso de leche', 'milk, a glass']) assert.strictEqual(P.rateName(n).verdict, 'SELTEN', n);
  assert.strictEqual(P.rateName('milk', 30).verdict, 'JA');
  assert.strictEqual(P.rateName('milk', 200).verdict, 'SELTEN');
  assert.notStrictEqual(P.rateName('Kokosmilch').verdict, 'SELTEN', 'plant drinks keep their own rules');
  assert.match(html, /\{id:"milk", n:"milk, a splash", g:"dairy", r:"ja"/);
  assert.match(html, /\{id:"milkglass", n:"milk, a glass", g:"dairy", r:"selten"/);
});
