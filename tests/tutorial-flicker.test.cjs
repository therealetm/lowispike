'use strict';
/* Oct 19 2026 (Emmanuel: "the tutorial is flickering for some reason on my iOS phone and also on every version").
   Cause: the Day card's BUSY list names the tour itself ('#ltTour:not(.lt-held)') so the Day card waits for it, and the tour's own
   busyBy() walked that same list. So the visible tour counted as "another panel": it hid, found nothing, showed again, every 350 ms tick.
   This runs the real tutorial.js against a tiny fake page and checks the card stays up over many ticks, and still gives way to a real
   panel and comes back once it closes. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const S = require('../tutorial-steps.js');
const R = require('../daily-ritual.js');

function classList() {
    const set = new Set();
    return { add: (...c) => c.forEach(x => set.add(x)), remove: (...c) => c.forEach(x => set.delete(x)), contains: c => set.has(c), toggle: (c, f) => { (f === undefined ? !set.has(c) : f) ? set.add(c) : set.delete(c); } };
}
function el(tag) {
    const e = {
        tagName: tag.toUpperCase(), id: '', className: '', style: {}, attrs: {}, children: [], isConnected: false, offsetHeight: 180, parent: null,
        classList: classList(), innerHTML: '',
        setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = v; }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, removeAttribute(k) { delete this.attrs[k]; },
        addEventListener() { }, focus() { }, remove() { this.isConnected = false; },
        appendChild(c) { c.parent = this; c.isConnected = true; this.children.push(c); return c; },
        getBoundingClientRect() { return { left: 0, top: 0, right: 390, bottom: 844, width: 390, height: 844 }; },
        closest(sel) { let n = this; while (n) { if (sel === '#ltTour' && n.id === 'ltTour') return n; n = n.parent; } return null; },
        querySelector(sel) { if (!this._kids) this._kids = { '.lt-card': el('div'), '.lt-hole': el('div') }; const k = this._kids[sel]; if (k) { k.parent = this; k.isConnected = true; } return k || null; },
        querySelectorAll() { return []; }
    };
    Object.defineProperty(e, 'style', { value: { cssText: '' }, writable: true });
    return e;
}
function page() {
    const timers = [];
    const H = el('html'); H.isConnected = true; H.clientWidth = 390;
    const body = el('body'); body.isConnected = true;
    let tour = null; const panels = {};
    const D = {
        documentElement: H, body, activeElement: null, head: { appendChild() { } },
        createElement(t) { const e = el(t); if (t === 'div' && !tour) { tour = e; } return e; },
        getElementById(id) { return id === 'ltCss' ? {} : null; },
        querySelector(sel) {
            if (sel === 'link[href^="tutorial.css"]') return {};
            const m = /^#ltTour(:not\(\.lt-held\))?$/.exec(sel);
            if (m) return tour && tour.isConnected && (!m[1] || !tour.classList.contains('lt-held')) ? tour : null;
            return panels[sel] || null;
        },
        querySelectorAll() { return []; }
    };
    const W = {
        document: D, innerWidth: 390, innerHeight: 844, LowiTutorialSteps: Object.assign({}, S, { OFF: false }) /* the parked engine, switched on (tutorial-steps.js OFF, Oct 29 2026) */, LowiRitualCore: { BUSY: R.BUSY },
        localStorage: { _v: {}, getItem(k) { return this._v[k] || null; }, setItem(k, v) { this._v[k] = v; } },
        addEventListener() { }, dispatchEvent() { }, CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
        matchMedia: () => ({ matches: false }), setInterval: f => { timers.push(f); return timers.length; }, clearInterval() { }, setTimeout() { return 0; },
        getComputedStyle: e => ({ display: 'block', visibility: e && e.classList && e.classList.contains('lt-held') ? 'hidden' : 'visible', opacity: '1', position: 'fixed' })
    };
    W.window = W;
    const ctx = vm.createContext(Object.assign(W, { console, JSON, Math, Date, String, Object, Array, Set, Promise }));
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'tutorial.js'), 'utf8'), ctx, { filename: 'tutorial.js' });
    const tick = () => timers.forEach(f => f());
    return { W, tick, panels, tour: () => tour };
}

test('the tour never counts itself as another panel: the card stays visible tick after tick (no flicker)', () => {
    assert.ok(R.BUSY.includes('#ltTour:not(.lt-held)'), 'the Day card still waits for the tour');
    const p = page(), T = p.W.LowiTutorial;
    assert.ok(T && T.start({ from: 'test' }), 'tour starts');
    assert.strictEqual(T.busyBy(), '', 'the visible tour is not "busy" by itself');
    const flips = [];
    for (let k = 0; k < 20; k++) { p.tick(); flips.push(T.held()); }
    assert.deepStrictEqual(flips, Array(20).fill(false), 'never hidden over 7 seconds of ticks on a quiet Home');
    assert.ok(!p.tour().classList.contains('lt-held'));
});

test('the tour still gives way to a real panel, and comes back steadily once it closes', () => {
    const p = page(), T = p.W.LowiTutorial;
    T.start({ from: 'test' });
    const sheet = el('div'); sheet.isConnected = true; p.panels['#sheetwrap.open'] = sheet;
    p.tick(); assert.strictEqual(T.held(), true, 'hides at once for a sheet');
    delete p.panels['#sheetwrap.open'];
    p.tick(); assert.strictEqual(T.held(), true, 'waits one more quiet tick (a closing animation cannot blink it)');
    p.tick(); assert.strictEqual(T.held(), false, 'back once things are quiet');
    const flips = [];
    for (let k = 0; k < 10; k++) { p.tick(); flips.push(T.held()); }
    assert.deepStrictEqual(flips, Array(10).fill(false), 'and stays back');
});
