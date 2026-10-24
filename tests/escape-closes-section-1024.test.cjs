'use strict';
/* Oct 24 2026 (back and close sweep 14:40): a hardware Escape (iPad keyboard, computer) closed a sheet over a page, but on the
   page itself (Move, Cook, Profile, Community) it did nothing, while back and the X go home. section-nav.js now takes an Escape
   that nothing else handled as one back. It must not stack on an Escape that closed a sheet or the chat, and the synthetic
   Escape back-swipe.js sends on a back never counts. Both real files run together, back-swipe.js first, as index.html loads them. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const R = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function make() {
    const st = { stack: [null], i: 0, tab: 'home', backs: 0, pops: [], left: false, sheet: false, chat: false, inner: 0 };
    const L = {};
    const on = (k, f) => (L[k] = L[k] || []).push(f);
    const fire = (k, e) => (L[k] || []).slice().forEach(f => f(e));
    const history = {
        get state() { return st.stack[st.i]; },
        pushState(s) { st.stack = st.stack.slice(0, st.i + 1); st.stack.push(s); st.i++; },
        replaceState(s) { st.stack[st.i] = s; },
        back() { st.backs++; if (st.i > 0) { st.i--; st.pops.push({ state: st.stack[st.i] }); } else st.left = true; },
    };
    const cls = new Set();
    const classList = { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c), toggle: (c, v) => (v ? cls.add(c) : cls.delete(c)) };
    const el = () => ({ id: '', style: {}, classList: { add() { }, remove() { }, contains() { return false; } }, addEventListener() { }, setAttribute() { }, appendChild() { }, isConnected: true });
    const sheetEl = { id: 'sh', className: 'sh', hidden: false, isConnected: true, getBoundingClientRect: () => ({ width: 390, height: 600 }), contains: () => false, dispatchEvent: e => { fire('d:keydown', e); return true; } };
    const D = {
        readyState: 'complete',
        documentElement: { lang: 'en', classList, get className() { return [...cls].join(' '); } },
        body: { className: '', appendChild() { } },
        activeElement: null,
        scrollingElement: null,
        querySelector(q) {
            if (/\.tab\.active/.test(q)) return { id: 'tab-' + st.tab };
            if (/aria-modal/.test(q) && st.sheet) return sheetEl;   /* openSheet() */
            return null;
        },
        querySelectorAll(q) {
            if (q === '[aria-modal="true"], dialog[open]') return st.sheet ? [sheetEl] : [];
            if (q === '#cgThread[data-open]') return { length: st.chat ? 1 : 0 };
            if (/aria-modal/.test(q)) return { length: st.sheet ? 1 : 0 };
            return { length: 0 };
        },
        getElementById(id) { if (id === 'main') return el(); return null; },
        createElement: el,
        addEventListener: (t, f) => on('d:' + t, f),
        dispatchEvent(e) { fire('d:' + e.type, e); return true; },
    };
    /* a sheet that closes itself on Escape, and the Community chat that does the same (listening on the document) */
    D.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (st.sheet) st.sheet = false; else if (st.chat) st.chat = false; });
    const timers = [];
    const W = {
        history, document: D,
        goTab(t) { st.tab = t; },
        getComputedStyle: () => ({ display: 'block', visibility: 'visible', zIndex: '90' }),
        addEventListener: (t, f, cap) => on('w:' + t + (cap === true ? ':cap' : ''), f),
    };
    const ctx = {
        window: W, document: D, history, performance: { now: () => 0 }, console,
        KeyboardEvent: function (t, o) { return Object.assign({ type: t, isTrusted: false }, o); },
        MutationObserver: function () { this.observe = () => { }; },
        requestAnimationFrame: f => timers.push(f), setTimeout: f => timers.push(f),
    };
    vm.runInNewContext(R('back-swipe.js'), ctx);
    vm.runInNewContext(R('section-nav.js'), ctx);
    fire('d:pointerdown', {});   /* the guard entry under the app */
    const settle = () => { for (let n = 0; n < 50 && (st.pops.length || timers.length); n++) { if (st.pops.length) fire('w:popstate', st.pops.shift()); else timers.shift()(); } };
    /* a real key: window capture, the document, window bubble */
    const key = (k = 'Escape', o = {}) => {
        let prevented = false;
        const e = Object.assign({ type: 'keydown', key: k, isTrusted: true, target: null, get defaultPrevented() { return prevented; }, preventDefault() { prevented = true; } }, o);
        if (o.prevent) prevented = true;
        fire('w:keydown:cap', e); fire('d:keydown', e); fire('w:keydown', e); settle();
    };
    return { st, W, settle, key };
}

for (const tab of ['move', 'shelf', 'profile', 'foryou']) {
    test('Escape on the ' + tab + ' page with nothing open goes Home and stays in the app', () => {
        const a = make();
        a.W.goTab(tab); a.settle();
        assert.strictEqual(a.st.tab, tab);
        a.key();
        assert.strictEqual(a.st.tab, 'home', 'Escape closes the page like back');
        assert.strictEqual(a.st.left, false);
        assert.strictEqual(JSON.stringify(a.st.stack[a.st.i]), '{"lowiBack":1}', 'the guard entry stays under the app');
        a.key();
        assert.strictEqual(a.st.left, false, 'Escape on Home never leaves');
    });
}

test('Escape with a sheet open over a page closes only the sheet; the next Escape closes the page', () => {
    const a = make();
    a.W.goTab('shelf'); a.settle();
    a.st.sheet = true;
    a.key();
    assert.strictEqual(a.st.sheet, false);
    assert.strictEqual(a.st.tab, 'shelf', 'the page stays');
    a.key();
    assert.strictEqual(a.st.tab, 'home');
});

test('Escape that closes the Community chat keeps Community open', () => {
    const a = make();
    a.W.goTab('foryou'); a.settle();
    a.st.chat = true;
    a.key();
    assert.strictEqual(a.st.chat, false);
    assert.strictEqual(a.st.tab, 'foryou');
});

test('an Escape someone prevented, typed in a field, or another key does nothing', () => {
    const a = make();
    a.W.goTab('move'); a.settle();
    a.key('Escape', { prevent: true });
    assert.strictEqual(a.st.tab, 'move');
    a.key('Escape', { target: { closest: q => (/input/.test(q) ? {} : null) } });
    assert.strictEqual(a.st.tab, 'move');
    a.key('Enter');
    assert.strictEqual(a.st.tab, 'move');
});

test('back with a sheet over a page still closes just the sheet (the synthetic Escape is not a second back)', () => {
    const a = make();
    a.W.goTab('shelf'); a.settle();
    a.st.sheet = true;
    a.W.history.back(); a.settle();
    assert.strictEqual(a.st.sheet, false);
    assert.strictEqual(a.st.tab, 'shelf');
    assert.strictEqual(a.st.left, false);
});
