'use strict';
/* Oct 26, 2026 scan-why (Emmanuel, on the scanner card for K-Classic "Mandeln Stifte": "Let's add a little graph in there ... when it says
   moderate, what does that mean? Can I eat this every day? Every week? ... I need to know exactly how many times I can eat this ...
   just a little tap button to understand the reasoning ... a simple explanation that a 9-year-old and a 70-80-year-old would
   understand"). The one scanner card (shop-scan.js) gets a tiny estimated blood sugar curve, a "How often" line in numbers, a
   collapsed Why?, a plain portion source line in Details, and plain nuts / hard cheese get their real usual portion (30 g). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const S = require('../spike-core.js');
const C = require('../shop-scan-core.js');

const almonds = { name: 'Mandeln Stifte', brand: 'K-Classic', barcode: '4337185000001', ingredients: 'Mandeln', facts: { s: 4, c: 4.1, f: 8, p: 26, fat: 55, kcal: 632 } };
const gouda = { name: 'Gouda jung', brand: 'Milsani', cat: 'dairy', ingredients: 'Milch, Salz, Milchsäurebakterien, Lab', facts: { s: 0.1, c: 0.1, p: 25, fat: 30, kcal: 360 } };
const cola = { name: 'Cola', cat: 'drink', ingredients: 'Wasser, Zucker, Kohlensäure', facts: { s: 10.6, c: 10.6, drink: true, kcal: 42 } };
const muesli = { name: 'Schoko Müsli', ingredients: 'Haferflocken, Zucker, Schokolade 10%', facts: { c: 62, s: 18, f: 7, p: 9, fat: 9, kcal: 410 } };

test('almonds: the usual portion is a small handful (30 g, the policy\'s own nut portion), so the verdict is Lower, not Moderate', () => {
    const a = S.assess(almonds);
    assert.equal(a.engine.serving.g, 30, 'usual portion for plain nuts is 30 g, not the invented 50 g of "other"');
    assert.equal(a.engine.serving.group, 'nuts', 'the portion group rides along for the Details source line');
    assert.equal(S.tighten(almonds, a), 'ok', 'Lower at the usual portion');
    const big = S.assess(almonds, { servingG: 50 });
    assert.equal(S.tighten(almonds, big), 'better', '50 g of nuts is still a big portion (policy.nuts_large): Moderate');
});

test('hard cheese uses its own usual portion (30 g), not the 150 g of a dairy pot', () => {
    const a = S.assess(gouda);
    assert.equal(a.engine.serving.g, 30);
    assert.equal(a.engine.serving.group, 'cheese');
    assert.equal(S.tighten(gouda, a), 'ok');
});

test('the card verdict at a chosen amount is the same rule as the first verdict (tightened), never looser', () => {
    assert.equal(C.levelAt(almonds, 30), 'none');
    assert.equal(C.levelAt(almonds, 50), 'mild', 'picking 50 g of almonds must not jump back to Lower');
    assert.equal(C.levelAt(cola, 330), 'spike');
});

test('explain: How often in numbers for every verdict, and the portion reason for big nut portions (EN/DE/ES)', () => {
    for (const lang of ['en', 'de', 'es']) {
        const lo = C.explain(almonds, 30, 'none', lang), mid = C.explain(almonds, 50, 'mild', lang), hi = C.explain(cola, 330, 'spike', lang), un = C.explain({ name: 'X' }, 0, 'unknown', lang);
        for (const e of [lo, mid, hi, un]) { assert.ok(e && e.often && e.often.length > 8, lang + ' often'); assert.ok(e.lines.length >= 2 && e.lines.length <= 4, lang + ' 2-4 short lines'); for (const l of e.lines) assert.ok(l.length < 190, lang + ' short line: ' + l); }
        assert.match(lo.often, /every day|jeden Tag|todos los días/i);
        assert.match(mid.often, /30 g/, 'a big nut portion names the small handful that is fine every day');
        assert.match(mid.lines.join(' '), /316 kcal/, 'why names the energy in 50 g');
        assert.match(hi.often, /once a week|einmal pro Woche|una vez por semana/i);
        assert.match(un.often, /can't|nicht|no podemos/i);
    }
    const m = C.explain(muesli, 50, 'spike', 'en');
    assert.match(m.lines.join(' '), /sugar/i, 'a sugary food names the sugar');
    assert.match(C.explain(almonds, 30, 'none', 'en').lines.join(' '), /1[.,]2 g carbs .*little to turn into sugar/i, 'a low carb food says there is little to turn into sugar');
});

test('curve: a gentle low hump for Lower, taller for Moderate, a sharp spike for Higher', () => {
    const pk = l => C.curve(l).peak;
    assert.ok(C.curve('none') && C.curve('mild') && C.curve('spike'));
    assert.equal(C.curve('unknown'), null);
    assert.ok(pk('none') < pk('mild') && pk('mild') < pk('spike'));
    for (const l of ['none', 'mild', 'spike']) assert.match(C.curve(l).d, /^M[\d .,CSLQ-]+$/);
    for (const k of ['graphL', 'oftenH', 'whyB', 'psrc_maker', 'psrc_nuts', 'psrc_cheese', 'psrc_group', 'psrc_last', 'psrc_mine', 'whyFoot'])
        for (const i of [0, 1, 2]) assert.ok(C.TX[k] && C.TX[k][i], 'string ' + k + ' in all 3 languages');
});

/* --- the card itself (stub DOM, same harness as one-scanner.test.cjs) --- */
function stubEl(cls) {
    const kids = [], classes = new Set(cls || []);
    return {
        dataset: {}, children: kids, isConnected: true, innerHTML: '',
        classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle: (c, on) => (on === false || (on === undefined && classes.has(c)) ? classes.delete(c) : classes.add(c)) },
        setAttribute() { }, getAttribute() { return null; }, appendChild(k) { kids.push(k); return k; },
        querySelector(sel) { if (sel === '.ss-card') return kids.find(k => k.className === 'ss-card') || null; return null; },
        querySelectorAll() { return []; }, closest() { return null; }, remove() { }
    };
}
function load() {
    const W = {
        LowiShopScanCore: C, LowiSpikeCore: S, LowiLang: { get: () => 'en' },
        LowiDex: { rate: p => S.assess(p), prep: p => p, view: p => p, stop() { }, scan() { }, shopOn: () => false, swap: () => null, bubbleInfo: () => null },
        addEventListener() { }, dispatchEvent() { return true; }, localStorage: { getItem: () => null, setItem() { } }, sessionStorage: { getItem: () => null, setItem() { } },
        setTimeout, clearTimeout, requestAnimationFrame: f => setTimeout(f, 0), performance: { now: () => Date.now() }
    };
    const D = { readyState: 'complete', documentElement: { lang: 'en' }, body: stubEl(), addEventListener() { }, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl() };
    const ctx = { window: W, document: D, CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; }, console, setTimeout, clearTimeout };
    W.window = W; W.document = D; W.CustomEvent = ctx.CustomEvent;
    vm.createContext(ctx); vm.runInContext(read('shop-scan.js'), ctx);
    return W;
}
function card(W, p, o) { const el = stubEl(['b3-cam']); W.LowiShopScan.show(el, p, o || { ctx: 'shop' }); const c = el.children.find(k => k.className === 'ss-card'); return c ? c.innerHTML : ''; }

test('the card: one verdict with a tiny labelled curve, How often, a collapsed Why? button, no clunky "estimated blood sugar impact" line', () => {
    const W = load(), h = card(W, almonds);
    assert.match(h, /class="ss-vw">Lower</, 'almonds read Lower at a small handful');
    assert.match(h, /<svg[^>]*class="ss-curve"/, 'a tiny curve');
    assert.match(h, /Estimate, not a measurement/, 'the curve is labelled');
    assert.match(h, /class="ss-often"/); assert.match(h, /Fine every day/);
    assert.match(h, /data-ss="why"[^>]*aria-expanded="false"/, 'Why? is a collapsed toggle');
    assert.match(h, /class="ss-whyp"[^>]*hidden/, 'the explanation is hidden until tapped');
    assert.doesNotMatch(h, /estimated blood sugar impact/, 'no repeated "estimate ... estimated" line');
    assert.doesNotMatch(h, /<ul class="ss-why">/, 'the Why list moved out of Details into the Why? tap');
    assert.match(h, /class="ss-psrc"[^>]*>[^<]*<b>30 g<\/b>[^<]*usual portion of nuts/i, 'Details says plainly where the portion came from');
    const u = card(W, { name: 'Mystery', barcode: '1' });
    assert.doesNotMatch(u, /<svg[^>]*class="ss-curve"/, 'no curve without numbers');
    assert.match(u, /class="ss-often"/);
});

test('Why? toggles, the portion handler re-renders through the same rule, Reduce Motion stops the curve drawing', () => {
    const js = read('shop-scan.js'), css = read('shop-scan.css');
    assert.match(js, /k === 'why'/, 'click handler for Why?');
    assert.match(js, /C\.levelAt\(/, 'picking an amount re-rates with the same tightened rule');
    assert.match(css, /prefers-reduced-motion[^}]*\{[^}]*\.ss-curve/, 'no curve animation with Reduce Motion');
});
