'use strict';
/* A fake page just big enough to run misty-pad.js in Node (no browser). Same page as tests/ui-joystick-fade.test.cjs,
   shared here for tests/ui-joystick-vanish.test.cjs. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ---------- a fake page just big enough for misty-pad.js ---------- */
function classList(el) {
    const s = new Set();
    return {
        add: (...c) => c.forEach(x => s.add(x)), remove: (...c) => c.forEach(x => s.delete(x)), contains: c => s.has(c),
        toggle(c, on) { if (on === undefined) on = !s.has(c); if (on) s.add(c); else s.delete(c); return on; },
        get size() { return s.size; }, toString: () => [...s].join(' ')
    };
}
function makeEl(tag, doc) {
    const ls = {};
    const el = {
        tagName: String(tag).toUpperCase(), id: '', type: '', className: '', children: [], parentNode: null, isConnected: false,
        dataset: {}, attrs: {}, style: { setProperty(k, v) { this[k] = v; }, getPropertyValue(k) { return this[k] || ''; } },
        offsetWidth: 60, _html: '',
        set innerHTML(h) { this._html = h; if (/mp-knob/.test(h) && !this._knob) { this._knob = makeEl('span', doc); this._knob.className = 'mp-knob'; this._knob.parentNode = this; } },
        get innerHTML() { return this._html; },
        setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
        appendChild(c) { if (c.parentNode && c.parentNode !== this) { const p = c.parentNode; p.children = p.children.filter(x => x !== c); } if (!this.children.includes(c)) this.children.push(c); c.parentNode = this; c.isConnected = this.isConnected; return c; },
        querySelector(sel) { if (sel === '.mp-knob') return this._knob || null; return null; },
        addEventListener(n, f) { (ls[n] = ls[n] || []).push(f); }, removeEventListener() { },
        dispatch(n, ev) { (ls[n] || []).forEach(f => f(ev)); },
        setPointerCapture(id) { this.captured = id; }, releasePointerCapture() { this.captured = null; },
        getBoundingClientRect: () => ({ left: 0, top: 0, right: 390, bottom: 844, width: 390, height: 844 }),
        closest: () => null
    };
    el.classList = classList(el);
    return el;
}
function fakePage() {
    const docLs = {}, winLs = {}, timers = [];
    let clock = 1000, tid = 0;
    const D = {
        readyState: 'complete', hidden: false, currentScript: null,
        documentElement: null, head: null, body: null, byId: {},
        createElement: t => makeEl(t, D),
        getElementById(id) { return this.byId[id] || null; },
        querySelector: () => null,
        addEventListener(n, f) { (docLs[n] = docLs[n] || []).push(f); },
        fire(n, ev) { (docLs[n] || []).forEach(f => f(ev || {})); }
    };
    D.documentElement = makeEl('html', D); D.documentElement.lang = 'en'; D.documentElement.isConnected = true;
    D.head = makeEl('head', D); D.head.isConnected = true; D.body = makeEl('body', D); D.body.isConnected = true;
    const hud = makeEl('div', D); hud.id = 'whHud'; hud.isConnected = true; D.byId.whHud = hud;
    const origAppend = hud.appendChild.bind(hud);
    hud.appendChild = c => { origAppend(c); if (c.id) D.byId[c.id] = c; return c; };
    const sent = [];
    const W = {
        document: D, innerWidth: 390, innerHeight: 844, navigator: {},
        localStorage: { _s: {}, getItem(k) { return k in this._s ? this._s[k] : null; }, setItem(k, v) { this._s[k] = String(v); } },
        performance: { now: () => clock },
        setTimeout(f, ms) { const id = ++tid; timers.push({ id, at: clock + (+ms || 0), f }); return id; },
        clearTimeout(id) { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
        setInterval: () => 0, clearInterval() { },
        addEventListener(n, f) { (winLs[n] = winLs[n] || []).push(f); },
        fire(n, ev) { (winLs[n] || []).forEach(f => f(ev || {})); },
        dispatchEvent() { }, getComputedStyle: () => ({}),
        LowiWorldHome: { pad(cmd) { if (cmd) sent.push(cmd); return { mode: '' }; } },
        LowiMistyTurn: { core: { K: { HOLD_MS: 280, BACK_MS: 1200 }, holdDir: () => 1 }, thrust() { } }
    };
    W.window = W; W.navigator = { vibrate() { } };
    const ctx = vm.createContext(Object.assign(W, { console, Math, JSON, Date, Object, Array, Set, Map, String, Number, isFinite, parseFloat }));
    W.localStorage.setItem('lowi.pad.hint', '1');
    vm.runInContext(read('misty-pad.js'), ctx);
    const advance = ms => {
        const end = clock + ms;
        for (;;) {
            timers.sort((a, b) => a.at - b.at);
            const t = timers[0]; if (!t || t.at > end) break;
            timers.shift(); clock = t.at; t.f();
        }
        clock = end;
    };
    const pad = () => D.byId.whPad;
    const ev = (o) => Object.assign({ pointerId: 1, button: 0, clientX: 100, clientY: 700, cancelable: true, stopPropagation() { }, preventDefault() { } }, o);
    return {
        W, D, sent, advance, pad,
        faded: () => pad().classList.contains('mp-steer'),
        down: o => pad().dispatch('pointerdown', ev(o)),
        move: o => pad().dispatch('pointermove', ev(o)),
        up: o => pad().dispatch('pointerup', ev(o)),
        cancel: o => pad().dispatch('pointercancel', ev(Object.assign({ type: 'pointercancel' }, o))),
        lost: o => pad().dispatch('lostpointercapture', ev(o)),
        key: (n, k) => pad().dispatch(n, ev({ key: k }))
    };
}

module.exports = { fakePage };
