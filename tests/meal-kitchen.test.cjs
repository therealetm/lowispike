'use strict';
/* Oct 25, 2026 (Emmanuel): "if someone posted a meal in the community, we need an add to kitchen button; it then adds all the
   products into their kitchen from the picture that they just saw in the community or on the For You page. That's why it's
   important that the products are also, minimalistically, efficiently, included."
   One small "Add to kitchen" row under a shared meal in Chat/Circles and For You: one tap puts the meal's foods into the
   viewer's Kitchen (lowispike.kitchen.v1) without duplicates, says how many went in, Undo for a few seconds. No foods, no button.
   Browser check: tools/meal-kitchen/check.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const exists = f => fs.existsSync(path.join(root, f));

test('the files exist and are loaded after the meal details, styled and precached', () => {
  for (const f of ['meal-kitchen-core.js', 'meal-kitchen.js', 'meal-kitchen.css']) assert.ok(exists(f), f + ' missing');
  const html = read('index.html');
  const iCore = html.indexOf('src="meal-kitchen-core.js'), iDom = html.indexOf('src="meal-kitchen.js'), iKit = html.indexOf('src="kitchen-core.js'), iMd = html.indexOf('src="meal-detail-core.js');
  assert.ok(iCore > 0 && iDom > iCore, 'core before the DOM part');
  assert.ok(iKit > 0 && iKit < iDom && iMd < iDom, 'Kitchen and meal-detail cores load first');
  assert.match(html, /href="meal-kitchen\.css\?v=/);
  assert.match(read('sw.js'), /STATIC\.push\("meal-kitchen-core\.js", "meal-kitchen\.js", "meal-kitchen\.css"\)/);
});

test('the foods of a shared meal: names only, no portions or emoji, once each, tap water left out, at most 10', () => {
  const C = require('../meal-kitchen-core.js');
  assert.deepEqual(C.foodsOfDetail(null), []);
  assert.deepEqual(C.foodsOfDetail({ name: 'Bowl' }), [], 'a meal without foods gives nothing (no button)');
  assert.deepEqual(C.foodsOfDetail({ items: [{ name: '🥚 Eggs', portion: '2' }, { name: 'eggs' }, { name: 'Spinach (1 cup)' }, { name: 'Feta · 50 g' }, { name: 'Water' }, { name: '  ' }, null] }),
    ['Eggs', 'Spinach', 'Feta']);
  const many = { items: Array.from({ length: 14 }, (_, i) => ({ name: 'Food ' + i })) };
  assert.equal(C.foodsOfDetail(many).length, 10);
  assert.deepEqual(C.foodsOfRecipe({ ing: [{ g: 'eier', n: 'Eggs', q: '' }, { g: 'kaese', n: 'Parmesan' }] }), ['Eggs', 'Parmesan']);
  assert.deepEqual(C.foodsOfRecipe({ ing: ['gemuese|Shirataki noodles', 'eier|Eggs'] }), ['Shirataki noodles', 'Eggs']);
  assert.deepEqual(C.foodsOfRecipe({}), []);
});

test('one tap adds every food once; things already at home stay as they were; Undo takes out exactly what went in', () => {
  const K = require('../kitchen-core.js');
  const C = require('../meal-kitchen-core.js');
  let st = K.add(null, 'Eier', 1000); /* already at home, in German */
  st = K.add(st, 'Butter', 1100);
  const r = C.addAll(JSON.stringify(st), ['Eggs', 'eier', 'Spinach', 'Feta', 'spinach'], 5000);
  assert.deepEqual(r.added.map(i => i.n), ['Eggs', 'Spinach', 'Feta'], 'spinach twice in one meal goes in once');
  assert.deepEqual(r.had, ['eier'], 'Eier was already at home');
  const r2 = C.addAll(r.state, ['Eier', 'Spinach', 'Tomato'], 6000);
  assert.deepEqual(r2.added.map(i => i.n), ['Tomato']);
  assert.deepEqual(r2.had, ['Eier', 'Spinach'], 'already there: counted, not doubled');
  assert.equal(K.parse(r2.state).items.length, 6);
  const back = C.undo(r2.state, r2.added.map(i => i.id));
  assert.deepEqual(K.view(back).map(i => i.n).sort(), ['Butter', 'Eggs', 'Eier', 'Feta', 'Spinach']);
  assert.deepEqual(C.missing(back, ['Eggs', 'Tomato', 'Butter']), ['Tomato']);
});

test('the row is small: a button plus the first three foods and +N, in EN, DE and ES, escaped; done shows the count and Undo', () => {
  const C = require('../meal-kitchen-core.js');
  assert.equal(C.rowHTML({ key: 'c:1', foods: [] }), '', 'no foods, no row');
  const foods = ['Eggs', 'Spinach', 'Feta', 'Tomato', '<b>x</b>'];
  const en = C.rowHTML({ key: 'c:1', foods, st: 'add', where: 'chat' }, 'en');
  assert.match(en, /<button type="button" class="mk-btn" data-mk="add" data-mk-key="c:1"/);
  assert.match(en, />Add to kitchen</);
  assert.match(en, /Eggs · Spinach · Feta <span class="mk-more">\+2<\/span>/);
  assert.match(en, /aria-label="Add 5 foods to your kitchen: Eggs, Spinach, Feta, Tomato, &lt;b&gt;x&lt;\/b&gt;"/);
  assert.ok(!/<b>x/.test(en));
  assert.match(C.rowHTML({ key: 'f:2', foods, st: 'add', where: 'fy' }, 'de'), /In die Küche/);
  assert.match(C.rowHTML({ key: 'f:2', foods, st: 'add', where: 'fy' }, 'es'), /A mi cocina/);
  const done = C.rowHTML({ key: 'c:1', foods, st: 'done', added: 3, had: 2, undo: true }, 'de');
  assert.match(done, /✓ 3 in deiner Küche/); assert.match(done, /2 schon da/); assert.match(done, /data-mk="undo"[^>]*>Rückgängig</);
  assert.match(C.rowHTML({ key: 'c:1', foods, st: 'have' }, 'es'), /Todo en tu cocina/);
  assert.ok(!/data-mk="undo"/.test(C.rowHTML({ key: 'c:1', foods, st: 'done', added: 3, undo: false }, 'en')), 'Undo goes after a few seconds');
  for (const l of ['en', 'de', 'es']) for (const k of Object.keys(C.STR.en)) assert.ok(C.STR[l][k], l + ' ' + k);
});

test('hooks: Chat/Circles right after the meal label, For You and Tribe right after the meal card; nothing else changed there', () => {
  const cc = read('community-chat.js');
  assert.match(cc, /mealHtml\(ph\.meal\)\+\(W\.LowiMealKitchen\?W\.LowiMealKitchen\.chatHTML\(m,ph\):''\)/);
  const html = read('index.html');
  assert.match(html, /LowiMealDetail\.fyChip\(p\) : ""\) \+[^\n]*\n\s*\(window\.LowiMealKitchen \? LowiMealKitchen\.fyHTML\(p\) : ""\)/);
  assert.match(html, /LowiMealSnap\.cardHTML\(p\.meta\.meal\) : ''\) \+\n\s*\(window\.LowiMealKitchen \? LowiMealKitchen\.fyHTML\(p\) : ''\)/);
});

/* the DOM part in a tiny fake page: which posts get the row, and what one tap writes */
function page(lang) {
  const store = { 'lowispike.lang': lang || 'en' }, events = [], listeners = [];
  const W = {
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    document: { addEventListener: (t, fn) => listeners.push(fn), querySelectorAll: () => [], documentElement: { lang: lang || 'en' } },
    dispatchEvent: e => events.push(e), addEventListener: () => {}, CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
    LowiNibblo: { UID: 'nibblo-uid', pick: () => ({ dish: { r: 'Shirataki Carbonara Pull' } }), bookId: r => 'rb_' + r.toLowerCase().replace(/[^a-z]+/g, '_') }
  };
  W.window = W; W.CustomEvent = W.CustomEvent;
  const ctx = vm.createContext(Object.assign(W, { setTimeout: () => 0, console, CustomEvent: W.CustomEvent }));
  vm.runInContext('const RECIPE_BOOK = [{id:"rb_shirataki_carbonara_pull", n:"Shirataki Carbonara Pull", ing:[{g:"gemuese",n:"Shirataki noodles",q:""},{g:"eier",n:"Eggs",q:""},{g:"milch",n:"Cottage cheese",q:""}]}];', ctx);
  for (const f of ['kitchen-core.js', 'meal-detail-core.js', 'meal-detail.js', 'meal-kitchen-core.js', 'meal-kitchen.js']) vm.runInContext(read(f), ctx, { filename: f });
  return { W, store, events, ctx };
}

test('Chat: a person\'s meal with stored foods gets the row, an old post without foods does not, a Nibblo post uses its recipe', () => {
  const { W } = page('en');
  const MK = W.LowiMealKitchen;
  const ph = { src: 'https://x/y.jpg', meal: { name: 'Egg bowl', lvl: 'low' } };
  const h = MK.chatHTML({ id: 'm1', uid: 'u1', md: { v: 1, name: 'Egg bowl', items: [{ name: 'Eggs', portion: '2' }, { name: 'Spinach' }] } }, ph);
  assert.match(h, /data-mk-key="c:m1"/); assert.match(h, /Eggs · Spinach/);
  assert.equal(MK.chatHTML({ id: 'm2', uid: 'u1', md: null }, ph), '', 'older post: no foods, no button');
  assert.equal(MK.chatHTML({ id: 'm3', uid: 'u1', md: { items: [{ name: 'Eggs' }] } }, { src: 'x' }), '', 'a plain photo is not a meal');
  const nb = MK.chatHTML({ id: 'nb-20261025-n', uid: 'nibblo-uid' }, { src: 'https://x/nb.webp', meal: { name: 'Carbonara', lvl: 'low' } });
  assert.match(nb, /Shirataki noodles · Eggs · Cottage cheese/);
});

test('For You: meta.detail first, else the meal card items; a bot post with p.rec uses that recipe; no foods, no row', () => {
  const { W } = page('de');
  const MK = W.LowiMealKitchen;
  assert.match(MK.fyHTML({ id: 'p1', meta: { spike: 'low', detail: { v: 1, items: [{ name: 'Avocado' }] } } }), /In die Küche/);
  W.LowiMealSnap = { clean: m => (m && m.items ? { items: m.items } : null) };
  assert.match(MK.fyHTML({ id: 'p2', meta: { meal: { name: 'Salad', items: [{ name: 'Lettuce' }, { name: 'Tuna' }] } } }), /Lettuce · Tuna/);
  assert.match(MK.fyHTML({ id: 'nb1', nb: 1, rec: 'rb_shirataki_carbonara_pull', meta: {} }), /Cottage cheese/);
  assert.equal(MK.fyHTML({ id: 'p3', meta: { title: 'a TikTok' } }), '');
  assert.equal(MK.fyHTML({ id: 'p4', cap: 'text only' }), '');
});

test('a tap writes the Kitchen key once (no doubles on a second tap), fires lowi:kitchen, and Undo takes them out again', () => {
  const { W, store, events } = page('en');
  const MK = W.LowiMealKitchen, K = W.LowiKitchenCore;
  store[K.KEY] = JSON.stringify(K.add(null, 'Eggs', 1));
  MK.chatHTML({ id: 'm1', uid: 'u1', md: { items: [{ name: 'Eggs' }, { name: 'Spinach' }, { name: 'Feta' }] } }, { src: 'x', meal: { name: 'Bowl' } });
  const r = JSON.parse(JSON.stringify(MK.add('c:m1')));
  assert.deepEqual(r.added.map(i => i.n), ['Spinach', 'Feta']); assert.deepEqual(r.had, ['Eggs']);
  assert.deepEqual(K.view(store[K.KEY]).map(i => i.n).sort().join(), 'Eggs,Feta,Spinach');
  assert.ok(events.some(e => e.type === 'lowi:kitchen'));
  assert.equal(MK.add('c:m1'), null, 'a second tap adds nothing');
  assert.match(MK.chatHTML({ id: 'm1', uid: 'u1', md: { items: [{ name: 'Eggs' }, { name: 'Spinach' }, { name: 'Feta' }] } }, { src: 'x', meal: { name: 'Bowl' } }), /✓ 2 in your kitchen.*1 already there.*Undo/);
  assert.equal(MK.undo('c:m1'), true);
  assert.equal(K.view(store[K.KEY]).map(i => i.n).join(), 'Eggs', 'Undo leaves what was already there');
  assert.match(MK.chatHTML({ id: 'm1', uid: 'u1', md: { items: [{ name: 'Eggs' }, { name: 'Spinach' }] } }, { src: 'x', meal: { name: 'Bowl' } }), /data-mk="add"/);
  store[K.KEY] = JSON.stringify(K.add(K.add(null, 'Eggs', 1), 'Spinach', 2));
  assert.match(MK.chatHTML({ id: 'm9', uid: 'u1', md: { items: [{ name: 'Eggs' }, { name: 'Spinach' }] } }, { src: 'x', meal: { name: 'Bowl' } }), /All in your kitchen/);
});

test('styles: tappable (44px target), readable on the For You photo, wraps on an SE', () => {
  const css = read('meal-kitchen.css');
  assert.match(css, /\.mk-btn::after,\.mk-undo::after\{content:"";position:absolute;inset:-6px -2px\}/, '32px pill + 12px invisible margin = 44px');
  assert.match(css, /\.mk-fy \.mk-btn,\.mk-fy \.mk-undo\{color:#fff;background:rgba\(8,12,20,\.62\)/);
  assert.match(css, /\.mk-row\{display:flex;flex-wrap:wrap/);
  assert.match(css, /prefers-reduced-motion/);
});
