'use strict';
/* Bug hunt 23 Oct 2026: on Move, open the Care board, then swipe back (Safari) or press the phone's back button: LOWiSPIKE went
   straight to Home and left the Care board open (html.nm-open-lb on Home; the board was still open next time you opened Move).
   Back now closes the Care board first and keeps Move, like the board's own "< Move" button. Real back-swipe.js + section-nav.js. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const R = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function make({ guard = false, fyw = false } = {}) {
    const st = { stack: [null], i: 0, tab: 'home', backs: 0, pops: [], left: false, open: {} };
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
    const D = {
        readyState: 'complete',
        documentElement: { lang: 'en', classList, get className() { return [...cls].join(' '); } },
        body: { className: '', appendChild() { } },
        activeElement: null,
        scrollingElement: null,
        querySelector(q) { if (/\.tab\.active/.test(q)) return { id: 'tab-' + st.tab }; if (/\.nm-layer-/.test(q)) return { classList: { contains: c => c === 'fyw' && fyw } }; return null; },
        querySelectorAll() { return { length: 0 }; },
        getElementById(id) { if (id === 'main') return el(); return null; },
        createElement: el,
        addEventListener: (t, f) => on('d:' + t, f),
        dispatchEvent() { return true; },
    };
    const timers = [];
    const W = {
        history, document: D,
        goTab(t) { st.tab = t; },
        LowiNavMoves: { isOpen: k => !!st.open[k], show: (k, on) => { st.open[k] = !!on; } },
        addEventListener: (t, f) => on('w:' + t, f),
    };
    const ctx = {
        window: W, document: D, history, performance: { now: () => 0 }, console,
        KeyboardEvent: function (t, o) { return Object.assign({ type: t }, o); },
        MutationObserver: function () { this.observe = () => { }; },
        requestAnimationFrame: f => timers.push(f), setTimeout: f => timers.push(f),
    };
    vm.runInNewContext(R('back-swipe.js'), ctx);
    vm.runInNewContext(R('section-nav.js'), ctx);
    if (guard) fire('d:pointerdown', {});
    /* popstate is async in a browser: run queued pops (each reaches every listener in load order), then timers, until quiet */
    const settle = () => { for (let n = 0; n < 50 && (st.pops.length || timers.length); n++) { if (st.pops.length) fire('w:popstate', st.pops.shift()); else timers.shift()(); } };
    return { st, W, settle };
}

const userBack = a => { a.W.history.back(); a.settle(); };

test('back with the Care board open closes the board and stays on Move', () => {
    const a = make({ guard: true });
    a.W.goTab('move'); a.settle(); a.st.open.lb = true;
    userBack(a);
    assert.strictEqual(a.st.open.lb, false, 'Care board closed');
    assert.strictEqual(a.st.tab, 'move', 'still on Move');
    assert.strictEqual(a.st.left, false);
    assert.strictEqual(JSON.stringify(a.st.stack[a.st.i]), '{"lowiSec":"move"}', 'section entry is back for the next back');
    userBack(a);
    assert.strictEqual(a.st.tab, 'home', 'the next back goes Home, as before');
    assert.strictEqual(a.st.left, false);
});

test('back on Move with nothing open still goes Home', () => {
    const a = make({ guard: true });
    a.W.goTab('move'); a.settle();
    userBack(a);
    assert.strictEqual(a.st.tab, 'home');
    assert.strictEqual(a.st.left, false);
});

test('For You as the window inside Cook is left alone (back closes Cook, as before)', () => {
    const a = make({ guard: true, fyw: true });
    a.W.goTab('shelf'); a.settle(); a.st.open.fy = true;
    userBack(a);
    assert.strictEqual(a.st.tab, 'home');
});
