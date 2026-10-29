'use strict';
/* Code error sweep 22 Oct 2026 20:02: when Home came back without the X (a bubble, the tutorial, goTab('home')), section-nav.js
   drops the section's history entry with a quiet history.back(). back-swipe.js took that pop for a swipe back on Home with
   nothing open and went back once more, out of LOWiSPIKE (WebKit iPhone 15 sim: the page left for the entry before the app,
   and the renderer crashed during that navigation 1 of 3 runs; tools/probe-chat-gl.cjs / the queue's reload crash).
   Both real files run together here, back-swipe.js first, as index.html loads them. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const R = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function make({ guard = false } = {}) {
    const st = { stack: [null], i: 0, tab: 'home', backs: 0, pops: [], left: false };
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
        querySelector(q) { if (/\.tab\.active/.test(q)) return { id: 'tab-' + st.tab }; return null; },
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

test('Home coming back without the X drops the section entry once and stays in the app (no guard entry yet)', () => {
    const a = make();
    a.W.goTab('foryou'); a.settle();
    assert.strictEqual(JSON.stringify(a.st.stack[a.st.i]), '{"lowiSec":"foryou"}');
    a.W.goTab('home'); a.settle();
    assert.strictEqual(a.st.tab, 'home');
    assert.strictEqual(a.st.backs, 1, 'only the quiet back, no second back out of LOWiSPIKE');
    assert.strictEqual(a.st.left, false);
    /* Oct 29 19:02 bug hunt: the guard goes back once the quiet drop has landed, so a sheet opened on Home right after it (Settings >
       My day) closes on back instead of leaving the app */
    assert.strictEqual(a.st.i, 1);
    assert.strictEqual(JSON.stringify(a.st.stack[a.st.i]), '{"lowiBack":1}');
});

test('same with the guard entry under the app: still one back, the guard stays', () => {
    const a = make({ guard: true });
    a.W.goTab('foryou'); a.W.goTab('home'); a.settle();
    assert.strictEqual(a.st.backs, 1);
    assert.strictEqual(JSON.stringify(a.st.stack[a.st.i]), '{"lowiBack":1}');
});

test('a real swipe back on Home with nothing open still leaves, as before', () => {
    const a = make({ guard: true });
    a.st.i--; a.st.pops.push({ state: a.st.stack[a.st.i] }); a.settle();
    assert.strictEqual(a.st.backs, 1, 'back-swipe.js goes on out of the app');
});

test('section-nav.js tells back-swipe.js about its quiet back; index.html loads back-swipe.js first', () => {
    assert.match(R('section-nav.js'), /api\.swallowed = e => swallow > 0 \|\| \(!!e && e === swallowedEvt\);/);
    assert.match(R('back-swipe.js'), /W\.LowiSections\.swallowed\(e\)\) \{ setTimeout\(guard, 0\); return; \}/);
    const h = R('index.html');
    assert.ok(h.indexOf('back-swipe.js?v=') < h.indexOf('section-nav.js?v='));
});
