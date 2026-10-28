'use strict';
/* Oct 28 2026 (Emmanuel, call: the fourth Water orb "Groesse" goes; the size changes by a long press on Flasche - "Ja, genau").
   The Water bloom is Sips / Glas / Flasche, no Size orb. A tap on any of them logs water as before; a long press on Flasche steps
   the bottle size (0.33 / 0.5 / 0.75 / 1 / 1.5 l), shows it on the orb, and logs NO water, also not on the release. Same in the
   all-bubbles overview. Runs the real home-blooms-v2.js page part in a small fake window (node:vm) with fake timers and pointer
   events. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'home-blooms-v2.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'home-blooms-v2.css'), 'utf8');
const K_SRC = fs.readFileSync(path.join(ROOT, 'spirit-core.js'), 'utf8');
const NB = '\u00a0';

function el(tag) {
    const attrs = {}, ls = {};
    const e = {
        tagName: String(tag || 'div').toUpperCase(), dataset: {}, style: { setProperty() { } },
        classList: { add() { }, remove() { }, contains: () => false, toggle() { } },
        innerHTML: '', hidden: false, offsetWidth: 1, isConnected: true,
        setAttribute(k, v) { attrs[k] = String(v); }, getAttribute(k) { return k in attrs ? attrs[k] : null; },
        addEventListener(t, f) { (ls[t] = ls[t] || []).push(f); }, removeEventListener(t, f) { ls[t] = (ls[t] || []).filter(x => x !== f); },
        fire(t, ev) { (ls[t] || []).slice().forEach(f => f(ev)); },
        querySelector() { return null; }, querySelectorAll() { return []; }, contains(x) { return x === e; },
        closest() { return null; }, appendChild(c) { return c; }, remove() { }, click() { }, focus() { },
        getBoundingClientRect() { return { left: 20, top: 380, width: 76, height: 76, right: 96, bottom: 456 }; }
    };
    return e;
}

/* an orb as the bloom draws it: <button class="hb2-orb" data-hb2="act" data-id="..."> (closest() finds itself) */
function orb(id) { const o = el('button'); o.dataset.hb2 = 'act'; o.dataset.id = id; o.closest = () => o; return o; }

function page(lang) {
    const timers = []; let clock = 1000;
    const store = {};
    const D = el('html');
    const waterBtn = el('button'); waterBtn.setAttribute('data-orbit', 'water');
    let last = null;
    Object.assign(D, {
        head: el('head'), body: Object.assign(el('body'), { appendChild: c => { last = c; return c; } }),
        documentElement: Object.assign(el('html'), { lang }), currentScript: null,
        createElement: t => el(t), getElementById: () => null,
        querySelector: s => (s === '[data-orbit="water"]' ? waterBtn : null), activeElement: null, dispatchEvent() { }
    });
    const logged = [], toasts = [];
    const W = {
        document: D, innerWidth: 390, innerHeight: 844, console, Date: { now: () => clock }, Math, JSON, String, Array, Object, isFinite, parseFloat,
        setTimeout: (f, ms) => { timers.push({ f, at: clock + (ms || 0) }); return timers.length; },
        clearTimeout: id => { if (timers[id - 1]) timers[id - 1].f = null; },
        matchMedia: () => ({ matches: true }), CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; },
        addEventListener() { }, removeEventListener() { }, dispatchEvent() { }, navigator: {},
        getComputedStyle: () => ({ getPropertyValue: () => '', fontSize: '12px' }),
        localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        toast: m => toasts.push(m)
    };
    W.window = W; W.globalThis = W;
    vm.createContext(W);
    vm.runInContext(K_SRC, W);
    W.LowiSpirit = { meal() { }, water(k) { logged.push(k); }, refresh() { } };
    vm.runInContext(SRC, W);
    const api = W.LowiHomeBloomsV2;
    api.mount(D);
    const advance = ms => { clock += ms; timers.forEach(t => { if (t.f && t.at <= clock) { const f = t.f; t.f = null; f(); } }); };
    const down = (o, x, y, extra) => Object.assign({ target: o, pointerId: 1, isPrimary: true, clientX: x || 100, clientY: y || 100 }, extra || {});
    const click = o => ({ target: o, isTrusted: false, detail: 0, preventDefault() { }, stopPropagation() { } });
    const openWater = () => { assert.strictEqual(api.open('water'), true, 'the Water bloom opens'); assert.ok(last && last.__acts, 'bloom drawn'); return last; };
    return { W, D, api, advance, down, click, logged, toasts, K: W.LowiSpiritCore, openWater };
}

test('the Water bloom is Sips, Glas, Flasche: the fourth orb Groesse is gone (DE / EN / ES)', () => {
    for (const [lang, words] of [['de', ['Sips', 'Glas', 'Flasche']], ['en', ['Sips', 'Glass', 'Bottle']], ['es', ['Sorbos', 'Vaso', 'Botella']]]) {
        const p = page(lang);
        assert.deepStrictEqual([...p.api.actions('water').map(a => a.label)], words, lang);
        assert.deepStrictEqual([...p.api.actions('water').map(a => a.id)], ['sips', 'cup', 'bottle'], lang);
    }
    assert.doesNotMatch(SRC, /id: 'bsize'/, 'no Size orb in the source');
    assert.doesNotMatch(SRC, /bsize: '<path/, 'its icon went with it');
});

test('the bottle says its size and, for screen readers, that holding it changes the size', () => {
    const de = page('de').api.actions('water').find(a => a.id === 'bottle');
    assert.strictEqual(de.sub, '0,75' + NB + 'l', 'no size picked yet = 0,75 l');
    assert.ok(de.aria.includes('Eine ganze Flasche, 0,75' + NB + 'l. Gedr\u00fcckt halten: Gr\u00f6\u00dfe \u00e4ndern'), de.aria);
    assert.match(page('en').api.actions('water').find(a => a.id === 'bottle').aria, /Hold to change the size/);
    assert.match(page('es').api.actions('water').find(a => a.id === 'bottle').aria, /cambiar el tama/);
});

test('a tap on Flasche logs one bottle, the size stays', () => {
    const p = page('de'); const ov = p.openWater(); p.advance(1000);
    const b = orb('bottle');
    ov.fire('pointerdown', p.down(b)); p.advance(120); ov.fire('pointerup', p.down(b)); ov.fire('click', p.click(b));
    assert.deepStrictEqual(p.logged, ['bottle']);
    assert.strictEqual(p.K.bottleMl(), 750, 'size unchanged');
});

test('a long press on Flasche steps the size, shows it, and logs no water (also not on the release)', () => {
    const p = page('de'); const ov = p.openWater(); p.advance(1000);
    const b = orb('bottle');
    ov.fire('pointerdown', p.down(b));
    p.advance(400); assert.strictEqual(p.K.bottleMl(), 750, 'not yet at 400 ms');
    p.advance(200);
    assert.strictEqual(p.K.bottleMl(), 1000, 'held: 0,75 l -> 1 l');
    assert.deepStrictEqual(p.toasts, ['Flasche: 1' + NB + 'l']);
    assert.strictEqual(ov.__acts.find(a => a.id === 'bottle').sub, '1' + NB + 'l', 'the orb small line shows the new size right away');
    /* the finger lifts: iOS sends one click, on the orb under it now (the re-drawn one) */
    ov.fire('pointerup', p.down(b)); ov.fire('click', p.click(orb('bottle')));
    assert.deepStrictEqual(p.logged, [], 'the long press logged no water');
    p.advance(1000);
    ov.fire('pointerdown', p.down(b)); p.advance(600); ov.fire('pointerup', p.down(b)); ov.fire('click', p.click(b));
    assert.strictEqual(p.K.bottleMl(), 1500);
    p.advance(1000);
    ov.fire('pointerdown', p.down(b)); p.advance(600); ov.fire('pointerup', p.down(b)); ov.fire('click', p.click(b));
    assert.strictEqual(p.K.bottleMl(), 330, '1,5 l wraps to 0,33 l');
    assert.deepStrictEqual(p.logged, [], 'still nothing logged');
    /* a normal tap later logs one bottle of the picked size */
    p.advance(1000);
    ov.fire('pointerdown', p.down(b)); p.advance(100); ov.fire('pointerup', p.down(b)); ov.fire('click', p.click(b));
    assert.deepStrictEqual(p.logged, ['bottle']);
});

test('holding on long after the size stepped still logs nothing when the finger lifts; the next tap logs again', () => {
    const p = page('de'); const ov = p.openWater(); p.advance(1000);
    const b = orb('bottle');
    ov.fire('pointerdown', p.down(b)); p.advance(600);
    assert.strictEqual(p.K.bottleMl(), 1000);
    p.advance(3000); /* the finger stays on the bottle for 3 more seconds */
    assert.strictEqual(p.K.bottleMl(), 1000, 'one step per hold');
    ov.fire('pointerup', p.down(b)); p.advance(30); ov.fire('click', p.click(b));
    assert.deepStrictEqual(p.logged, [], 'the late release logged no water');
    /* the release went to the old (re-drawn away) orb and never reached the bloom: the click is still eaten */
    ov.fire('pointerdown', p.down(b)); p.advance(600); p.advance(2000); ov.fire('click', p.click(b));
    assert.deepStrictEqual(p.logged, []);
    assert.strictEqual(p.K.bottleMl(), 1500);
    /* no click came after a hold (some browsers send none): the next tap is a normal tap */
    ov.fire('pointerdown', p.down(b)); p.advance(600); ov.fire('pointerup', p.down(b)); p.advance(2000);
    ov.fire('pointerdown', p.down(b)); p.advance(100); ov.fire('pointerup', p.down(b)); ov.fire('click', p.click(b));
    assert.deepStrictEqual(p.logged, ['bottle'], 'next tap logs one bottle');
});

test('the size is saved on the device (same key as before), so it survives closing the bloom', () => {
    const p = page('de'); const ov = p.openWater(); p.advance(1000);
    const b = orb('bottle');
    ov.fire('pointerdown', p.down(b)); p.advance(600); ov.fire('pointerup', p.down(b));
    assert.strictEqual(p.W.localStorage.getItem('lowispike.water.bottle.v1'), '1000');
    p.api.close();
    assert.strictEqual(p.api.actions('water').find(a => a.id === 'bottle').sub, '1' + NB + 'l');
});

test('sliding away, lifting early, a second finger, a cancel or a press on Sips / Glas never changes the size', () => {
    const p = page('de'); const ov = p.openWater(); p.advance(1000);
    const b = orb('bottle');
    ov.fire('pointerdown', p.down(b, 100, 100)); ov.fire('pointermove', p.down(b, 100, 120)); p.advance(700);
    assert.strictEqual(p.K.bottleMl(), 750, 'slid 20 px: no hold');
    ov.fire('pointerdown', p.down(b)); p.advance(300); ov.fire('pointerup', p.down(b)); p.advance(700);
    assert.strictEqual(p.K.bottleMl(), 750, 'lifted at 300 ms: no hold');
    ov.fire('pointerdown', p.down(b)); ov.fire('pointerdown', p.down(b, 150, 150, { pointerId: 2, isPrimary: false })); p.advance(700);
    assert.strictEqual(p.K.bottleMl(), 750, 'second finger: no hold');
    ov.fire('pointerdown', p.down(b)); ov.fire('pointercancel', p.down(b)); p.advance(700);
    assert.strictEqual(p.K.bottleMl(), 750, 'cancelled: no hold');
    for (const id of ['sips', 'cup']) { const o = orb(id); ov.fire('pointerdown', p.down(o)); p.advance(700); ov.fire('pointerup', p.down(o)); }
    assert.strictEqual(p.K.bottleMl(), 750, 'Sips and Glas have no hold');
    assert.deepStrictEqual(p.logged, [], 'and none of this logged water');
});

test('the all-bubbles overview and the Water bloom share the same hold', () => {
    const m = SRC.match(/function openAll\(\)[\s\S]*?\n    }\n/); assert.ok(m, 'openAll found');
    assert.match(m[0], /ov\.addEventListener\('click', onBloomClick\);\s*orbHold\(ov\);/);
    const o = SRC.match(/function open\(kind, src\)[\s\S]*?\n    }\n/); assert.ok(o, 'open found');
    assert.match(o[0], /ov\.addEventListener\('click', onBloomClick\);\s*orbHold\(ov\);/);
    assert.match(SRC, /if \(st\.holdEat\) \{/, 'the release click after a hold is eaten');
});

test('a held orb shows no iOS callout and selects no text', () => {
    const rule = CSS.match(/\.hb2-orb \{[\s\S]*?\}/)[0];
    assert.match(rule, /-webkit-touch-callout: none/);
    assert.match(rule, /-webkit-user-select: none; user-select: none/);
});
