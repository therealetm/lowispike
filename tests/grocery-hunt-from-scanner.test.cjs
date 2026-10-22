'use strict';
/* Oct 22 2026 bug hunt (Fuel > Shop > Scan in the shop > Finds): the Finds chip sits inside the shopping scanner, which covers
   everything (z-index 2147483000), so the Finds panel (z-index 410) opened underneath it and the tap looked dead. Pins: a Finds tap
   from inside the scanner closes the camera first (LowiDex.stop, like the shopping-list chip) and then opens the panel; a Finds tap
   anywhere else (Shop mode's Shop finds entry) leaves the scanner API alone and still opens the panel. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'grocery-hunt.js'), 'utf8');

function el(tag) {
    return { tagName: tag, dataset: {}, attrs: {}, children: [], style: {}, innerHTML: '', textContent: '', className: '',
        classList: { s: new Set(), add(c) { this.s.add(c); }, remove(c) { this.s.delete(c); }, contains(c) { return this.s.has(c); }, toggle() { } },
        setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, removeAttribute(k) { delete this.attrs[k]; },
        addEventListener() { }, removeEventListener() { }, appendChild(c) { this.children.push(c); }, remove() { }, contains: () => false,
        insertAdjacentHTML() { }, insertAdjacentElement() { }, closest: () => null, querySelector: () => null, querySelectorAll: () => [] };
}
function boot() {
    const calls = [], listeners = [];
    const D = { readyState: 'loading', documentElement: { lang: 'de' }, body: el('body'),
        addEventListener: (t, f, cap) => listeners.push({ t, f, cap: !!cap }), removeEventListener() { }, getElementById: () => null,
        querySelector: () => null, querySelectorAll: () => [], createElement: t => el(t) };
    D.body.appendChild = c => { calls.push('panel'); D.body.children.push(c); };
    const storage = {};
    const W = { document: D, LowiGroceryCore: require('../grocery-hunt-core.js'), LowiDex: { stop: () => calls.push('stop') },
        MutationObserver: function () { this.observe = () => { }; }, requestAnimationFrame: () => 0, addEventListener() { }, removeEventListener() { },
        dispatchEvent() { }, CustomEvent: function (n) { this.type = n; }, setInterval: () => 0, clearInterval() { },
        localStorage: { getItem: k => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: k => { delete storage[k]; } } };
    W.window = W;
    const ctx = Object.assign(W, { console, Date, Math, String, Number, Object, Array, JSON, Set, Map, Promise, setTimeout: () => 0, clearTimeout() { }, fetch: () => Promise.reject(new Error('offline')) });
    vm.runInNewContext(SRC, ctx);
    const click = listeners.find(l => l.t === 'click' && l.cap);
    return { calls, click: click && click.f, G: W.LowiGrocery };
}
function tapOn(click, chip) {
    let stopped = false;
    click({ target: chip, preventDefault() { }, stopPropagation() { stopped = true; } });
    return stopped;
}

test('Finds chip inside the shopping scanner closes the camera first, then opens the panel on top', () => {
    const { calls, click, G } = boot();
    assert.ok(click, 'a capture-phase click handler is wired');
    const cam = el('div'); cam.className = 'b3-cam';
    const chip = el('button'); chip.className = 'ss-chip gh-hunt';
    chip.closest = sel => (sel === '[data-gh="open"]' ? chip : (sel === '.b3-cam' || sel === '#b3Cam') ? cam : null);
    assert.strictEqual(tapOn(click, chip), true, 'the tap is handled');
    assert.deepStrictEqual(calls, ['stop', 'panel'], 'scanner closed before the Finds panel opens, so the panel is not hidden under it');
    assert.strictEqual(G.isOpen(), true);
});

test('Shop finds entry outside the scanner opens the panel without touching the scanner', () => {
    const { calls, click, G } = boot();
    const entry = el('button'); entry.className = 'gh-entry';
    entry.closest = sel => (sel === '[data-gh="open"]' ? entry : null);
    tapOn(click, entry);
    assert.deepStrictEqual(calls, ['panel']);
    assert.strictEqual(G.isOpen(), true);
});

test('a tap that is not a Finds button is left alone', () => {
    const { calls, click } = boot();
    const other = el('button');
    assert.strictEqual(tapOn(click, other), false);
    assert.deepStrictEqual(calls, []);
});
