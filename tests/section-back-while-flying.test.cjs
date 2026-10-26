'use strict';
/* Oct 26 2026 (Emmanuel: "Once we're in the Community section, the back button disappears. Going back to the home
   disappears."). section-nav.css hid the round Home button on a page while html.mf-on was set, and section-nav.js blocked
   the edge swipe and Escape on it too. mf-on means your companion is flying; autopilot keeps it set after you leave Home,
   so every page (Community, Move, Cook, Profile) lost all three ways home. A page always keeps its way home while she flies;
   only a real full-screen layer with its own close (camera, herb room) may hide it. Runs the real back-swipe.js and
   section-nav.js in a small fake DOM (as escape-closes-section-1024.test.cjs does) and reads the real CSS. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const R = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function make() {
    const st = { stack: [null], i: 0, tab: 'home', left: false, pops: [] };
    const L = {};
    const on = (k, f) => (L[k] = L[k] || []).push(f);
    const fire = (k, e) => (L[k] || []).slice().forEach(f => f(e));
    const history = {
        get state() { return st.stack[st.i]; },
        pushState(s) { st.stack = st.stack.slice(0, st.i + 1); st.stack.push(s); st.i++; },
        replaceState(s) { st.stack[st.i] = s; },
        back() { if (st.i > 0) { st.i--; st.pops.push({ state: st.stack[st.i] }); } else st.left = true; },
    };
    const cls = new Set();
    const classList = { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c), toggle: (c, v) => (v === undefined ? (cls.has(c) ? cls.delete(c) : cls.add(c)) : v ? cls.add(c) : cls.delete(c)) };
    const styles = [];
    const el = () => ({ id: '', style: { setProperty() { }, removeProperty() { } }, classList: { add() { }, remove() { }, contains() { return false; } }, addEventListener() { }, setAttribute() { }, appendChild() { }, isConnected: true, getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }) });
    const pages = {};
    const D = {
        readyState: 'complete',
        documentElement: { lang: 'en', classList, get className() { return [...cls].join(' '); } },
        body: { className: '', appendChild() { } },
        activeElement: null,
        scrollingElement: null,
        querySelector(q) { if (/\.tab\.active/.test(q)) return { id: 'tab-' + st.tab }; return null; },
        querySelectorAll() { return { length: 0 }; },
        getElementById(id) { if (id === 'main') return el(); if (/^tab-/.test(id)) return (pages[id] = pages[id] || el()); return null; },
        createElement: el,
        addEventListener: (t, f, o) => on('d:' + t, f),
        dispatchEvent(e) { fire('d:' + e.type, e); return true; },
    };
    const timers = [];
    const W = {
        history, document: D, innerWidth: 390, innerHeight: 844,
        goTab(t) { st.tab = t; },
        getComputedStyle: () => ({ display: 'block', visibility: 'visible', zIndex: '90' }),
        addEventListener: (t, f, cap) => on('w:' + t + (cap === true ? ':cap' : ''), f),
        matchMedia: () => ({ matches: true }),
    };
    const ctx = {
        window: W, document: D, history, performance: { now: () => (ctx._t += 16) }, _t: 0, console,
        KeyboardEvent: function (t, o) { return Object.assign({ type: t, isTrusted: false }, o); },
        MutationObserver: function () { this.observe = () => { }; },
        matchMedia: () => ({ matches: true }), requestAnimationFrame: f => timers.push(f), setTimeout: f => timers.push(f), clearTimeout() { },
    };
    vm.runInNewContext(R('back-swipe.js'), ctx);
    vm.runInNewContext(R('section-nav.js'), ctx);
    fire('d:pointerdown', {});
    const settle = () => { for (let n = 0; n < 80 && (st.pops.length || timers.length); n++) { if (st.pops.length) fire('w:popstate', st.pops.shift()); else timers.shift()(); } };
    const key = () => {
        const e = { type: 'keydown', key: 'Escape', isTrusted: true, target: null, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
        fire('w:keydown:cap', e); fire('d:keydown', e); fire('w:keydown', e); settle();
    };
    return { st, W, D, cls, fire, settle, key };
}

/* every CSS rule (in every stylesheet the app loads) whose selector could hide .sec-x/#secX on a page while she flies */
function hideRulesWhileFlying() {
    const html = R('index.html');
    const sheets = [...html.matchAll(/<link[^>]+href="([^"?]+\.css)/g)].map(m => m[1]).filter(f => fs.existsSync(path.join(ROOT, f)));
    assert.ok(sheets.includes('section-nav.css'), 'index.html loads section-nav.css');
    const out = [];
    for (const f of sheets) {
        const css = R(f).replace(/\/\*[\s\S]*?\*\//g, '');
        for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
            if (!/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?![.\d])/.test(m[2])) continue;
            for (const sel of m[1].split(',')) if (/(\.sec-x|#secX)\b/.test(sel) && /\.mf-on\b/.test(sel)) out.push(f + ': ' + sel.trim());
        }
    }
    return out;
}

test('no stylesheet hides the Home button on a page because your companion is flying', () => {
    assert.deepStrictEqual(hideRulesWhileFlying(), [], 'html.mf-on must never hide .sec-x');
    const css = R('section-nav.css');
    assert.match(css, /html\.sec-open \.sec-x\{display:flex\}/, 'a page shows its Home button');
    /* the real full-screen layers with their own close still hide it */
    assert.match(css, /html\.sec-open\.b3-camon \.sec-x/);
    assert.match(css, /html\.sec-open\.sp-open \.sec-x/);
});

test('the Home button has an Apple-size tap target (44 pt or more) without changing the glass circle', () => {
    const css = R('section-nav.css').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.match(css, /\.sec-x\{[^}]*width:40px;height:40px/, 'the circle stays 40 px');
    const ring = css.match(/\.sec-x::(?:before|after)\{([^}]*)\}/);
    assert.ok(ring, 'an invisible ring widens the tap area');
    const inset = ring[1].match(/inset:\s*-(\d+)px/);
    assert.ok(inset && 40 + 2 * Number(inset[1]) >= 44, 'tap area is at least 44 px');
    assert.match(ring[1], /position:absolute/);
});

for (const tab of ['foryou', 'move', 'shelf', 'profile']) {
    test('Escape on the ' + tab + ' page goes Home while your companion is flying on autopilot', () => {
        const a = make();
        a.W.goTab(tab); a.settle();
        a.cls.add('mf-on');
        a.key();
        assert.strictEqual(a.st.tab, 'home', 'Escape still takes you Home');
        assert.strictEqual(a.st.left, false);
    });
}

test('the edge swipe back still starts on Community while your companion is flying', () => {
    const a = make();
    a.W.goTab('foryou'); a.settle();
    a.cls.add('mf-on');
    const ev = (x, y, extra) => Object.assign({ pointerId: 1, button: 0, clientX: x, clientY: y, isPrimary: true, pointerType: 'touch', target: null, preventDefault() { }, stopPropagation() { } }, extra || {});
    const send = (t, e) => { a.fire('w:' + t + ':cap', e); a.fire('w:' + t, e); };
    send('pointerdown', ev(8, 400));
    for (let x = 20; x <= 320; x += 30) send('pointermove', ev(x, 402));
    send('pointerup', ev(320, 402));
    a.settle();
    assert.strictEqual(a.st.tab, 'home', 'a swipe from the left edge takes you Home');
});

test('the camera (a full-screen layer with its own close) still keeps Escape from leaving the page', () => {
    const a = make();
    a.W.goTab('foryou'); a.settle();
    a.cls.add('b3-camon');
    a.key();
    assert.strictEqual(a.st.tab, 'foryou');
});
