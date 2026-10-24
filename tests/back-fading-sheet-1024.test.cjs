'use strict';
/* Oct 24 2026 12:40 (back and close sweep): Body stats / Weight journey (body-stats.js) keep role=dialog and aria-modal while they
   fade out (.bs-out, no .on marker). back-swipe.js judged "did back close something?" by a page signature that did not change,
   so after closing the sheet it also called history.back() and left the app (open Body stats, back, open again, back = gone).
   back-swipe.js now also checks the top layer itself: gone, classes changed or no longer on top = it closed. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'back-swipe.js'), 'utf8');

function make({ closes = true, inner = false } = {}) {
    const st = { stack: [null], i: 0, open: true, backs: 0, esc: 0 };
    const docL = {};
    /* the Body stats overlay: stays in the page with role=dialog while it fades, only its class changes */
    const ov = {
        id: 'bsOv', className: 'bs-ov', hidden: false, isConnected: true,
        getBoundingClientRect: () => ({ width: 390, height: 844 }),
        contains: () => false,
        dispatchEvent(e) { if (e.key === 'Escape' && st.open && closes) { st.esc++; st.open = false; if (inner) wrap.className = 'stp-ov gh-ov out'; else ov.className = 'bs-ov bs-out'; } return true; },
    };
    /* Shop finds (grocery-hunt.js): the aria-modal card sits in an overlay that swaps .in for .out; the card keeps its classes */
    const wrap = { className: 'stp-ov gh-ov in', parentElement: null };
    if (inner) { ov.className = 'stp-card gh-card'; ov.parentElement = wrap; }
    const D = {
        documentElement: { className: 'wh-on' }, body: { className: '' }, activeElement: null,
        querySelector(q) { return q === '.tab.active' ? { id: 'tab-home' } : null; },
        /* the signature counts: the fading overlay is still there, nothing has .on: unchanged by the close */
        querySelectorAll(q) { if (q === '[aria-modal="true"], dialog[open]') return [ov]; return { length: q.indexOf('role="dialog"') >= 0 ? 1 : 0 }; },
        addEventListener(t, f) { (docL[t] = docL[t] || []).push(f); },
        dispatchEvent() { return true; },
    };
    D.activeElement = D.body; wrap.parentElement = D.body;
    const history = {
        get state() { return st.stack[st.i]; },
        pushState(s) { st.stack = st.stack.slice(0, st.i + 1); st.stack.push(s); st.i++; },
        back() { st.backs++; if (st.i > 0) st.i--; },
    };
    const winL = {}; const timers = [];
    const W = { history, document: D, getComputedStyle: () => ({ display: 'block', visibility: 'visible', zIndex: '400' }), addEventListener(t, f) { (winL[t] = winL[t] || []).push(f); } };
    vm.runInNewContext(SRC, { window: W, document: D, history, KeyboardEvent: function (t, o) { return Object.assign({ type: t }, o); }, setTimeout: f => timers.push(f) });
    const touch = () => (docL['pointerdown'] || []).forEach(f => f({}));
    const swipeBack = () => { history.back(); (winL['popstate'] || []).forEach(f => f({})); while (timers.length) timers.shift()(); };
    return { st, touch, swipeBack };
}

test('back on a sheet that fades with role=dialog still on closes it and stays in the app', () => {
    const a = make();
    a.touch(); a.swipeBack();
    assert.strictEqual(a.st.esc, 1, 'the sheet got Escape');
    assert.strictEqual(a.st.open, false);
    assert.strictEqual(a.st.backs, 1, 'no second history.back (that left the app)');
    assert.strictEqual(JSON.stringify(a.st.stack[a.st.i]), JSON.stringify({ lowiBack: 1 }), 'guard put back');
});

test('Shop finds: the card keeps its classes, the overlay around it fades: still closes and stays in the app', () => {
    const a = make({ inner: true });
    a.touch(); a.swipeBack();
    assert.strictEqual(a.st.open, false);
    assert.strictEqual(a.st.backs, 1, 'no second history.back (that left the app)');
    assert.strictEqual(JSON.stringify(a.st.stack[a.st.i]), JSON.stringify({ lowiBack: 1 }));
});

test('a layer that ignores Escape: back still goes on, as before (nothing changed, nothing closed)', () => {
    const a = make({ closes: false });
    a.touch(); a.swipeBack();
    assert.strictEqual(a.st.backs, 2, 'back went on');
});
