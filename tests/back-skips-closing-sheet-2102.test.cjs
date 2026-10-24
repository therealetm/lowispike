'use strict';
/* Oct 24 2026 21:02 (bug hunt): My Recipe Book > Browse recipes closes the book (z 250) and opens All recipes (z 29). While the
   book was still sliding out (.r2-ov.off), back sent Escape to the dying book instead of All recipes: All recipes stayed open,
   back switched Cook to Home under it, and the next back left the app. back-swipe.js topLayer() now skips sheets that are
   closing, parked or inert. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'back-swipe.js'), 'utf8');

function make({ bookClosing = true } = {}) {
    const st = { stack: [null], i: 0, tab: 'shelf', allOpen: true, bookEsc: 0, allEsc: 0, backs: 0, homes: 0 };
    const docL = {};
    const D = {};
    const bubbleToDoc = e => (docL['keydown'] || []).forEach(f => f(e));
    const mk = (name, z, onEsc) => {
        const el = {
            name, z, className: 'r2-sh', hidden: false, isConnected: true,
            getBoundingClientRect: () => ({ width: 392, height: 500 }),
            closest: q => (name === 'book' && bookClosing && /\.r2-ov\.off/.test(q)) ? { className: 'r2-ov mybook-ov off' } : null,
            contains: n => n === el || (n && n.owner === el),
            /* apple-ui.js: each sheet listens on its own overlay and closes only when it is R2.top() */
            dispatchEvent(e) { if (e.key === 'Escape' && onEsc()) return true; bubbleToDoc(e); return true; },
        };
        return el;
    };
    const book = mk('book', 250, () => false /* not R2.top(): ignores the key */);
    const all = mk('all', 29, () => { if (!st.allOpen) return false; st.allEsc++; st.allOpen = false; return true; });
    const focused = { owner: all, dispatchEvent: e => all.dispatchEvent(e) }; /* apple-ui puts focus in the new sheet */
    Object.assign(D, {
        documentElement: { get className() { return st.allOpen ? 'g2e-open' : ''; } },
        body: { className: '' },
        get activeElement() { return st.allOpen ? focused : D.body; },
        querySelector(q) { if (q === '.tab.active') return { id: 'tab-' + st.tab }; return null; },
        querySelectorAll(q) {
            if (q === '[aria-modal="true"], dialog[open]') return [all].concat(st.allOpen ? [] : []).filter(x => x !== all || st.allOpen).concat([book]);
            return { length: st.allOpen ? 1 : 0 };
        },
        addEventListener(t, f) { (docL[t] = docL[t] || []).push(f); },
        dispatchEvent(e) { bubbleToDoc(e); return true; },
    });
    const history = {
        get state() { return st.stack[st.i]; },
        pushState(s) { st.stack = st.stack.slice(0, st.i + 1); st.stack.push(s); st.i++; },
        back() { st.backs++; if (st.i > 0) st.i--; },
    };
    const winL = {}; const timers = [];
    const W = {
        history, document: D,
        LowiSections: { close() { st.homes++; st.tab = 'home'; } },
        getComputedStyle: e => ({ display: 'block', visibility: 'visible', zIndex: String(e.z) }),
        addEventListener(t, f) { (winL[t] = winL[t] || []).push(f); },
    };
    vm.runInNewContext(SRC, { window: W, document: D, history, KeyboardEvent: function (t, o) { return Object.assign({ type: t }, o); }, setTimeout: f => timers.push(f) });
    const touch = () => (docL['pointerdown'] || []).forEach(f => f({}));
    const swipeBack = () => { history.back(); (winL['popstate'] || []).forEach(f => f({})); while (timers.length) timers.shift()(); };
    return { st, touch, swipeBack, W, book, all };
}

test('back while the book is still sliding out closes All recipes, stays on Cook, stays in the app', () => {
    const a = make();
    a.touch(); a.swipeBack();
    assert.strictEqual(a.st.allEsc, 1, 'All recipes got the Escape');
    assert.strictEqual(a.st.allOpen, false);
    assert.strictEqual(a.st.homes, 0, 'Cook was not switched to Home under the sheet');
    assert.strictEqual(a.st.backs, 1, 'no second history.back (that left the app)');
    assert.strictEqual(JSON.stringify(a.st.stack[a.st.i]), JSON.stringify({ lowiBack: 1 }), 'guard put back');
});

test('topLayer skips a closing sheet even when its z is higher', () => {
    const a = make();
    assert.strictEqual(a.W.LowiBackSwipe.topLayer(), a.all);
});

test('a sheet that is not closing still wins by z (unchanged)', () => {
    const a = make({ bookClosing: false });
    assert.strictEqual(a.W.LowiBackSwipe.topLayer(), a.book);
});
