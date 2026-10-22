'use strict';
/* Oct 22 2026 (Emmanuel: "Even when I finish cooking, there's no 'I just ate it' ... There should be 'I just ate this' or 'I'm going to
   eat this' right in the main shortcut. It comes with the shuffle and the Tinder swipe, and then it logs it automatically.").
   Pins: "I just ate this" logs through the one meal path (logMeal: slot from the clock, macros, XP), the same food twice in a slot counts
   once, the slot can be changed, Undo takes back the log, the XP and the gap clock; "I'll eat this" plans (book recipes through the
   old addtoday path, everything else on td.later) and never logs; the wiring on the Shuffle card, the swipe and the cook-along end;
   three languages, includes and offline cache. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = read('ate-this.js'), HTML = read('index.html');

function el(tag) {
    const e = { tagName: tag, dataset: {}, attrs: {}, children: [], style: {}, hidden: false, innerHTML: '', textContent: '',
        classList: { s: new Set(), add(c) { this.s.add(c); }, remove(c) { this.s.delete(c); }, contains(c) { return this.s.has(c); } },
        setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, removeAttribute(k) { delete this.attrs[k]; },
        appendChild(c) { this.children.push(c); }, remove() { }, closest: () => null, querySelector: () => null, querySelectorAll: () => [],
        click() { if (fake.onClick) fake.onClick(this); } };
    return e;
}
const fake = {};
function boot(opts) {
    opts = opts || {};
    const byId = {}, listeners = {}, storage = { lowi_fast_v1: '{"last":1}' }, toasts = [], events = [];
    const S = { logs: [], ledger: [], xp: 100, td: { day: '2026-10-22', plan: ['rb_meal'], ate: {}, extra: [], picked: {} } };
    const RECS = { rb_meal: { id: 'rb_meal', n: 'Cauliflower Nacho Smash Tray', c: 'meal', book: true, r: 'ja' }, rb_custard: { id: 'rb_custard', n: 'Cinnamon Baked Yogurt Custard', c: 'dessert', book: true, r: 'ja' } };
    const POOL = { 'sf-buy:1': { id: 'sf-buy:1', buy: true, n: 'Skyr', product: { name: 'Skyr Natur', code: '4000', verdict: 'low' } }, com1: { id: 'com1', com: true, n: 'Mia\'s bowl' } };
    const key = t => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const V = {
        state: () => S, save: () => true,
        mealDup(d) { d = d || {}; const sl = d.slot || '', k = key(d.t); return S.logs.find(l => (!sl || !l.slot || l.slot === sl) && ((d.code && l.code === d.code) || (k && key(l.t) === k))) || null; },
        logMeal(d) { const id = 'meal:' + d.id; if (this.mealDup(d)) return { log: null, xp: 0, dup: true, why: 'dup' }; const log = { id: d.id, eventId: id, t: d.t, macros: d.macros, slot: d.slot, code: d.code || undefined, via: d.via, ts: Date.now() };
            S.logs.push(log); S.ledger.push({ eventId: id, amt: 15 }); S.xp += 15; storage.lowi_fast_v1 = '{"last":2}'; return { log, xp: 15, why: '' }; },
        unaward(id) { const i = S.ledger.findIndex(e => e.eventId === id); if (i < 0) return 0; S.ledger.splice(i, 1); S.xp -= 15; return 15; }
    };
    const D = { documentElement: { lang: opts.lang || 'en' }, body: el('body'),
        addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); }, getElementById: id => byId[id] || null, querySelector: () => null, querySelectorAll: () => [],
        createElement: t => { const e = el(t); Object.defineProperty(e, 'id', { set(v) { byId[v] = e; this._id = v; }, get() { return this._id; } }); return e; } };
    D.body.appendChild = c => { D.body.children.push(c); };
    const W = { document: D, LowiVitalsBridge: V, LowiLang: opts.dict ? { t: s => opts.dict[s] || s, get: () => opts.lang || 'en' } : undefined, LowiP2: { rec: id => RECS[id] || null }, LowiSpiritCore: { slotFor: () => opts.slot || 'lunch', macros: r => ({ kcal: 300, r: r.id }) },
        toast: m => toasts.push(m), MutationObserver: function () { this.observe = () => { }; }, requestAnimationFrame: f => 0, addEventListener() { },
        dispatchEvent: e => events.push(e.type), CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
        localStorage: { getItem: k => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: k => { delete storage[k]; } } };
    W.window = W;
    const ctx = Object.assign(W, { fById: id => POOL[id] || null, console, Date, Math, String, Number, Object, Array, JSON, Set, setTimeout: () => 0, clearTimeout() { }, CustomEvent: W.CustomEvent, localStorage: W.localStorage });
    vm.runInNewContext(SRC, ctx);
    fake.onClick = b => { if (b.dataset.td === 'addtoday') toasts.push('addtoday:' + b.dataset.id); };
    return { A: W.LowiAte, S, storage, toasts, events, listeners, byId };
}

test('I just ate this: one tap logs an eaten meal through logMeal, slot from the clock, macros, XP, and the plan copy is ticked', () => {
    const { A, S } = boot({ slot: 'dinner' });
    const r = A.logNow('rb_meal');
    assert.ok(r && r.log, 'logged');
    assert.strictEqual(S.logs.length, 1);
    assert.strictEqual(S.logs[0].t, 'Cauliflower Nacho Smash Tray');
    assert.strictEqual(S.logs[0].slot, 'dinner');
    assert.deepStrictEqual(S.logs[0].macros, { kcal: 300, r: 'rb_meal' });
    assert.strictEqual(S.xp, 115);
    assert.strictEqual(S.td.ate[0], true, 'the planned copy is marked eaten, so it never logs twice');
});

test('bug hunt Oct 22: the bar and the plan show the recipe name in the app language (the log keeps the English key)', () => {
    const dict = { 'Cinnamon Baked Yogurt Custard': 'Zimt-Joghurt-Pudding aus dem Ofen', 'Skyr Natur': 'Skyr Natur' };
    const { A, S, byId } = boot({ lang: 'de', dict });
    A.logNow('rb_custard');
    assert.strictEqual(S.logs[0].t, 'Cinnamon Baked Yogurt Custard', 'stored name stays the canonical one, so one meal still counts once');
    const bar = byId.ateBar;
    assert.match(bar.innerHTML, /Zimt-Joghurt-Pudding aus dem Ofen/); assert.doesNotMatch(bar.innerHTML, /Cinnamon Baked/);
    A.logNow('rb_custard'); assert.match(byId.ateBar.innerHTML, /Zimt-Joghurt-Pudding aus dem Ofen/, 'the already-logged bar too');
    S.td.later = [{ key: 'x', t: 'Cinnamon Baked Yogurt Custard' }];
    assert.match(A.planHTML(S.td), /Zimt-Joghurt-Pudding aus dem Ofen/);
});

test('the same meal twice counts once (fair play), products log with their barcode', () => {
    const { A, S, storage } = boot();
    A.logNow('rb_custard'); const again = A.logNow('rb_custard');
    assert.ok(again.dup); assert.strictEqual(S.logs.length, 1); assert.strictEqual(S.xp, 115);
    A.logNow('sf-buy:1'); assert.strictEqual(S.logs[1].t, 'Skyr Natur'); assert.strictEqual(S.logs[1].code, '4000');
    assert.ok(storage.lowi_fast_v1);
});

test('the slot can be changed after logging, and Undo takes back the log, the XP and the gap clock', () => {
    const { A, S, storage } = boot({ slot: 'lunch' });
    A.logNow('rb_custard'); assert.strictEqual(storage.lowi_fast_v1, '{"last":2}');
    A.changeSlot('snack'); assert.strictEqual(S.logs[0].slot, 'snack');
    A.undo();
    assert.strictEqual(S.logs.length, 0); assert.strictEqual(S.xp, 100); assert.strictEqual(S.ledger.length, 0);
    assert.strictEqual(storage.lowi_fast_v1, '{"last":1}', 'the gap clock is back to before');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(S.td.ate)), {});
});

test("I'll eat this plans and never logs: book recipes via the Today plan path, others on td.later with an Ate it", () => {
    const { A, S, toasts } = boot();
    A.planLater('rb_custard'); assert.ok(toasts.includes('addtoday:rb_custard')); assert.strictEqual(S.logs.length, 0);
    A.planLater('sf-buy:1'); assert.strictEqual(S.td.later.length, 1); assert.strictEqual(S.logs.length, 0);
    A.planLater('sf-buy:1'); assert.strictEqual(S.td.later.length, 1, 'not planned twice');
    const h = A.planHTML(S.td); assert.match(h, /data-ate="laterate"/); assert.match(h, /Planned · not eaten yet/);
    A.logNow('sf-buy:1'); assert.ok(S.td.later[0].ate, 'eating it marks the planned copy eaten');
    assert.match(A.planHTML(S.td), /Eaten/);
});

test('markup: the pair, the cook-along end with I just ate this as the main button, three languages', () => {
    const { A } = boot();
    const d = A.doneNav({ id: 'rb_meal', n: 'Tray' });
    assert.match(d, /r2-btn pri big ate-now[^>]*data-ate="now"/); assert.match(d, /data-ate="later"/); assert.match(d, /I just ate this/);
    assert.match(A.pairHTML('x'), /I just ate this[\s\S]*I&#39;ll eat this/);
    for (const l of ['en', 'de', 'es']) for (const k of ['now', 'later', 'ateIt', 'eaten', 'logged', 'dup', 'undo', 'undone', 'planned', 'plannedTag', 'breakfast', 'lunch', 'dinner', 'snack']) assert.ok(A.TX[l][k], l + ' ' + k);
    const de = boot({ lang: 'de' }).A; assert.match(de.pairHTML('x'), /Gerade gegessen/);
});

test('wiring: included after one-sheet.css, cached offline, cook end, swipe right and the plan use it', () => {
    assert.match(HTML, /one-sheet\.css\?v=[^"]+">\s*<!--[^>]*-->\s*<link rel="stylesheet" id="ateCss" href="ate-this\.css\?v=[^"]+">\s*<script src="ate-this\.js\?v=[^"]+"><\/script>/);
    const sw = read('sw.js'); assert.match(sw, /"ate-this\.css", "ate-this\.js"/);
    assert.match(HTML, /i >= n \? \(window\.LowiAte \? LowiAte\.doneNav\(r\)/);
    assert.match(HTML, /dir === "right" && window\.LowiAte\) LowiAte\.offer\(id\)/);
    assert.match(HTML, /LowiAte\.extraBtn\(r\.id\)/); assert.match(HTML, /LowiAte\.planHTML\(d\)/);
    assert.match(read('ate-this.css'), /\.ate-bar \{[^}]*position: fixed/);
});
