'use strict';
/* Oct 24 2026 17:02 (bug hunt, companion area): on Misty's card, tap the pencil to rename her, then swipe back (Safari) or
   press Android back: the app was left. back-swipe.js sent Escape, misty-hub.js cancelled the rename (the field went away,
   the card stayed), but nothing in the page signature changed and the card was still the top layer, so back went on and
   left LOWiSPIKE. The rename form now carries data-back-layer, and back-swipe.js counts those. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'back-swipe.js'), 'utf8');
const HUB = fs.readFileSync(path.join(ROOT, 'misty-hub.js'), 'utf8');

function make({ marked = true } = {}) {
    const st = { stack: [null], i: 0, renaming: true, backs: 0, esc: 0 };
    const docL = {}, winL = {}, timers = [];
    /* the rename input has focus inside Misty's card (the top layer); Escape on it cancels the rename only */
    const input = { tagName: 'INPUT', dispatchEvent(e) { if (e.key === 'Escape' && st.renaming) { st.esc++; st.renaming = false; } return true; } };
    const card = {
        id: '', className: 'r2-sh', hidden: false, isConnected: true, parentElement: null,
        getBoundingClientRect: () => ({ width: 390, height: 740 }),
        contains: e => e === input,
        dispatchEvent() { return true; },
    };
    const D = {
        documentElement: { className: 'wh-on' }, body: { className: '' }, activeElement: input,
        querySelector(q) { return q === '.tab.active' ? { id: 'tab-home' } : null; },
        querySelectorAll(q) {
            if (q === '[aria-modal="true"], dialog[open]') return [card];
            if (q === '[data-back-layer]') return { length: marked && st.renaming ? 1 : 0 };
            if (q === '.r2-ov.on') return { length: 1 };
            return { length: 3 };          /* the card's open markers: unchanged by cancelling the rename */
        },
        addEventListener(t, f) { (docL[t] = docL[t] || []).push(f); },
        dispatchEvent() { return true; },
    };
    card.parentElement = D.body;
    const history = {
        get state() { return st.stack[st.i]; },
        pushState(s) { st.stack = st.stack.slice(0, st.i + 1); st.stack.push(s); st.i++; },
        back() { st.backs++; if (st.i > 0) st.i--; },
    };
    const W = { history, document: D, getComputedStyle: () => ({ display: 'block', visibility: 'visible', zIndex: '400' }), addEventListener(t, f) { (winL[t] = winL[t] || []).push(f); } };
    vm.runInNewContext(SRC, { window: W, document: D, history, KeyboardEvent: function (t, o) { return Object.assign({ type: t }, o); }, setTimeout: f => timers.push(f) });
    const touch = () => (docL['pointerdown'] || []).forEach(f => f({}));
    const swipeBack = () => { history.back(); (winL['popstate'] || []).forEach(f => f({})); while (timers.length) timers.shift()(); };
    return { st, touch, swipeBack };
}

test('back while renaming Misty cancels the rename and stays in the app', () => {
    const a = make();
    a.touch(); a.swipeBack();
    assert.strictEqual(a.st.esc, 1, 'the rename field got Escape');
    assert.strictEqual(a.st.renaming, false, 'rename cancelled');
    assert.strictEqual(a.st.backs, 1, 'no second history.back (that left the app)');
    assert.strictEqual(JSON.stringify(a.st.stack[a.st.i]), JSON.stringify({ lowiBack: 1 }), 'guard put back');
});

test('without the marker the old behaviour is what left the app (guards the test itself)', () => {
    const a = make({ marked: false });
    a.touch(); a.swipeBack();
    assert.strictEqual(a.st.backs, 2, 'back went on and left');
});

test('the rename form on Misty\'s card carries data-back-layer', () => {
    assert.match(HUB, /<form class="mh-rnf" data-back-layer/);
    assert.match(SRC, /\[data-back-layer\]/);
});
