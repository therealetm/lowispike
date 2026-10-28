'use strict';
/* Fuel bloom navigation (Oct 18, 2026, E-man's handoff: "Fuel: only Shop and Cook, plus a meal log button you can actually
   see (not hidden behind a hold). Swap is removed for good.").
   Runs the real home-blooms-v2.js page part in a small fake window (node:vm) so the orbs, their order, their words in all
   three languages and where each one goes are checked as behaviour, not as source text.
   Browser check: tests/home-blooms-v2-live.cjs (Chromium 390x844, WebKit iPhone 13, WebKit iPad). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'home-blooms-v2.js'), 'utf8');

function classList() {
    const s = new Set();
    return { add: (...c) => c.forEach(x => s.add(x)), remove: (...c) => c.forEach(x => s.delete(x)), contains: c => s.has(c), toggle: c => (s.has(c) ? s.delete(c) : s.add(c)) };
}
function el(tag) {
    const attrs = {}, handlers = {};
    const e = {
        tagName: String(tag || 'div').toUpperCase(), dataset: {}, style: { setProperty() { } }, classList: classList(), innerHTML: '', hidden: false, offsetWidth: 1,
        setAttribute(k, v) { attrs[k] = String(v); }, getAttribute(k) { return k in attrs ? attrs[k] : null; },
        addEventListener(n, f) { (handlers[n] = handlers[n] || []).push(f); }, removeEventListener() { }, fire(n, ev) { (handlers[n] || []).forEach(f => f(ev)); },
        querySelector() { return null; }, querySelectorAll() { return []; }, contains(x) { return x === e; }, closest() { return null; },
        appendChild(c) { return c; }, remove() { e.removed = true; }, click() { }, focus() { },
        getBoundingClientRect() { return { left: 20, top: 380, width: 76, height: 76, right: 96, bottom: 456 }; }
    };
    return e;
}

/* a fake page with the ring's Fuel bubble and every Fuel destination the app has today, each one recording its call */
function page(opts) {
    opts = opts || {};
    const calls = [];
    const fuel = el('div'); fuel.setAttribute('data-orbit', 'fuel'); fuel.closest = sel => (sel === '[data-orbit]' ? fuel : null);
    const sos = el('div'); sos.id = 'sos';
    const winH = {};
    const D = el('html');
    Object.assign(D, {
        head: el('head'), body: el('body'), documentElement: Object.assign(el('html'), { lang: opts.lang || 'en' }), currentScript: null,
        createElement: t => el(t), getElementById: id => (id === 'sos' && opts.sos !== false ? sos : null),
        querySelector: sel => (sel === '[data-orbit="fuel"]' ? fuel : null), activeElement: null
    });
    const W = {
        document: D, innerWidth: 390, innerHeight: 844, console, Date, Math, JSON, String, Array, Object, isFinite, setTimeout: (f) => { f(); return 0; }, clearTimeout() { },
        matchMedia: () => ({ matches: true }), CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
        addEventListener(n, f) { (winH[n] = winH[n] || []).push(f); }, removeEventListener() { }, dispatchEvent() { },
        localStorage: { getItem: () => null, setItem() { } }, navigator: {}
    };
    W.window = W;
    W.LowiSpirit = { meal: () => calls.push('meal'), showPick: () => calls.push('pick'), water() { }, refresh() { } };
    W.LowiSpiritCore = { pickFor: () => ({ recipe: { n: 'Egg muffins' }, why: 'protein' }) };
    W.LowiSwafloBridge = { catalog: () => [{ n: 'Egg muffins', ing: ['egg'] }] };
    if (opts.store !== false) W.LowiStorePicks = { open: src => calls.push('store:' + src) };
    if (opts.host !== false) W.LowiHost = { go: tab => calls.push('go:' + tab) };
    if (opts.gap !== false) W.LowiGapView = { open: o => calls.push('gap:' + ((o && o.from) || '')) };
    if (opts.meal === false) delete W.LowiSpirit.meal;
    D.dispatchEvent = () => { };
    vm.createContext(W);
    vm.runInContext(SRC, W);
    const real = W.LowiHomeBloomsV2;
    real.mount(D);
    /* plain copies: arrays made inside the vm realm are not deep-equal to this realm's arrays */
    const api = { open: k => real.open(k), openAll: () => real.openAll(), hub: f => real.hub(f), isOpen: () => real.isOpen(), actions: k => JSON.parse(JSON.stringify(real.actions(k))), ring: () => JSON.parse(JSON.stringify(real.RING)) };
    /* tap an orb the way a finger does: open the bloom from the Fuel bubble, click the orb with that id */
    const tapOrb = id => {
        assert.ok(api.open('fuel'), 'Fuel bloom opens');
        const bloom = W.__lastBloom;
        const t = { dataset: { hb2: 'act', id } };
        bloom.fire('click', { target: { closest: () => t }, preventDefault() { }, stopPropagation() { } });
    };
    const origCreate = D.createElement;
    D.createElement = t => { const e = origCreate(t); if (String(t) === 'div') W.__lastBloom = e; return e; };
    const hold = () => { (winH.pointerdown || []).forEach(f => f({ target: fuel, clientX: 50, clientY: 400 })); };
    return { api, calls, tapOrb, hold, W };
}

/* Oct 28 2026 (Emmanuel, iPhone: "wenn du was änderst, dann musst du das doch überall ändern"): the Oct 28 food plan made the Home
   tap on Fuel open Einkaufen, but kept the Shop / Cook / Meal bloom for open('fuel'). The companion sheet's "Ballaststoffe: noch
   13 g" row still asked for it, so the old three bubbles came back. Fuel brings no orbs any more, whoever asks. */
test('Fuel brings no orbs in any language, even with every module present', () => {
    for (const lang of ['en', 'de', 'es']) {
        const { api } = page({ lang, sos: true });
        assert.deepStrictEqual(api.actions('fuel'), [], lang);
    }
});

test('open(\'fuel\') from any module opens Einkaufen (Supermarkt), not a bloom', () => {
    const { api, calls, W } = page();
    W.__lastBloom = null;
    assert.strictEqual(api.open('fuel'), true);
    assert.deepStrictEqual(calls, ['store:home-shop']);
    assert.strictEqual(api.isOpen(), null, 'no bloom is open');
});

test('without the Einkaufen module, open(\'fuel\') falls back to the eating hub, never to orbs', () => {
    const { api, calls } = page({ store: false });
    assert.strictEqual(api.open('fuel'), true);
    assert.deepStrictEqual(calls, ['gap:fuel']);
    assert.strictEqual(api.isOpen(), null);
});

test('the eating hub (Essenspause) opens from hub(): log a meal and Kochen live there', () => {
    const { api, calls } = page();
    assert.strictEqual(api.hub('peak'), true);
    assert.deepStrictEqual(calls, ['gap:peak']);
    const b = page({ gap: false });
    assert.strictEqual(b.api.hub('peak'), true, 'without the hub, the meal log sheet opens');
    assert.deepStrictEqual(b.calls, ['meal']);
});

test('holding Fuel (Einkaufen since the Oct 28 food plan) does nothing but squish: one gesture per bubble', () => {
    const { hold, calls } = page();
    hold();
    assert.deepStrictEqual(calls, []);
});

test('Water, Move and Gap blooms are untouched by the Fuel change', () => {
    const { api } = page();
    assert.deepStrictEqual(api.actions('water').map(a => a.id), ['sips', 'cup', 'bottle']); /* Oct 23 water by sips (tests/water-sips.test.cjs) */
    assert.deepStrictEqual(api.actions('gap').map(a => a.id), []);
});
