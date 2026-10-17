/* Clean flight view: autopilot / steering fade the distracting UI, one tap brings it back and does nothing else. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const C = require(path.join(ROOT, 'clean-view-core.js'));

const run = (evs, st) => { let s = st || C.init(); const acts = []; for (const e of evs) { const r = C.step(s, e); s = r.st; acts.push(r.act); } return { s, acts }; };

test('core: autopilot fades everything, the controller too; a tap brings it back and keeps her flying', () => {
    const a = run([{ type: 'mode', mode: 'auto' }]);
    assert.deepEqual(a.acts, ['hide']);
    assert.equal(a.s.clean, true); assert.equal(a.s.view, 'auto');
    assert.equal(C.padLive(a.s), false);
    const b = run([{ type: 'tap' }], a.s);
    assert.deepEqual(b.acts, ['show']);
    assert.equal(b.s.clean, false);
    assert.equal(b.s.mode, 'auto', 'restoring never stops the autopilot');
    /* nothing fades again by itself while she keeps flying */
    const c = run([{ type: 'mode', mode: 'auto' }, { type: 'mode', mode: 'auto' }], b.s);
    assert.deepEqual(c.acts, [null, null]);
    assert.equal(c.s.clean, false);
});

test('core: steering fades everything except the controller; a new steering move fades it again', () => {
    const a = run([{ type: 'mode', mode: 'drive' }]);
    assert.deepEqual(a.acts, [null], 'taking over alone does not hide: only a real steering move does');
    const b = run([{ type: 'steer' }], a.s);
    assert.deepEqual(b.acts, ['hide']);
    assert.equal(b.s.view, 'drive'); assert.equal(C.padLive(b.s), true);
    const c = run([{ type: 'tap' }, { type: 'steer' }], b.s);
    assert.deepEqual(c.acts, ['show', 'hide']);
    /* autopilot -> you take over and steer: the controller comes back, the rest stays faded */
    const d = run([{ type: 'mode', mode: 'auto' }, { type: 'mode', mode: 'drive' }]);
    assert.deepEqual(d.acts, ['hide', 'view']);
    assert.equal(d.s.view, 'drive'); assert.equal(C.padLive(d.s), true);
});

test('core: everything is back when she goes home, stops or you leave Home; coming back does not fade it again', () => {
    for (const m of ['', 'home']) {
        const r = run([{ type: 'mode', mode: 'auto' }, { type: 'mode', mode: m }]);
        assert.deepEqual(r.acts, ['hide', 'show']); assert.equal(r.s.clean, false);
    }
    const l = run([{ type: 'mode', mode: 'auto' }, { type: 'leave', mode: 'auto' }, { type: 'mode', mode: 'auto' }]);
    assert.deepEqual(l.acts, ['hide', 'show', null], 'back on Home while she still flies: no surprise fade');
    assert.equal(C.isTap(4, 200), true); assert.equal(C.isTap(14, 200), false); assert.equal(C.isTap(2, 600), false);
});

test('the fade list covers every distracting control the user named, and never Misty, her cell, the world or speech', () => {
    const all = C.HIDE.concat(C.HIDE_AUTO).join(' ');
    for (const s of ['#tabbar', '#tbTheme', '#pfBtn', '.sp-top', '#spFast', '#f3Board', '#whHud >', '.wh-move', '#bwrMapBtn', '#whPad']) assert.ok(all.includes(s), 'missing ' + s);
    /* the HUD rule fades water, Sound, Today, World map, VR, the movement bubble, but keeps the controller and Misty's nudge */
    const hud = C.HIDE.find(s => s.startsWith('#whHud >'));
    for (const k of ['#whPad', '#whPadChip', '#mhNudge']) assert.ok(hud.includes(':not(' + k + ')'), hud);
    assert.ok(!C.HIDE.includes('#whPad'), 'the controller stays while you steer');
    const bare = all.replace(/:not\([^)]*\)/g, '');
    for (const k of C.KEEP) assert.ok(!bare.includes(k), 'must stay visible: ' + k);
    assert.ok(!/\.rp-|spBubble|bw3|canvas/.test(bare));
    const css = C.css();
    assert.ok(css.includes('html.lw-clean #tabbar'));
    assert.ok(css.includes('html.lw-clean.lw-clean-auto #whPad'));
    for (const l of ['en', 'de', 'es']) assert.ok(C.say(l).length > 20);
});

test('clean-view.js: fades with opacity + visibility only, no frame loop, swallows the reveal tap before anything else', () => {
    const src = read('clean-view.js');
    assert.ok(!/requestAnimationFrame|setInterval\(check/.test(src), 'no loop while she flies');
    assert.ok(/opacity: 0 !important; visibility: hidden !important; pointer-events: none !important/.test(src));
    assert.ok(!/display:\s*none/.test(src), 'layout and states stay as they are');
    assert.ok(/prefers-reduced-motion: reduce/.test(src));
    assert.ok(/aria-live', 'polite'/.test(src));
    /* window capture: runs before liquid-glass pager, region pals, the cell recall (document capture) and the world */
    for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'pointermove']) assert.ok(src.includes("W.addEventListener('" + t + "'"), t);
    assert.ok((src.match(/\{ capture: true, passive: false \}/g) || []).length >= 5, 'capture-phase, cancelable listeners');
    for (const t of ['touchstart', 'touchend', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu']) assert.ok(src.includes("'" + t + "'"), t);
    assert.ok(/stopImmediatePropagation/.test(src) && /preventDefault/.test(src));
    /* the world's own tap / long press is cancelled, not left half-open */
    assert.ok(/pointercancel/.test(src) && /lwClean = true/.test(src));
    /* it follows the existing flight modes, no new button */
    assert.ok(/data-mode/.test(src) && /lowi:pad/.test(src) && /lowi:autopilot/.test(src));
    assert.ok(!/createElement\('button'\)/.test(src));
    const html = read('index.html');
    const iCore = html.indexOf('clean-view-core.js'), iView = html.indexOf('clean-view.js?'), iLg = html.indexOf('liquid-glass.js?');
    assert.ok(iCore > 0 && iView > iCore && iLg > iView, 'loaded before liquid-glass so its capture listeners come first');
    const sw = read('sw.js');
    assert.ok(sw.includes('"clean-view.js"') && sw.includes('"clean-view-core.js"'));
    assert.ok(!/misty-hunt|LowiHunt|award/.test(src), 'never touches the hunt: autopilot still eats nothing and earns nothing');
});

/* a tiny DOM stand-in, enough to drive clean-view.js through real listener code */
function fakeWorld() {
    const listeners = {};
    const cls = new Set(['wh-home']);
    const mk = (id, extra) => Object.assign({ id, dataset: {}, isConnected: true, style: { setProperty() { } }, closest(sel) { return sel.split(',').some(s => s.trim() === '#' + id || (extra && extra.includes(s.trim()))) ? this : null; }, dispatchEvent(e) { (this._got = this._got || []).push(e.type); } }, {});
    const pad = mk('whPad'); pad.dataset.mode = 'idle';
    const canvas = mk('cv', ['.bw3-canvas', '#bw3Stage']);
    const water = mk('water');
    const H = { classList: { contains: c => cls.has(c), add: (...c) => c.forEach(x => cls.add(x)), remove: (...c) => c.forEach(x => cls.delete(x)), toggle: (c, on) => { if (on === undefined ? !cls.has(c) : on) cls.add(c); else cls.delete(c); } }, lang: 'en' };
    const D = { documentElement: H, hidden: false, head: { appendChild() { } }, body: { appendChild() { } }, activeElement: null, getElementById: id => id === 'whPad' ? pad : null, createElement: () => ({ setAttribute() { }, style: {} }), addEventListener() { } };
    const timers = [];
    const W = {
        document: D, performance: { now: () => W._t }, _t: 1000,
        addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
        dispatchEvent: e => { (listeners[e.type] || []).forEach(f => f(e)); },
        LowiPad: { state: () => ({ pad: pad.dataset.mode === 'idle' ? '' : pad.dataset.mode, mode: pad.dataset.mode === 'idle' ? '' : pad.dataset.mode }) },
        LowiCleanCore: C
    };
    W.window = W;
    const ctx = { window: W, document: D, performance: W.performance, setTimeout: (f, ms) => { timers.push({ f, at: W._t + (ms || 0) }); return timers.length; }, clearTimeout: () => { }, setInterval: () => 0, clearInterval() { }, CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; }, PointerEvent: function (t, o) { this.type = t; Object.assign(this, o); }, MutationObserver: function () { this.observe = () => { }; this.disconnect = () => { }; }, Math, Date, Set, Object, String, console };
    vm.runInNewContext(read('clean-view.js'), ctx);
    const flush = (ms) => { W._t += ms || 0; for (let i = 0; i < timers.length; i++) { const t = timers[i]; if (t && t.at <= W._t) { timers[i] = null; t.f(); } } };
    const ev = (type, target, o) => { const e = Object.assign({ type, target, pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 100, cancelable: true, stopped: false, prevented: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, stopPropagation() { } }, o || {}); (listeners[type] || []).forEach(f => { if (!e.stopped) f(e); }); return e; };
    return { W, cls, pad, canvas, water, ev, flush, setMode: m => { pad.dataset.mode = m; W.LowiClean.check(); } };
}

test('reveal tap during autopilot: eaten whole (down, up, click, touch), UI back, autopilot kept, no re-hide', () => {
    const f = fakeWorld();
    f.setMode('auto');
    assert.ok(f.cls.has('lw-clean') && f.cls.has('lw-clean-auto'));
    const d = f.ev('pointerdown', f.water);
    assert.ok(d.stopped && d.prevented, 'the press never reaches water / quest / sheet / world');
    assert.ok(!f.cls.has('lw-clean'), 'everything is back');
    for (const t of ['touchstart', 'pointerup', 'touchend', 'mouseup', 'click']) assert.ok(f.ev(t, f.water).stopped, t + ' of the reveal tap is eaten');
    f.flush(500);
    assert.ok(!f.ev('click', f.water).stopped, 'later taps work normally');
    assert.equal(f.W.LowiClean.state().mode, 'auto');
    f.flush(5000); f.W.LowiClean.check();
    assert.ok(!f.cls.has('lw-clean'), 'no automatic re-hide');
});

test('steering: controller works and fades the rest; world drag passes through; a still tap reveals and cancels the world tap', () => {
    const f = fakeWorld();
    /* drag the controller */
    const d = f.ev('pointerdown', f.pad, { clientX: 50, clientY: 50 });
    assert.ok(!d.stopped, 'the controller gets its own press');
    f.pad.dataset.mode = 'drive';
    const m = f.ev('pointermove', f.pad, { clientX: 70, clientY: 40 });
    assert.ok(!m.stopped);
    assert.ok(f.cls.has('lw-clean') && !f.cls.has('lw-clean-auto'), 'faded, controller kept');
    f.ev('pointerup', f.pad); f.flush(800);
    /* the controller still steers while faded */
    assert.ok(!f.ev('pointerdown', f.pad, { pointerId: 2 }).stopped);
    f.ev('pointerup', f.pad, { pointerId: 2 }); f.flush(800);
    assert.ok(f.cls.has('lw-clean'));
    /* a drag on the world turns it and keeps the view clean */
    assert.ok(!f.ev('pointerdown', f.canvas, { pointerId: 3, clientX: 100, clientY: 100 }).stopped);
    f.ev('pointermove', f.canvas, { pointerId: 3, clientX: 160, clientY: 100 });
    assert.ok(!f.ev('pointerup', f.canvas, { pointerId: 3, clientX: 160, clientY: 100 }).stopped);
    assert.ok(f.cls.has('lw-clean'));
    f.flush(800);
    /* a still tap on the world: the up is eaten, the world gets a cancel (no warp, no long press), UI back */
    f.ev('pointerdown', f.canvas, { pointerId: 4 }); f.W._t += 120;
    const up = f.ev('pointerup', f.canvas, { pointerId: 4 });
    assert.ok(up.stopped, 'the world never sees a tap');
    assert.ok((f.canvas._got || []).includes('pointercancel'));
    assert.ok(!f.cls.has('lw-clean'));
    assert.ok(f.ev('click', f.canvas).stopped);
    assert.equal(f.W.LowiClean.state().mode, 'drive', 'steering mode kept');
});

test('steering: a still press on the world reveals before the long press opens her sheet; leaving Home restores', () => {
    const f = fakeWorld();
    f.pad.dataset.mode = 'drive'; f.W.LowiClean.check();
    f.W.LowiClean._feed({ type: 'steer' });
    assert.ok(f.cls.has('lw-clean'));
    f.ev('pointerdown', f.canvas, { pointerId: 7 });
    f.flush(400);                                   /* before the world's 500 ms long press */
    assert.ok(!f.cls.has('lw-clean'));
    assert.ok((f.canvas._got || []).includes('pointercancel'));
    assert.ok(f.ev('pointerup', f.canvas, { pointerId: 7 }).stopped);
    f.W.LowiClean._feed({ type: 'steer' });
    assert.ok(f.cls.has('lw-clean'));
    f.cls.delete('wh-home'); f.W.LowiClean.check();
    assert.ok(!f.cls.has('lw-clean'), 'never leaks to another screen');
});

test('movement bubble stays anchored to her HOME cell while the camera follows her flight', () => {
    const src = read('move-bubble.js');
    assert.ok(/function homeRect\(mi\)/.test(src));
    assert.ok(/mf-roam/.test(src) && /--mf-bx/.test(src) && /--mf-by/.test(src));
    assert.ok(/mr = homeRect\(mi\)/.test(src), 'place() measures the home cell, not the drifting one');
    assert.ok(/classList\.contains\('lw-clean'\)\) return/.test(src), 'no re-placing while the UI is faded');
    assert.ok(/lowi:clean-view/.test(src));
    /* 13 px = one 12 px ring of the landscape search, so a wobble can't flip it between two neighbouring rings */
    assert.ok(/Math\.abs\(nx - ox\) < 13 && Math\.abs\(ny - oy\) < 13\) return/.test(src), 'no few-pixel hops from the neighbours\' wobble');
    /* the same correction keeps VR from hopping sides when the camera roams */
    assert.ok(/el\.id === 'spBubble' && H\.classList\.contains\('mf-roam'\)/.test(read('world-home.js')));
    /* the cell really is slid by these two variables */
    assert.ok(/html\.mf-roam #spHome #spBubble \{ translate: var\(--mf-bx, 0px\) var\(--mf-by, 0px\)/.test(read('misty-pad.css')));
});
