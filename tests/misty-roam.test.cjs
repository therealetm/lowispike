'use strict';
/* Oct 16, 2026 (E-man): "Misty enters the worlds herself, free roaming everywhere." She follows you into any place you open
   (a tap, the World map) and roams the whole view by herself; on autopilot she goes into each place on her own, roams, and
   heads on to the next. misty-flight.js (misty-roam). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const F = require('../misty-flight.js');

test('she comes into a place by herself only once it has settled, and never with reduced motion', () => {
    const base = { inRegion: true, busy: false, hero: false, reduced: false, settled: F.K.JOIN };
    assert.equal(F.joinOk(base), true);
    assert.equal(F.joinOk({ ...base, inRegion: false }), false, 'at Home she stays in her bubble');
    assert.equal(F.joinOk({ ...base, busy: true }), false, 'not during the warp');
    assert.equal(F.joinOk({ ...base, hero: true }), false, 'not during the place\'s own hero turn');
    assert.equal(F.joinOk({ ...base, settled: F.K.JOIN / 2 }), false, 'a short beat after it lands');
    assert.equal(F.joinOk({ ...base, reduced: true }), false, 'reduced motion: no roaming by herself');
    assert.equal(F.joinOk(null), false);
    assert.ok(F.K.JOIN > 0.3 && F.K.JOIN < 2);
});

test('inside a place she roams on her own unless you steer her; she takes over again a few seconds after you let go', () => {
    assert.equal(F.roams('', 0), true, 'nobody on the stick');
    assert.equal(F.roams('auto', 0), true, 'autopilot');
    assert.equal(F.roams('drive', 0), false, 'you are steering');
    assert.equal(F.roams('drive', F.K.HANDBACK - 0.5), false);
    assert.equal(F.roams('drive', F.K.HANDBACK + 0.5), true, 'let go a while ago');
});

test('autopilot moves on to the next place only after a good stay, and never while you touch the world', () => {
    assert.equal(F.autoLeave('auto', F.K.STAY_IN + 1, F.K.CAM_IDLE + 1), true);
    assert.equal(F.autoLeave('auto', F.K.STAY_IN - 1, 99), false, 'stays a while');
    assert.equal(F.autoLeave('auto', 99, 1), false, 'you just panned or pinched');
    assert.equal(F.autoLeave('', 99, 99), false, 'only on autopilot: a place you opened yourself is never left for you');
    assert.equal(F.autoLeave('drive', 99, 99), false);
    assert.ok(F.K.STAY_IN >= 20);
});

test('her spots stay in the safe part of the view and are far enough apart that she really travels', () => {
    const Z = F.K.SAFE; let prev = { x: 0.5, y: 0.5 };
    assert.ok(Z.y0 >= 0.3, 'clear of the top bar, Daily Quest and arrival card'); assert.ok(Z.y1 <= 0.78, 'clear of the dock and controller');
    for (let i = 0; i < 400; i++) {
        const u = (i * 0.618034) % 1, v = (i * 0.414214 + 0.3) % 1, s = F.roamSpot(u, v, prev);
        assert.ok(s.x >= Z.x0 - 1e-9 && s.x <= Z.x1 + 1e-9 && s.y >= Z.y0 - 1e-9 && s.y <= Z.y1 + 1e-9, 'inside the safe zone');
        const d = Math.hypot((s.x - prev.x) / (Z.x1 - Z.x0), (s.y - prev.y) / (Z.y1 - Z.y0));
        assert.ok(d >= 0.2, 'not a tiny hop: ' + d.toFixed(3));
        prev = s;
    }
    assert.deepEqual(Object.keys(F.roamSpot(0.5, 0.5)).sort(), ['x', 'y']);
});

test('her roaming pace is calm, slower when tired, and scales with the screen', () => {
    assert.ok(F.roamPx(1, 390) <= 160 && F.roamPx(0, 390) >= 45, 'gentle: a slow glide, not a dart');
    assert.ok(F.roamPx(0.2, 390) < F.roamPx(0.9, 390));
    assert.ok(F.roamPx(1, 820) > F.roamPx(1, 390) && F.roamPx(1, 820) <= F.roamPx(1, 390) * 1.6, 'a bit quicker on iPad');
});

test('wired: joins after a tap, roams without moving the camera, autopilot goes in and on, steering wins', () => {
    const js = read('misty-flight.js');
    assert.match(js, /S\.st === 'idle' && ctx\.inRegion/, 'Home\'s per-frame ask lets her join you in a place');
    assert.match(js, /function join\(ctx\)[\s\S]*?enterInside\(ctx\)/, 'she enters like a flown-in Misty');
    assert.match(js, /if \(!free && !r\.fly && !heroBusy/, 'the camera follows her only when you steer: roaming never moves your view');
    assert.match(js, /S\.tourGo && mode === 'auto' && !regionsBusy\(\)\) \{[\s\S]{0,400}startWarp/, 'autopilot dives into the place after its stop');
    assert.match(js, /Rg\.travel\('hub'\)/, 'and heads back out the same way as the World map');
    assert.match(js, /const keep = \(?S\.keepAuto && why === 'left'/, 'autopilot keeps flying after heading out');
    assert.match(js, /if \(ctx && ctx\.PD && ctx\.PD\.mode && !keep\) padMode\(ctx, ''\)/);
    assert.doesNotMatch(js, /addEventListener\(['"](click|pointerdown|touchstart)/, 'she lives in the 3D canvas: no new tap handlers, nothing blocks your taps');
});
