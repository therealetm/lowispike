'use strict';
/* Oct 24 2026 (back and close sweep): the Circles list (user-rooms.js) listens for Escape on its own element only. Back sent
   Escape to the document, so Circles never closed: back from Community went Home with Circles still on top, and the next back
   left the app. back-swipe.js now sends Escape to the top open layer (it still bubbles to the document). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'back-swipe.js'), 'utf8');
const NAV = fs.readFileSync(path.join(ROOT, 'section-nav.js'), 'utf8');

function make({ focusInside = false, docSheet = false } = {}) {
    const st = { stack: [null], i: 0, tab: 'home', urOpen: true, docSheetOpen: docSheet, docEsc: 0, urEsc: 0, backs: 0, homes: 0 };
    const docL = {};
    const D = {};
    const bubbleToDoc = e => (docL['keydown'] || []).forEach(f => f(e));
    const ur = {
        id: '', className: 'ur', hidden: false, isConnected: true,
        getBoundingClientRect: () => ({ width: 390, height: 844 }),
        contains: n => n === ur || n === urInput,
        /* user-rooms.js: el.addEventListener('keydown', onKey) and onKey stops propagation after closing */
        dispatchEvent(e) { if (e.key === 'Escape' && st.urOpen) { st.urEsc++; st.urOpen = false; return true; } bubbleToDoc(e); return true; },
    };
    const urInput = { dispatchEvent: e => ur.dispatchEvent(e) };
    Object.assign(D, {
        documentElement: { get className() { return (st.urOpen ? 'ur-open ' : '') + (st.docSheetOpen ? 'x-open' : ''); } },
        body: { className: '' },
        get activeElement() { return focusInside ? urInput : D.body; },
        querySelector(q) { if (q === '.tab.active') return { id: 'tab-' + st.tab }; return null; },
        querySelectorAll(q) {
            if (q === '[aria-modal="true"], dialog[open]') return st.urOpen ? [ur] : [];
            const n = (st.urOpen ? 1 : 0) + (st.docSheetOpen ? 1 : 0);
            return { length: q === '.r2-ov.on' ? 0 : n };
        },
        addEventListener(t, f) { (docL[t] = docL[t] || []).push(f); },
        dispatchEvent(e) { bubbleToDoc(e); return true; },
    });
    /* a sheet that listens on the document */
    D.addEventListener('keydown', e => { if (e.key === 'Escape' && st.docSheetOpen) { st.docEsc++; st.docSheetOpen = false; } });
    const history = {
        get state() { return st.stack[st.i]; },
        pushState(s) { st.stack = st.stack.slice(0, st.i + 1); st.stack.push(s); st.i++; },
        back() { st.backs++; if (st.i > 0) st.i--; },
    };
    const winL = {}; const timers = [];
    const W = {
        history, document: D,
        LowiSections: { close() { st.homes++; st.tab = 'home'; } },
        getComputedStyle: () => ({ display: 'block', visibility: 'visible', zIndex: '90' }),
        addEventListener(t, f) { (winL[t] = winL[t] || []).push(f); },
    };
    vm.runInNewContext(SRC, { window: W, document: D, history, KeyboardEvent: function (t, o) { return Object.assign({ type: t }, o); }, setTimeout: f => timers.push(f) });
    const touch = () => (docL['pointerdown'] || []).forEach(f => f({}));
    const swipeBack = () => { history.back(); (winL['popstate'] || []).forEach(f => f({})); while (timers.length) timers.shift()(); };
    return { st, touch, swipeBack, W };
}

test('back with Circles open on Home closes Circles and stays in the app', () => {
    const a = make();
    a.touch(); a.swipeBack();
    assert.strictEqual(a.st.urEsc, 1, 'Circles got the Escape');
    assert.strictEqual(a.st.urOpen, false);
    assert.strictEqual(a.st.backs, 1, 'no second history.back (that left the app)');
    assert.strictEqual(JSON.stringify(a.st.stack[a.st.i]), JSON.stringify({ lowiBack: 1 }), 'guard put back');
});

test('focus already inside the layer: Escape goes to the focused element, as before', () => {
    const a = make({ focusInside: true });
    a.touch(); a.swipeBack();
    assert.strictEqual(a.st.urEsc, 1);
    assert.strictEqual(a.st.backs, 1);
});

test('a sheet that listens on the document still closes (Escape bubbles up)', () => {
    const a = make({ docSheet: true });
    a.st.urOpen = false;
    a.touch(); a.swipeBack();
    assert.strictEqual(a.st.docEsc, 1);
    assert.strictEqual(a.st.backs, 1);
});

test('back-swipe exports escape() and section-nav uses it for a sheet over a section', () => {
    const a = make();
    assert.strictEqual(typeof a.W.LowiBackSwipe.escape, 'function');
    assert.match(NAV, /BS\.escape\(\)/);
});
