'use strict';
/* Einkaufen bubbles (Oct 28 2026, 23:00). Emmanuel, call: "Whilst we edit, when I click on shopping, I want supermarket, Home,
   Seller Zone and Hilf mit to also be bubbles. And then when you click on those bubbles, it takes you to those pages. Don't you think
   that it's more aligned to our design?"
   The Einkaufen bubble now opens a bloom like Water / Move / Sleep (home-blooms-v2.js RING fuel = 'bloom'); its orbs are Einkaufen's own
   doors from store-picks.js doors(), and a tap on one opens Einkaufen right on that page (openAt). Browser check:
   /home/sprite/shopb-probe.cjs (Chromium 390x844 and WebKit iPhone sizes). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = read('home-blooms-v2.js');

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

/* the real home-blooms-v2.js page part in a fake window: ring bubbles + every destination, each one recording its call */
function page(opts) {
    opts = opts || {};
    const calls = [];
    const bubbles = {};
    ['fuel', 'water', 'move', 'gap'].forEach(k => { const b = el('div'); b.setAttribute('data-orbit', k); b.closest = sel => (sel === '[data-orbit]' ? b : null); bubbles[k] = b; });
    const winH = {};
    const D = el('html');
    Object.assign(D, {
        head: el('head'), body: el('body'), documentElement: Object.assign(el('html'), { lang: opts.lang || 'de' }), currentScript: null,
        createElement: t => el(t), getElementById: () => null,
        querySelector: sel => { const m = /data-orbit="(\w+)"/.exec(sel); return m ? bubbles[m[1]] || null : null; }, activeElement: null
    });
    const W = {
        document: D, innerWidth: 390, innerHeight: 844, console, Date, Math, JSON, String, Array, Object, isFinite, setTimeout: (f) => { f(); return 0; }, clearTimeout() { },
        matchMedia: () => ({ matches: true }), CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
        addEventListener(n, f) { (winH[n] = winH[n] || []).push(f); }, removeEventListener() { }, dispatchEvent() { },
        localStorage: { getItem: () => null, setItem() { } }, navigator: {}
    };
    W.window = W;
    W.LowiSpirit = { meal: () => calls.push('meal'), water() { }, refresh() { } };
    const doors = opts.doors || [{ id: 'shop', label: 'Supermarkt' }, { id: 'home', label: 'Zu Hause' }, { id: 'sz', label: 'Seller Zone' }, { id: 'gift', label: 'Hilf mit' }];
    W.LowiStorePicks = { open: src => calls.push('store:' + src), doors: () => doors.slice(), openAt: (id, from) => { calls.push('at:' + id + ':' + from); return true; } };
    W.LowiHost = { go: tab => calls.push('go:' + tab) };
    W.LowiGapView = { open: o => calls.push('gap:' + ((o && o.from) || '')) };
    W.LowiMistyHub = { close: () => calls.push('sheet:close') };
    D.dispatchEvent = () => { };
    let blooms = 0;
    const origCreate = D.createElement;
    D.createElement = t => { const e = origCreate(t); if (String(t) === 'div') blooms++; return e; };
    vm.createContext(W);
    vm.runInContext(SRC, W);
    const B = W.LowiHomeBloomsV2;
    B.mount(D);
    const tap = k => (winH.click || []).forEach(f => f({ target: bubbles[k], preventDefault() { }, stopImmediatePropagation() { }, stopPropagation() { } }));
    return { B, W, D, calls, tap, blooms: () => blooms, plain: x => JSON.parse(JSON.stringify(x)) };
}


test('a tap on Einkaufen opens its bloom with the four doors as orbs, nothing opens yet', () => {
    const p = page();
    p.tap('fuel');
    assert.strictEqual(p.B.isOpen(), 'fuel');
    assert.deepStrictEqual(p.calls, [], 'no page opens on the bubble tap');
    assert.deepStrictEqual(p.plain(p.B.actions('fuel')).map(a => a.id + '=' + a.label), ['buy-shop=Supermarkt', 'buy-home=Zu Hause', 'buy-sz=Seller Zone', 'buy-gift=Hilf mit']);
});

test('a second tap on Einkaufen folds the bloom again (same toggle as Water / Move / Sleep)', () => {
    const p = page();
    p.tap('fuel');
    assert.strictEqual(p.B.isOpen(), 'fuel');
    p.tap('fuel');
    assert.strictEqual(p.B.isOpen(), null);
});

test('open(fuel) from the tutorial or other code opens the same bloom', () => {
    const p = page();
    assert.strictEqual(p.B.open('fuel'), true);
    assert.strictEqual(p.B.isOpen(), 'fuel');
    assert.deepStrictEqual(p.calls, []);
});

test('each orb opens Einkaufen right on its own page (openAt with that door) and the bloom folds', () => {
    for (const id of ['shop', 'home', 'sz', 'gift']) {
        const p = page();
        const made = [];
        const mk = p.D.createElement;
        p.D.createElement = t => { const e = mk(t); made.push(e); return e; };
        p.B.open('fuel');
        const ov = made.find(e => e.id === 'hb2Bloom');
        assert.ok(ov, 'the bloom element');
        const orb = { dataset: { hb2: 'act', id: 'buy-' + id } };
        ov.fire('click', { target: { closest: () => orb }, preventDefault() { }, stopPropagation() { }, isTrusted: false, detail: 0 });
        assert.deepStrictEqual(p.calls, ['at:' + id + ':home-shop-' + id], id);
    }
});

test('only the doors Einkaufen really has become orbs (no Hilf mit before the server table, no dead orb)', () => {
    const p = page({ doors: [{ id: 'shop', label: 'Supermarkt' }, { id: 'sz', label: 'Seller Zone' }, { id: 'nope', label: 'X' }] });
    p.tap('fuel');
    assert.deepStrictEqual(p.plain(p.B.actions('fuel')).map(a => a.id), ['buy-shop', 'buy-sz']);
});

test('the bloom is titled Einkaufen and the overview (hold Scan) keeps its four groups without the shop doors', () => {
    assert.match(SRC, /fuel: \(\) => T\('Shopping', 'Einkaufen', 'Compras'\)/);
    assert.match(SRC, /const ALL = BLOOMS\.filter\(k => k !== 'fuel' && k !== 'gap'\);/, 'Gap (times in a second step, Oct 28 22:54) stays out too');
});

test('Hilf mit appearing later refreshes an open Einkaufen bloom', () => {
    assert.match(SRC, /W\.addEventListener\('lowi:gift-ready', onShopDoors\)/);
    assert.match(SRC, /function onShopDoors\(\) \{ if \(st\.open === 'fuel'\) refreshOpen\(\); \}/);
});

test('store-picks.js: doors() in tab-bar order and openAt() opens on that door; Hilf mit in Einkaufen\'s frame', () => {
    const s = read('store-picks.js');
    const d = s.slice(s.indexOf('function doors()'), s.indexOf('function openAt('));
    const order = ["id: 'shop'", "id: 'home'", "id: 'sz'", "id: 'kitchen'", "id: 'gift'"].map(x => d.indexOf(x));
    assert.ok(order.every(i => i > 0) && order.every((v, i) => !i || v > order[i - 1]), 'same order as the tab bar');
    assert.match(d, /if \(homeTab\(\)\)/, 'Zu Hause only with week-basket.js');
    assert.match(d, /if \(giftDoor\(\)\)/, 'Hilf mit only once the server table is there');
    const o = s.slice(s.indexOf('function openAt('), s.indexOf('W.LowiStorePicks = {'));
    assert.match(o, /if \(!ov\) openPanel\(from \|\| 'home-shop', id\);/);
    assert.match(o, /W\.LowiGiftBasket\.open\('shop'\)/, 'Hilf mit opens in the frame, so X closes Einkaufen itself');
    assert.match(s, /W\.LowiStorePicks = \{ open: openPanel, openAt, doors, close,/);
});

test('the static Home layout (no ring) asks the same map first', () => {
    assert.match(read('sym-home.js'), /B\.open\('fuel'\)\) return; if \(B && typeof B\.shop === 'function' && B\.shop\(\)\) return;/);
});

test('the tour\'s Einkaufen card shows the bloom (fuel-bloom), not the panel', () => {
    assert.match(read('tutorial-steps.js'), /id: 'fuel', area: 'home', target: \['#whHud \.wh-meals'\], demo: \{ g: 'tap', open: 'fuel-bloom' \}/);
});
