// A Nibblo meal post opens its full recipe: ingredients with amounts, the estimated basket per shop, the steps, Start cooking.
// 25 Oct 2026, Emmanuel (voice, about "Shirataki Carbonara Pull" in Chat): "When I click on the low spike, it's not taking me
// to how do you cook it. Wasn't the whole point that the ingredients are also the ingredients from the e-book? ... every
// ingredient it listed should also be in an ingredient list. Where did I buy these things? Aldi? Lidl? It needs to go through
// the whole procedure: tell us the price, ingredients, how it's prepared, cooked, etc."
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const N = require('../nibblo-core.js');
const A = require('../recipe-amounts-core.js');
const html = read('index.html');

function recipeBook() {
  const a = html.indexOf('const RECIPE_BOOK = ['), b = html.indexOf('const bookId =', a);
  const NOTE_VANILLA = 'nv', NOTE_SAUCE = 'ns'; // eslint-disable-line no-unused-vars
  return eval(html.slice(a + 'const RECIPE_BOOK = '.length, b).trim().replace(/;$/, ''));
}
const BOOK = recipeBook();
const bookIdOf = n => 'rb_' + String(n).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/[^a-z]+/g, '_').replace(/^_|_$/g, ''); // same as index.html bookId
const all = () => Object.keys(N.SLOTS).flatMap(s => N.MENU[s].map(d => Object.assign({ slot: s }, d)));
const ingOf = r => r.ing.map(x => { const [g, n] = x.split('|'); return { g, n }; });

test('every Nibblo dish is a Recipe Book recipe, so it is already in the Cook swipe, Shuffle and Cook with me', () => {
  for (const d of all()) {
    const r = BOOK.find(x => x.n === d.r);
    assert.ok(r, d.r + ' is in RECIPE_BOOK');
    assert.notEqual(r.r, 'nein', d.r + ' is not a "nein" recipe, so the swipe pool (fPool) keeps it');
    assert.ok(r.make && r.make.length >= 2, d.r + ' has cooking steps for Cook with me');
  }
  // the swipe pool takes every non-"nein" Recipe Book recipe
  assert.match(html, /function fPool\(\)\{\s*const book = \(typeof RECIPE_BOOK !== "undefined" \? RECIPE_BOOK : \[\]\)\.filter\(r => r\.r !== "nein"\)/);
});

test('every food the caption names is in that recipe\'s ingredient list', () => {
  const FOODS = ['chicken', 'egg', 'parmesan', 'shirataki', 'salmon', 'cucumber', 'beef', 'lettuce', 'yogurt', 'cabbage', 'shrimp', 'tuna',
    'cauliflower', 'zucchini', 'turkey', 'cheddar', 'avocado', 'feta', 'kale', 'mushroom', 'broth', 'nori', 'konjak', 'halloumi', 'pepper', 'mozzarella',
    'tomato', 'cottage', 'frischkäse', 'dill', 'lime', 'lemon', 'mint', 'garlic', 'celery', 'paprika', 'ginger', 'tamari', 'scallion', 'sesame'];
  const ALIAS = { egg: /egg/, cottage: /cottage/, pepper: /pepper/, tomato: /tomato/ };
  for (const d of all()) {
    const r = BOOK.find(x => x.n === d.r), ing = ingOf(r).map(i => i.n.toLowerCase()).join(' | ');
    const line = d.line[0].toLowerCase();
    for (const f of FOODS) {
      if (!new RegExp('\\b' + f).test(line)) continue;
      if (f === 'pepper' && /black pepper|pepper/.test(ing)) continue;
      assert.match(ing, ALIAS[f] || new RegExp(f), d.r + ': "' + f + '" from the caption is in the ingredients (' + ing + ')');
    }
  }
});

test('every Recipe Book ingredient gets an amount for one person, in the book order', () => {
  for (const r of BOOK) {
    const a = A.AMT[r.n];
    assert.ok(a, r.n + ' has amounts');
    assert.equal(a.length, r.ing.length, r.n + ': one amount per ingredient');
    a.forEach((q, i) => assert.ok(q && q.trim(), r.n + ' ingredient ' + i + ' has an amount'));
  }
  assert.deepEqual(Object.keys(A.AMT).filter(n => !BOOK.find(r => r.n === n)), [], 'no amounts for recipes that are not in the book');
  assert.equal(A.q('Shirataki Carbonara Pull', 0), '200 g');
  assert.equal(A.q('Shirataki Carbonara Pull', 4), '150 g');
  assert.equal(A.q('Nope', 0), '');
});

test('amounts read naturally in German and Spanish, and every translated one is registered for the text translator', () => {
  assert.equal(A.loc('2 tbsp', 'de'), '2 EL');
  assert.equal(A.loc('2 tbsp', 'es'), '2 cucharadas');
  assert.equal(A.loc('1 tsp', 'es'), '1 cucharadita');
  assert.equal(A.loc('½ tsp', 'de'), '½ TL');
  assert.equal(A.loc('6 leaves', 'de'), '6 Blätter');
  assert.equal(A.loc('1 sheet', 'es'), '1 lámina');
  assert.equal(A.loc('a pinch', 'de'), 'eine Prise');
  assert.equal(A.loc('a handful', 'es'), 'un puñado');
  assert.equal(A.loc('150 g', 'de'), '150 g');
  assert.equal(A.loc('2', 'es'), '2');
  const rows = A.rows();
  for (const s of A.all()) {
    assert.ok(/^([0-9]+|½|¼|¾)( (g|ml|cm))?$/.test(s) || rows.some(r => r[0] === s), '"' + s + '" is translated or needs no translation');
    for (const l of ['de', 'es']) assert.doesNotMatch(A.loc(s, l), /tbsp|tsp|sheet|leaves|pinch|handful|slices|clove|stalk|pods|sprigs|\bcan\b|\bbag\b/, s + ' in ' + l);
  }
  assert.match(read('recipe-amounts-core.js'), /root\.LowiLang\.add\(api\.rows\(\)\)/);
});

test('the recipe page shows the amounts, says they are for one person, and says how it rates and why', () => {
  assert.match(html, /q:window\.LowiRecipeAmounts \? LowiRecipeAmounts\.q\(r\.n, j\) : ""/, 'fromBook() fills q');
  assert.match(html, /Amounts for 1 person\./);
  assert.match(html, /\["Amounts for 1 person\.", "Mengen für 1 Person\.", "Cantidades para 1 persona\."\]/);
  assert.match(html, /spikeHTML\(r\) \+/);
  const carb = BOOK.find(r => r.n === 'Shirataki Carbonara Pull'), ing = ingOf(carb);
  const en = A.spike({ r: carb.r, ing }, 'en');
  assert.equal(en.label, 'Low spike');
  assert.match(en.why, /^Protein: eggs, cottage cheese, parmesan and chicken\. No bread, rice, pasta or sugar/);
  const de = A.spike({ r: carb.r, ing }, 'de', n => ({ Eggs: 'Eier', 'Cottage cheese': 'Hüttenkäse', Parmesan: 'Parmesan', Chicken: 'Hähnchen' })[n] || n);
  assert.match(de.why, /^Eiweiß: Eier, Hüttenkäse, Parmesan und Hähnchen\./);
  assert.match(A.spike({ r: carb.r, ing }, 'es').why, /^Proteína: .* y chicken\. Sin pan, arroz, pasta ni azúcar/);
  const tea = BOOK.find(r => r.n === 'Bitter Green Tea Lime');
  assert.match(A.spike({ r: tea.r, ing: ingOf(tea) }, 'en').why, /^No sugar, syrup or sweetener/);
  const crisp = BOOK.find(r => r.n === 'Parmesan Pizza Crisps');
  assert.equal(A.spike({ r: crisp.r, ing: ingOf(crisp) }, 'en').label, 'Now and then');
});

test('the Nibblo chat post: photo, Low spike label, caption and a "Cook this" button all open the recipe', () => {
  const carb = N.MENU.e.find(d => d.r === 'Shirataki Carbonara Pull');
  assert.ok(carb, 'Shirataki Carbonara Pull is on the dinner menu');
  const rec = bookIdOf('Shirataki Carbonara Pull');
  assert.equal(rec, 'rb_shirataki_carbonara_pull');
  const m = { id: 'nb-20261025-e', uid: N.UID };
  assert.match(N.recipeFor(m), /^rb_/);
  assert.equal(N.recipeFor({ id: 'nb-20261025-e', uid: 'someone' }), '', 'only Nibblo');
  assert.equal(N.recipeFor({ id: 'x', uid: N.UID }), '');
  const ph = { src: 'food-img/x.webp', caption: 'Evening craving? I\'ve got you', meal: { name: 'Shirataki Carbonara Pull', lvl: 'low' }, rec };
  const h = N.chatHTML(ph, m, { label: 'Low spike' });
  const opens = h.match(/data-sh="recipe" data-r="rb_shirataki_carbonara_pull"/g) || [];
  assert.equal(opens.length, 4, 'photo, label, caption and Cook this');
  assert.match(h, /class="cs-photo nb-photo"/);
  assert.match(h, /cs-meal-bs cs-meal-low nb-bs/);
  assert.match(h, /Cook this/);
  assert.doesNotMatch(h, /data-chat="photo"/, 'the photo opens the recipe, not the photo viewer');
  assert.equal(N.chatHTML({ src: 'x', meal: { name: 'a' } }, m, {}), '', 'nothing without a recipe');
  // chatPhoto carries rec and its own render(); community-chat.js msgBody() uses a photo's render() when it has one
  assert.match(read('community-chat.js'), /if\(typeof ph\.render==='function'\)\{const own=ph\.render\(\{label:tr\(/);
  assert.match(read('nibblo-core.js'), /const ph = \{ src: x\.src, caption: x\.caption, meal: x, rec: x\.rec \};\s*ph\.render = h => chatHTML\(ph, m, h\);/);
});

test('Chat\'s photoOf for the real bot message (German phone): render() draws the German dish with "Nachkochen" and the recipe link', () => {
  const K = require('../community-chat-core.js');
  const b = N.chatBody('20261025', 'e', K.mealBody), msg = { id: 'nb-20261025-e', uid: N.UID, t: b };
  const W = { document: { documentElement: { lang: 'de' } } }; N.install(W);
  try {
    const got = N.chatPhoto(K, msg, N.UID), dish = N.pick('20261025', 'e').dish;
    assert.equal(got.rec, bookIdOf(dish.r));
    assert.equal(typeof got.render, 'function');
    const h = got.render({ label: 'Wenig Spike' });
    assert.match(h, new RegExp('data-r="' + bookIdOf(dish.r) + '"'));
    assert.ok(h.includes(dish.name[1]), 'German dish name');
    assert.match(h, /Wenig Spike/);
    assert.match(h, /Nachkochen/);
    assert.ok(BOOK.some(r => bookIdOf(r.n) === got.rec), 'the id is a real Recipe Book recipe');
  } finally { delete W.__lowiNibblo; N.lang = () => 'en'; }
});

test('"Cook this" in German and Spanish, and only for a Recipe Book id', () => {
  assert.match(N.cookHTML('rb_a', 'de'), /<b>Nachkochen<\/b><small>Zutaten, Preise, Schritte<\/small>/);
  assert.match(N.cookHTML('rb_a', 'es'), /<b>Cocínalo<\/b><small>Ingredientes, precios, pasos<\/small>/);
  assert.match(N.cookHTML('rb_a', 'en'), /<b>Cook this<\/b>/);
  assert.equal(N.cookHTML('m_1', 'en'), '');
  assert.equal(N.cookHTML('', 'en'), '');
  assert.match(N.cookHTML('rb_a"x', 'en'), /data-r="rb_a&quot;x"/, 'escaped');
});

test('For You: a Nibblo post opens the recipe from the photo and from "Cook this"', () => {
  const p = { id: 'p1', nb: 1, user_id: N.UID, meta: { nb: { d: '20261025', s: 'e' } } };
  assert.match(N.recipeFor(p), /^rb_/);
  assert.match(N.fyHitHTML(p), /class="nb-fyhit" data-sh="recipe" data-r="rb_/);
  assert.equal(N.fyHitHTML({ id: 'p2', user_id: 'u' }), '');
  assert.match(html, /LowiNibblo\.fyHitHTML\(p\)/);
  // a post the cloud mapped before nibblo-core.js loaded is made Nibblo's when it is drawn (seen in the simulated iPhone: no Bot tag, no Cook this)
  assert.match(html, /function slideHTML\(p\)\{\s*\/\*[^*]*\*\/\s*if \(!p\.nb && window\.LowiNibblo && LowiNibblo\.isPost && LowiNibblo\.isPost\(p\)\) LowiNibblo\.post\(p, LowiNibblo\.lang\);/);
  const raw = { id: 'snb-20261025-e', uid: N.UID, cap: 'x', meta: { nb: { d: '20261025', s: 'e' } } };
  assert.ok(N.isPost(raw) && N.post(raw, 'de').nb === 1 && N.fyHitHTML(raw), 'post() makes it Nibblo\'s in place');
  assert.match(html, /LowiNibblo\.cookHTML\(LowiNibblo\.recipeFor\(p\), null, "nb-fy"\)/);
});

test('the recipe screen opens any [data-sh=recipe][data-r] tap, before the chat or For You handlers', () => {
  assert.match(html, /const rl = t\.closest\('\[data-sh="recipe"\]\[data-r\]/);
  assert.match(html, /if \(rl && rec\(rl\.dataset\.r\)\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); openRecipe\(rl\.dataset\.r\); return; \}\s*\n[^\n]*\n\}, true\);/);
});

test('prices stay estimates: the basket says so and nothing new claims a live price', () => {
  assert.match(html, /Estimated basket for this dish, all from one shop\. Not live prices\./);
  for (const f of ['recipe-amounts-core.js', 'nibblo-recipe.css']) assert.doesNotMatch(read(f), /€|EUR/);
  assert.doesNotMatch(read('nibblo-core.js').split('25 Oct 2026 (Emmanuel): "When I click')[1], /€/);
});

test('the new files load and work offline', () => {
  assert.match(html, /<script src="recipe-amounts-core\.js\?v=[0-9-]+"><\/script>\s*<script src="nibblo-core\.js/);
  assert.match(html, /<link rel="stylesheet" id="nbrCss" href="nibblo-recipe\.css\?v=/);
  assert.match(read('sw.js'), /STATIC\.push\("recipe-amounts-core\.js", "nibblo-recipe\.css"\)/);
});
