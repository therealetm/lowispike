// 29 Oct 2026 (Emmanuel, screenshot of the barcode result "Milky Candy" with its red "Warum?" button):
// "In why i need a button that open my custom gpt for deeper analyses".
// gpt-open.js deepHTML: one link to his Custom GPT that copies what the app knows about the food (name, brand, portion,
// nutrients, ingredients, verdict, reason). Used in the scan card's Why? panel (barcode, typed number, name search),
// the photo check's verdict and the product card, so every result path has it.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const GPT = 'https://chatgpt.com/g/g-69481a874bf08191b8118f8d88c9c90e-lowispike';
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function load(clip) {
  const L = {}, on = (t, f) => { (L[t] = L[t] || []).push(f); };
  const document = { visibilityState: 'visible', documentElement: { lang: 'de' }, addEventListener: on, removeEventListener() {}, body: { appendChild() {} },
    createElement() { return { style: {}, setAttribute() {}, select() {}, setSelectionRange() {} }; }, execCommand: () => true };
  const win = { document, location: { href: 'https://therealetm.github.io/lowispike/' }, navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14)', clipboard: clip },
    matchMedia: () => ({ matches: false }), addEventListener: on, removeEventListener() {}, setTimeout: () => 0, clearTimeout() {}, Date };
  win.window = win;
  vm.runInNewContext(read('gpt-open.js'), win);
  return { G: win.LowiGptOpen, L, win };
}

const MILKY = { kind: 'product', name: 'Milky Candy', brand: 'More Nutrition', code: '4260639154551', portion: '30 g',
  per100: { kcal: 537, carbs: 41.2, sugar: 3.1, fiber: 2, protein: 9.5, fat: 37 }, ingredients: 'Milchschokolade mit Suessungsmittel',
  verdict: 'Nicht insulinfreundlich', often: 'Hoechstens einmal pro Woche, als kleine Portion',
  reasons: ['Es enthaelt Suessstoff. LOWiSPIKE zaehlt Suessstoff wie Zucker.'] };

test('the copied text carries the product, nutrients, verdict and reason in his language', () => {
  const { G } = load();
  const s = G.deepText(MILKY, 'de');
  for (const x of ['LOWISPIKE SCAN', 'Produkt: Milky Candy', 'Marke: More Nutrition', 'Barcode: 4260639154551', 'Portion: 30 g',
    'Pro 100 g: 537 kcal', '41,2 g KH', '3,1 g Zucker', '9,5 g Eiwei', '37 g Fett', 'Zutaten: Milchschokolade mit Suessungsmittel',
    'Urteil der App: Nicht insulinfreundlich', 'Wie oft: Hoechstens einmal pro Woche', 'Grund der App: Es enthaelt Suessstoff']) assert.ok(s.includes(x), x + '\n' + s);
  assert.ok(/Alternativen/.test(s));
  assert.ok(G.deepText(MILKY, 'en').includes('Product: Milky Candy'));
  assert.ok(G.deepText(MILKY, 2).includes('Producto: Milky Candy'));
  const m = G.deepText({ kind: 'meal', foods: [{ name: 'Vollkornbrot', portion: '2 Scheiben', kcal: 200, carbs: 43 }], drinks: [{ name: 'Wasser', kcal: 0 }],
    total: { kcal: 200, carbs: 43 }, verdict: 'Nicht insulinfreundlich', reasons: ['Vollkornbrot: viel Staerke'] }, 'de');
  assert.ok(m.includes('Mahlzeit (Foto-Check)') && m.includes('- Vollkornbrot (2 Scheiben): 200 kcal') && m.includes('43 g KH') && m.includes('Gesamt: 200 kcal'), m);
});

test('the button is a plain link to his Custom GPT, no handler attributes the cards swallow, no ?q=', () => {
  const { G } = load();
  const h = G.deepHTML(MILKY, 'de', 'ss-gpt');
  assert.ok(h.startsWith('<a class="gpt-deep ss-gpt" href="' + GPT + '" target="_blank" rel="noopener" data-gpt-deep="'), h);
  assert.ok(!/data-(ss|b3|mr)\b|\?q=|onclick/.test(h));
  assert.ok(h.includes('Tiefer analysieren im GPT') && h.includes('deinen GPT'));
  assert.ok(!/<script|<img/.test(G.deepHTML({ name: '<img src=x onerror=1>' }, 'de')), 'escaped');
});

test('tapping it copies the text inside the tap, before the iPhone hand-off', async () => {
  let got = null;
  const { L } = load({ writeText: s => { got = s; return Promise.resolve(); } });
  const small = { textContent: 'x' };
  const attrs = { 'data-gpt-deep': 'LOWISPIKE SCAN test', 'data-gpt-l': 'de' };
  const a = { getAttribute: k => attrs[k] == null ? null : attrs[k], setAttribute(k, v) { attrs[k] = v; }, removeAttribute(k) { delete attrs[k]; }, querySelector: () => small,
    closest: s => (s === 'a[data-gpt-deep]' ? a : null) };
  for (const f of L.click) f({ target: a, button: 0, preventDefault() {}, stopPropagation() {} });
  assert.strictEqual(got, 'LOWISPIKE SCAN test');
  await new Promise(r => setImmediate(r));
  assert.match(small.textContent, /Kopiert/);
  assert.strictEqual(attrs['data-gpt-copied'], '1');
  assert.ok(read('gpt-open.js').includes('W.addEventListener("click", onDeep, true)'), 'window capture runs before the document-capture hand-off');
});

test('every result card has it: scan Why? panel, photo check, product card', () => {
  const ss = read('shop-scan.js');
  assert.ok(/'<div class="ss-whyp"[^\n]*gptHTML\(p, lvl, e, g, unit, lines\)[^\n]*ss-whyf/.test(ss), 'inside the Why? panel, under the explanation');
  const mr = read('meal-result.js');
  const i = mr.indexOf('const head = v.empty');
  assert.ok(mr.slice(i, i + 1400).includes('gptHTML(st.items, st.drinks, hl, cz, l)'), 'photo check verdict');
  const html = read('index.html');
  const j = html.indexOf('function simpleCardHTML(p){');
  assert.ok(html.slice(j, j + 4000).includes('scGptHTML(p, v, why, g)'), 'product card');
  assert.ok(read('shop-scan.css').includes('a.gpt-deep small {'), 'styled, hint wraps');
});
