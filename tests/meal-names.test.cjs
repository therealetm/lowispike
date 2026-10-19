/* Meal names understood + Log meal cleanup (meal-names task).
   Emmanuel: typing "chicken stew" or "chicken soup" only gave "chicken"; "chicken" logged as "protein not provided, fiber not provided,
   sugar not provided"; the Log meal panel repeated Snap food, Scan product and "What can I buy here?". */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const M = require('../meal-db-core.js');
const data = JSON.parse(read('data/meals/fndds.json'));
M.load(data);
const KEYS = ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar'];
const full = r => KEYS.every(k => typeof r[k] === 'number' && Number.isFinite(r[k]) && r[k] >= 0);

test('a vague name ("grandma\'s mystery dish") is a rough typical meal, not a random food that shares the word "dish"', () => {
  for (const t of ['grandmas mystery dish', 'leftovers', 'Omas Gericht', 'comida de mi abuela']) {
    const r = M.parse(t);
    assert.equal(r.how, 'rough', t + ' -> ' + r.name);
    assert.ok(full(r), t + ' still gets every value');
  }
  assert.equal(M.parse('chicken stew').name, 'Chicken stew', 'real meals are unaffected');
  assert.equal(M.parse('fish and chips').name, 'Fish and chips');
});

test('the meal database is built from USDA FNDDS and is a real size', () => {
  assert.match(data.src, /FNDDS/);
  assert.ok(data.f.length > 4500, 'thousands of foods and dishes: ' + data.f.length);
  assert.ok(fs.statSync(path.join(root, 'data/meals/fndds.json')).size < 700000, 'small enough to load on a phone');
  assert.ok(fs.existsSync(path.join(root, 'tools/meal-data/build.cjs')), 'the build script is in the repo');
});

test('every composed dish and every default points at a real FNDDS food', () => {
  const names = new Set(data.f.map(r => r[0].toLowerCase()));
  for (const d of M.DISHES) for (const m of d.mix) assert.ok(names.has(m[0].toLowerCase()), d.n + ': ' + m[0]);
  for (const [k, v] of Object.entries(M.DEFAULTS)) assert.ok(names.has(v.toLowerCase()), k + ': ' + v);
});

test('a whole meal name is understood as that meal, not its first word', () => {
  const chicken = M.parse('chicken'), stew = M.parse('chicken stew'), soup = M.parse('chicken soup');
  assert.match(stew.name, /stew/i);
  assert.match(soup.name, /soup/i);
  assert.notEqual(stew.name, chicken.name);
  assert.notEqual(soup.name, chicken.name);
  assert.notEqual(stew.kcal, chicken.kcal);
  assert.match(M.parse('jacket potato with cheese').name, /baked potato with cheese/i);
  const fc = M.parse('fish and chips');
  assert.equal(fc.name, 'Fish and chips');
  assert.ok(fc.kcal > 600 && fc.protein > 20, 'fish and chips is a big plate');
  assert.match(M.parse('spaghetti bolognese').name, /bolognese/i);
  assert.match(M.parse('pad thai').name, /pad thai/i);
  assert.equal(M.parse('jollof rice').name, 'Jollof rice');
});

test('meals from other languages and with amounts', () => {
  assert.match(M.parse('Hähnchensuppe').name, /chicken.*soup|soup.*chicken/i);
  assert.match(M.parse('sopa de pollo').name, /chicken.*soup|soup.*chicken/i);
  assert.match(M.parse('Ofenkartoffel mit Käse').name, /baked potato with cheese/i);
  const one = M.parse('egg'), two = M.parse('2 eggs');
  assert.ok(Math.abs(two.kcal - one.kcal * 2) <= 2, '2 eggs is twice one egg');
  assert.equal(M.parse('200g rice').grams, 200);
  assert.ok(M.parse('two slices of pizza').grams < M.parse('pizza').grams * 2, 'slices count as slices');
});

test('an unknown dish is split into its parts and summed', () => {
  const r = M.parse('grilled chicken with rice and broccoli');
  assert.equal(r.how, 'parts');
  assert.equal(r.parts.length, 3);
  const sum = r.parts.length && r.kcal;
  assert.ok(sum > M.parse('rice').kcal, 'more than the rice alone');
  assert.ok(r.ingredients.length >= 3);
});

test('every typed meal gets protein, fiber, sugar and the rest: never blank', () => {
  for (const q of ['chicken', 'chicken stew', 'banana', 'fish and chips', 'xyzzy plate', 'sopa de pollo', 'a big bowl of something']) {
    const r = M.parse(q);
    assert.ok(full(r), q + ' -> ' + JSON.stringify(r));
  }
  assert.equal(M.parse('xyzzy').how, 'rough');
  const f = M.fill({ protein: 30, fiber: null, sugar: '', carbs: undefined, fat: 5, kcal: null }, M.parse('chicken stew'));
  assert.equal(f.macros.protein, 30, 'your own numbers win');
  assert.equal(f.macros.fat, 5);
  assert.deepEqual(f.filled.sort(), ['carbs', 'fiber', 'kcal', 'sugar']);
});

/* the result sheet's macro grid, run for real: a log with blanks (as "chicken" was saved before) shows estimates, not "Not provided" */
test('the logged meal sheet never shows "not provided"', () => {
  const js = read('spirit.js');
  const start = js.indexOf('    const MDB = window.LowiMealDB;');
  const end = js.indexOf('    function estHTML(');
  assert.ok(start > 0 && end > start, 'spirit.js wires the meal database into the meal sheet');
  const ctx = { window: { LowiMealDB: M }, D: { querySelector: () => null, addEventListener() {} }, fetch: () => Promise.reject(new Error('offline')),
    K: require('../spirit-core.js'), tr: k => (k === 'missing' ? 'Not provided' : k), esc: x => String(x), console };
  vm.createContext(ctx);
  vm.runInContext(js.slice(start, end) + '\nthis.macroHTML = macroHTML; this.withEstimate = withEstimate;', ctx);
  const html = ctx.macroHTML({ t: 'chicken', macros: { protein: null, fiber: null, sugar: null, carbs: null, fat: null, kcal: null } });
  assert.doesNotMatch(html, /Not provided|missing/i);
  assert.match(html, /\u2248 \d/);
  const w = ctx.withEstimate('chicken stew', { protein: null, fiber: null, sugar: null, carbs: null, fat: null, kcal: null });
  assert.match(w.est.n, /stew/i);
  assert.ok(KEYS.every(k => typeof w.macros[k] === 'number'), JSON.stringify(w.macros));
  assert.ok(!/tr\('missing'\)/.test(js.slice(start, end)), 'the macro grid never renders the "not provided" text');
});

test('saving a typed meal (Manual or the Scanner\'s "What is it?") fills the blanks before logging, and the log keeps what it was understood as', () => {
  const js = read('spirit.js');
  const fin = js.slice(js.indexOf('async function finishMeal'), js.indexOf('async function finishMeal') + 2500);
  assert.match(fin, /withEstimate\(title, values\)/);
  assert.match(fin, /seed\.est = w\.est/);
  assert.match(js, /estHTML\(log\) \+ macroHTML\(log\)/);
  const html = read('index.html');
  assert.match(html, /if\(data\.est\)log\.est=data\.est;/, 'logMeal keeps est');
  assert.match(read('sw.js'), /"meal-db-core\.js"/, 'cached offline');
  assert.match(read('apple-ui.js'), /'meal-db-core\.js'/, 'loaded before spirit.js');
});

test('Log meal panel: Manual, Eaten recently and Misty suggestions only', () => {
  const js = read('spirit.js');
  // Oct 19: the slot head (Breakfast/Lunch/Dinner/Snacks, then Write / Scan / Snap, E-man's ask) sits above this panel in `how`
  const i = js.indexOf("const html = how + '<div class=\"sp-quick-log\">");
  assert.ok(i > 0);
  const panel = js.slice(i, i + 1400);
  assert.doesNotMatch(panel, /button\('photo'|button\('scan'|sp-quick-cap/, 'Snap food and Scan product live in Scan');
  assert.match(panel, /sp-manual[\s\S]*recent[\s\S]*tip/, 'Manual first, then Eaten recently, then Misty');
  assert.doesNotMatch(panel, /<details class="sp-manual"/, 'Manual is open, not folded away');
  assert.match(js, /<details class="sp-own">/, 'your own numbers are optional and folded away');
  const sp = read('store-picks.js');
  assert.doesNotMatch(sp.slice(sp.indexOf('const SPOTS'), sp.indexOf('const SPOTS') + 600), /sp-quick-cap/, 'no "What can I buy here?" in Log meal');
});
