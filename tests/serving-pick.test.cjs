/* scanfe-g2 (Oct 23 2026): the serving selector. The pack serving (manufacturer) is the default, else the food group's usual
   portion; the user can pick another amount (quick picks or own grams / ml) on the portion block, and the estimate line, the
   Food check card and Details are re-rated for that amount live. The product itself keeps its default verdict. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const S = require('../spike-core.js');
const FC = require('../food-card-core.js');
const NC = require('../nutri-stats-core.js');
const clone = o => JSON.parse(JSON.stringify(o));

const ULTJE = { barcode: '4004980506206', name: 'Ültje Süß & Salzig', brand: 'Ultje', cat: 'snack', facts: { c: 36, s: 29, f: 5.6, p: 16, fat: 33, kcal: 517, q: '150 g' }, ingredients: '' };
const MUESLI = { barcode: '4000000000101', name: 'Crunchy Müsli', cat: 'cereal', facts: { c: 64, s: 22, f: 6, p: 9, fat: 14, kcal: 450, sv: 40, q: '750 g' }, ingredients: 'Haferflocken, Zucker, Weizenmehl' };
const COLA = { barcode: '5000112000002', name: 'Cola', cat: 'drink', facts: { c: 10.6, s: 10.6, drink: 1, q: '330 ml' }, ingredients: 'Wasser, Zucker, Kohlensäure' };

test('engine: the manufacturer serving is the default; a picked amount wins', () => {
    const a = S.assess(clone(MUESLI));
    assert.equal(a.engine.serving.g, 40); assert.equal(a.engine.serving.source, 'manufacturer');
    const b = S.assess(clone(MUESLI), { servingG: 120 });
    assert.equal(b.engine.serving.g, 120); assert.equal(b.engine.serving.source, 'user');
    assert.ok(b.engine.glucose.availableCarbsG > a.engine.glucose.availableCarbsG, 'more food, more carbs');
    for (const bad of [0, -5, 'x', null]) assert.equal(S.assess(clone(MUESLI), { servingG: bad }).engine.serving.g, 40, 'no valid amount -> default');
    const u = S.assess(clone(ULTJE));
    assert.equal(u.engine.serving.source, 'group', 'no pack serving -> the usual portion');
});

test('engine: a bigger amount can raise the estimate, a tiny one can lower it, and it is never "no spike"', () => {
    const small = S.assess(clone(ULTJE), { servingG: 10 }), big = S.assess(clone(ULTJE), { servingG: 150 });
    const rank = { ok: 0, better: 1, spike: 2 };
    assert.ok(rank[big.verdict] >= rank[S.assess(clone(ULTJE)).verdict]);
    assert.ok(rank[small.verdict] <= rank[S.assess(clone(ULTJE)).verdict]);
    assert.ok(big.why.some(w => w[0] === 'e_carbs' && w[2] === 150), 'the why line names the picked amount');
});

test('food card: rated for the picked amount, default unchanged, memo per amount', () => {
    const p = clone(ULTJE);
    const d = FC.model(p);
    assert.equal(d.serving.g, 30);
    const m = FC.model(p, 150);
    assert.equal(m.serving.g, 150);
    assert.ok(m.serving.shown.carbs > d.serving.shown.carbs);
    assert.equal(FC.model(p).serving.g, 30, 'the default comes back after a pick');
    assert.match(FC.cardHTML(p, 0, 150), /150 g/);
    assert.match(FC.cardHTML(p, 1, 150), /150 g/);
    assert.match(FC.detailsHTML(p, 2, 150), /class="fc-det"/);
    assert.equal(FC.cardHTML(p, 0, 0), FC.cardHTML(p, 0), 'no amount -> default card');
    const c = FC.model(clone(COLA), 500);
    assert.equal(c.serving.unit, 'ml'); assert.equal(c.serving.g, 500);
    assert.match(FC.cardHTML(clone(COLA), 0, 500), /500 ml/);
});

function loadUI(lang, memory) {
    const store = memory ? { 'lowi.portion.v1': JSON.stringify(memory) } : {}, listeners = {}, events = [];
    const D = { documentElement: { lang }, body: {}, addEventListener: (t, f) => { listeners[t] = f; }, querySelector: () => null, createElement: () => ({}) };
    const W = { document: D, LowiNutriStatsCore: NC, LowiSpikeCore: S, LowiVitalsBridge: { state: () => ({ user: {}, logs: [] }), save() { } }, addEventListener() { }, requestAnimationFrame: () => 0,
        dispatchEvent: e => events.push(e), localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); } } };
    function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; }
    const ctx = vm.createContext({ window: W, localStorage: W.localStorage, MutationObserver: function () { this.observe = () => { }; }, requestAnimationFrame: () => 0, setTimeout, CustomEvent, console });
    vm.runInContext(read('nutri-stats.js'), ctx);
    return { UI: W.LowiNutriStats, store, listeners, events };
}

test('portion block: starts at the pack serving with quick picks, in all three languages', () => {
    const { UI } = loadUI('en');
    const h = UI.portionHTML(clone(MUESLI));
    assert.match(h, /Pack serving/); assert.match(h, /value="40"/);
    assert.match(h, /class="ns-chips" role="group" aria-label="Serving size"/);
    assert.match(h, /data-ns="g" data-g="40" aria-pressed="true">Serving · <b>40 g<\/b>/);
    assert.match(h, /data-g="750" aria-pressed="false">Whole pack · <b>750 g<\/b>/);
    assert.match(h, /data-g="100" aria-pressed="false"><b>100 g<\/b>/);
    assert.deepEqual(JSON.parse(JSON.stringify(UI.servingFor(clone(MUESLI)))), { key: 'bc:4000000000101', grams: 40, from: 'maker', unit: 'g' });
    const de = loadUI('de').UI.portionHTML(clone(MUESLI));
    assert.match(de, /Portion laut Packung/); assert.match(de, /Portionsgröße/); assert.match(de, /Ganze Packung/);
    const es = loadUI('es').UI.portionHTML(clone(MUESLI));
    assert.match(es, /Ración del envase/); assert.match(es, /Tamaño de la ración/); assert.match(es, /Envase entero/);
});

test('portion block: no pack serving -> the usual portion; drinks in ml; last time wins and is a quick pick', () => {
    const { UI } = loadUI('en');
    const u = UI.portionHTML(clone(ULTJE));
    assert.match(u, /Usual portion/); assert.match(u, /value="30"/); assert.match(u, /Usual · <b>30 g<\/b>/); assert.match(u, /Whole pack · <b>150 g<\/b>/);
    const c = UI.portionHTML(clone(COLA));
    assert.match(c, /value="250"/); assert.match(c, /<span>ml<\/span>/); assert.match(c, /Amount in ml/); assert.match(c, /Whole pack · <b>330 ml<\/b>/);
    const L = loadUI('en', { 'bc:4000000000101': 120 });
    const h = L.UI.portionHTML(clone(MUESLI));
    assert.match(h, /Last time/); assert.match(h, /value="120"/);
    assert.match(h, /data-g="120" aria-pressed="true">Last time · <b>120 g<\/b>/);
    assert.equal(L.UI.servingFor(clone(MUESLI)).from, 'last');
    assert.equal(L.UI.servingFor({ name: 'x', facts: {} }), null, 'no facts -> nothing to rate');
});

test('portion block: a quick pick sets the amount, tells the card (lowi:portion) and the meal log keeps it', () => {
    const L = loadUI('en');
    const p = clone(MUESLI);
    L.UI.portionHTML(p);
    const inp = { value: '40' }, tiles = { innerHTML: '' }, lab = { textContent: '' }, chips = [40, 750, 100].map(g => ({ g, pressed: null, getAttribute: k => (k === 'data-g' ? String(g) : null), setAttribute(k, v) { this.pressed = v; } }));
    const box = { getAttribute: k => (k === 'data-ns-key' ? 'bc:4000000000101' : null), querySelector: s => (s === '.ns-g' ? inp : s === '.ns-tiles' ? tiles : s === '.ns-plab' ? lab : null), querySelectorAll: () => chips };
    const btn = { getAttribute: k => (k === 'data-ns' ? 'g' : k === 'data-g' ? '100' : null), closest: s => (s === '.ns-portion' ? box : null) };
    L.listeners.click({ target: { closest: () => btn }, preventDefault() { }, stopPropagation() { } });
    assert.equal(inp.value, 100); assert.equal(lab.textContent, 'Your portion');
    assert.deepEqual(chips.map(c => c.pressed), ['false', 'false', 'true']);
    assert.equal(L.events.length, 1); assert.equal(L.events[0].type, 'lowi:portion'); assert.equal(L.events[0].detail.grams, 100);
    assert.equal(L.UI.logMacros(p).grams, 100);
    L.listeners.click({ target: { closest: () => btn }, preventDefault() { }, stopPropagation() { } });
    assert.equal(L.events.length, 1, 'the same amount again re-rates nothing');
});

test('card wiring: the scanned card is rated for the portion block amount and redraws live', () => {
    const idx = read('index.html');
    const card = idx.slice(idx.indexOf('function simpleCardHTML(p){'), idx.indexOf('function actsHTML(p)'));
    assert.match(card, /const sv = scServing\(p\), g = scUserG\(sv\); p = scView\(p, sv\);/);
    assert.match(card, /LowiFoodCard\.cardHTML\(p, LI\(\), g(, \{swaps: !!szs\})?\)/);
    assert.match(card, /LowiFoodCard\.detailsHTML\(p, LI\(\), g\)/);
    assert.match(idx, /function scUserG\(sv\)\{ return sv && \(sv\.from === "last" \|\| sv\.from === "mine"\)/, 'the default amount keeps the stored verdict');
    assert.match(idx, /addEventListener\("lowi:portion", \(\) => \{ clearTimeout\(scPortT\); scPortT = setTimeout\(scRedrawServing, 120\); \}\)/);
    assert.match(idx, /for \(const sel of \["\.sc-verd", "\.fc-card", "\.fc-det", "ul\.b3-why"\]\)/, 'the portion block (and what you type) is never redrawn');
    assert.match(idx, /const meta = LV_B3\[scView\(p, scServing\(p\)\)\.verdict\]/, 'the meal log level follows the amount you ate');
    assert.match(read('nutri-stats.css'), /\.ns-chip\[aria-pressed="true"\]/);
    assert.match(read('nutri-stats.css'), /\.ns-chip \{ min-height: 44px;/);
});
