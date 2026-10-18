'use strict';
/* Oct 18 2026 (Emmanuel, Home handoff item "Joystick": "fades while you steer but keeps working, comes back afterwards").
   While a finger actively steers the joystick (#whPad: a drag past the dead zone, or the forward / back hold), the joystick
   turns see-through so the world and Misty show through it. It keeps taking input the whole time. It comes back as soon as
   steering ends: finger lifted, pointer cancelled, pointer capture lost, the app hidden, or the window losing focus.
   A plain tap, the keyboard (focus must stay visible) and the double-tap back burst after the finger is gone never fade it.
   Look only: same bubble, same icon, same size and place; misty-pad.css's hide rules (Today, sheets, autopilot clean view)
   still win over the fade, and inside a world the fade beats the keep-steering rule without hiding the joystick.
   Runs misty-pad.js against a small fake page (no browser). Browser proof: tests/ui-joystick-fade-live.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
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

test('the joystick is built at rest, not faded', () => {
    const p = fakePage();
    assert.ok(p.pad(), 'controller built');
    assert.equal(p.faded(), false);
});

test('dragging it fades it, and it keeps steering while faded', () => {
    const p = fakePage();
    p.down({ clientX: 100, clientY: 700 });
    assert.equal(p.faded(), false, 'a finger that has not moved yet is not steering (it may be a tap)');
    p.move({ clientX: 102, clientY: 701 });
    assert.equal(p.faded(), false, 'inside the dead zone: still not steering');
    p.move({ clientX: 120, clientY: 690 });
    assert.equal(p.faded(), true, 'past the dead zone: steering, the joystick fades');
    const n = p.sent.length;
    p.move({ clientX: 80, clientY: 720 });
    p.move({ clientX: 70, clientY: 730 });
    assert.ok(p.sent.length > n && p.sent.slice(n).some(c => c.vx < 0 && c.vy < 0), 'still sends steering while faded');
    assert.equal(p.faded(), true);
    assert.equal(p.W.LowiPad.state().faded, true, 'LowiPad.state() tells it');
    p.up({ clientX: 70, clientY: 730 });
    assert.equal(p.faded(), false, 'finger lifted: back to full');
    assert.equal(p.W.LowiPad.state().faded, false);
});

test('holding it still (forward) fades it once the hold starts; lifting brings it back', () => {
    const p = fakePage();
    p.down();
    p.advance(150);
    assert.equal(p.faded(), false, 'before the hold kicks in nothing fades (a tap stays a tap)');
    p.advance(200);
    assert.ok(p.pad().classList.contains('mp-fwd'), 'forward hold running');
    assert.equal(p.faded(), true, 'holding forward is steering: faded');
    p.up();
    assert.equal(p.faded(), false);
    assert.ok(!p.pad().classList.contains('mp-fwd'));
});

test('a plain tap and the double-tap back burst never fade it', () => {
    const p = fakePage();
    p.down(); p.advance(60); p.up(); p.advance(80);
    assert.equal(p.faded(), false, 'single tap');
    p.down(); p.advance(60); p.up();
    p.advance(400);
    assert.ok(p.pad().classList.contains('mp-back'), 'double tap: the short back burst runs');
    assert.equal(p.faded(), false, 'back burst without a finger on the joystick: not faded');
    p.advance(1500);
    assert.equal(p.faded(), false);
});

test('pointer cancel and lost pointer capture bring it back', () => {
    let p = fakePage();
    p.down(); p.move({ clientX: 130 });
    assert.equal(p.faded(), true);
    p.cancel();
    assert.equal(p.faded(), false, 'pointercancel');
    p = fakePage();
    p.down(); p.move({ clientX: 130 });
    assert.equal(p.faded(), true);
    p.lost();
    assert.equal(p.faded(), false, 'lostpointercapture');
});

test('the app going to the background or the window losing focus brings it back', () => {
    let p = fakePage();
    p.down(); p.move({ clientX: 130 });
    assert.equal(p.faded(), true);
    p.D.hidden = true; p.D.fire('visibilitychange');
    assert.equal(p.faded(), false, 'hidden page');
    p = fakePage();
    p.down(); p.move({ clientX: 130 });
    assert.equal(p.faded(), true);
    p.W.fire('blur');
    assert.equal(p.faded(), false, 'window blur');
    p.move({ clientX: 150 });
    assert.equal(p.faded(), true, 'the same finger still steering after focus returns fades it again');
    p.up();
    assert.equal(p.faded(), false);
});

test('keyboard steering never fades it (focus stays visible)', () => {
    const p = fakePage();
    p.key('keydown', 'ArrowLeft');
    assert.equal(p.faded(), false);
    p.key('keydown', 'w');
    assert.equal(p.faded(), false);
    p.key('keyup', 'w'); p.key('keyup', 'ArrowLeft');
    assert.equal(p.faded(), false);
});

/* ---------- the look: misty-pad.css ---------- */
function rules(css) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const out = [];
    (function block(str, media) {
        let j = 0;
        while (j < str.length) {
            const open = str.indexOf('{', j); if (open < 0) break;
            const sel = str.slice(j, open).trim();
            let d = 1, k = open + 1; while (k < str.length && d) { if (str[k] === '{') d++; else if (str[k] === '}') d--; k++; }
            const body = str.slice(open + 1, k - 1);
            if (sel.startsWith('@')) block(body, sel); else out.push({ sel, body, media: media || '' });
            j = k;
        }
    })(css);
    return out;
}
const split = sel => { const o = []; let d = 0, c = ''; for (const ch of sel) { if (ch === '(' || ch === '[') d++; else if (ch === ')' || ch === ']') d--; if (ch === ',' && !d) { o.push(c.trim()); c = ''; } else c += ch; } if (c.trim()) o.push(c.trim()); return o; };
function spec(sel) {
    let s = sel.replace(/:not\(([^()]*)\)/g, ' $1 ');
    const ids = (s.match(/#[\w-]+/g) || []).length;
    const cls = (s.match(/\.[\w-]+/g) || []).length + (s.match(/\[[^\]]*\]/g) || []).length + (s.match(/:(?!:)[\w-]+/g) || []).length;
    s = s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]*\]|::?[\w-]+/g, ' ');
    return [ids, cls, (s.match(/(^|[\s>+~])([a-z][\w-]*)/gi) || []).length];
}
const gt = (a, b) => a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] > b[2];
const opa = body => { const m = body.match(/opacity\s*:\s*([^;!]+)(!important)?/); return m ? { v: m[1].trim(), imp: !!m[2] } : null; };

test('misty-pad.css: steering fades the joystick to see-through, not invisible', () => {
    const css = read('misty-pad.css'), R = rules(css);
    const base = R.find(r => !r.media && split(r.sel).includes('.wh-hud .wh-pad.mp-steer'));
    assert.ok(base, 'Home steering rule .wh-hud .wh-pad.mp-steer');
    const o = opa(base.body);
    assert.ok(o && !o.imp, 'Home fade is not !important, so every hide rule (Today, sheets, places, autopilot clean view) still wins');
    const m = css.match(/--mp-steer-o:\s*([\d.]+)/);
    assert.ok(m, 'fade level is one variable');
    assert.ok(+m[1] >= 0.3 && +m[1] <= 0.5, 'see-through but you still see where your thumb is: ' + m[1]);
    assert.match(o.v, /var\(--mp-steer-o/);
    assert.match(css, /transition:[^;]*opacity/, 'the fade is a soft cross-fade');
});

test('misty-pad.css: inside a world the fade beats the keep-steering rule, still touchable, never on autopilot', () => {
    const R = rules(read('misty-pad.css'));
    const KEEP = 'html.mf-in.wh-away:not(.lw-clean-auto) .wh-hud .wh-pad';
    const keep = R.find(r => split(r.sel).includes(KEEP));
    assert.ok(keep && /opacity\s*:\s*1\s*!important/.test(keep.body), 'keep-steering rule unchanged');
    const w = R.filter(r => !r.media && split(r.sel).some(s => /mf-in/.test(s) && /wh-away/.test(s) && /\.mp-steer/.test(s)));
    assert.ok(w.length, 'in-world steering rule');
    for (const r of w) {
        const o = opa(r.body); assert.ok(o && o.imp && /var\(--mp-steer-o/.test(o.v), 'in-world fade is !important with the same level: ' + r.body);
        assert.ok(!/pointer-events\s*:\s*none/.test(r.body), 'never untouchable while steering');
        for (const s of split(r.sel)) {
            assert.ok(/:not\(\.lw-clean-auto\)/.test(s), 'scoped like the keep rule (autopilot clean view still hides it): ' + s);
            assert.ok(gt(spec(s), spec(KEEP)), 'outweighs the keep rule: ' + s);
        }
    }
});

test('misty-pad.css: more contrast or less transparency asked for: a lighter fade', () => {
    const R = rules(read('misty-pad.css'));
    for (const q of ['prefers-contrast: more', 'prefers-reduced-transparency: reduce']) {
        const r = R.find(x => x.media.includes(q) && /--mp-steer-o\s*:\s*0?\.[6-8]/.test(x.body));
        assert.ok(r, q + ' sets a lighter fade');
    }
});

test('the fade is look only: the glass style and the hide rules are untouched', () => {
    const css = read('misty-pad.css');
    assert.match(css, /html\.wh-today-open \.wh-hud \.wh-pad-chip, html\.wh-r2-on \.wh-hud \.wh-pad,/, 'hide rules kept');
    const js = read('misty-pad.js');
    assert.ok(/st\.fade !== on|st\.fade === on/.test(js), 'class written only when the value changes (compares the last written value)');
    const orbit = read('home-orbit-v2.css');
    assert.ok(!/mp-steer/.test(orbit), 'no new rule in the ring Home sheet');
});
