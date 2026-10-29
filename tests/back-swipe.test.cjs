'use strict';
/* back-swipe.js: Safari's edge swipe back closes the top sheet, then goes back to Today, then leaves; it never fights the Move player. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'back-swipe.js'), 'utf8');

function make({ tab = 'home', sheetOpen = false, mv = false, r2 = false, dialog = false } = {}) {
    const st = { stack: [null], i: 0, tab, sheetOpen, mv, homeClicks: 0, escapes: 0, backs: 0 };
    const listeners = {};
    const history = {
        get state() { return st.stack[st.i]; },
        pushState(s) { st.stack = st.stack.slice(0, st.i + 1); st.stack.push(s); st.i++; },
        back() { st.backs++; if (st.i > 0) { st.i--; } },
    };
    const tabEl = () => ({ id: 'tab-' + st.tab });
    const homeBtn = { click() { st.homeClicks++; st.tab = 'home'; } };
    const D = {
        /* r2: a sheet that loses .on at once but stays in the page (slide-out) and drops its page classes later */
        documentElement: { get className() { return st.sheetOpen && !r2 && !dialog ? 'x-open' : ''; } },
        body: { className: '' },
        activeElement: null,
        querySelector(q) {
            if (q === '.tab.active') return tabEl();
            if (q === '#mv-player.on') return st.mv ? {} : null;
            if (q.indexOf('data-tab="home"') >= 0) return homeBtn;
            return null;
        },
        /* dialog: a sheet like the Gap view (role=dialog + aria-modal) that loses .on at once and stays in the page for its slide-out */
        querySelectorAll(q) { if (dialog) return { length: q === '.on, .open, [open]' ? (st.sheetOpen ? 1 : 0) : q === '.r2-ov.on' ? 0 : 1 }; if (r2) return { length: q === '.r2-ov.on' ? (st.sheetOpen ? 1 : 0) : 1 }; return { length: st.sheetOpen ? 1 : 0 }; },
        addEventListener(t, f) { (listeners['d:' + t] = listeners['d:' + t] || []).push(f); },
        dispatchEvent(e) { if (e.key === 'Escape') { st.escapes++; st.sheetOpen = false; } return true; },
    };
    const timers = [];
    const W = {
        history, document: D,
        /* Oct 21: no menu bar; back to Home goes through section-nav.js */
        LowiSections: { close() { homeBtn.click(); } },
        addEventListener(t, f) { (listeners['w:' + t] = listeners['w:' + t] || []).push(f); },
    };
    const ctx = { window: W, document: D, history, KeyboardEvent: function (t, o) { return Object.assign({ type: t }, o); }, setTimeout: f => timers.push(f) };
    vm.runInNewContext(SRC, ctx);
    const touch = () => (listeners['d:pointerdown'] || []).forEach(f => f({}));
    const swipeBack = () => { history.back(); (listeners['w:popstate'] || []).forEach(f => f({})); while (timers.length) timers.shift()(); };
    const pop = e => (listeners['w:popstate'] || []).forEach(f => f(e || {}));
    const flush = () => { while (timers.length) timers.shift()(); };
    return { st, history, touch, swipeBack, W, pop, flush };
}

test('a touch puts one guard entry under the app, only once', () => {
    const a = make();
    a.touch(); a.touch();
    assert.strictEqual(JSON.stringify(a.st.stack), JSON.stringify([null, { lowiBack: 1 }]));
});

test('back with a sheet open closes the sheet and keeps you in the app', () => {
    const a = make({ tab: 'foryou', sheetOpen: true });
    a.touch(); a.swipeBack();
    assert.strictEqual(a.st.escapes, 1);
    assert.strictEqual(a.st.sheetOpen, false);
    assert.strictEqual(a.st.tab, 'foryou');
    assert.strictEqual(JSON.stringify(a.history.state), '{"lowiBack":1}', 'guard is back');
});

test('back on Today with a sheet sliding out (scanned product) closes it and stays in the app', () => {
    const a = make({ tab: 'home', sheetOpen: true, r2: true });
    a.touch(); a.swipeBack();
    assert.strictEqual(a.st.escapes, 1);
    assert.strictEqual(a.st.sheetOpen, false);
    assert.strictEqual(a.st.backs, 1, 'only the swipe itself went back, not out of the app');
    assert.strictEqual(JSON.stringify(a.history.state), '{"lowiBack":1}', 'guard is back');
});

test('back on Today with the Gap view sliding out (a dialog that keeps role=dialog while it slides) closes it and stays in the app', () => {
    const a = make({ tab: 'home', sheetOpen: true, dialog: true });
    a.touch(); a.swipeBack();
    assert.strictEqual(a.st.escapes, 1);
    assert.strictEqual(a.st.sheetOpen, false);
    assert.strictEqual(a.st.backs, 1, 'only the swipe itself went back, not out of the app');
    assert.strictEqual(JSON.stringify(a.history.state), '{"lowiBack":1}', 'guard is back');
});

test('back in Community with nothing open goes to Today, not out of the app', () => {
    const a = make({ tab: 'foryou' });
    a.touch(); a.swipeBack();
    assert.strictEqual(a.st.homeClicks, 1);
    assert.strictEqual(a.st.tab, 'home');
    assert.strictEqual(JSON.stringify(a.history.state), '{"lowiBack":1}');
    assert.strictEqual(a.st.backs, 1, 'only the swipe itself went back');
});

test('back on Today with nothing open leaves as before', () => {
    const a = make({ tab: 'home' });
    a.touch(); a.swipeBack();
    assert.strictEqual(a.st.backs, 2, 'the swipe plus one more step out of the app');
    assert.strictEqual(a.st.homeClicks, 0);
});

test('a section entry dropped quietly (Settings > My day goes Home) puts the guard back, so back closes the sheet and stays in the app', () => {
    const a = make({ tab: 'foryou' });
    a.st.stack = [null, { lowiSec: 'foryou' }]; a.st.i = 1;
    let swallow = 1, ev = null;
    a.W.LowiSections.swallowed = e => swallow > 0 || (!!e && e === ev);
    /* section-nav.js goTab('home'): its quiet history.back(), back-swipe.js sees the popstate first */
    a.st.tab = 'home'; a.history.back(); ev = {}; a.pop(ev); swallow = 0; a.flush();
    assert.strictEqual(JSON.stringify(a.history.state), '{"lowiBack":1}', 'guard is back without a touch');
    /* My day opens on Home; back (no touch in between) */
    a.st.sheetOpen = true; a.swipeBack();
    assert.strictEqual(a.st.escapes, 1);
    assert.strictEqual(a.st.sheetOpen, false);
    assert.strictEqual(a.st.i, 1, 'still inside the app (on the guard put back)');
});

test('the Move player keeps its own back: no Escape, no tab change', () => {
    const a = make({ tab: 'move', mv: true });
    a.touch(); a.history.pushState({ lowiMv: 1 });
    a.swipeBack();                              /* lowiMv -> lowiBack: the player\'s pop */
    assert.strictEqual(a.st.escapes, 0);
    assert.strictEqual(a.st.homeClicks, 0);
    a.swipeBack();                              /* below our guard but the player is still on */
    assert.strictEqual(a.st.escapes, 0);
    assert.strictEqual(a.st.homeClicks, 0);
});

test('index.html loads it after nav-moves.js and the service worker lists it', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(html.indexOf('back-swipe.js?v=') > html.indexOf('nav-moves.js?v='));
    assert.strictEqual((fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').match(/"back-swipe\.js"/g) || []).length, 2);
});
