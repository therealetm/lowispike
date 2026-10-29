'use strict';
/* Oct 21 2026 (Emmanuel, on the Home tutorial card "Tutorial · 17 of 41"): "Those dotted lines in the tutorial, I feel like they're
   stupid... remove it and just have a number there." The two rows of progress dots are gone; the "17 of 41" count is the only progress
   indicator. This renders the real tutorial.js card on every step and checks: no dots, the count reads "i of n", Back/Skip/Next still there,
   and no dot styling is left behind in tutorial.css. */
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
        addEventListener(t, f) { (this.ls = this.ls || {})[t] = f; }, focus() { }, remove() { this.isConnected = false; },
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


test('the tutorial card shows only the step number, no progress dots, on every step', () => {
    const p = page(), T = p.W.LowiTutorial;
    assert.ok(T && T.start({ from: 'test' }), 'tour starts');
    const card = p.tour().querySelector('.lt-card');
    const n = (card.innerHTML.match(/ of (\d+)</) || [])[1];
    assert.ok(n && +n > 1, 'the count says "of N"');
    for (let k = 1; k <= +n; k++) {
        const h = card.innerHTML;
        assert.ok(!/lt-dots/.test(h), 'no dots row on step ' + k);
        assert.ok(!/<i[\s>]/.test(h), 'no dot elements on step ' + k);
        assert.ok(h.includes('<small class="lt-count">Tutorial \u00b7 ' + k + ' of ' + n + '</small>'), 'step ' + k + ' reads "Tutorial · ' + k + ' of ' + n + '"');
        assert.ok(/data-lt="(next|claim)"/.test(h), 'Next is still there on step ' + k);
        if (k > 1) assert.ok(h.includes('data-lt="back"'), 'Back is still there on step ' + k);
        if (k < +n) {
            assert.ok(h.includes('data-lt="skip"'), 'Skip is still there on step ' + k);
            p.tour().ls.click({ stopPropagation() { }, target: { closest: () => ({ getAttribute: () => 'next' }) } });
        }
    }
});

test('no dot styling or dot code is left over', () => {
    const css = fs.readFileSync(path.join(ROOT, 'tutorial.css'), 'utf8'), js = fs.readFileSync(path.join(ROOT, 'tutorial.js'), 'utf8');
    assert.ok(!/lt-dots/.test(css), 'tutorial.css has no .lt-dots rules');
    assert.ok(!/lt-dots/.test(js), 'tutorial.js renders no dots');
    assert.ok(/\.lt-count\s*\{[^}]*font-size:\s*12px/.test(css), 'the count is a little larger (12 px) now it is the only progress indicator');
});
