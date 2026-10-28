'use strict';
/* Gap bubbles (Oct 28 2026, 22:54). Emmanuel on the call, about the Essenspause window with the meal-time buttons inside it:
   "You put it inside ... That's not what we said", "They're supposed to be bubbles ... just like when you click on sleep or when
   you click on water ... Or when you click on move", "Yeah, nuke that window", and: the long press (Nach dem Essen) "worked fine,
   preserve that". So a tap on Gap blooms two orbs round the ring like Water / Move / Sleep: Letzte Mahlzeit and Erste Mahlzeit.
   A tap on one opens its times as orbs in the same place; a tap on a time saves it. This file runs the real home-blooms-v2.js page
   part in a fake window with a fake timer (LowiFastStop / LowiFastEdit) and checks every path.
   Browser check: tools/check-gap-bloom.cjs (Chromium and WebKit iPhone sizes, the live app). */
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

const H = 3600000, M = 60000;
/* fast: { start } running since start, or { off: last } stopped (last = first meal) */
function page(fast) {
    const calls = [], toasts = [];
    const bubbles = {};
    ['fuel', 'water', 'move', 'gap'].forEach(k => { const b = el('div'); b.setAttribute('data-orbit', k); b.closest = sel => (sel === '[data-orbit]' ? b : null); bubbles[k] = b; });
    const winH = {}, divs = [];
    const D = el('html');
    Object.assign(D, {
        head: el('head'), body: el('body'), documentElement: Object.assign(el('html'), { lang: 'de' }), currentScript: null,
        createElement: t => { const e = el(t); if (String(t) === 'div') divs.push(e); return e; }, getElementById: () => null,
        querySelector: sel => { const m = /data-orbit="(\w+)"/.exec(sel); return m ? bubbles[m[1]] || null : null; }, activeElement: null, dispatchEvent() { }
    });
    const W = {
        document: D, innerWidth: 390, innerHeight: 844, console, Date, Math, JSON, String, Array, Object, isFinite, setTimeout: (f) => { f(); return 0; }, clearTimeout() { },
        matchMedia: () => ({ matches: true }), CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
        addEventListener(n, f) { (winH[n] = winH[n] || []).push(f); }, removeEventListener() { }, dispatchEvent: ev => calls.push('event:' + ev.type),
        localStorage: { getItem: () => null, setItem() { } }, navigator: { userAgent: 'iPhone' }
    };
    W.window = W;
    W.LowiSpirit = { meal: () => calls.push('meal'), water() { }, refresh() { } };
    W.LowiStorePicks = { open: src => calls.push('store:' + src) };
    W.LowiGapView = { open: o => calls.push('gapview:' + ((o && o.mode) || (o && o.from) || '')) };
    W.toast = m => toasts.push(m);
    const s = fast.off ? { last: fast.off, off: 1, hist: [] } : { last: fast.start, hist: [] };
    W.LowiFastStop = {
        _st: () => s, startOf: () => (s.off ? 0 : s.last),
        end: (t, o) => { calls.push('end:' + t + ':' + JSON.stringify(o)); if (t <= s.last) return { err: 'before' }; s.last = t; s.off = 1; return { ok: true }; },
        firstMeal: t => { calls.push('firstMeal:' + t); if (!s.off) return false; s.last = t; delete s.off; return true; },
        w: (k, o) => k + (o && o.t ? ' ' + o.t : '')
    };
    W.LowiFastEdit = { save: t => { calls.push('save:' + t); s.last = t; return { ok: true, to: t }; }, w: k => k };
    vm.createContext(W);
    vm.runInContext(SRC, W);
    const B = W.LowiHomeBloomsV2;
    B.mount(D);
    const tap = k => (winH.click || []).forEach(f => f({ target: bubbles[k], preventDefault() { }, stopImmediatePropagation() { }, stopPropagation() { } }));
    /* a tap on an orb of the open bloom (its overlay is the newest div) */
    const orb = id => {
        const ov = divs[divs.length - 1];
        const t = { tagName: 'BUTTON', dataset: { hb2: 'act', id }, querySelector: () => null };
        t.closest = () => t;
        ov.fire('click', { target: t, preventDefault() { }, stopPropagation() { }, isTrusted: false, detail: 0 });
    };
    return { B, W, s, calls, toasts, tap, orb, ids: () => JSON.parse(JSON.stringify(B.actions('gap').map(a => a.id))), labels: () => JSON.parse(JSON.stringify(B.actions('gap').map(a => a.label))) };
}
const hm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

test('a tap on Gap opens two bubbles round it, Letzte Mahlzeit and Erste Mahlzeit, never the old Essenspause window', () => {
    const start = Date.now() - 3 * H - 40 * M;
    const p = page({ start });
    p.tap('gap');
    assert.strictEqual(p.B.isOpen(), 'gap');
    assert.ok(!p.calls.some(c => c.startsWith('gapview:')), 'the old window is not opened');
    assert.deepStrictEqual(p.labels(), ['Letzte Mahlzeit', 'Erste Mahlzeit']);
    const a = p.B.actions('gap');
    assert.strictEqual(a[0].sub, hm(start), 'Letzte Mahlzeit shows when the timer started');
    assert.strictEqual(a[1].sub, undefined);
    p.tap('gap');
    assert.strictEqual(p.B.isOpen(), null, 'a second tap on Gap folds it, like Water');
});

test('running timer: Erste Mahlzeit > Jetzt stops it at now (points as before), then the bloom folds', () => {
    const start = Date.now() - 16 * H;
    const p = page({ start });
    p.tap('gap');
    p.orb('g-first');
    assert.strictEqual(p.B.isOpen(), 'gap', 'still open: the times');
    assert.deepStrictEqual(p.labels(), ['Jetzt', 'Andere Zeit'], 'only Jetzt and Andere Zeit (Oct 28 23:43, Antje: too many options)');
    assert.ok(p.B.actions('gap')[0].sub === hm(Date.now()), 'Jetzt shows its clock time');
    assert.ok(!p.calls.some(c => /^(end|firstMeal|save):/.test(c)), 'opening the times changes nothing');
    const t0 = Date.now();
    p.orb('g-t0');
    const end = p.calls.find(c => c.startsWith('end:'));
    assert.ok(end, 'LowiFastStop.end called');
    const [, t, o] = /^end:(\d+):(.*)$/.exec(end);
    assert.ok(Math.abs(+t - t0) < 2000);
    assert.deepStrictEqual(JSON.parse(o), { keep: true });
    assert.strictEqual(p.s.off, 1);
    assert.strictEqual(p.B.isOpen(), null);
});

test('Erste Mahlzeit never offers a time before the timer started', () => {
    const p = page({ start: Date.now() - 20 * M });
    p.tap('gap');
    p.orb('g-first');
    assert.deepStrictEqual(p.ids(), ['g-t0', 'g-other'], 'Jetzt and Andere Zeit only');
    assert.strictEqual(p.B.gap.commit('first', p.s.last - M), false, 'a typed time before the start is refused');
    assert.ok(p.toasts.includes('before'));
    assert.ok(!p.s.off);
});

test('Erste Mahlzeit right after the start: Jetzt would be before it, only Andere Zeit', () => {
    const p = page({ start: Date.now() - 20 * 1000 });
    p.tap('gap');
    p.orb('g-first');
    assert.deepStrictEqual(p.ids(), ['g-other']);
});

test('stopped timer: Letzte Mahlzeit > Jetzt starts it now; Erste Mahlzeit only says what to do', () => {
    const first = Date.now() - 5 * H;
    const p = page({ off: first });
    p.tap('gap');
    const a = p.B.actions('gap');
    assert.strictEqual(a[0].sub, undefined);
    assert.strictEqual(a[1].sub, hm(first), 'Erste Mahlzeit shows when you ate');
    p.orb('g-first');
    assert.strictEqual(p.B.gap.pick(), null, 'nothing to stop: no times');
    assert.match(p.toasts.join('|'), /Letzte Mahlzeit/);
    assert.ok(!p.calls.some(c => /^(end|firstMeal|save):/.test(c)));
    p.orb('g-last');
    assert.strictEqual(p.B.gap.pick(), 'last');
    const t0 = Date.now();
    assert.deepStrictEqual(p.labels(), ['Jetzt', 'Andere Zeit']);
    p.orb('g-t0');
    const fm = p.calls.find(c => c.startsWith('firstMeal:'));
    assert.ok(fm && Math.abs(+fm.split(':')[1] - t0) < 2000, 'started now');
    assert.ok(!p.s.off, 'running');
    assert.ok(p.toasts.some(m => m.startsWith('started')));
    assert.strictEqual(p.B.isOpen(), null);
});

test('running timer: Letzte Mahlzeit > Jetzt moves the start (like Zeit ändern did), no stop, no points', () => {
    const p = page({ start: Date.now() - 3 * H });
    p.tap('gap');
    p.orb('g-last');
    assert.deepStrictEqual(p.labels(), ['Jetzt', 'Andere Zeit']);
    assert.ok(!p.ids().some(id => /^g-t(15|30|60)$/.test(id)), 'no vor 15 min / vor 30 min / vor 1 h');
    const t0 = Date.now();
    p.orb('g-t0');
    const sv = p.calls.find(c => c.startsWith('save:'));
    assert.ok(sv && Math.abs(+sv.split(':')[1] - t0) < 2000);
    assert.ok(!p.calls.some(c => c.startsWith('end:')), 'not stopped');
    assert.ok(p.toasts.some(m => m.startsWith('restart')));
});

test('Andere Zeit: the phone\'s time picker; a time still ahead today means yesterday', () => {
    const p = page({ start: Date.now() - 2 * H });
    const d = new Date(); d.setSeconds(0, 0);
    const past = new Date(d.getTime() - 50 * M);
    const t = p.B.gap.fromHM(hm(past));
    assert.ok(Math.abs(t - past.getTime()) < 24 * H && t <= Date.now());
    const ahead = new Date(d.getTime() + 2 * H);
    const ta = p.B.gap.fromHM(hm(ahead));
    assert.ok(ta < Date.now() && Date.now() - ta < 24 * H, 'never in the future');
    assert.strictEqual(p.B.gap.fromHM(''), 0);
    /* the orb is a label with the time input inside, not a button (an input inside a button does not open on iPhone) */
    assert.match(SRC, /const tag = a\.time \? 'label' : 'button'/);
    assert.match(SRC, /<input type="time" class="hb2-time"/);
    assert.match(SRC, /inp\.addEventListener\('change', \(\) => \{ if \(!isIOS\(\)\) commit\(\); \}\);\s*inp\.addEventListener\('blur', commit\);/, 'iPhone saves on Done, elsewhere on the pick');
    assert.match(SRC, /never redraw under the open time picker/);
});

test('hold Gap still opens Nach dem Essen (phases only), unchanged', () => {
    assert.match(SRC, /if \(kind === 'gap'\) \{ const G = W\.LowiGapView; if \(fn\(G, 'open'\)[^\n]*G\.open\(\{ phases: true/);
    assert.match(read('living-bubbles.js'), /return G\.open\(\{ phases: true \}\) !== false;/);
});

test('only Letzte / Erste Mahlzeit move the timer: the bloom never writes the timer itself', () => {
    assert.doesNotMatch(SRC, /lowi_fast_v1['"]?, *JSON\.stringify\([^)]*last/);
    assert.doesNotMatch(SRC, /fetch\(|XMLHttpRequest|supabase|sendBeacon/i);
    /* the other paths stay cut off from the timer (index.html, DECOUPLED, covered by the timer tests) */
});

test('the all-bubbles overview keeps its four step-free groups; English and Spanish words', () => {
    assert.match(SRC, /const ALL = BLOOMS\.filter\(k => k !== 'fuel' && k !== 'gap'\);/);
    assert.match(SRC, /T\('Last meal', 'Letzte Mahlzeit', 'Última comida'\)/);
    assert.match(SRC, /T\('First meal', 'Erste Mahlzeit', 'Primera comida'\)/);
    assert.match(SRC, /T\('Other time', 'Andere Zeit', 'Otra hora'\)/);
});
