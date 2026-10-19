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
    /* Oct 18 (E-man: "all of a sudden she just spawns out with the camera being zoomed out"): out through the edge now ends on
       the outside view of the world she left (the pull-back from its core through its rings), not on the whole universe */
    const eg = mf.slice(mf.indexOf('function exitGo'), mf.indexOf('function autoExitFrame'));
    assert.ok(/Rg\.travel\('hub', false, 0\)/.test(eg) && !/wide: true/.test(eg), 'out with the reversed fly-in, ending at that world');
    const auto = mf.slice(mf.indexOf('function autoExitFrame'), mf.indexOf('function startOut'));
    assert.ok(/ph === 'seek'/.test(auto) && /'press'/.test(auto) && /X\.t \/ EXIT\.HOLD/.test(auto), 'autopilot seeks the corner, presses for the same 3 s, then goes');
    assert.ok(!/Rg\.travel\('hub'\)\); \} catch/.test(mf.slice(mf.indexOf('function roamFrame'), mf.indexOf('function exitReset'))), 'autopilot no longer warps out from wherever she is');
    /* no new controls */
    assert.ok(!/createElement\(['"]button/.test(mf), 'no button of its own');
    /* the hunt stays yours: a fly-out never eats crumbs or counts a power-up */
    assert.ok(/S\.huntFly = false/.test(mf.slice(mf.indexOf('function startOut'), mf.indexOf('function outDraw'))));
});

/* cloud walls & dark zones (Oct 17, E-man; the black holes of 131627 are deleted): the Misty-style cloudy wall round a world is
   the way out (push into it for 3 s: its glass bubble skin bulges like Home's when she leaves for the spirit world, the wall
   stretches, Home shows through, it bursts). Where the wall has its gaps the world opens onto the dark: always free to fly in,
   nothing pulls or catches, the deeper the darker (near black, Misty too), a short glow every 3 s; never a way out. */
test('cloud walls: pushing outward into the cloudy wall starts the 3-second exit', () => {
    const wall = Object.assign({}, push, { dark: false });
    let r = hold(null, 2.9, wall);
    assert.strictEqual(r.fires, 0);
    r = hold(r.s, 0.2, wall);
    assert.strictEqual(r.fires, 1, 'out after 3 s pushing into the cloud wall');
    assert.strictEqual(MF.exitHold(null, Object.assign({ dt: 1 / 60 }, wall)).dark, false);
});

test('dark zones: pushing outward into the dark never starts the exit, however long you push', () => {
    const dark = Object.assign({}, push, { dark: true });
    const r = hold(null, 10, dark);
    assert.strictEqual(r.fires, 0, 'the dark is not a way out');
    assert.strictEqual(r.p, 0, 'no progress builds up there');
    assert.strictEqual(MF.exitHold(null, Object.assign({ dt: 1 / 60 }, dark)).dark, true);
    assert.strictEqual(MF.exitHold(null, Object.assign({ dt: 1 / 60 }, dark, { edge: 0.5 })).dark, false, 'only at the edge');
});

test('cloud walls: sliding from the wall into the dark resets the count (a moment shorter than the grace keeps it)', () => {
    const wall = Object.assign({}, push, { dark: false }), dark = Object.assign({}, push, { dark: true });
    let r = hold(null, 2, wall);
    r = hold(r.s, 0.1, dark);
    assert.ok(r.p > 0.6, 'a brush past the dark keeps the count: ' + r.p);
    r = hold(r.s, 0.5, dark);
    assert.strictEqual(r.p, 0, 'staying in the dark resets it');
    r = hold(r.s, 2.9, wall);
    assert.strictEqual(r.fires, 0, 'counts again from zero at the wall');
    r = hold(r.s, 0.2, wall);
    assert.strictEqual(r.fires, 1);
});

test('black holes are gone: no pull, no catch, no escape, no warning line, no swirl', () => {
    ['HOLE', 'holeSpots', 'inHole', 'holePull', 'holeCaught', 'holeEscape', 'mistReach', 'lostAmt'].forEach(n => assert.strictEqual(MF[n], undefined, n + ' removed'));
    ['holeFrame', 'holeAt', 'S.bh', 'bhEsc', 'bhPull', 'bhCool', 'LowiMistyHints.hole', "'#8f6bff'", 'black hole ', 'inHole'].forEach(n => assert.ok(mf.indexOf(n) < 0, n + ' gone from misty-flight.js'));
    const hints = fs.readFileSync(path.join(ROOT, 'misty-hints.js'), 'utf8');
    assert.ok(!/black hole|Schwarzes Loch|agujero negro|hole:/i.test(hints), 'no black-hole line in any language');
    assert.ok(!/hole:\s*\(\)/.test(hints));
});

test('dark zones: every world has the same two dark openings each time; most of the edge is cloud wall; never straight down', () => {
    const ids = ['brain', 'lung', 'heart', 'liver', 'pancreas', 'gut', 'muscle'];
    ids.forEach(id => {
        const g = MF.darkSpots(id);
        assert.deepStrictEqual(g, MF.darkSpots(id), id + ': same places every time');
        assert.deepStrictEqual(g.map(x => x.a), MF.exitGaps(id).map(x => x.a), id + ': where the wall has its gaps');
        assert.strictEqual(g.length, MF.MIST.GAPS);
        assert.ok(Math.abs(MF.angWrap(g[0].a - g[1].a)) > 1.5, id + ': apart');
        g.forEach(x => {
            assert.strictEqual(MF.inDark(x.a, g), true, id + ': the middle of an opening');
            assert.strictEqual(MF.inDark(x.a + x.w / 2 + 0.05, g), false, id + ': just past it is cloud wall');
            assert.strictEqual(MF.inMist(x.a, g), !MF.inDark(x.a, g));
            assert.ok(Math.abs(MF.angWrap(x.a + Math.PI / 2)) >= 0.44, id + ': not straight down where the controller is');
        });
        let wall = 0; const N = 720;
        for (let j = 0; j < N; j++) if (!MF.inDark(j / N * 2 * Math.PI, g)) wall++;
        assert.ok(wall / N > 0.6 && wall / N < 0.8, id + ': wall share ' + (wall / N).toFixed(2));
    });
    assert.notDeepStrictEqual(MF.darkSpots('brain'), MF.darkSpots('heart'), 'worlds differ');
});

test('dark zones: free to fly deep in, the deeper the darker (near black), and the light comes back the same way', () => {
    const D = MF.DARK;
    assert.strictEqual(MF.darkReach(10, true), 10 * D.DEEP, 'far on into the dark, whether or not you keep pushing');
    assert.ok(D.DEEP >= 3, 'deep enough to feel endless');
    assert.strictEqual(MF.darkReach(10, false), 10, 'at the cloud wall: the usual edge (that is where the exit counts)');
    assert.strictEqual(MF.darkAmt(0.5), 0, 'in the world: no dark');
    assert.strictEqual(MF.darkAmt(D.START), 0);
    assert.ok(MF.darkAmt(1.1) > 0.4, 'already dim by the world\'s own shell: ' + MF.darkAmt(1.1));
    assert.strictEqual(MF.darkAmt(D.FULL), D.MAX);
    assert.strictEqual(MF.darkAmt(D.DEEP), D.MAX, 'as dark as it gets, all the way out');
    assert.ok(D.MAX >= 0.9 && D.MAX < 1, 'near black, never a blank screen');
    let prev = -1;
    for (let e = 0.5; e <= D.DEEP; e += 0.05) { const v = MF.darkAmt(e); assert.ok(v >= prev - 1e-12, 'never lighter going deeper at ' + e.toFixed(2)); prev = v; }
    assert.strictEqual(MF.darkAmt(1.0), MF.darkAmt(1.0), 'a pure function of depth: flying back undoes it exactly');
});

test('dark zones: out there she glows for a split second every three seconds, so you know nothing froze', () => {
    const D = MF.DARK;
    assert.strictEqual(D.PULSE, 3);
    assert.ok(D.FLASH > 0.15 && D.FLASH < 0.5, 'a split second');
    assert.strictEqual(MF.darkGlow(0), 0); assert.strictEqual(MF.darkGlow(1.5), 0); assert.strictEqual(MF.darkGlow(2.9), 0);
    let flashes = 0, on = false, lit = 0; const dt = 1 / 60;
    for (let t = 0; t < 12.3; t += dt) { const g = MF.darkGlow(t); assert.ok(g >= 0 && g <= 1); if (g > 0.05) lit += dt; if (g > 0.05 && !on) flashes++; on = g > 0.05; }
    assert.strictEqual(flashes, 4, 'at 3, 6, 9 and 12 s');
    assert.ok(lit < 4 * D.FLASH, 'dark nearly all the time: lit ' + lit.toFixed(2) + ' s of 12');
    assert.ok(MF.darkGlow(3 + D.FLASH / 2) > 0.95, 'a real flash');
});

test('cloud walls: the autopilot heads for the nearest stretch of wall, well clear of the dark openings', () => {
    const g = [{ a: 1, w: 0.95 }, { a: -2, w: 0.95 }], D = MF.DARK;
    assert.strictEqual(MF.wallToward(0, g), 0, 'already at the wall: straight out');
    [1, 1.2, 0.7, -2, -1.6, 3, -2.4].forEach(a0 => {
        const x = MF.wallToward(a0, g);
        g.forEach(h => assert.ok(Math.abs(MF.angWrap(x - h.a)) >= h.w / 2 + D.CLEAR - 1e-9, a0 + ' -> ' + x + ' clear of ' + h.a));
        assert.ok(Math.abs(MF.angWrap(x - a0)) <= g[0].w / 2 + D.CLEAR + 1e-9, a0 + ': the nearest side');
    });
    assert.strictEqual(MF.angWrap(3 * Math.PI).toFixed(6), Math.PI.toFixed(6));
});

test('cloud walls: its bubble skin bulges out further the longer you push, and she rides its tip', () => {
    assert.strictEqual(MF.exitTent(0, 20), 0);
    assert.ok(MF.exitTent(0.5, 20) > 0 && MF.exitTent(0.5, 20) < MF.exitTent(1, 20));
    assert.ok(Math.abs(MF.exitTent(1, 20) - 20 * MF.DARK.TENT) < 1e-9);
    assert.strictEqual(MF.exitTent(2, 20), MF.exitTent(1, 20), 'capped');
    const fx = mf.slice(mf.indexOf('function exitFx'), mf.indexOf('function exitGo'));
    assert.match(fx, /skinPush\(V\.a, L, p\)/, 'every push (yours or the autopilot\'s) shows the skin');
    assert.match(mf.slice(mf.indexOf('function exitGo'), mf.indexOf('function autoExitFrame')), /skinPop\(\)/, 'it rings out as you slip through');
    assert.match(mf, /reach = dark \? darkReach\(baseR, true\) : baseR \+ exitTent\(S\.exP \|\| 0, baseR\) \* 0\.92/, 'she rides the bulge while you push');
    const sk = mf.slice(mf.indexOf('function skinBuild'), mf.indexOf('function skinPush'));
    assert.match(sk, /SphereGeometry/); assert.match(sk, /pow\(c,60\.0\)/, 'tented out where she presses, like misty-galaxy\'s edge');
    assert.match(sk, /userData\.lwKeep = true/);
});

test('cloud walls wiring: exit knows the dark zones, autopilot seeks the wall, wall stretches and bursts, Home shows through', () => {
    assert.match(mf, /exitHold\(S\.exH, \{[^}]*dark: !!S\.inDark/);
    assert.match(mf, /wallToward\(Math\.atan2\(V\.a\.dot\(V\.up\), V\.a\.dot\(V\.rt\)\), darkSpots\(S\.flew\)\)/);
    assert.ok(!/gapToward\(Math\.atan2/.test(mf), 'the autopilot never heads for the dark');
    assert.match(mf, /if \(S\.st !== 'inside'\) \{ mistFrame\(ctx, 0, false\); darkFrame\(ctx, 0\); \}/);
    assert.match(mf, /mistFrame\(ctx, freeR, true\)/, 'the wall sits at the edge your own flying reaches');
    const auto = mf.slice(mf.indexOf('function autoExitFrame'), mf.indexOf('function startOut'));
    assert.match(auto, /inR = freeReach\(r\.maxD, curRegion\(\)\)/, 'the autopilot presses on that same wall');
    const draw = mf.slice(mf.indexOf('function mistDraw'), mf.indexOf('function skinBuild'));
    assert.match(draw, /inDark\(th, zones\)/, 'no cloud over a dark opening');
    assert.match(draw, /MS\.dz/, 'a soft patch of darkness there instead');
    assert.match(draw, /\(1 \+ 0\.22 \* p \* w\)/, 'the wall stretches outward where she presses');
    assert.match(draw, /\* \(1 - be \* wb\)/, 'and bursts open there');
    assert.match(draw, /MS\.hm\.material\.opacity = MS\.f \* 0\.75 \* hp \* hp/, 'Home shows through behind it');
    assert.match(draw, /skinDraw\(a, inR, dt\)/);
    assert.match(mf.slice(mf.indexOf('function exitGo'), mf.indexOf('function autoExitFrame')), /wallBurst\(/, 'the burst fires with the way out');
    assert.match(mf, /'#b9d4ff', '#cdbbff', '#bff3ff'/, 'the wall wears Misty\'s blue, violet and cyan');
    assert.match(mf, /MS\.g\.userData\.lwKeep = true/, 'a later world never parks the wall out of sight');
    assert.match(mf, /LowiMistyHints\.lost\(\)/, 'coming back out of the dark she says she was lost');
});

test('dark zones wiring: steering stays yours, nothing catches her, the veil covers the world and lifts on the way back', () => {
    const inside = mf.slice(mf.indexOf('function insideFrame'), mf.indexOf('function mistTex'));
    assert.match(inside, /const free = roams\(mode, S\.idle\);/, 'nothing else takes her over');
    assert.match(inside, /if \(zone && L >= baseR \* 0\.98\) S\.deep = true; else if \(L < baseR \* 0\.97\) S\.deep = false;/, 'once out in the dark she may turn any way until she is back inside');
    assert.match(inside, /darkFrame\(ctx, freeR\);/);
    assert.ok(/W\.LowiMistyHunt\.frame\(ctx, S\.p, !free, inR\)/.test(inside), 'crumbs untouched');
    assert.ok(!/S\.p\.addScaledVector\(V\.rt, Math\.sin\(S\.t \* 0\.8\)/.test(inside), 'no wandering off your line in the dark');
    const df = mf.slice(mf.indexOf('function darkFrame'), mf.indexOf('/* ---------- world-exit: out of a world'));
    assert.match(df, /!regionsBusy\(\) && !\(r && r\.fly\)/, 'World map / travelling: the light comes back at once');
    assert.match(df, /want = darkAmt\(L \/ reach\)/);
    assert.match(df, /DARK\.IN : DARK\.OUT/, 'eases in and out, never a cut');
    assert.match(df, /S\.dkG = darkGlow\(S\.dkT\)/);
    const vb = mf.slice(mf.indexOf('function veilBuild'), mf.indexOf('function veilOff'));
    assert.match(vb, /DV\.g\.renderOrder = 99/, 'drawn after the whole world, Misty included');
    assert.match(vb, /depthTest: false/);
    assert.match(vb, /gl_Position=vec4\(position\.xy\*2\.0,0\.0,1\.0\)/, 'covers the whole view whatever the camera does');
    assert.match(vb, /userData\.lwKeep = true/);
    const vd = mf.slice(mf.indexOf('function veilDraw'), mf.indexOf('function darkFrame'));
    assert.match(vd, /DV\.u\.uG\.value = glow/, 'her glow opens the dark round her');
    assert.match(vd, /html\.mf-dark #rpPal/, 'the guide dims with the dark');
    assert.ok(!/#whPad|wh-pad/.test(vd), 'the controller is never dimmed');
    assert.match(mf, /S\.deep = false; S\.dk = 0; S\.dkT = 0; veilOff\(\);/, 'a flight that ends never leaves the dark behind');
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
    assert.match(hints, /lost: \['Oh, where am I\?[^']*', 'Oh, wo bin ich\?[^']*', 'Oh, ¿dónde estoy\?[^']*'\]/, 'back out of the dark, in English, German and Spanish');
});
