/* world-exit (Oct 17, E-man): push Misty against the edge of a world for 3 s and you both fly out; autopilot does the same
   (corner, press, out); leaving a world (World map, X, autopilot, recall) takes her along instead of snapping her back into her bubble. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MF = require(path.join(ROOT, 'misty-flight.js'));
const mf = fs.readFileSync(path.join(ROOT, 'misty-flight.js'), 'utf8');

const push = { mode: 'drive', mag: 1, out: 1, edge: 1, busy: false };
function hold(s, secs, inp, dt = 1 / 60) {
    let fires = 0, h = { s, p: 0 };
    for (let t = 0; t < secs - 1e-9; t += dt) { h = MF.exitHold(h.s, Object.assign({ dt }, inp)); if (h.fire) fires++; }
    return { s: h.s, p: h.p, fires };
}

test('three seconds of pushing outward at the edge fires exactly once, not before', () => {
    assert.strictEqual(MF.EXIT.HOLD, 3);
    let r = hold(null, 2.9, push);
    assert.strictEqual(r.fires, 0, 'nothing before 3 s');
    assert.ok(r.p > 0.95 && r.p < 1, 'progress shows how close you are: ' + r.p);
    r = hold(r.s, 0.2, push);
    assert.strictEqual(r.fires, 1, 'fires at 3 s');
    r = hold(r.s, 5, push);
    assert.strictEqual(r.fires, 0, 'keeps pushing after it fired: still one exit');
});

test('letting go or steering away resets the count', () => {
    let r = hold(null, 2.5, push);
    r = hold(r.s, 0.05, Object.assign({}, push, { mag: 0 }));
    assert.strictEqual(r.s.t, 0, 'released: back to zero');
    r = hold(r.s, 2.5, push);
    assert.strictEqual(r.fires, 0, '2.5 + 2.5 s with a release between is not 3 s');
    r = hold(r.s, 0.05, Object.assign({}, push, { out: -0.6 }));
    assert.strictEqual(r.s.t, 0, 'steering back into the world: back to zero');
    r = hold(r.s, 0.05, Object.assign({}, push, { out: 0.1 }));
    assert.strictEqual(r.s.t, 0, 'steering along the edge (not outward) does not count');
    /* after a fire, it takes a release before another exit can build up */
    r = hold(null, 3.1, push); assert.strictEqual(r.fires, 1);
    r = hold(r.s, 0.05, Object.assign({}, push, { mag: 0 }));
    r = hold(r.s, 3.1, push); assert.strictEqual(r.fires, 1, 'a fresh 3-second push is a fresh exit');
});

test('only at the edge, only you: away from the edge, autopilot, or mid-warp it never counts', () => {
    assert.strictEqual(hold(null, 5, Object.assign({}, push, { edge: 0.6 })).fires, 0, 'in the middle of the world');
    assert.strictEqual(hold(null, 5, Object.assign({}, push, { mode: 'auto' })).fires, 0, 'autopilot never fires the push exit');
    assert.strictEqual(hold(null, 5, Object.assign({}, push, { mode: 'home' })).fires, 0);
    assert.strictEqual(hold(null, 5, Object.assign({}, push, { busy: true })).fires, 0, 'during a warp / fall-in');
    assert.strictEqual(hold(null, 5, Object.assign({}, push, { mag: 0.2 })).fires, 0, 'a resting thumb is not a push');
});

test('a finger slipping off the edge for a moment keeps the count; a real move away resets it', () => {
    let r = hold(null, 2, push);
    r = hold(r.s, 0.15, Object.assign({}, push, { edge: 0.9 }));
    assert.ok(r.s.t >= 1.99, 'short slip keeps the count');
    r = hold(r.s, 1.05, push);
    assert.strictEqual(r.fires, 1);
    r = hold(null, 2, push);
    r = hold(r.s, 0.5, Object.assign({}, push, { edge: 0.8 }));
    assert.strictEqual(r.s.t, 0, 'half a second off the edge resets');
    /* one long hitch frame is capped: a frozen frame cannot count as seconds of pushing */
    r = MF.exitHold(null, Object.assign({ dt: 2.5 }, push));
    assert.ok(r.s.t <= MF.EXIT.DT + 1e-9 && !r.fire);
});

test('the way out is continuous: phase A starts where she is, phase B starts where A ended and ends beside the world she left', () => {
    const from = { x: 0.85, y: 0.2 };
    const a0 = MF.outAt('A', 0, from), a1 = MF.outAt('A', 1, from);
    assert.ok(Math.abs(a0.x - from.x) < 1e-9 && Math.abs(a0.y - from.y) < 1e-9, 'no jump when the place starts to go');
    assert.ok(a1.x < from.x && a1.y > from.y, 'drifts toward the middle');
    const door = { x: 0.2, y: 0.7 };
    const b0 = MF.outAt('B', 0, a1, door), b1 = MF.outAt('B', 1, a1, door);
    assert.ok(Math.abs(b0.x - a1.x) < 1e-9 && Math.abs(b0.y - a1.y) < 1e-9, 'B starts where A ended');
    assert.ok(Math.abs(b1.x - (0.2 + 0.3 * 0.3)) < 1e-9, 'ends a little toward the middle from the world she left');
    let prev = b0;
    for (let k = 0.05; k <= 1.0001; k += 0.05) { const b = MF.outAt('B', k, a1, door); assert.ok(Math.hypot(b.x - prev.x, b.y - prev.y) < 0.08, 'no jump at k=' + k); prev = b; }
    const off = MF.outAt('B', 1, a1, { x: -3, y: 4 });
    assert.ok(off.x >= 0.16 && off.x <= 0.84 && off.y >= 0.24 && off.y <= 0.8, 'a world off screen never takes her off screen');
});

test('wiring: leaving a world takes her along (no snap back into the bubble), autopilot goes corner -> press -> out', () => {
    assert.ok(/d\.phase === 'start' && d\.id === 'hub' && S\.st === 'inside'/.test(mf), 'any trip out of her world (World map, X, recall, autopilot) starts the fly-out');
    assert.ok(/if \(S\.st === 'out'\) \{ outFrame\(ctx, k\); return; \}/.test(mf), 'the fly-out runs before the tapped-away / left checks that used to hide her');
    assert.ok(/onBeforeRender = outDraw/.test(mf), 'drawn after the warp moved the camera: never a frame behind');
    assert.ok(/S\.st = 'free'/.test(mf.slice(mf.indexOf('function outLand'))), 'she lands out in the universe flying, not in her cell');
    assert.ok(/travel\('hub', false, 0, \{ wide: true \}\)/.test(mf.slice(mf.indexOf('function exitGo'))), 'out to the whole universe, with the World map warp');
    const auto = mf.slice(mf.indexOf('function autoExitFrame'), mf.indexOf('function startOut'));
    assert.ok(/ph === 'seek'/.test(auto) && /'press'/.test(auto) && /X\.t \/ EXIT\.HOLD/.test(auto), 'autopilot seeks the corner, presses for the same 3 s, then goes');
    assert.ok(!/Rg\.travel\('hub'\)\); \} catch/.test(mf.slice(mf.indexOf('function roamFrame'), mf.indexOf('function exitReset'))), 'autopilot no longer warps out from wherever she is');
    /* no new controls */
    assert.ok(!/createElement\(['"]button/.test(mf), 'no button of its own');
    /* the hunt stays yours: a fly-out never eats crumbs or counts a power-up */
    assert.ok(/S\.huntFly = false/.test(mf.slice(mf.indexOf('function startOut'), mf.indexOf('function outDraw'))));
});

/* mist rule (Oct 17, E-man): inside a world the mist/clouds are the forbidden edge. Pushing into them only lets Misty explore and
   get lost; only pushing outward into clear space (a gap in the mist) starts the 3-second exit. */
test('mist rule: pushing outward into the mist never starts the exit, however long you push', () => {
    const mist = Object.assign({}, push, { mist: true });
    let r = hold(null, 10, mist);
    assert.strictEqual(r.fires, 0, 'no exit into the mist');
    assert.strictEqual(r.p, 0, 'no progress builds up in the mist');
    const h = MF.exitHold(null, Object.assign({ dt: 1 / 60 }, mist));
    assert.strictEqual(h.lost, true, 'pushing into the mist at the edge = exploring / getting lost');
    assert.strictEqual(MF.exitHold(null, Object.assign({ dt: 1 / 60 }, push, { mist: false })).lost, false);
    assert.strictEqual(MF.exitHold(null, Object.assign({ dt: 1 / 60 }, mist, { edge: 0.5 })).lost, false, 'only at the edge');
});

test('mist rule: pushing outward into a clear gap starts the 3-second exit as before', () => {
    const clear = Object.assign({}, push, { mist: false });
    let r = hold(null, 2.9, clear);
    assert.strictEqual(r.fires, 0);
    r = hold(r.s, 0.2, clear);
    assert.strictEqual(r.fires, 1, 'out after 3 s in clear space');
});

test('mist rule: sliding from a clear gap into the mist resets the count (a wisp shorter than the grace keeps it)', () => {
    const clear = Object.assign({}, push, { mist: false }), mist = Object.assign({}, push, { mist: true });
    let r = hold(null, 2, clear);
    r = hold(r.s, 0.1, mist);
    assert.ok(r.p > 0.6, 'a wisp of mist for a moment keeps the count: ' + r.p);
    r = hold(r.s, 0.5, mist);
    assert.strictEqual(r.p, 0, 'staying in the mist resets it');
    r = hold(r.s, 2.9, clear);
    assert.strictEqual(r.fires, 0, 'counts again from zero in the clear');
    r = hold(r.s, 0.2, clear);
    assert.strictEqual(r.fires, 1);
});

test('mist rule: every world has the same two clear gaps each time; most of the edge is mist; never straight down', () => {
    const ids = ['brain', 'lung', 'heart', 'liver', 'pancreas', 'gut', 'muscle'];
    ids.forEach(id => {
        const g = MF.exitGaps(id);
        assert.deepStrictEqual(g, MF.exitGaps(id), id + ': same gaps every time');
        assert.strictEqual(g.length, MF.MIST.GAPS);
        assert.ok(Math.abs(MF.angWrap(g[0].a - g[1].a)) > 1.5, id + ': the gaps are apart');
        g.forEach(x => {
            assert.strictEqual(MF.inMist(x.a, g), false, id + ': a gap centre is clear');
            assert.strictEqual(MF.inMist(x.a + x.w / 2 + 0.05, g), true, id + ': just past the gap is mist');
            assert.ok(Math.abs(MF.angWrap(x.a + Math.PI / 2)) >= 0.44, id + ': no gap straight down where the controller is');
        });
        let clear = 0; const N = 720;
        for (let j = 0; j < N; j++) if (!MF.inMist(j / N * 2 * Math.PI, g)) clear++;
        assert.ok(clear / N > 0.2 && clear / N < 0.4, id + ': clear share ' + (clear / N).toFixed(2));
    });
    assert.notDeepStrictEqual(MF.exitGaps('brain'), MF.exitGaps('heart'), 'worlds differ');
});

test('mist rule: autopilot heads for the nearest clear gap; reach grows only while pushing into the mist', () => {
    const g = [{ a: 1, w: 0.95 }, { a: -2, w: 0.95 }];
    assert.strictEqual(MF.gapToward(0.6, g), 1);
    assert.strictEqual(MF.gapToward(-2.5, g), -2);
    assert.strictEqual(MF.gapToward(3, g), -2, 'wraps around');
    assert.strictEqual(MF.angWrap(3 * Math.PI).toFixed(6), Math.PI.toFixed(6));
    assert.strictEqual(MF.mistReach(10, true, true), 10 * MF.MIST.LOST, 'out into the mist while you push');
    assert.strictEqual(MF.mistReach(10, true, false), 10, 'let go: eased back');
    assert.strictEqual(MF.mistReach(10, false, true), 10, 'clear space: the usual edge (that is where the exit counts)');
    assert.ok(MF.MIST.LOST > 1.15 && MF.MIST.LOST < 1.6);
    assert.strictEqual(MF.lostAmt(0.9), 0); assert.strictEqual(MF.lostAmt(MF.MIST.LOST), 1);
});

test('mist rule wiring: the exit check knows about the mist, autopilot seeks a gap, mist is drawn only inside a world', () => {
    assert.match(mf, /exitHold\(S\.exH, \{[^}]*mist: !!S\.inMist/);
    assert.match(mf, /gapToward\(Math\.atan2\(V\.a\.dot\(V\.up\), V\.a\.dot\(V\.rt\)\), exitGaps\(S\.flew\)\)/);
    assert.match(mf, /mistReach\(inR, misty, pushOut\)/);
    assert.match(mf, /if \(S\.st !== 'inside'\) mistFrame\(ctx, 0, false\)/);
    assert.match(mf, /mistFrame\(ctx, inR, true\)/);
    assert.match(mf, /LowiMistyHints\.lost\(\)/, 'coming back out of the mist she says she was lost');
});
