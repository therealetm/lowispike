'use strict';
/* Oct 17, 2026 (E-man): "if I touch Misty ... turn Misty left, right ... instead of the world turning"; on the controller "hold in the
   middle ... it goes straight", "double tap for backwards, triple tapping for auto". misty-turn.js + hooks in misty-flight.js / misty-pad.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const T = require('../misty-turn.js');
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

test('a touch counts as "on Misty" only inside a finger-sized circle round her sprite', () => {
    const spot = { x: 200, y: 400, h: 90 };
    assert.equal(T.hitR(90), 45);
    assert.ok(T.hits(200, 400, spot) && T.hits(240, 410, spot), 'on her = hers');
    assert.ok(!T.hits(260, 400, spot), 'a bit beside her = the world');
    assert.equal(T.hitR(20), T.K.HIT_MIN, 'tiny Misty far away still gets a fingertip-sized target');
    assert.equal(T.hitR(900), T.K.HIT_MAX, 'a close-up Misty never swallows the whole screen');
    assert.ok(!T.hits(200, 400, null) && !T.hits(200, 400, { x: NaN, y: 1, h: 50 }), 'no spot (she is home) = never hers');
});

test('dragging on her turns her: right = her right, about 300 px all the way round, angles stay wrapped', () => {
    const yaw0 = 0, f0 = T.fwdOf(yaw0);
    assert.ok(near(f0[0], 0) && near(f0[2], -1), 'heading 0 = straight into the screen');
    const off = T.turnBy(0, 100); assert.ok(off < 0);
    const f = T.fwdOf(off), right = [1, 0, 0];
    assert.ok(f[0] * right[0] > 0.5, 'a drag to the right swings her nose to the right of the screen');
    assert.ok(near(Math.abs(T.turnBy(0, Math.PI / T.K.TURN)), Math.PI, 1e-9), 'half a turn = facing you, so a crumb behind her is one swipe away');
    let a = 0; for (let i = 0; i < 50; i++) a = T.turnBy(a, 40);
    assert.ok(a >= -Math.PI && a <= Math.PI);
});

test('holding forward flies her along her heading and the camera swings in behind her; back never moves the camera', () => {
    const s = { off: Math.PI * 0.9 };
    let o = T.steer(s, { dt: 0.016, mode: 'drive', vx: 0, vy: 0.4, th: 1, camYaw: 0.3 });
    assert.equal(o.th, 1); assert.ok(o.cam > 0, 'camera turns toward her heading'); assert.equal(o.vy, 0.4, 'up/down still climbs/dives');
    const worldYaw = 0.3 + Math.PI * 0.9;
    assert.ok(near(o.yaw, T.wrap(worldYaw), 1e-9), 'the chase never changes where she faces in the world');
    for (let i = 0; i < 400; i++) o = T.steer(s, { dt: 0.016, mode: 'drive', th: 1, camYaw: o.yaw - s.off });
    assert.ok(Math.abs(s.off) < 0.01, 'after a few seconds the camera is right behind her');
    const b = { off: 1 }, ob = T.steer(b, { dt: 0.016, mode: 'drive', th: -1, camYaw: 0 });
    assert.equal(ob.cam, 0); assert.equal(ob.th, -1); assert.equal(b.off, 1);
    const busy = { off: 1 }, obz = T.steer(busy, { dt: 0.016, mode: 'drive', th: 1, camYaw: 0, busy: true });
    assert.equal(obz.cam, 0, 'no camera tug during a warp or camera flight');
});

test('while holding, the controller sideways turns her (steering wheel) instead of sliding her', () => {
    const s = { off: 0 }, o = T.steer(s, { dt: 0.1, mode: 'drive', vx: 1, vy: 0, th: 1, camYaw: 0 });
    assert.equal(o.vx, 0, 'no sideways slide while flying forward');
    assert.ok(o.yaw < 0, 'controller right = she turns right');
    const plain = T.steer({ off: 0 }, { dt: 0.1, mode: 'drive', vx: 1, vy: 0, th: 0, camYaw: 0 });
    assert.equal(plain.vx, 1, 'without the hold the controller works exactly as before');
});

test('autopilot and fly-home never use the hold: only your steering', () => {
    for (const mode of ['auto', 'home', '']) assert.equal(T.steer({ off: 0 }, { dt: 0.016, mode, th: 1, camYaw: 0 }).th, 0, mode);
});

test('controller gestures: hold = forward, tap then hold = back, three quick taps chain to autopilot', () => {
    assert.equal(T.holdDir(0, 5000), 1);
    assert.equal(T.holdDir(4800, 5000), -1, 'a press right after a tap = back');
    assert.equal(T.holdDir(4000, 5000), 1, 'an old tap does not count');
    let n = T.tapChain(0, 0, 1000); n = T.tapChain(1000, n, 1200); n = T.tapChain(1200, n, 1450);
    assert.equal(n, 3);
    assert.equal(T.tapChain(1000, 2, 1500), 1, 'too slow: starts over');
    const pad = read('misty-pad.js');
    assert.ok(/if \(st\.taps >= 3\) \{[^}]*userMode\(st\.mode === 'auto' \? 'drive' : 'auto'\)/.test(pad), 'three taps toggle autopilot');
    assert.ok(!/if \(now - st\.lastUp < 340\) \{ st\.lastUp = 0; userMode/.test(pad), 'two taps no longer start autopilot');
    assert.ok(/else if \(n === 2\) backBurst\(\);/.test(pad), 'a plain double tap = reverse');
    assert.ok(/function backBurst\(\) \{[\s\S]*?startHold\(-1\)[\s\S]*?thrust\(0\)/.test(pad), 'the reverse is short and stops by itself');
    assert.equal(T.K.BACK_MS > 0 && T.K.BACK_MS <= 2000, true);
    assert.ok(/startHold\(dir\)/.test(pad) && /holdDir\(st\.lastUp, t0\)/.test(pad));
    assert.ok(/const held = !!st\.thr; if \(held\) thrust\(0\);/.test(pad), 'letting go (or a cancel) always stops her');
    assert.ok(/lostpointercapture/.test(pad) && /visibilitychange/.test(pad));
    assert.ok(/if \(!st\.moved\) \{ st\.moved = true; clearTimeout\(st\.holdT\)/.test(pad), 'a drag is a drag, never a hold');
});

test('a gesture that starts on Misty never reaches the world; anywhere else the world still turns', () => {
    const js = read('misty-turn.js');
    assert.ok(/W\.addEventListener\('pointerdown', e => \{[\s\S]*?closest\('#bw3Stage'\)[\s\S]*?hits\(e\.clientX, e\.clientY, sp\)[\s\S]*?e\.stopPropagation\(\)[\s\S]*?setPointerCapture[\s\S]*?\}, true\);/.test(js), 'capture phase, hit test first, then it is hers');
    assert.ok(/\['pointerup', 'pointercancel'\]\.forEach/.test(js) && /lostpointercapture/.test(js), 'release and cancel end it');
    assert.ok(/W\.addEventListener\('touchmove', e => \{ if \(S\.own\) \{ e\.stopPropagation\(\); if \(e\.cancelable\) e\.preventDefault\(\);/.test(js), 'no page scroll or pager swipe');
    assert.ok(/if \(S\.own \|\| \(e\.button != null && e\.button !== 0\)\) return;/.test(js), 'a second finger on the world is still the world');
    const bw = read('body-world-3d.js');
    assert.ok(bw.includes('world.drag(dx, dy);') && bw.includes("el.addEventListener('pointerdown', e => {"), 'the world drag itself is untouched');
    assert.ok(!/LowiMistyTurn/.test(bw), 'the world gesture code knows nothing about it');
});

test('flight hooks: heading-based forward only in your own steering, hunt rules unchanged', () => {
    const f = read('misty-flight.js');
    assert.ok(/if \(mode === 'drive'\) \{ V\.want\.addScaledVector\(V\.rt, vx\)\.addScaledVector\(V\.up, vy\); thrustWant\(\); \}/.test(f), 'out in the world');
    assert.ok(/V\.want\.addScaledVector\(V\.rt, vx\)\.addScaledVector\(V\.up, vy\); thrustWant\(\);/.test(f), 'inside a world (the steered branch)');
    assert.equal((f.match(/thrustWant\(\)/g) || []).length, 3, 'one helper + two drive branches, never in the roam / tour code');
    assert.ok(/steering = mode === 'drive' && \(mag > 0\.05 \|\| !!S\.th \|\| !!\(tq && tq\.hands\)\)/.test(f), 'holding / turning counts as you steering (ends adventures, keeps her from roaming off)');
    assert.ok(/W\.LowiMistyHunt\.frame\(ctx, S\.p, !free, inR\)/.test(f), 'crumbs still only for your steering');
    assert.ok(/touchSpot: \(\) =>/.test(f) && /S\.st === 'inside' \|\| S\.st === 'free'/.test(f), 'she is touchable only while out flying or inside a world');
    assert.ok(/W\.LowiMistyFlight\.recall|recall: \(\) =>/.test(f));
});

test('ships: loaded after the flight, precached, no new buttons, only paint on the controller', () => {
    const html = read('index.html'), sw = read('sw.js');
    assert.match(html, /<script src="misty-turn\.js\?v=[\d-]+"><\/script>/);
    assert.ok(html.indexOf('misty-turn.js?v=') > html.indexOf('misty-flight.js?v='));
    assert.ok(sw.includes('"misty-turn.js"'));
    const js = read('misty-turn.js').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/createElement\(|innerHTML|appendChild/.test(js), 'no DOM controls: the facing dots live in the 3D world');
    const css = read('misty-pad.css');
    assert.ok(/\.wh-pad\.mp-fwd \.mp-knob/.test(css) && /\.wh-pad\.mp-back \.mp-knob/.test(css));
    assert.ok(!/\.wh-pad\.mp-(fwd|back)[^{]*\{[^}]*(width|height|left|top|bottom|margin)\s*:/.test(css), 'hold styles change no layout');
    assert.ok(!/'[^'\n]*(steer her|flies on her own)/.test(read('misty-pad.js')), 'companion copy stays gender-neutral');
});

test('total freedom: your own flying reaches to just inside the visible walls, crumbs and the autopilot tour stay in the core', () => {
    const F = require('../misty-flight.js');
    for (const maxD of [8, 14, 20]) {
        assert.ok(F.freeReach(maxD, 'heart') >= 20 && F.freeReach(maxD, 'heart') < 22 && F.freeReach(maxD, 'heart') >= F.inReach(maxD));
        assert.ok(F.freeReach(maxD, 'gut') < 15.5 || F.freeReach(maxD, 'gut') === F.inReach(maxD), 'never through the gut tube wall');
    }
    const f = read('misty-flight.js');
    assert.ok(/freeR = freeReach\(r\.maxD, curRegion\(\)\)/.test(f));
    assert.ok(/baseR = free \? inR : freeR/.test(f), 'the soft edge uses the big reach while you steer');
    assert.ok(/mistReach\(baseR, dark, pushOut\)/.test(f) && /exitCheck\(ctx, k, mode, vx, vy, magX, baseR\)/.test(f), 'cloud walls (item 3): the dark of a black hole is the forbidden edge; the 3 s exit sees the free edge and a held forward');
    assert.ok(/W\.LowiMistyHunt\.frame\(ctx, S\.p, !free, inR\)/.test(f), 'crumbs keep their old spread');
});
