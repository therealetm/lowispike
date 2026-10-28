/* Oct 24 2026 (Emmanuel: "I tried to fly into a world and it crashed"). The 3D world's render loop asked for the next screen refresh
   only at the end of frame(), so ONE frame that threw (in step() or renderer.render()) ended the loop for good and the world froze.
   These tests run the real createWorld() from body-world-3d-scene.js with a stand-in three.js (a proxy that answers everything) and a
   hand-cranked requestAnimationFrame, then make frames fail on purpose. Tests 1-3 fail on the old code (the loop dies at the first
   bad frame). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* a stand-in for anything three.js hands back: every property, call and `new` answers with another stand-in; numbers read as 0 */
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
const rafQ = [];
let clock = 0, rafId = 0;
Object.assign(globalThis, {
    window: globalThis, devicePixelRatio: 2, innerWidth: 390, innerHeight: 844,
    document: { documentElement: { className: '', classList: { contains: () => false }, dataset: {} }, addEventListener() { }, createElement: () => ANY, hidden: false },
    requestAnimationFrame: fn => { rafQ.push({ fn, id: ++rafId }); return rafId; },
    cancelAnimationFrame: id => { const i = rafQ.findIndex(r => r.id === id); if (i > -1) rafQ.splice(i, 1); }, addEventListener: () => { }
});
let scene = null;
const load = async () => scene || (scene = await import(pathToFileURL(path.join(ROOT, 'body-world-3d-scene.js')).href));

async function makeWorld() {
    const S = await load();
    rafQ.length = 0;
    /* every world starts its clock at 0: the scene draws every second refresh once nobody has touched it for 2.5 s (its calm mode),
       and these tests stay inside the first 2.5 s so every refresh is a drawn one */
    clock = 0;
    const box = { renders: 0, boom: 0, errs: [] };
    const renderer = stand({ render() { box.renders++; if (box.boom > 0) { box.boom--; throw new Error('test: bad frame'); } } });
    const THREE = stand({ WebGLRenderer: function () { return renderer; } });
    box.world = S.createWorld(THREE, ANY, { places: [], onFrameError: e => box.errs.push(e) });
    /* one turn of the crank: run whatever asked for this refresh; returns false when nothing asked (the loop is dead) */
    box.pump = n => { for (let i = 0; i < n; i++) { const q = rafQ.splice(0); if (!q.length) return false; clock += 16.7; q.forEach(r => { try { r.fn(clock); } catch (e) { box.escaped = e; } }); } return true; };
    return box;
}
const quiet = fn => { const w = console.warn, out = []; console.warn = (...a) => out.push(a.join(' ')); try { return fn(out); } finally { console.warn = w; } };

test('one bad frame (renderer.render throws) no longer stops the world: the next frames are drawn', async () => {
    const b = await makeWorld();
    quiet(() => {
        b.world.start();
        assert.ok(b.pump(10), 'loop runs');
        const before = b.renders;
        b.boom = 1;
        assert.ok(b.pump(1), 'the bad frame ran');
        assert.ok(b.pump(20), 'the loop is still asking for refreshes after the bad frame');
        assert.strictEqual(b.renders, before + 21, 'every refresh after it was drawn');
        assert.strictEqual(b.escaped, undefined, 'nothing escaped the frame');
    });
    assert.strictEqual(b.errs.length, 1, 'the error was reported once');
    assert.strictEqual(b.errs[0].part, 'render');
    b.world.stop();
});

test('a burst of bad frames (graphics hiccup during a trip) is ridden out, and the console is not flooded', async () => {
    const b = await makeWorld();
    quiet(out => {
        b.world.start(); b.pump(5);
        b.boom = 100;
        assert.ok(b.pump(100), 'still running through 100 failing frames');
        assert.ok(b.pump(10));
        assert.ok(out.filter(l => /frame error/.test(l)).length <= 3, 'at most 3 warnings in the same few seconds, got ' + out.length);
    });
    assert.strictEqual(b.errs.length, 100);
    b.world.stop();
});

test('a step() that keeps failing mid-glide: the picture keeps being drawn and the glide is finished at once, the world never hangs', async () => {
    const b = await makeWorld();
    quiet(() => {
        b.world.start(); b.pump(5);
        /* a broken glide (no start point): step() throws on every frame while it is set */
        b.world.rig.fly = { t: 0, dur: 1.45, from: null, to: null };
        const before = b.renders;
        assert.ok(b.pump(40), 'loop alive');
        assert.strictEqual(b.renders, before + 40, 'drawn on every refresh even while step() failed');
        assert.strictEqual(b.world.rig.fly, null, 'the stuck glide was ended');
        const errs = b.errs.length;
        assert.ok(b.pump(10));
        assert.strictEqual(b.errs.length, errs, 'and step() runs cleanly again');
    });
    b.world.stop();
});

test('a frame hook that throws every frame is skipped quietly; the world and the other hooks keep running', async () => {
    const b = await makeWorld();
    let good = 0;
    quiet(out => {
        b.world.onFrame(() => { throw new Error('test: broken hook'); });
        b.world.onFrame(() => { good++; });
        b.world.start();
        assert.ok(b.pump(100));
        assert.strictEqual(good, 100, 'the healthy hook ran every frame');
        assert.ok(out.length <= 3, 'not 100 warnings: ' + out.length);
    });
    assert.ok(b.errs.every(e => e.part === 'onFrame'));
    b.world.stop();
});

test('stop() still stops the loop (the guard does not keep a stopped world alive)', async () => {
    const b = await makeWorld();
    quiet(() => { b.world.start(); b.pump(3); b.world.stop(); });
    assert.strictEqual(b.pump(1), false, 'nothing asks for a refresh after stop()');
});

test('frameGuard: counts, streaks, ok() and log throttling (first 3, then at most once every 5 s)', async () => {
    const S = await load();
    let t = 0; const seen = [];
    const g = S.frameGuard(e => seen.push(e), () => t);
    quiet(out => {
        assert.strictEqual(g.run('step', () => { }), true);
        for (let i = 0; i < 50; i++) assert.strictEqual(g.run('step', () => { throw new Error('x'); }), false);
        assert.strictEqual(out.length, 3);
        t = 5001; g.run('render', () => { throw new Error('y'); });
        assert.strictEqual(out.length, 4);
    });
    assert.strictEqual(g.count, 51); assert.strictEqual(g.streak, 51); assert.strictEqual(seen.length, 51);
    assert.deepStrictEqual({ part: g.last.part, message: g.last.message }, { part: 'render', message: 'y' });
    g.ok(); assert.strictEqual(g.streak, 0);
    const g2 = S.frameGuard(() => { throw new Error('reporter broke'); });
    quiet(() => assert.strictEqual(g2.run('x', () => { throw 1; }), false, 'a broken reporter is swallowed too'));
});

test('body-world-3d.js: frame errors are counted on LowiWorld3D, and a restored graphics context is drawn again at once', () => {
    const s = read('body-world-3d.js');
    assert.match(s, /shouldRender, onFrameError[,\s}]/, 'createWorld gets the error reporter');
    assert.match(s, /api\.frameErrors\+\+/);
    const back = s.slice(s.indexOf('function ctxBack'), s.indexOf('function fail('));
    assert.match(back, /world\.start\(\)/, 'the loop starts again on restore');
    assert.match(back, /renderOnce\(\)/, 'and the scene is drawn once at once');
    const sc = read('body-world-3d-scene.js');
    const fr = sc.slice(sc.indexOf('    function frame(now)'), sc.indexOf('    function frameWork('));
    assert.ok(fr.indexOf('requestAnimationFrame(frame)') > -1 && fr.indexOf('requestAnimationFrame(frame)') < fr.indexOf('frameWork(now)'), 'the next refresh is asked for before the work');
});
