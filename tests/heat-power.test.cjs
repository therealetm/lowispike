/* Oct 25 2026 heat pass (Emmanuel: "my phone or everyone's phone gets really, really hot when they open our app ... it's killing the
   battery ... I didn't think it should be hot at all"). Measured on the live build 20261025-132728 with tools/heat/heat-probe.cjs:
   nobody touching Home still drew the full-screen 3D world ~30 times a second forever (also behind Community and the other pages),
   never-ending SVG loops repainted every frame (two of them inside a sheet nobody could see), and the sound kit kept its
   AudioContext running after the first tap. These tests guard the fixes:
   - power-saver.js: the calm -> rest -> deep ladder, the automatic battery saver (Low Power Mode / hot phone), hidden = no timers,
     and pausing never-ending CSS loops on elements nobody can see (and starting them again when they can)
   - body-world-3d-scene.js (the real createWorld, hand-cranked): quiet frames are drawn less often and wait on a timer instead of
     every refresh, a touch brings full speed back at once, stop() leaves nothing behind, timer frames never lower the sharpness,
     battery saver caps the sharpness at 1.5x
   - index.html: the sound kit's AudioContext naps 6 s after the last sound; power-saver.js loads before the world. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const P = require(path.join(ROOT, 'power-saver.js'));

/* ---------- power-saver.js: pure parts ---------- */
test('the ladder: active under 3 s, calm to 30 s, rest from 30 s, deep from 90 s; battery saver reaches rest at 10 s and deep at 45 s', () => {
    assert.strictEqual(P.stateFor(0, false, false), 'active');
    assert.strictEqual(P.stateFor(2999, false, false), 'active');
    assert.strictEqual(P.stateFor(3000, false, false), 'calm');
    assert.strictEqual(P.stateFor(29999, false, false), 'calm');
    assert.strictEqual(P.stateFor(30000, false, false), 'rest');
    assert.strictEqual(P.stateFor(90000, false, false), 'deep');
    assert.strictEqual(P.stateFor(10000, true, false), 'rest');
    assert.strictEqual(P.stateFor(45000, true, false), 'deep');
    assert.strictEqual(P.stateFor(999999, false, true), 'active', 'a flight or warp in progress is never slowed down');
});

test('frame rates: full speed while active; Home calm stays ~30 a second as before; behind a page and at rest it is fewer; saver fewer still', () => {
    for (const sv of [false, true]) for (const back of [false, true]) assert.strictEqual(P.intervalFor('active', sv, back), 0, 'active is every refresh');
    assert.strictEqual(P.fpsFor('calm', false, false), 30, 'Home calm unchanged from the Oct 16 speed pass (every second refresh)');
    const order = ['calm', 'rest', 'deep'];
    for (const sv of [false, true]) for (const back of [false, true]) {
        const f = order.map(s => P.fpsFor(s, sv, back));
        assert.ok(f[0] > f[1] && f[1] > f[2] && f[2] >= 4, 'each step down is slower but never frozen: ' + f);
    }
    order.forEach(s => {
        assert.ok(P.fpsFor(s, false, true) < P.fpsFor(s, false, false), 'behind a page is drawn less often than Home (' + s + ')');
        assert.ok(P.fpsFor(s, true, false) < P.fpsFor(s, false, false), 'saver is drawn less often (' + s + ')');
    });
    assert.ok(P.intervalFor('deep', false, true) >= 150);
});

test('battery saver caps the world at 1.5x sharp and never raises a lower cap', () => {
    assert.strictEqual(P.dprCapFor(2, true), 1.5);
    assert.strictEqual(P.dprCapFor(2, false), 2);
    assert.strictEqual(P.dprCapFor(1, true), 1);
});

test('Low Power Mode / hot phone is recognised from 30 Hz full-speed frames and let go after smooth frames', () => {
    const at = (ms, n) => Array(n).fill(ms / 1000);
    assert.strictEqual(P.slowVerdict(at(33.3, 120), false), true, '30 Hz (iOS Low Power Mode cap) turns saver on');
    assert.strictEqual(P.slowVerdict(at(16.7, 120), false), false, '60 Hz stays normal');
    assert.strictEqual(P.slowVerdict(at(8.3, 120), false), false, '120 Hz ProMotion stays normal');
    assert.strictEqual(P.slowVerdict(at(25, 120), true), true, 'in between: no flapping, saver stays on');
    assert.strictEqual(P.slowVerdict(at(16.7, 120), true), false, 'smooth again turns it off');
    assert.strictEqual(P.slowVerdict(at(40, 30), false), false, 'too few frames to judge');
    const mixed = at(16.7, 100).concat(at(200, 20));
    assert.strictEqual(P.slowVerdict(mixed, false), false, 'a few hitches (median) are not Low Power Mode');
});

test('the busy list covers flights, warps, world trips, Mirror camera and the movement player', () => {
    ['mf-transit', 'mf-roam', 'wh-padfly', 'bwr-warping', 'gx-in', 'gx-out', 'gx-hold', 'mm-cam', 'mp-on', 'lt-on'].forEach(c => assert.ok(P.BUSY.test('wh-home ' + c + ' x'), c));
    assert.ok(!P.BUSY.test('wh-home wb-on'));
    /* places you stay in are not motion: with these busy, the world never slowed down behind the Room (measured Oct 25) */
    ['wh-cosmos', 'wh-away', 'wh-leave', 'wh-mapview'].forEach(c => assert.ok(!P.BUSY.test('wb-on wb-comm ' + c + ' x'), c + ' is a place, not motion'));
    /* the 2 s after crossing into the spirit world are still drawn every refresh by the scene itself */
    assert.match(read('body-world-3d-scene.js'), /now - cosAt < 2000/);
});

/* ---------- power-saver.js: running in a stand-in page ---------- */
function fakePage(opts) {
    opts = opts || {};
    const L = {}, timers = new Map(); let tid = 0, t = 0;
    const cls = new Set(['wh-home']);
    const H = { get className() { return [...cls].join(' '); }, classList: { toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); }, contains: c => cls.has(c), add: c => cls.add(c) } };
    const anims = opts.anims || [];
    const D = { documentElement: H, hidden: false, head: { appendChild() { } }, createElement: () => ({}), addEventListener: (k, f) => { (L['d:' + k] = L['d:' + k] || []).push(f); }, getAnimations: () => anims };
    const store = opts.store || {};
    const W = {
        document: D, performance: { now: () => t }, navigator: {}, localStorage: { getItem: k => store[k] || null },
        addEventListener: (k, f) => { (L[k] = L[k] || []).push(f); },
        setInterval: (f, ms) => { timers.set(++tid, { f, ms, iv: true }); return tid; }, clearInterval: id => timers.delete(id),
        setTimeout: (f, ms) => { timers.set(++tid, { f, ms }); return tid; }, clearTimeout: id => timers.delete(id),
        getComputedStyle: el => el.style || { display: 'block', opacity: '1' }
    };
    return { W, D, H, cls, L, timers, store, fire: (k, d) => (L[(d ? 'd:' : '') + k] || []).forEach(f => f({})), advance: ms => { t += ms; }, runTimeouts: () => { [...timers].forEach(([id, x]) => { if (!x.iv) { timers.delete(id); x.f(); } }); } };
}

test('in a page: rest/saver classes follow the ladder, a touch brings it straight back to active, hidden stops its timers', () => {
    const pg = fakePage(); const lp = P.create(pg.W);
    assert.strictEqual(lp.state(), 'active');
    pg.advance(31000); assert.strictEqual(lp.state(), 'rest'); assert.ok(pg.cls.has('lowi-rest'));
    assert.ok(lp.interval(false) > lp.interval(true) - 1000 && lp.interval(true) > lp.interval(false), 'behind a page waits longer between draws');
    pg.fire('pointerdown'); assert.strictEqual(lp.state(), 'active'); assert.ok(!pg.cls.has('lowi-rest'));
    assert.strictEqual(lp.interval(false), 0, 'full speed right after a touch');
    pg.advance(100000); assert.strictEqual(lp.state(), 'deep');
    pg.cls.add('mf-roam'); assert.strictEqual(lp.state(), 'active', 'Misty roaming keeps it lively'); pg.cls.delete('mf-roam');
    const before = [...pg.timers.values()].filter(x => x.iv).length;
    assert.ok(before >= 1);
    pg.D.hidden = true; pg.fire('visibilitychange', true);
    assert.strictEqual([...pg.timers.values()].filter(x => x.iv).length, 0, 'no repeating timers while the app is hidden');
    pg.D.hidden = false; pg.fire('visibilitychange', true);
    assert.strictEqual(lp.state(), 'active', 'coming back counts as a touch');
    assert.ok([...pg.timers.values()].filter(x => x.iv).length >= 1);
});

test('in a page: 30 Hz full-speed frames switch battery saver on (class + 1.5x cap + earlier rest), smooth frames switch it off', () => {
    const pg = fakePage(); const lp = P.create(pg.W);
    for (let i = 0; i < 130; i++) lp.reportFrame(1 / 30);
    assert.strictEqual(lp.saver(), true); assert.ok(pg.cls.has('lowi-saver')); assert.strictEqual(lp.dprCap(2), 1.5);
    pg.advance(11000); assert.strictEqual(lp.state(), 'rest', 'saver rests after 10 s');
    for (let i = 0; i < 130; i++) lp.reportFrame(1 / 60);
    assert.strictEqual(lp.saver(), false); assert.ok(!pg.cls.has('lowi-saver')); assert.strictEqual(lp.dprCap(2), 2);
    pg.store['lowi.power'] = 'saver'; assert.strictEqual(lp.saver(), true, 'can be forced for testing');
});

function fakeAnim(target, iterations) {
    return { effect: { target, getTiming: () => ({ iterations }) }, playState: 'running', pause() { this.playState = 'paused'; }, play() { this.playState = 'running'; } };
}
function el(opts) {
    const parent = opts.parent || null;
    return { nodeType: 1, isConnected: true, parentElement: parent, style: { display: opts.display || 'block', opacity: opts.opacity == null ? '1' : opts.opacity }, getBoundingClientRect: () => ({ width: opts.w == null ? 50 : opts.w, height: opts.h == null ? 50 : opts.h }), checkVisibility: () => !opts.hidden };
}

test('never-ending CSS loops on elements nobody can see are paused, and start again when they can be seen', () => {
    const sheet = el({ hidden: true });
    const inHidden = el({ parent: sheet, hidden: true }); /* visibility:hidden sheet (the Today sheet) */
    const fadedParent = el({ opacity: '0' });
    const inFaded = el({ parent: fadedParent });
    const zero = el({ w: 0, h: 0 });
    const seen = el({});
    const fadesItselfIn = el({ opacity: '0' }); /* its OWN opacity 0 (a loop that fades it in) must keep running */
    const once = el({ hidden: true });
    const A = [fakeAnim(inHidden, Infinity), fakeAnim(inFaded, Infinity), fakeAnim(zero, Infinity), fakeAnim(seen, Infinity), fakeAnim(fadesItselfIn, Infinity), fakeAnim(once, 1)];
    const pg = fakePage({ anims: A }); const lp = P.create(pg.W);
    lp.scan();
    assert.deepStrictEqual(A.map(a => a.playState), ['paused', 'paused', 'paused', 'running', 'running', 'running']);
    assert.strictEqual(lp.pausedCount(), 3);
    /* the sheet opens: visible again */
    inHidden.checkVisibility = () => true; fadedParent.style.opacity = '1';
    lp.scan();
    assert.strictEqual(A[0].playState, 'running'); assert.strictEqual(A[1].playState, 'running');
    assert.strictEqual(A[2].playState, 'paused', 'still no size');
    assert.strictEqual(lp.pausedCount(), 1);
});

test('opening a sheet (a class change on <html> or a tap) looks again within a frame, not after 2 s', () => {
    const src = read('power-saver.js');
    assert.match(src, /new MutationObserver\(scanSoon\)\.observe\(H, \{ attributes: true, attributeFilter: \['class'\] \}\)/);
    assert.match(src, /\['click', 'pointerup', 'transitionend'\]\.forEach\(t => W\.addEventListener\(t, scanSoon/);
    assert.match(src, /scanSoonT = W\.setTimeout\(\(\) => \{ scanSoonT = 0; scan\(\); \}, 60\)/);
});

test('rest pauses only the companion breathing/shimmer loops and the level badge glow (SVG and box-shadow loops repaint every frame)', () => {
    const src = read('power-saver.js');
    const css = (src.match(/st\.textContent = '([^']+)'/) || [])[1] || '';
    assert.ok(css.length > 0);
    css.split('{')[0].split(',').forEach(sel => assert.match(sel, /^html\.lowi-rest /, 'only while resting: ' + sel));
    assert.match(css, /\{animation-play-state:paused!important\}$/);
});

/* ---------- body-world-3d-scene.js: the real loop, hand-cranked ---------- */
function stand(own) {
    const p = new Proxy(function () { }, {
        get(t, k) {
            if (own && k in own) return own[k];
            if (k === Symbol.toPrimitive) return () => 0;
            if (k === Symbol.iterator) return function* () { };
            if (k === 'then') return undefined;
            if (k === 'length') return 0;
            return ANY;
        },
        set(t, k, v) { if (own) own[k] = v; return true; },
        apply() { return ANY; }, construct() { return ANY; }, has() { return true; }
    });
    return p;
}
const ANY = stand();
const rafQ = [], winL = {};
let clock = 0, rafId = 0;
const realST = setTimeout, realCT = clearTimeout;
const fakeTimers = new Map(); let ftId = 0;
Object.assign(globalThis, {
    window: globalThis, devicePixelRatio: 2, innerWidth: 390, innerHeight: 844,
    document: { documentElement: { className: '', classList: { contains: () => false }, dataset: {} }, addEventListener() { }, createElement: () => ANY, hidden: false },
    requestAnimationFrame: fn => { rafQ.push({ fn, id: ++rafId }); return rafId; },
    cancelAnimationFrame: id => { const i = rafQ.findIndex(r => r.id === id); if (i > -1) rafQ.splice(i, 1); },
    addEventListener: (k, f) => { (winL[k] = winL[k] || []).push(f); }
});
Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => clock } });
/* the loop's timers run on the test clock while a crank turns (node:test keeps the real ones) */
function withFakeTimers(fn) {
    globalThis.setTimeout = (f, ms) => { fakeTimers.set(++ftId, { f, at: clock + (ms || 0) }); return ftId; };
    globalThis.clearTimeout = id => { fakeTimers.delete(id); };
    try { return fn(); } finally { globalThis.setTimeout = realST; globalThis.clearTimeout = realCT; }
}
let scene = null;
const load = async () => scene || (scene = await import(pathToFileURL(path.join(ROOT, 'body-world-3d-scene.js')).href));
const power = { iv: { home: 1000 / 30, back: 1000 / 20 }, cap: c => c, frames: [], interval(back) { return back ? this.iv.back : this.iv.home; }, dprCap(c) { return this.cap(c); }, reportFrame(dt) { this.frames.push(dt); } };
globalThis.LowiPower = power;

async function makeWorld(o) {
    o = o || {};
    const S = await load();
    rafQ.length = 0; fakeTimers.clear(); Object.keys(winL).forEach(k => delete winL[k]);
    clock = 0; power.frames = []; power.cap = c => c;
    const box = { renders: 0, dprs: [], back: !!o.back };
    const renderer = stand({ render() { box.renders++; }, setPixelRatio(d) { box.dprs.push(d); } });
    const THREE = stand({ WebGLRenderer: function () { return renderer; } });
    globalThis.devicePixelRatio = o.dpr || 2;
    box.world = S.createWorld(THREE, ANY, { places: [], dprCap: o.dprCap || 2, inBack: () => box.back });
    /* one screen refresh: run what asked for it, else (nothing asked) jump to the next timer the loop set and run it */
    box.tick = () => withFakeTimers(() => {
        clock += 16.7;
        [...fakeTimers].forEach(([id, x]) => { if (x.at <= clock) { fakeTimers.delete(id); x.f(); } });
        const q = rafQ.splice(0);
        q.forEach(r => r.fn(clock));
        return q.length;
    });
    box.run = ms => { const end = clock + ms; let refreshes = 0; while (clock < end) refreshes += box.tick(); return refreshes; };
    box.touch = () => withFakeTimers(() => (winL.pointerdown || []).forEach(f => f({})));
    const stop0 = box.world.stop, start0 = box.world.start;
    box.world.stop = () => withFakeTimers(() => stop0());
    box.world.start = () => withFakeTimers(() => start0());
    return box;
}

test('touching (first 2.5 s): every refresh is drawn, as before', async () => {
    const b = await makeWorld();
    b.world.start();
    const r0 = b.renders; b.run(1000);
    assert.ok(b.renders - r0 >= 58, 'about 60 draws in a second, got ' + (b.renders - r0));
    b.world.stop();
});

test('Home calm: about 30 draws a second, still on the screen refresh (unchanged look)', async () => {
    const b = await makeWorld();
    b.world.start(); b.run(3000);
    const r0 = b.renders; const ref = b.run(2000);
    const per = (b.renders - r0) / 2;
    assert.ok(per >= 28 && per <= 31, 'about 30 a second, got ' + per);
    assert.ok(ref >= 115, 'calm at 30 still follows every refresh (no timer), got ' + ref);
    b.world.stop();
});

test('rest (15 a second): the loop sleeps on a timer between draws instead of waking every refresh, and time keeps real speed', async () => {
    const b = await makeWorld();
    power.iv.home = 1000 / 15;
    try {
        b.world.start(); b.run(3000);
        const r0 = b.renders; const ref = b.run(4000);
        const per = (b.renders - r0) / 4;
        assert.ok(per >= 13 && per <= 16, 'about 15 draws a second, got ' + per);
        assert.ok(ref <= per * 4 + 4, 'the loop only wakes for a draw (refresh callbacks ' + ref + ', draws ' + (b.renders - r0) + ')');
        assert.ok(fakeTimers.size === 1 && rafQ.length === 0, 'waiting on exactly one timer between draws');
    } finally { power.iv.home = 1000 / 30; b.world.stop(); }
});

test('behind a page (Community and the other tabs) the world uses the slower back rate', async () => {
    const b = await makeWorld({ back: true });
    power.iv.back = 100;
    try {
        b.world.start(); b.run(3000);
        const r0 = b.renders; b.run(4000);
        const per = (b.renders - r0) / 4;
        assert.ok(per >= 9 && per <= 11, 'about 10 a second behind a page, got ' + per);
    } finally { power.iv.back = 1000 / 20; b.world.stop(); }
});

test('a touch while the loop sleeps on its timer asks for the very next refresh and draws it', async () => {
    const b = await makeWorld();
    power.iv.home = 200;
    try {
        b.world.start(); b.run(3000); b.run(150);
        const pendingBefore = fakeTimers.size;
        const r0 = b.renders;
        b.touch();
        assert.ok(pendingBefore >= 1);
        assert.strictEqual(fakeTimers.size, 0, 'the sleep timer is cancelled');
        assert.strictEqual(rafQ.length, 1, 'the next refresh is asked for at once');
        b.tick();
        assert.strictEqual(b.renders, r0 + 1, 'drawn on that refresh');
        const r1 = b.renders; b.run(500);
        assert.ok(b.renders - r1 >= 28, 'and full speed for the touch (60 a second), got ' + (b.renders - r1));
    } finally { power.iv.home = 1000 / 30; b.world.stop(); }
});

test('stop() while the loop sleeps on its timer leaves nothing running', async () => {
    const b = await makeWorld();
    power.iv.home = 200;
    try {
        b.world.start(); b.run(3000); b.run(120);
        b.world.stop();
        assert.strictEqual(fakeTimers.size, 0, 'timer cleared');
        assert.strictEqual(rafQ.length, 0, 'no refresh asked for');
        const r0 = b.renders; b.run(1000);
        assert.strictEqual(b.renders, r0, 'nothing drawn after stop()');
        b.world.start(); b.run(100);
        assert.ok(b.renders > r0, 'start() again runs');
    } finally { power.iv.home = 1000 / 30; b.world.stop(); }
});

test('frames that waited on a timer on purpose never lower the sharpness, and are not reported as a slow phone', async () => {
    const b = await makeWorld();
    power.iv.home = 1000 / 8;
    try {
        b.world.start(); b.run(3000);
        const reported = power.frames.length, dprChanges = b.dprs.length;
        b.run(30000);
        assert.strictEqual(b.dprs.length, dprChanges, 'no sharpness drop in 30 s of 8-a-second drawing');
        const late = power.frames.slice(reported);
        assert.ok(late.every(dt => dt < 0.02), 'only refresh-to-refresh frames are reported, never one that slept on a timer: max ' + Math.max(...late));
        assert.ok(power.frames.slice(0, reported).every(dt => dt < 0.02), 'full-speed frames were reported at their real 16.7 ms');
    } finally { power.iv.home = 1000 / 30; b.world.stop(); }
});

test('battery saver: a 3x phone (world at 2x) is drawn at 1.5x while saver is on, and climbs back when it ends', async () => {
    const b = await makeWorld({ dpr: 3, dprCap: 2 });
    b.world.start(); b.run(500);
    power.cap = c => Math.min(c, 1.5);
    b.run(100);
    assert.strictEqual(b.dprs[b.dprs.length - 1], 1.5, 'dropped to 1.5x: ' + b.dprs);
    power.cap = c => c;
    b.run(30000);
    assert.strictEqual(b.dprs[b.dprs.length - 1], 2, 'back to 2x after saver ends: ' + b.dprs.slice(-4));
    b.world.stop();
});

test('the world tells the scene whether it is behind a page; power-saver.js loads before the world; the offline cache has it', () => {
    assert.match(read('body-world-3d.js'), /inBack: \(\) => mode === 'back'/);
    const html = read('index.html');
    const ps = html.indexOf('<script src="power-saver.js?v=');
    assert.ok(ps > 0, 'power-saver.js is loaded');
    /* Oct 28 launch scene: it is now the first script of the body, right after the scene, before the app markup and the loader */
    assert.ok(ps < html.indexOf('<div id="app"') && ps < html.indexOf('<script src="apple-ui.js'), 'loaded before the app and the world');
    assert.ok(ps > html.indexOf('id="lwLaunch"'), 'after the launch scene, so it never delays its first frame');
    assert.match(read('sw.js'), /"power-saver\.js"/);
});

/* ---------- index.html: the sound kit naps ---------- */
test('the sound kit AudioContext goes to sleep 6 s after the last sound and wakes on the next tap or sound', () => {
    const html = read('index.html');
    const nap = html.match(/function sfxNap\(\)\{[^\n]+/);
    assert.ok(nap, 'sfxNap exists');
    assert.match(nap[0], /ac\.state === "running"\) \{ try \{ ac\.suspend\(\); \}/);
    assert.match(nap[0], /\}, 6000\);/);
    assert.match(html, /function ready\(\)\{[^\n]*ac\.resume\(\);[^\n]*sfxNap\(\); return ac\.state !== "closed"; \}/, 'every sound resets the nap and wakes a sleeping context');
    assert.match(html, /unlocked = true; \}\n  sfxNap\(\);\n\}/, 'the unlock tap also starts the nap clock');
    assert.match(html, /document\.addEventListener\("pointerdown", wakeSfx, \{capture:true, passive:true\}\)/, 'woken as the finger lands, before the tap sound');
    assert.ok(html.includes('["touchend", "click", "keydown"].forEach(t => document.addEventListener(t, wakeSfx, {capture:true, passive:true}));'), 'the older wake-ups stay as they were');
    /* run it: a stand-in context goes running -> suspended after 6 s of silence */
    const fn = new Function('ac', 'setTimeout', 'clearTimeout', 'let sfxNapT = 0;\n' + nap[0] + '\nreturn sfxNap;');
    const q = []; const ac = { state: 'running', suspend() { this.state = 'suspended'; } };
    const go = fn(ac, (f, ms) => { q.push({ f, ms }); return q.length; }, () => { });
    go(); assert.strictEqual(q[0].ms, 6000); q[0].f(); assert.strictEqual(ac.state, 'suspended');
});

test('behind steady Community the faded-out world canvas is not drawn; the pull-out and the dive home always are', () => {
    const src = read('body-world-3d.js');
    assert.match(src, /if \(mode === 'back'\) return !!\(back && back\.isConnected\) && !backFaded\(\);/);
    const fn = src.slice(src.indexOf('function backFaded()'), src.indexOf('function shouldRender()'));
    assert.ok(fn.length > 0 && fn.length < 600, 'backFaded is a small helper before shouldRender');
    assert.match(fn, /contains\('wb-comm'\)/);
    assert.match(fn, /contains\('gx-in'\)/);
    assert.match(fn, /contains\('gx-out'\)/);
    assert.match(fn, /getComputedStyle\(canvas\)\.opacity === 0/, 'only when the canvas is really fully faded out (the Room CSS is live and its fade has finished)');
    /* run it: a tiny fake page */
    const mk = (cls, op) => {
        const H = { classList: { contains: c => cls.includes(c) } };
        const W = { getComputedStyle: () => ({ opacity: op }) };
        return new Function('H', 'W', 'canvas', fn + '; return backFaded();')(H, W, {});
    };
    assert.strictEqual(mk(['wb-on', 'wb-comm'], '0'), true, 'steady Community, canvas faded = no drawing');
    assert.strictEqual(mk(['wb-on', 'wb-comm'], '1'), false, 'canvas still visible (Room CSS not live yet) = keep drawing');
    assert.strictEqual(mk(['wb-on', 'wb-comm'], '0.4'), false, 'mid-fade = keep drawing');
    assert.strictEqual(mk(['wb-on', 'wb-comm', 'gx-in'], '0'), false, 'pull-out from Home = always drawn');
    assert.strictEqual(mk(['wb-on', 'wb-comm', 'gx-out'], '0'), false, 'dive home = always drawn');
    assert.strictEqual(mk(['wb-on'], '0'), false, 'other pages are not affected');
});
