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

test('core: the menu never comes back by itself (she leaves a world, goes home, stops); only a tap or another tab restores', () => {
    for (const m of ['', 'home']) {
        const r = run([{ type: 'mode', mode: 'auto' }, { type: 'mode', mode: m }]);
        assert.deepEqual(r.acts, ['hide', null], 'no automatic return when the flight ends: ' + JSON.stringify(m)); assert.equal(r.s.clean, true);
        const t = run([{ type: 'tap' }], r.s);
        assert.deepEqual(t.acts, ['show'], 'your tap brings it back'); assert.equal(t.s.clean, false);
        const d = run([{ type: 'steer' }, { type: 'mode', mode: m }, { type: 'mode', mode: m }]);
        assert.deepEqual(d.acts, ['hide', null, null], 'steering, then she floats home: still clean'); assert.equal(C.padLive(d.s), true, 'the controller stays usable');
    }
    /* leaving a world on autopilot: auto -> '' -> auto again (she goes on to the next place) never flashes the menu */
    const w = run([{ type: 'mode', mode: 'auto' }, { type: 'mode', mode: '' }, { type: 'mode', mode: 'auto' }, { type: 'mode', mode: 'drive' }]);
    assert.deepEqual(w.acts, ['hide', null, null, 'view']);
    assert.equal(w.s.clean, true);
    const l = run([{ type: 'mode', mode: 'auto' }, { type: 'leave', mode: 'auto' }, { type: 'mode', mode: 'auto' }]);
    assert.deepEqual(l.acts, ['hide', 'show', null], 'back on Home while she still flies: no surprise fade');
    assert.equal(C.isTap(4, 200), true); assert.equal(C.isTap(14, 200), false); assert.equal(C.isTap(2, 600), false);
});

test('the fade list covers every distracting control the user named, and never Misty, her cell, the world or speech', () => {
    const all = C.HIDE.concat(C.HIDE_AUTO).join(' ');
    for (const s of ['#tabbar', '#tbTheme', '#pfBtn', '.sp-top', '#spFast', '#f3Board', '#whHud >', '.wh-move', '#whPad']) assert.ok(all.includes(s), 'missing ' + s);
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
    assert.ok(f.cls.has('lw-clean'), 'a touch-down alone is not a tap');
    assert.ok(f.ev('touchstart', f.water).stopped);
    f.W._t += 120;
    assert.ok(f.ev('pointerup', f.water).stopped);
    assert.ok(!f.cls.has('lw-clean'), 'everything is back');
    for (const t of ['touchend', 'mouseup', 'click']) assert.ok(f.ev(t, f.water).stopped, t + ' of the reveal tap is eaten');
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

test('steering: a still hold on the world is not a tap (the menu stays away, the world keeps its own long press); leaving Home restores', () => {
    const f = fakeWorld();
    f.pad.dataset.mode = 'drive'; f.W.LowiClean.check();
    f.W.LowiClean._feed({ type: 'steer' });
    assert.ok(f.cls.has('lw-clean'));
    assert.ok(!f.ev('pointerdown', f.canvas, { pointerId: 7 }).stopped);
    f.flush(700);
    assert.ok(f.cls.has('lw-clean'), 'holding still never brings the menu back');
    assert.ok(!(f.canvas._got || []).includes('pointercancel'), 'the world keeps its gesture');
    assert.ok(!f.ev('pointerup', f.canvas, { pointerId: 7 }).stopped);
    assert.ok(f.cls.has('lw-clean'));
    f.cls.delete('wh-home'); f.W.LowiClean.check();
    assert.ok(!f.cls.has('lw-clean'), 'never leaks to another screen');
});

/* Oct 17 (E-man): "on autopilot, every time I touch the screen to move the world around, the whole panel comes back" (main world) */
test('autopilot, main world: touching and dragging the world turns it and keeps the menu hidden', () => {
    const f = fakeWorld();
    f.setMode('auto');
    assert.ok(f.cls.has('lw-clean') && f.cls.has('lw-clean-auto'));
    /* touch-down alone: the world gets the press, nothing comes back */
    const d = f.ev('pointerdown', f.canvas, { pointerId: 21, isPrimary: true, clientX: 100, clientY: 100, timeStamp: 5000 });
    assert.ok(!d.stopped && !d.prevented, 'the world gets the press so it can turn');
    assert.ok(f.cls.has('lw-clean') && f.cls.has('lw-clean-auto'), 'touching the screen keeps the clean view');
    /* drag: passes through, clean view and autopilot kept */
    for (const x of [104, 120, 160, 220]) assert.ok(!f.ev('pointermove', f.canvas, { pointerId: 21, clientX: x, clientY: 100 }).stopped);
    assert.ok(f.cls.has('lw-clean'));
    const u = f.ev('pointerup', f.canvas, { pointerId: 21, clientX: 220, clientY: 100, timeStamp: 5200 });
    assert.ok(!u.stopped, 'the end of the drag is the world\'s (its spin carries on)');
    assert.ok(!(f.canvas._got || []).includes('pointercancel'));
    f.flush(2000); f.W.LowiClean.check();
    assert.ok(f.cls.has('lw-clean') && f.cls.has('lw-clean-auto'), 'still hidden after the drag');
    assert.ok(!f.ev('click', f.canvas).stopped, 'nothing is swallowed after a drag');
    assert.equal(f.W.LowiClean.state().mode, 'auto', 'autopilot kept');
    /* a drag that comes back to where it started is still a drag */
    f.ev('pointerdown', f.canvas, { pointerId: 22, isPrimary: true, clientX: 100, clientY: 100, timeStamp: 6000 });
    f.ev('pointermove', f.canvas, { pointerId: 22, clientX: 140, clientY: 100 });
    f.ev('pointermove', f.canvas, { pointerId: 22, clientX: 101, clientY: 100 });
    f.ev('pointerup', f.canvas, { pointerId: 22, clientX: 101, clientY: 100, timeStamp: 6150 });
    assert.ok(f.cls.has('lw-clean'));
});

test('autopilot, main world: a hold, a cancelled touch and a pinch never bring the menu back', () => {
    const f = fakeWorld();
    f.setMode('auto');
    /* hold: a still press longer than a tap */
    f.ev('pointerdown', f.canvas, { pointerId: 31, isPrimary: true, timeStamp: 1000 });
    f.flush(900);
    assert.ok(f.cls.has('lw-clean'), 'holding never restores');
    assert.ok(!f.ev('pointerup', f.canvas, { pointerId: 31, timeStamp: 1900 }).stopped);
    assert.ok(f.cls.has('lw-clean'), 'letting go of a hold never restores');
    /* cancelled: the system takes the touch (a swipe from the edge, a call) */
    f.ev('pointerdown', f.canvas, { pointerId: 32, isPrimary: true, timeStamp: 3000 });
    f.ev('pointercancel', f.canvas, { pointerId: 32, timeStamp: 3080 });
    assert.ok(f.cls.has('lw-clean'), 'a cancelled touch never restores');
    /* pinch: two still-ish fingers, lifted quickly, are a zoom, not two taps */
    assert.ok(!f.ev('pointerdown', f.canvas, { pointerId: 33, isPrimary: true, clientX: 100, timeStamp: 4000 }).stopped);
    assert.ok(!f.ev('pointerdown', f.canvas, { pointerId: 34, isPrimary: false, clientX: 200, timeStamp: 4020 }).stopped);
    f.ev('pointermove', f.canvas, { pointerId: 34, clientX: 230 });
    assert.ok(!f.ev('pointerup', f.canvas, { pointerId: 33, clientX: 100, timeStamp: 4100 }).stopped);
    assert.ok(!f.ev('pointerup', f.canvas, { pointerId: 34, clientX: 230, timeStamp: 4110 }).stopped);
    assert.ok(f.cls.has('lw-clean'), 'a pinch never restores');
    /* the first finger dragged, then a second finger lands: still the world's */
    f.ev('pointerdown', f.canvas, { pointerId: 35, isPrimary: true, clientX: 100, timeStamp: 5000 });
    f.ev('pointermove', f.canvas, { pointerId: 35, clientX: 150 });
    assert.ok(!f.ev('pointerdown', f.canvas, { pointerId: 36, isPrimary: false, clientX: 250, timeStamp: 5100 }).stopped);
    f.ev('pointerup', f.canvas, { pointerId: 36, timeStamp: 5150 }); f.ev('pointerup', f.canvas, { pointerId: 35, timeStamp: 5160 });
    assert.ok(f.cls.has('lw-clean'));
    assert.equal(f.W.LowiClean.state().mode, 'auto');
});

test('autopilot, main world: a completed still tap brings the menu back and does nothing else; a late frame never makes it a hold', () => {
    const f = fakeWorld();
    f.setMode('auto');
    f.ev('pointerdown', f.canvas, { pointerId: 41, isPrimary: true, timeStamp: 2000 });
    assert.ok(f.cls.has('lw-clean'), 'nothing yet on touch-down');
    f.ev('pointermove', f.canvas, { pointerId: 41, clientX: 104, clientY: 103 });   /* a finger always wobbles a little */
    f.W._t += 700;                                   /* the page was busy: the up is handled late, but it happened 160 ms after the down */
    const up = f.ev('pointerup', f.canvas, { pointerId: 41, timeStamp: 2160 });
    assert.ok(up.stopped && up.prevented, 'the world never sees the tap (no warp, no petting, no map toggle)');
    assert.ok((f.canvas._got || []).includes('pointercancel'), 'the world\'s gesture is cancelled');
    assert.ok(!f.cls.has('lw-clean') && !f.cls.has('lw-clean-auto'), 'menu and controller back');
    assert.ok(f.ev('click', f.canvas).stopped, 'the tap\'s click is eaten too');
    assert.equal(f.W.LowiClean.state().mode, 'auto', 'she keeps flying');
    /* the next autopilot start hides it again, and the old rule stands */
    f.setMode('idle'); f.flush(600); f.setMode('auto');
    assert.ok(f.cls.has('lw-clean'));
});

test('anything but the world (her empty cell, the guide): a drag, a hold or a cancel is eaten and never brings the menu back', () => {
    const f = fakeWorld();
    f.setMode('auto');
    let d = f.ev('pointerdown', f.water, { pointerId: 61, timeStamp: 1000 });
    assert.ok(d.stopped, 'her empty cell never recalls her on this touch');
    assert.ok(f.ev('pointermove', f.water, { pointerId: 61, clientX: 170 }).stopped);
    assert.ok(f.ev('pointerup', f.water, { pointerId: 61, clientX: 170, timeStamp: 1150 }).stopped);
    assert.ok(f.cls.has('lw-clean'), 'a drag that started on her cell keeps the clean view');
    f.flush(600);
    f.ev('pointerdown', f.water, { pointerId: 62, timeStamp: 3000 }); f.flush(800);
    f.ev('pointerup', f.water, { pointerId: 62, timeStamp: 3800 });
    assert.ok(f.cls.has('lw-clean'), 'a hold keeps the clean view');
    f.flush(600);
    f.ev('pointerdown', f.water, { pointerId: 63, timeStamp: 5000 }); f.ev('pointercancel', f.water, { pointerId: 63, timeStamp: 5050 });
    assert.ok(f.cls.has('lw-clean'), 'a cancelled touch keeps the clean view');
});

/* Oct 17 (E-man): "in the spirit world, tapping the screen also brings all panels back" (unwanted) */
for (const sp of ['mf-galaxy', 'wh-cosmos', 'gx-out']) test('spirit world (' + sp + '): a tap never brings the panels back; on autopilot it only brings back the controller', () => {
    const f = fakeWorld();
    f.setMode('auto'); f.cls.add(sp);
    /* a drag turns the world, nothing comes back */
    f.ev('pointerdown', f.canvas, { pointerId: 71, isPrimary: true, timeStamp: 1000 });
    f.ev('pointermove', f.canvas, { pointerId: 71, clientX: 180 });
    f.ev('pointerup', f.canvas, { pointerId: 71, clientX: 180, timeStamp: 1200 });
    assert.ok(f.cls.has('lw-clean') && f.cls.has('lw-clean-auto'));
    /* a still tap: panels stay hidden, the controller comes back so you can take over; the tap does nothing else */
    f.ev('pointerdown', f.canvas, { pointerId: 72, isPrimary: true, timeStamp: 2000 });
    const up = f.ev('pointerup', f.canvas, { pointerId: 72, timeStamp: 2100 });
    assert.ok(up.stopped, 'that tap never warps or pets');
    assert.ok(f.cls.has('lw-clean'), 'the panels stay hidden in the spirit world');
    assert.ok(!f.cls.has('lw-clean-auto'), 'the controller is back');
    assert.equal(f.W.LowiClean.state().mode, 'auto', 'she keeps flying on autopilot');
    f.flush(600);
    /* the controller already shows: more taps are the world's own and the panels still stay away */
    f.ev('pointerdown', f.canvas, { pointerId: 73, isPrimary: true, timeStamp: 3000 });
    assert.ok(!f.ev('pointerup', f.canvas, { pointerId: 73, timeStamp: 3100 }).stopped, 'the world gets its tap');
    f.ev('pointerdown', f.water, { pointerId: 74, timeStamp: 4000 }); f.ev('pointerup', f.water, { pointerId: 74, timeStamp: 4100 });
    f.ev('keydown', f.water, { key: 'a' });
    assert.ok(f.cls.has('lw-clean'), 'no tap or key brings the panels back out there');
    /* back on Home's own world: a tap brings everything back */
    f.cls.delete(sp); f.flush(600);
    f.ev('pointerdown', f.canvas, { pointerId: 75, isPrimary: true, timeStamp: 6000 });
    assert.ok(f.ev('pointerup', f.canvas, { pointerId: 75, timeStamp: 6100 }).stopped);
    assert.ok(!f.cls.has('lw-clean'), 'in the main world a tap brings the panels back');
});

test('autopilot inside a cell world: turning the world keeps everything hidden; Home\'s menus never show there even after a tap', () => {
    const f = fakeWorld();
    f.cls.add('wh-away');
    f.setMode('auto');
    assert.ok(f.cls.has('lw-clean'));
    f.ev('pointerdown', f.canvas, { pointerId: 51, isPrimary: true, timeStamp: 1000 });
    f.ev('pointermove', f.canvas, { pointerId: 51, clientX: 60, clientY: 140 });
    f.ev('pointermove', f.canvas, { pointerId: 51, clientX: 20, clientY: 180 });
    assert.ok(!f.ev('pointerup', f.canvas, { pointerId: 51, clientX: 20, clientY: 180, timeStamp: 1300 }).stopped);
    assert.ok(f.cls.has('lw-clean') && f.cls.has('lw-clean-auto'), 'camera rotation in a cell world keeps the clean view');
    /* the cell-world rule is CSS that ignores the clean state: Home's menus stay away inside a world */
    const css = C.worldCss();
    for (const s of ['#tabbar', '#spFast', '#f3Board', '#arrCard']) assert.ok(css.includes('html.wh-home.wh-away ' + s), s);
    assert.ok(/C\.worldCss\(\) \+ ' \{ opacity: 0 !important; visibility: hidden !important; pointer-events: none !important;/.test(read('clean-view.js')));
});

test('leaving a world: no automatic return a second later; world transitions and release touches never restore; only a tap does', () => {
    const f = fakeWorld();
    f.setMode('auto');
    assert.ok(f.cls.has('lw-clean'));
    /* she flies out of a world: misty-flight ends the inside flight (lowi:pad mode ''), the controller goes idle */
    f.W.dispatchEvent({ type: 'lowi:pad', detail: { mode: '' } });
    f.pad.dataset.mode = 'idle'; f.W.LowiClean.check();
    f.flush(1200); f.W.LowiClean.check();
    assert.ok(f.cls.has('lw-clean'), 'still hidden about a second after leaving the world');
    /* the camera following her out into the spirit world, a warp, the adventure ending: still Home, still hidden */
    f.cls.add('wh-cosmos'); f.W.LowiClean.check();
    f.W.dispatchEvent({ type: 'lowi:adventure', detail: { on: false, why: 'left' } });
    f.W.dispatchEvent({ type: 'lowi:autopilot', detail: { on: false } });
    f.flush(1000);
    assert.ok(f.cls.has('lw-clean'), 'world transitions never bring the menu back');
    f.cls.delete('wh-cosmos');
    /* she floats home and slips into her cell */
    f.pad.dataset.mode = 'home'; f.W.LowiClean.check(); f.pad.dataset.mode = 'idle'; f.W.LowiClean.check(); f.flush(25000); f.W.LowiClean.check();
    assert.ok(f.cls.has('lw-clean'));
    /* your tap: everything is back, and that tap does nothing else */
    const d = f.ev('pointerdown', f.water, { pointerId: 9 });
    assert.ok(d.stopped, 'the reveal tap is swallowed');
    assert.ok(f.ev('pointerup', f.water, { pointerId: 9 }).stopped);
    assert.ok(!f.cls.has('lw-clean') && !f.cls.has('lw-clean-auto'));
    f.flush(600);
    /* steering, letting go of the controller (a release touch) and she stops: still hidden, controller still works */
    f.ev('pointerdown', f.pad, { pointerId: 10, clientX: 50, clientY: 50 }); f.pad.dataset.mode = 'drive';
    f.ev('pointermove', f.pad, { pointerId: 10, clientX: 80, clientY: 50 });
    assert.ok(f.cls.has('lw-clean'));
    f.ev('pointerup', f.pad, { pointerId: 10 }); f.pad.dataset.mode = 'idle'; f.flush(1500); f.W.LowiClean.check();
    assert.ok(f.cls.has('lw-clean'), 'letting go never restores it');
    assert.ok(!f.ev('pointerdown', f.pad, { pointerId: 11 }).stopped, 'the controller is still yours');
    f.ev('pointerup', f.pad, { pointerId: 11 }); f.flush(600);
    /* another tab: nothing hidden leaks to another page */
    f.cls.delete('wh-home'); f.W.LowiClean.check();
    assert.ok(!f.cls.has('lw-clean'));
});

test('the cell guide and Misty\'s speech are never part of the fade', () => {
    const bare = C.HIDE.concat(C.HIDE_AUTO).join(' ').replace(/:not\([^)]*\)/g, '');
    assert.ok(!/\.rp-|#mhNudge|#spBubble/.test(bare));
    assert.ok(C.KEEP.includes('.rp-body') && C.KEEP.includes('.rp-say'));
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
