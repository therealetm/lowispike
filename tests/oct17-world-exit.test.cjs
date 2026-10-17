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

/* cloud walls & black holes (Oct 17, E-man handoff item 3; replaces the mist rule of 115010): the Misty-style cloudy wall round a
   world is the way out (push into it for 3 s: it stretches, Home shows through, it bursts). The dark spots (where the clear gaps
   were) are black holes: their dark sector never lets you out, their pull drags Misty into a forbidden area that is hard to leave. */
test('cloud walls: pushing outward into the cloudy wall starts the 3-second exit', () => {
    const wall = Object.assign({}, push, { hole: false });
    let r = hold(null, 2.9, wall);
    assert.strictEqual(r.fires, 0);
    r = hold(r.s, 0.2, wall);
    assert.strictEqual(r.fires, 1, 'out after 3 s pushing into the cloud wall');
    assert.strictEqual(MF.exitHold(null, Object.assign({ dt: 1 / 60 }, wall)).lost, false);
});

test('black holes: pushing outward into a dark spot never starts the exit, however long you push', () => {
    const dark = Object.assign({}, push, { hole: true });
    const r = hold(null, 10, dark);
    assert.strictEqual(r.fires, 0, 'no way out through a black hole');
    assert.strictEqual(r.p, 0, 'no progress builds up there');
    assert.strictEqual(MF.exitHold(null, Object.assign({ dt: 1 / 60 }, dark)).lost, true, 'that is the forbidden edge');
    assert.strictEqual(MF.exitHold(null, Object.assign({ dt: 1 / 60 }, dark, { edge: 0.5 })).lost, false, 'only at the edge');
});

test('cloud walls: sliding from the wall into a dark spot resets the count (a moment shorter than the grace keeps it)', () => {
    const wall = Object.assign({}, push, { hole: false }), dark = Object.assign({}, push, { hole: true });
    let r = hold(null, 2, wall);
    r = hold(r.s, 0.1, dark);
    assert.ok(r.p > 0.6, 'a brush past the dark keeps the count: ' + r.p);
    r = hold(r.s, 0.5, dark);
    assert.strictEqual(r.p, 0, 'staying at the dark spot resets it');
    r = hold(r.s, 2.9, wall);
    assert.strictEqual(r.fires, 0, 'counts again from zero at the wall');
    r = hold(r.s, 0.2, wall);
    assert.strictEqual(r.fires, 1);
});

test('black holes: every world has the same two dark spots each time; most of the edge is cloud wall; never straight down', () => {
    const ids = ['brain', 'lung', 'heart', 'liver', 'pancreas', 'gut', 'muscle'];
    ids.forEach(id => {
        const g = MF.holeSpots(id);
        assert.deepStrictEqual(g, MF.holeSpots(id), id + ': same spots every time');
        assert.deepStrictEqual(g.map(x => x.a), MF.exitGaps(id).map(x => x.a), id + ': where the old gaps were');
        assert.strictEqual(g.length, MF.MIST.GAPS);
        assert.ok(Math.abs(MF.angWrap(g[0].a - g[1].a)) > 1.5, id + ': the holes are apart');
        g.forEach(x => {
            assert.strictEqual(MF.inHole(x.a, g), true, id + ': a dark spot centre');
            assert.strictEqual(MF.inHole(x.a + x.w / 2 + 0.05, g), false, id + ': just past it is cloud wall');
            assert.strictEqual(MF.inMist(x.a, g), !MF.inHole(x.a, g));
            assert.ok(Math.abs(MF.angWrap(x.a + Math.PI / 2)) >= 0.44, id + ': no hole straight down where the controller is');
        });
        let wall = 0; const N = 720;
        for (let j = 0; j < N; j++) if (!MF.inHole(j / N * 2 * Math.PI, g)) wall++;
        assert.ok(wall / N > 0.6 && wall / N < 0.8, id + ': wall share ' + (wall / N).toFixed(2));
    });
    assert.notDeepStrictEqual(MF.holeSpots('brain'), MF.holeSpots('heart'), 'worlds differ');
});

test('black holes: the pull grows toward the middle, easy at the outskirts, caught at the core', () => {
    const R = 20, H = MF.HOLE;
    assert.strictEqual(MF.holePull(H.R * R + 0.01, R), 0, 'outside its reach: no pull');
    assert.strictEqual(MF.holePull(0, R), 1, 'full pull at its middle');
    assert.ok(MF.holePull(H.R * R * 0.9, R) < 0.02, 'barely a tug at the outskirts');
    assert.ok(MF.holePull(H.R * R * 0.5, R) > 0.2 && MF.holePull(H.R * R * 0.5, R) < 0.3, 'halfway in: a fight');
    assert.ok(MF.holePull(H.R * R * 0.3, R) > MF.holePull(H.R * R * 0.6, R), 'stronger closer in');
    assert.ok(H.SUCK > 1, 'at the core it is faster than she can fly: caught');
    assert.ok(H.SUCK * MF.holePull(H.R * R * 0.5, R) < 1, 'halfway in she can still fly out if you fight it');
    assert.strictEqual(MF.holeCaught(H.CORE * R, R), true);
    assert.strictEqual(MF.holeCaught(H.CORE * R + 0.01, R), false);
    assert.strictEqual(MF.holeCaught(0, 0), false, 'no world, no hole');
    assert.ok(H.CORE < H.R && H.DEEP > 1 && H.AT < 1, 'the hole sits just inside the wall, the forbidden dark lies beyond it');
});

test('black holes: getting out takes ESC seconds of pushing away; letting go loses ground faster; never farmable by tapping', () => {
    const H = MF.HOLE, away = { mag: 1, away: 1 };
    let s = null, r;
    for (let t = 0; t < H.ESC - 0.1; t += 1 / 60) { r = MF.holeEscape(s, Object.assign({ dt: 1 / 60 }, away)); s = r.s; assert.strictEqual(r.free, false); }
    for (let t = 0; t < 0.2; t += 1 / 60) { r = MF.holeEscape(s, Object.assign({ dt: 1 / 60 }, away)); s = r.s; if (r.free) break; }
    assert.strictEqual(r.free, true, 'out after ' + H.ESC + ' s of pushing away');
    s = null;
    for (let t = 0; t < 1.5; t += 1 / 60) s = MF.holeEscape(s, Object.assign({ dt: 1 / 60 }, away)).s;
    const before = s.t;
    for (let t = 0; t < 0.5; t += 1 / 60) s = MF.holeEscape(s, { dt: 1 / 60, mag: 0, away: 0 }).s;
    assert.ok(Math.abs(before - s.t - 0.5 * H.DECAY) < 0.05, 'letting go loses ground ' + H.DECAY + 'x as fast');
    s = null;
    for (let t = 0; t < 10; t += 1 / 60) { r = MF.holeEscape(s, { dt: 1 / 60, mag: 1, away: -1 }); s = r.s; }
    assert.strictEqual(r.free, false, 'pushing deeper in never gets her out');
    for (let t = 0; t < 10; t += 1 / 60) { r = MF.holeEscape(s, { dt: 1 / 60, mag: 0.3, away: 1 }); s = r.s; }
    assert.strictEqual(r.free, false, 'a weak nudge is not enough');
    r = MF.holeEscape(null, { dt: 5, mag: 1, away: 1 });
    assert.strictEqual(r.free, false, 'one long frame cannot jump the count');
});

test('cloud walls: the autopilot heads for the nearest stretch of wall, well clear of the black holes', () => {
    const g = [{ a: 1, w: 0.95 }, { a: -2, w: 0.95 }], H = MF.HOLE;
    assert.strictEqual(MF.wallToward(0, g), 0, 'already at the wall: straight out');
    [1, 1.2, 0.7, -2, -1.6, 3, -2.4].forEach(a0 => {
        const x = MF.wallToward(a0, g);
        g.forEach(h => assert.ok(Math.abs(MF.angWrap(x - h.a)) >= h.w / 2 + H.CLEAR - 1e-9, a0 + ' -> ' + x + ' clear of ' + h.a));
        assert.ok(Math.abs(MF.angWrap(x - a0)) <= g[0].w / 2 + H.CLEAR + 1e-9, a0 + ': the nearest side');
    });
    assert.strictEqual(MF.angWrap(3 * Math.PI).toFixed(6), Math.PI.toFixed(6));
    assert.strictEqual(MF.mistReach(10, true, true), 10 * MF.MIST.LOST, 'out into the dark while you push there');
    assert.strictEqual(MF.mistReach(10, true, false), 10, 'let go: eased back');
    assert.strictEqual(MF.mistReach(10, false, true), 10, 'at the wall: the usual edge (that is where the exit counts)');
    assert.strictEqual(MF.lostAmt(0.9), 0); assert.strictEqual(MF.lostAmt(MF.MIST.LOST), 1);
});

test('cloud walls wiring: exit knows the dark spots, autopilot seeks the wall, wall stretches and bursts, Home shows through', () => {
    assert.match(mf, /exitHold\(S\.exH, \{[^}]*hole: !!S\.inHole/);
    assert.match(mf, /wallToward\(Math\.atan2\(V\.a\.dot\(V\.up\), V\.a\.dot\(V\.rt\)\), holeSpots\(S\.flew\)\)/);
    assert.ok(!/gapToward\(Math\.atan2/.test(mf), 'the autopilot no longer heads for a gap');
    assert.match(mf, /mistReach\(baseR, dark, pushOut\)/);
    assert.match(mf, /if \(S\.st !== 'inside'\) mistFrame\(ctx, 0, false\)/);
    assert.match(mf, /mistFrame\(ctx, freeR, true\)/, 'the wall sits at the edge your own flying reaches');
    const auto = mf.slice(mf.indexOf('function autoExitFrame'), mf.indexOf('function startOut'));
    assert.match(auto, /inR = freeReach\(r\.maxD, curRegion\(\)\)/, 'the autopilot presses on that same wall');
    const draw = mf.slice(mf.indexOf('function mistDraw'), mf.indexOf('function holeAt'));
    assert.match(draw, /inHole\(th, holes\)/, 'no cloud over a black hole');
    assert.match(draw, /\(1 \+ 0\.22 \* p \* w\)/, 'the wall stretches outward where she presses');
    assert.match(draw, /\* \(1 - be \* wb\)/, 'and bursts open there');
    assert.match(draw, /MS\.hm\.material\.opacity = MS\.f \* 0\.75 \* hp \* hp/, 'Home shows through behind it');
    assert.match(mf.slice(mf.indexOf('function exitGo'), mf.indexOf('function autoExitFrame')), /wallBurst\(/, 'the burst fires with the way out');
    assert.match(mf, /'#b9d4ff', '#cdbbff', '#bff3ff'/, 'the wall wears Misty\'s blue, violet and cyan');
    assert.match(mf, /LowiMistyHints\.lost\(\)/, 'coming back she says she was lost');
    assert.match(mf, /LowiMistyHints\.hole\(\)/, 'caught, she says what to do');
});

test('black holes wiring: only your steering is caught, the camera follows her into the dark, World map always gets you out', () => {
    const hf = mf.slice(mf.indexOf('function holeFrame'), mf.indexOf('/* ---------- world-exit: out of a world'));
    assert.match(hf, /if \(roams\(mode, S\.idle\) \|\| S\.bhCool > 0\)/, 'the autopilot and her roaming steer clear');
    assert.match(hf, /if \(regionsBusy\(\) \|\| r\.fly/, 'travelling (World map, X) lets go of her at once');
    assert.match(hf, /const self = mode !== 'drive' \|\| \(\+S\.idle \|\| 0\) > 8/, 'left alone she slowly works her own way out: never stuck for good');
    assert.match(hf, /S\.bhCool = HOLE\.COOL/, 'a breather after escaping');
    const inside = mf.slice(mf.indexOf('function insideFrame'), mf.indexOf('function holeAt'));
    assert.match(inside, /const caught = holeFrame\(ctx, k, mode, vx, vy, mag, freeR, zs\)/);
    assert.match(inside, /const free = !caught && roams\(mode, S\.idle\)/, 'caught = not free: the steering camera keeps following her');
    assert.ok(/W\.LowiMistyHunt\.frame\(ctx, S\.p, !free, inR\)/.test(inside), 'crumbs untouched');
});

test('guide quiet during transit: hints and speech bubbles hush while she travels between worlds', () => {
    assert.match(mf, /function transitOn\(ok\)/);
    const t = mf.slice(mf.indexOf('function transitOn'), mf.indexOf('function transitSync'));
    ['out', 'warp', 'pull', 'orbit'].forEach(st => assert.ok(t.indexOf("st === '" + st + "'") >= 0, st + ' is transit'));
    assert.match(t, /S\.exP \|\| 0\) > 0/, 'pushing through the wall is transit');
    assert.match(mf, /transitSync\(ok\);/, 'checked every frame');
    assert.match(mf, /html\.mf-transit #whHint,html\.mf-transit \.lp-praise,html\.mf-transit \.rp-say\{opacity:0/);
    assert.match(mf, /H\.classList\.remove\('mf-transit'\)/, 'never left hushed after a flight ends');
    const hints = fs.readFileSync(path.join(ROOT, 'misty-hints.js'), 'utf8');
    assert.match(hints, /if \(H\.classList\.contains\('mf-transit'\)\) return;/);
    const MH = require(path.join(ROOT, 'misty-hints.js'));
    assert.ok(MH);
    assert.match(hints, /hole: \['A black hole![^']*', 'Ein Schwarzes Loch![^']*', '¡Un agujero negro![^']*'\]/, 'caught line in English, German and Spanish');
});
