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
    if (opts.meal === false) delete W.LowiSpirit.meal;
    D.dispatchEvent = () => { };
    vm.createContext(W);
    vm.runInContext(SRC, W);
    const real = W.LowiHomeBloomsV2;
    real.mount(D);
    /* plain copies: arrays made inside the vm realm are not deep-equal to this realm's arrays */
    const api = { open: k => real.open(k), actions: k => JSON.parse(JSON.stringify(real.actions(k))) };
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

const LABELS = {
    /* Oct 24 2026 (Emmanuel: one word per bubble, "Mahlzeit eintragen" was too long): Log meal became Meal */
    en: ['Shop', 'Cook', 'Meal'],
    de: ['Einkaufen', 'Kochen', 'Mahlzeit'],
    es: ['Comprar', 'Cocinar', 'Comida']
};

test('Fuel blooms exactly Shop, Cook and Log meal, in that order, with every module present', () => {
    const { api } = page();
    assert.deepStrictEqual(api.actions('fuel').map(a => a.id), ['shop', 'cook', 'log']);
});

test('Fuel orbs use the same plain words in English, German and Spanish', () => {
    for (const lang of Object.keys(LABELS)) {
        const { api } = page({ lang });
        assert.deepStrictEqual(api.actions('fuel').map(a => a.label), LABELS[lang], lang);
        /* sublines are 9px and one line in a 71px orb (375-wide phones): longer than about 12 characters gets cut with an
           ellipsis (seen live: "was kann ich kaufen?", "was du gegessen hast", "what can I buy?" at 375), so short or none */
        api.actions('fuel').forEach(a => assert.ok(!a.sub || a.sub.length <= 12, lang + ' ' + a.id + ' subline short enough to show whole: ' + a.sub));
        /* Oct 24 2026 (Emmanuel: "Kochen" + "Rezepte" said it twice): no Fuel orb has a subline any more, one word each */
        api.actions('fuel').forEach(a => { assert.ok(!a.sub, lang + ' ' + a.id + ' has no second line: ' + a.sub); assert.ok(!/\s/.test(a.label), lang + ' one word: ' + a.label); });
    }
});

test('Swap and Today\'s step are gone from Fuel in every language, even when Craving SOS and a pick exist', () => {
    for (const lang of Object.keys(LABELS)) {
        const { api } = page({ lang, sos: true });
        const acts = api.actions('fuel');
        assert.ok(!acts.some(a => a.id === 'swap' || a.id === 'step' || a.id === 'snack'), lang + ' ids ' + acts.map(a => a.id));
        assert.ok(!acts.some(a => /swap|tauschen|cambiar|today|heute|hoy/i.test(a.label + ' ' + a.sub)), lang + ' words ' + acts.map(a => a.label + '/' + a.sub));
    }
});

test('Log meal carries no subline: its label already says it, and German / Spanish labels need both lines', () => {
    for (const lang of Object.keys(LABELS)) {
        const log = page({ lang }).api.actions('fuel').find(a => a.id === 'log');
        assert.ok(log && !log.sub, lang + ' log sub: ' + (log && log.sub));
    }
});

test('meal logging is a visible orb that opens the meal log sheet', () => {
    const { tapOrb, calls } = page();
    tapOrb('log');
    assert.deepStrictEqual(calls, ['meal']);
});

test('Shop keeps its destination: the "What can I buy here?" panel', () => {
    const { tapOrb, calls } = page();
    tapOrb('shop');
    assert.deepStrictEqual(calls, ['store:home-bloom']);
});

test('Cook keeps its destination: the Cook tab', () => {
    const { tapOrb, calls } = page();
    tapOrb('cook');
    assert.deepStrictEqual(calls, ['go:shelf']);
});

test('holding Fuel (Einkaufen since the Oct 28 food plan) does nothing but squish: one gesture per bubble', () => {
    const { hold, calls } = page();
    hold();
    assert.deepStrictEqual(calls, []);
});

test('a missing module leaves its orb out rather than showing a dead button', () => {
    assert.deepStrictEqual(page({ store: false }).api.actions('fuel').map(a => a.id), ['cook', 'log']);
    assert.deepStrictEqual(page({ host: false }).api.actions('fuel').map(a => a.id), ['shop', 'log']);
    assert.deepStrictEqual(page({ meal: false }).api.actions('fuel').map(a => a.id), ['shop', 'cook']);
});

test('Water, Move and Gap blooms are untouched by the Fuel change', () => {
    const { api } = page();
    assert.deepStrictEqual(api.actions('water').map(a => a.id), ['sips', 'cup', 'bottle']); /* Oct 23 water by sips (tests/water-sips.test.cjs) */
    assert.deepStrictEqual(api.actions('gap').map(a => a.id), []);
});
