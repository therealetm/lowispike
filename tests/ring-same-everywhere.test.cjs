'use strict';
/* Same ring everywhere (Oct 28 2026). Emmanuel, iPhone, German voice note: "Digger, wenn du was änderst, dann musst du das doch
   überall ändern": in the companion sheet, "Was noch fehlt" > "Ballaststoffe: noch 13 g" opened the OLD Fuel bloom (Einkaufen /
   Kochen / Mahlzeit orbs) round the ring, hours after the Oct 28 food plan made the Home tap on that bubble open Einkaufen.
   Cause: the food plan changed the tap only and kept open('fuel') with the three orbs "for code that still asks for the old menu";
   misty-peak.js's food rows (meals, protein, fibre, glow) were that code.
   Now one map (home-blooms-v2.js RING) says what each bubble does, and every entry path reads it. This file opens the ring from
   each path and checks the same answer: the Home tap, the companion sheet rows, open() from other modules (tutorial, old callers),
   the all-bubbles overview, the tutorial picture, and a scan of the app for leftovers of the old trio.
   Browser check: tools/check-ring-same.cjs (Chromium and WebKit iPhone sizes). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = read('home-blooms-v2.js');
const core = require('../home-blooms-v2.js');

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
    W.LowiStorePicks = { open: src => calls.push('store:' + src) };
    W.LowiHost = { go: tab => calls.push('go:' + tab) };
    W.LowiGapView = { open: o => calls.push('gap:' + ((o && o.from) || '')) };
    W.LowiMistyHub = { close: () => calls.push('sheet:close') };
    W.LowiFastStop = { startOf: () => 0, _st: () => ({}), end: () => ({ ok: true }), firstMeal: () => true, w: () => '' };
    W.LowiFastEdit = { save: () => ({ ok: true }) };
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

/* the real go() of the companion sheet (misty-peak.js), run against the same fake window */
function peakGo(W) {
    const src = read('misty-peak.js');
    const i = src.indexOf('    function go(act) {');
    assert.ok(i > 0, 'misty-peak.js has go(act)');
    let d = 0, j = src.indexOf('{', i);
    for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; }
    return vm.runInContext('(function (W) {' + src.slice(i, j + 1) + '; return go; })(window)', W);
}

const OLD_TRIO = /Kochen|Mahlzeit|\bCook\b|\bMeal\b|Cocinar|Comida/;

test('one map says what each ring bubble does', () => {
    /* Oct 28 2026, 23:00 (Emmanuel: Supermarkt, Zu Hause, Seller Zone and Hilf mit "also be bubbles"): Einkaufen blooms;
       22:54 (Emmanuel: "nuke that window"): Gap blooms Letzte / Erste Mahlzeit */
    assert.deepStrictEqual(JSON.parse(JSON.stringify(core.RING)), { fuel: 'bloom', gap: 'bloom', water: 'bloom', move: 'bloom', sleep: 'bloom' });
    assert.deepStrictEqual(core.BLOOMS, ['fuel', 'gap', 'water', 'move', 'sleep']);
    assert.ok(Object.isFrozen(core.RING), 'nobody can change it at run time');
});

test('path 1, Home (old Shop module without doors): a tap on the Einkaufen bubble still opens Einkaufen, no orbs', () => {
    const p = page();
    const before = p.blooms();
    p.tap('fuel');
    assert.deepStrictEqual(p.calls, ['store:home-shop']);
    assert.strictEqual(p.B.isOpen(), null);
    assert.strictEqual(p.blooms(), before, 'no bloom was built');
});

for (const k of ['fiber', 'protein', 'fuel']) {
    test('path 2, companion sheet: the "' + k + '" row under Was noch fehlt opens the Essenspause eating hub, never the old orbs', () => {
        const P = require('../misty-peak.js');
        /* the row's act comes from the real sheet model */
        const acts = { fiber: 'fuel', protein: 'fuel', fuel: 'fuel' };
        assert.ok(/add\('fiber'[^\n]*act: 'fuel'/.test(read('misty-peak.js')) && /add\('protein'[^\n]*act: 'fuel'/.test(read('misty-peak.js')), 'fibre and protein rows use act fuel');
        assert.ok(P && typeof P.read === 'function');
        for (const lang of ['de', 'en', 'es']) {
            const p = page({ lang });
            const before = p.blooms();
            peakGo(p.W)(acts[k]);
            assert.deepStrictEqual(p.calls, ['sheet:close', 'gap:peak'], lang + ': sheet closes, eating hub opens');
            assert.strictEqual(p.B.isOpen(), null, lang + ': no bloom open');
            assert.strictEqual(p.blooms(), before, lang + ': no bloom built');
        }
    });
}

test('path 2b, companion sheet: Water and Move rows still open their own blooms (same map)', () => {
    const p = page();
    const go = peakGo(p.W);
    go('water');
    assert.strictEqual(p.B.isOpen(), 'water');
    p.B.close(true);
    go('move');
    assert.ok(['move', null].includes(p.B.isOpen()), 'move asks the ring (or the Move page when its module is missing)');
});

test('path 3, code (old Shop module without doors): open(\'fuel\') opens Einkaufen, open(\'gap\') the Letzte / Erste Mahlzeit bubbles', () => {
    const p = page();
    assert.strictEqual(p.B.open('fuel'), true);
    assert.deepStrictEqual(p.calls, ['store:home-shop']);
    assert.strictEqual(p.B.isOpen(), null);
    assert.strictEqual(p.B.open('gap'), true);
    assert.deepStrictEqual(p.calls, ['store:home-shop'], 'never the old Essenspause window');
    assert.strictEqual(p.B.isOpen(), 'gap');
    assert.deepStrictEqual(p.plain(p.B.actions('gap').map(a => a.label)), ['Letzte Mahlzeit', 'Erste Mahlzeit']);
    p.B.close(true);
    assert.deepStrictEqual(p.plain(p.B.actions('fuel')), []);
    /* tutorial.js 'fuel-bloom' still calls open('fuel'): the same Einkaufen answer */
    assert.match(read('tutorial.js'), /const bloom = k => \(\{[^\n]*LowiHomeBloomsV2\.open\(k\)/);
});

test('path 4, the all-bubbles overview takes its bubbles from the same map: no Fuel orbs', () => {
    assert.match(SRC, /const ALL = BLOOMS\.filter\(k => k !== 'fuel' && k !== 'gap'\);/, 'Einkaufen orbs open pages; Gap times come in a second step');
    assert.ok(core.BLOOMS.includes('fuel'), 'Einkaufen blooms on its own');
});

test('path 5, tutorial picture of the Einkaufen card: the bubble and its Supermarkt tabs, no Kochen / Mahlzeit pills', () => {
    const T = require('../tutorial-show.js');
    for (const lang of ['de', 'en', 'es']) {
        const h = T.visHtml('fuel', lang).replace(/<[^>]+>/g, ' ');
        assert.doesNotMatch(h, OLD_TRIO, lang + ': ' + h);
        assert.doesNotMatch(h, /1\/3/, lang + ': no meal count on the Einkaufen bubble');
    }
    assert.match(T.visHtml('fuel', 'de'), /Einkaufen[\s\S]*Supermarkt[\s\S]*Zu Hause[\s\S]*Hilf mit/);
});

test('no app file asks for the old Fuel menu any more', () => {
    const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && !/\.min\.js$/.test(f));
    const hits = [];
    for (const f of files) {
        const s = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
        if (/id: 'cook'|id: 'log'/.test(s) && f === 'home-blooms-v2.js') hits.push(f + ': Cook / Log orb');
        if (/\[T\.log, T\.shop, T\.cook\]/.test(s)) hits.push(f + ': tutorial trio pills');
    }
    assert.deepStrictEqual(hits, []);
    /* every module that opens a ring kind names one the map knows */
    const unknown = [];
    for (const f of files) {
        const s = read(f);
        const re = /LowiHomeBloomsV2\.open\(\s*['"](\w+)['"]/g; let m;
        while ((m = re.exec(s))) if (!core.RING[m[1]]) unknown.push(f + ':' + m[1]);
    }
    assert.deepStrictEqual(unknown, []);
});
