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

test('Log meal panel: one open field first, then Wie immer, then the companion\'s idea, apart', () => {
  const js = read('spirit.js');
  // Oct 27 (Emmanuel: "too much redundancy ... minimalism, efficiency, convenience"): ONE calm sheet. The field is the manual
  // entry, open at the top; Foto / Barcode are two small chips right under it (no big Write / Scan / Snap tiles, no Snap food /
  // Scan product row); own values fold away; Wie immer (eaten recently) sits under Save; the companion's idea comes after it.
  const i = js.indexOf("const html = '<div class=\"lm\" data-lm>'");
  assert.ok(i > 0);
  const panel = js.slice(i, i + 900);
  assert.match(panel, /form \+ usual \+ idea \+ today/, 'the field first, then Eaten recently (Wie immer), then the companion, then today');
  const f = js.slice(js.indexOf("const form = '<form id=\"spMeal\" class=\"lm-form\""), js.indexOf('const usual = recent.length'));
  assert.ok(f.length > 200);
  assert.match(f, /<input id="lmTitle" class="lm-in" name="title" required/, 'the manual field is open, not folded away');
  assert.doesNotMatch(f, /<details/, 'nothing in the form is a fold');
  // Oct 27 (later, Emmanuel: "remove the barcode scanner ... make the picture one very clear"): the photo is ONE big button
  // above the field, and the meal sheet has no Barcode at all (the store scanner stays on Home and in Shop).
  assert.match(panel, /lmSnapHTML\(\) \+ form/, 'the big photo button sits right above the one field');
  assert.match(f, /data-mic="1"/, 'typing and the mic stay in the one field');
  assert.doesNotMatch(f, /data-sp="scan"|data-sp="photo"/, 'no Barcode chip and no second photo chip in the form');
  assert.doesNotMatch(js, /sp-quick-cap|data-sp="slotWrite"/, 'no Snap food / Scan product row, no Write tile');
  assert.match(f, /'<\/button><\/div>' \+ own \+\s*'<button class="r2-btn pri lm-save"/, 'own values sit behind the quiet link, before the one Save');
  assert.match(js, /const own = '<div class="lm-own" id="lmOwn" hidden>/, 'your own numbers are optional and folded away (hidden until the link is tapped)');
  const sp = read('store-picks.js');
  assert.doesNotMatch(sp.slice(sp.indexOf('const SPOTS'), sp.indexOf('const SPOTS') + 600), /sp-quick-cap/, 'no "What can I buy here?" in Log meal');
});
