/* Oct 17 far-out fix (E-man: "I fly out, fly out, fly out ... and the app just restarts, I'm back in a bubble").
   Not a crash: the game itself sent her home. Holding one way carried her round straight back into her bubble, letting go of the
   stick to turn the view counted as idle (20 s, fly home), an edge drag paged away and ended the flight, and a lost WebGL context
   switched the 3D world off for good. These tests keep all four fixed. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const G = require(path.join(ROOT, 'misty-galaxy.js'));
const F = require(path.join(ROOT, 'misty-flight.js'));
const BW = require(path.join(ROOT, 'body-world-3d.js'));
const GAL = G.GAL;

const len = p => Math.hypot(p[0], p[1], p[2]);
/* a held-on flight in 3D, applying the loop the way misty-galaxy.js step() does (position and velocity as plain arrays) */
function hold(dir, speed, secs, dt = 1 / 30, start = [0, 0, 300]) {
    const n = len(dir), v = dir.map(x => x / n * speed);
    let p = start.slice(), loops = 0, nearest = Infinity, farthest = 0, bad = false, deepAfterLoop = true;
    for (let t = 0; t < secs; t += dt) {
        p = p.map((x, i) => x + v[i] * dt);
        if (len(p) > GAL.LOOP) { p = G.loopTo(p, v, loops); loops++; if (len(p) < GAL.DEEP1) deepAfterLoop = false; }
        if (!p.every(Number.isFinite)) bad = true;
        const L = len(p); farthest = Math.max(farthest, L); if (loops > 0) nearest = Math.min(nearest, L);
    }
    return { p, loops, nearest, farthest, bad, deepAfterLoop };
}

test('long flight: holding one way for ten minutes keeps going and never comes back into her own bubble', () => {
    const dirs = [[1, 0, 0], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 1, 1], [-3, 0.2, 1], [0.01, 0.99, 0.01]];
    for (const d of dirs) for (const sp of [60, 180, 400]) {
        const r = hold(d, sp, 600);
        assert.ok(!r.bad, 'finite all the way');
        assert.ok(r.loops >= 3, 'came round ' + r.loops + ' times at ' + sp + ' u/s');
        /* after coming round her straight line passes home PASS.MISS away: far outside the hand-made galaxy and her own world */
        assert.ok(r.nearest > GAL.R * 4, 'nearest to home after a loop ' + r.nearest.toFixed(0) + ' along ' + d);
        assert.ok(r.nearest >= G.PASS.MISS - 1, 'passes home at least PASS.MISS away (' + r.nearest.toFixed(0) + ')');
        assert.ok(r.deepAfterLoop, 'lands in the deep dark, nothing on screen jumps');
    }
});

test('long flight: each lap passes home on a different side, and coming round never loops twice in a row', () => {
    const v = [0, 0, -120], p = [0, 0, -(GAL.LOOP + 2)];
    const a = G.loopTo(p, v, 0), b = G.loopTo(p, v, 1);
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 500, 'different side each lap');
    for (let laps = 0; laps < 20; laps++) {
        const q = G.loopTo(p, v, laps);
        assert.ok(len(q) < GAL.LOOP, 'lands inside the loop: no flicker');
        assert.ok(q[2] > 0, 'lands behind home, still flying the same way (toward -z)');
    }
});

test('numeric limits: positions stay finite and inside the loop for any speed, direction or lap count', () => {
    const cases = [[[GAL.LOOP + 0.001, 0, 0], [1, 0, 0]], [[0, GAL.LOOP * 1.9, 0], [0, 50, 0]], [[1e4, -1e4, 3e3], [-1, 2, 3]],
        [[GAL.LOOP + 5, 0, 0], [0, 0, 0]], [[GAL.LOOP + 5, 0, 0], [1e-9, 0, 0]], [[0, 0, GAL.LOOP + 1], [0, 1e6, 0]]];
    for (const [p, v] of cases) for (const laps of [0, 1, 7, 1e3, 1e7]) {
        const q = G.loopTo(p, v, laps);
        assert.ok(q.every(Number.isFinite), 'finite for ' + p + ' / ' + v + ' / ' + laps);
        assert.ok(len(q) <= GAL.LOOP && len(q) >= G.PASS.MISS, 'within limits: ' + len(q));
    }
    /* an hour at top speed: the farthest she ever gets is the loop plus one frame of flight */
    const r = hold([0.3, -0.2, 1], 600, 3600, 1 / 20);
    assert.ok(!r.bad && r.farthest <= GAL.LOOP + 600 / 20 + 1, 'farthest ' + r.farthest.toFixed(0));
    assert.ok(G.PASS.MISS < GAL.LOOP - 1 && G.PASS.MISS > GAL.DEEP1 * 0.9, 'MISS sits between the hand-made galaxy and the loop');
});

test('looking around is not idle: turning or pinching the view keeps her out there past 20 s', () => {
    const lim = F.K.IDLE_HOME;
    assert.strictEqual(lim, 20);
    assert.strictEqual(F.lookBusy({ idle: 0.05 }), true, 'a drag or pinch just now');
    assert.strictEqual(F.lookBusy({ idle: 5 }), false);
    assert.strictEqual(F.lookBusy(null), false);
    /* stick let go for a minute while dragging the view the whole time */
    let stick = 0, look = 0; const dt = 1 / 30;
    for (let t = 0; t < 60; t += dt) { stick += dt; look = F.lookBusy({ idle: (t * 7) % 0.25 }) ? 0 : look + dt; assert.ok(!F.homeIdle(stick, look, lim), 'still out at ' + t.toFixed(1) + ' s'); }
    /* really doing nothing still brings her home, so getting home stays possible */
    assert.ok(F.homeIdle(lim + 0.1, lim + 0.1, lim));
    assert.ok(!F.homeIdle(lim + 5, 3, lim));
    const src = read('misty-flight.js');
    assert.match(src, /S\.lookIdle = lookBusy\(r\) \? 0 : \(\+S\.lookIdle \|\| 0\) \+ dt;/);
    assert.match(src, /homeIdle\(S\.idle, S\.lookIdle, K\.IDLE_HOME\)/);
});

test('repeated world exits and app switches: a blink pauses her where she is, leaving Home for real still ends the flight', () => {
    /* many short blinks in a row: each is forgiven because the timer starts again whenever Home is live again */
    let offT = 0;
    for (let i = 0; i < 50; i++) {
        for (let k = 0; k < 60; k++) { offT += 1 / 30; assert.ok(F.offGrace(true, offT), 'blink ' + i + ' forgiven'); }
        offT = 0; /* S.offT = 0 once Home is live again */
    }
    assert.ok(!F.offGrace(true, F.OFF_GRACE + 0.01), 'a long stall is not a blink');
    assert.ok(!F.offGrace(false, 0), 'another page or a full-screen view ends it at once');
    const src = read('misty-flight.js');
    /* time in the background does not count: switching apps for minutes keeps her where she was */
    assert.match(src, /S\.offT = \(\+S\.offT \|\| 0\) \+ \(D\.hidden \? 0 : ctx\.dt\)/);
    assert.match(src, /const blink = D\.hidden \|\|/);
    assert.match(src, /if \(S\.st !== 'idle' && !offGrace\(blink, S\.offT\)\) end\(ctx, 'abort'\)/);
    assert.match(src, /S\.offT = 0;/);
});

test('edge drag while flying turns the view; the page stays (only the tab bar changes pages)', () => {
    const src = read('liquid-glass.js');
    const i = src.indexOf("cur === 'home' && !onBar && document.documentElement.classList.contains('mf-on')");
    assert.ok(i > 0, 'flight guard in the pager');
    assert.ok(i < src.indexOf('if (!onBar && hScroller(t, pageEl(cur))) return;'), 'checked before the pager starts a swipe');
});

test('graphics taken away: the 3D world waits and comes back without a reload; it only gives up if they stay away or keep going', () => {
    const { LOST, lostPolicy } = BW;
    assert.ok(LOST.WAIT >= 8000 && LOST.MAX >= 3);
    assert.strictEqual(lostPolicy([0], 1), 'wait', 'the first loss waits');
    const now = 1e6;
    assert.strictEqual(lostPolicy(Array.from({ length: LOST.MAX }, (_, i) => now - i * 1000), now), 'wait');
    assert.strictEqual(lostPolicy(Array.from({ length: LOST.MAX + 1 }, (_, i) => now - i * 1000), now), 'fallback', 'losing it again and again');
    assert.strictEqual(lostPolicy(Array.from({ length: LOST.MAX + 1 }, (_, i) => now - LOST.SPAN - i * 1000), now), 'wait', 'old losses are forgotten');
    const src = read('body-world-3d.js');
    assert.match(src, /addEventListener\('webglcontextlost', e => \{ e\.preventDefault\(\); ctxLost\(\); \}\)/);
    assert.match(src, /addEventListener\('webglcontextrestored', \(\) => ctxBack\(\)\)/);
    assert.ok(!/webglcontextlost', e => \{ e\.preventDefault\(\); fail\(/.test(src), 'a loss no longer switches the world off at once');
    const back = src.slice(src.indexOf('function ctxBack()'), src.indexOf('function fail('));
    assert.ok(/world\.start\(\)/.test(back) && !/location\.reload|location\.href/.test(back), 'restarts drawing, no reload');
    /* coming back to the app while the graphics are still away does not try to draw into a dead context */
    assert.match(src, /else if \(world && !api\.lost\) world\.start\(\);/);
    /* the WebGL probe hands its context straight back (phones keep only a few) */
    assert.match(src, /getExtension\('WEBGL_lose_context'\); if \(x\) x\.loseContext\(\)/);
});
