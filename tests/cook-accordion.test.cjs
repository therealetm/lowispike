// Regression: Cook "All recipes" must not open as one endless list.
// Meals, Snacks, Sweet, Drinks, Quick ones and LOWiSPIKE rebuilds are closed headers (aria-expanded=false, panel hidden)
// until tapped; one tap opens one group and closes the others; a second tap closes it; every recipe stays in the page
// (inside its panel) so opening a group and tapping a recipe still works; a chip filter still shows its flat list.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const k1 = html.split('<script id="k1js">')[1].split('</script>')[0];
const css = html.split('<style id="k1css">')[1].split('</style>')[0];

// --- a tiny DOM, just enough for the accordion toggle ---
function el(cls, attrs) {
  const e = {cls:new Set(cls.split(' ').filter(Boolean)), attrs:Object.assign({}, attrs || {}), children:[], parent:null, dataset:{}, top:0};
  e.classList = {contains:c => e.cls.has(c), toggle:(c, on) => { if (on === undefined) on = !e.cls.has(c); if (on) e.cls.add(c); else e.cls.delete(c); return on; }, add:c => e.cls.add(c)};
  e.getAttribute = n => (n in e.attrs ? e.attrs[n] : null);
  e.setAttribute = (n, v) => { e.attrs[n] = String(v); };
  e.removeAttribute = n => { delete e.attrs[n]; };
  e.hasAttribute = n => n in e.attrs;
  e.append = c => { c.parent = e; e.children.push(c); return c; };
  e.matches = sel => sel.split(',').some(s => { s = s.trim(); if (s[0] === '#') return e.attrs.id === s.slice(1); if (s[0] === '.') return e.cls.has(s.slice(1)); if (s[0] === '[') return s.slice(1, -1) in e.attrs || s.slice(1, -1) in e.dataset; return false; });
  e.closest = sel => { let x = e; while (x) { if (x.matches && x.matches(sel)) return x; x = x.parent; } return null; };
  const all = () => { const out = []; (function w(n){ n.children.forEach(c => { out.push(c); w(c); }); })(e); return out; };
  e.querySelectorAll = sel => all().filter(x => x.matches(sel));
  e.querySelector = sel => { if (sel.startsWith(':scope > ')) { const s = sel.slice(9); return e.children.find(c => c.matches(s)) || null; } return e.querySelectorAll(sel)[0] || null; };
  e.getBoundingClientRect = () => ({top:e.top, bottom:e.top + 52, left:0, right:300, height:52});
  Object.defineProperty(e, 'parentElement', {get:() => e.parent});
  return e;
}
const root = el('r3k-all', {id:'r3kAll'});
const secs = ['meal', 'snack', 'dessert', 'drink', 'quickones', 'rebuilds'].map((k, i) => {
  const s = root.append(el('k1-grp k1-acc')); s.dataset.k1g = k;
  const b = s.append(el('k1-gh k1-ah', {'aria-expanded':'false', 'data-k1acc':k})); b.dataset.k1acc = k; b.top = 100 + i * 60;
  s.append(el('k1-panel', {hidden:''}));
  return s;
});
let clickL = null;
const document = {addEventListener:(t, f) => { if (t === 'click') clickL = f; }, body:{}, scrollingElement:{scrollTop:0, scrollTo(){}}, documentElement:{}};
const ctx = {window:{}, document, getComputedStyle:() => ({overflowY:'visible'}), innerHeight:800, matchMedia:() => ({matches:true}), String, Math, Object};
ctx.window.LowiLang = ctx.LowiLang = {get:() => 'de'};
vm.createContext(ctx);
vm.runInContext(k1, ctx);
const K = ctx.window.LowiK1;
assert.ok(K && typeof K.acc === 'function' && typeof K.list === 'function', 'LowiK1.acc and list exported');

// --- 1. initial render: every group closed, all recipes present but hidden ---
const row = r => '<button class="sh-rec" data-sh="recipe" data-r="' + r.id + '">' + r.n + '</button>';
const book = [
  {id:'m1', n:'Bowl', c:'meal'}, {id:'m2', n:'Burger', c:'meal'}, {id:'s1', n:'Chips', c:'snack'},
  {id:'d1', n:'Pudding', c:'dessert'}, {id:'k1', n:'Matcha', c:'drink'}
];
const out = K.list(book, '', row);
const groups = out.match(/<section class="k1-grp k1-acc[^"]*" data-k1g="(\w+)"/g) || [];
assert.deepStrictEqual(groups.map(g => g.match(/data-k1g="(\w+)"/)[1]), ['meal', 'snack', 'dessert', 'drink'], 'Meals, Snacks, Sweet, Drinks are accordion sections');
assert.ok(!/ open"/.test(out), 'no section open on first render');
assert.strictEqual((out.match(/aria-expanded="false"/g) || []).length, 4, 'every header says aria-expanded=false');
assert.strictEqual((out.match(/class="k1-panel"[^>]* hidden>/g) || []).length, 4, 'every panel starts hidden');
book.forEach(r => assert.ok(out.indexOf('data-r="' + r.id + '"') >= 0, 'recipe ' + r.id + ' still in the page'));
assert.ok(/<button type="button" class="k1-gh k1-ah" data-k1acc="meal" aria-expanded="false" aria-controls="k1p-meal"/.test(out), 'header is a real button wired to its panel');
assert.ok(/role="region" aria-labelledby="k1h-meal"/.test(out), 'panel is a labelled region');
assert.ok(out.indexOf('k1-chev') > 0, 'header has a chevron');
assert.ok(/Mahlzeiten/.test(out) && /S\u00fc\u00df|Süß/.test(out), 'German group titles');

// a chip filter keeps its flat list (no accordion around the picked category)
const flat = K.list(book.filter(r => r.c === 'meal'), 'meal', row);
assert.ok(flat.indexOf('k1-acc') < 0 && flat.indexOf('k1-list') > 0, 'chip filter shows the flat list');

// --- 2. open / close / one at a time ---
const tap = k => clickL({target:secs.find(s => s.dataset.k1g === k).children[0], preventDefault(){}, stopPropagation(){}});
const state = () => secs.map(s => [s.dataset.k1g, s.children[0].getAttribute('aria-expanded'), s.children[1].hasAttribute('hidden'), s.cls.has('open')]);
tap('dessert');
assert.deepStrictEqual(state().filter(x => x[1] === 'true').map(x => x[0]), ['dessert'], 'tap opens Sweet');
assert.ok(!secs[2].children[1].hasAttribute('hidden') && secs[2].cls.has('open'), 'Sweet panel shown');
assert.strictEqual(K.opened(), 'dessert');
tap('meal');
assert.deepStrictEqual(state().filter(x => x[1] === 'true').map(x => x[0]), ['meal'], 'opening Meals closes Sweet');
assert.ok(secs[2].children[1].hasAttribute('hidden'), 'Sweet panel hidden again');
tap('meal');
assert.deepStrictEqual(state().filter(x => x[1] === 'true'), [], 'second tap closes Meals');
assert.strictEqual(K.opened(), null);
tap('rebuilds');
assert.strictEqual(K.opened(), 'rebuilds');

// --- 3. a re-render (search typing, back from a recipe) keeps the open group open ---
const again = K.acc('rebuilds', '', 'LOWiSPIKE-Rebuilds', 2, '', '<input id="shQ">' + row({id:'x1', n:'Pizza'}));
assert.ok(/k1-acc open/.test(again) && /aria-expanded="true"/.test(again) && !/ hidden>/.test(again), 'open group survives re-render');
const other = K.acc('quickones', '', 'Schnelle', 1, '', row({id:'q1', n:'Pan'}));
assert.ok(/aria-expanded="false"/.test(other) && / hidden>/.test(other), 'others stay closed on re-render');

// --- 4. recipe selection: the row inside a panel keeps its data-sh="recipe" handoff ---
assert.ok(/<div class="k1-panel"[^>]*>(?:(?!<\/section>).)*data-sh="recipe" data-r="m1"/.test(out), 'recipe rows live inside panels with the recipe handoff');

// --- 5. Cook wires Quick ones + rebuilds through the accordion, search stays inside rebuilds ---
const kochen = html.split('function kochenHTML(){')[1].split('\nfunction recipeHTML')[0];
assert.ok(/LowiK1\.acc\("quickones"/.test(kochen), 'Quick ones is an accordion');
assert.ok(/LowiK1\.acc\("rebuilds"[\s\S]*id="shQ"/.test(kochen), 'rebuilds accordion holds the search');
assert.ok(/LowiK1\.chips\(cats, V\.cat/.test(kochen), 'category chips kept');

// --- 6. CSS: hidden panels never show, headers are big touch targets, reduced motion honoured ---
assert.ok(/\.k1-panel\[hidden\]\{display:none!important\}/.test(css), 'hidden panel beats the tablet grid');
assert.ok(/\.k1-ah\{[^}]*min-height:52px/.test(css), 'header at least 44pt tall');
assert.ok(/prefers-reduced-motion: reduce/.test(css), 'reduced motion');
console.log('cook-accordion: ok');
