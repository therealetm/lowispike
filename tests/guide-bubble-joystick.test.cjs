/* Guide speech bubble vs the joystick inside worlds (bug hunt, Oct 19, 2026).
   Seen in the world-exit task and reproduced by the bug hunt in Chromium 390x844: flying into the liver, the sidekick swims right
   under the joystick with Misty just below it, and the cheapest spot beside it covered the joystick (#whPad) for 2 to 3.5 s.
   The scene below is the one measured on build 20261019-080527: guide at (171, 618), bubble 260x97, joystick 144..247 x 476..579,
   Misty's keep-clear box 197..289 x 678..770. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../region-pals-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const VIEW = { w: 390, h: 844, top: 6, bottom: 6 };
const B = { w: 260, h: 97 };
const PAL = { x: 171, y: 618 };
const PAD = { l: 144, t: 476, r: 247, b: 579, w: 2, k: 'whPad' };
const MISTY = { l: 197, t: 678, r: 289, b: 770, w: 4 };
const ZOOM = { l: 310, t: 760, r: 380, b: 830, w: 2, k: '' };
const ORB = { l: 151, t: 598, r: 191, b: 638, w: 2 };
const rect = q => ({ l: q.l, t: q.t, r: q.l + B.w, b: q.t + B.h });

test('the measured scene: no spot beside the guide is clear, and the cheapest one covers the joystick', () => {
    const r = C.place(PAL, B, [ZOOM, PAD, MISTY, ORB], VIEW, null, C.gapFor(C.ORB_R.full));
    assert.ok(C.overlap(rect(r), PAD) > 4000, 'beside the guide it lands on the joystick (' + r.spot + ')');
});

test('a line that would cover the joystick docks clear of it, and clear of Misty', () => {
    const r = C.place(PAL, B, [ZOOM, PAD, MISTY, ORB], VIEW, null, C.gapFor(C.ORB_R.full));
    const d = C.dockSpot(r, B, [ZOOM, PAD, MISTY], VIEW, PAL, [PAD]);
    assert.ok(d, 'it docks');
    assert.strictEqual(d.tail, 0, 'no tail when docked');
    assert.strictEqual(C.overlap(rect(d), PAD), 0, 'not on the joystick');
    assert.strictEqual(C.overlap(rect(d), MISTY), 0, 'not on Misty');
    assert.ok(d.l >= 10 && d.l + B.w <= VIEW.w - 10 && d.t >= 6 && d.t + B.h <= VIEW.h - 6, 'on screen');
});

test('a line clear of the joystick stays beside the guide, with its tail', () => {
    const r = { l: 120, t: 640, spot: 'br' };
    assert.strictEqual(C.dockSpot(r, B, [ZOOM, PAD], VIEW, PAL, [PAD]), null);
});

test('once docked it stays docked while the spot beside the guide is within 16 px of the joystick (no flapping)', () => {
    const near = { l: 120, t: PAD.b + 10, spot: 'br' }; /* 10 px below the joystick */
    assert.strictEqual(C.dockSpot(near, B, [ZOOM, PAD], VIEW, PAL, [PAD]), null, 'not docked yet: it may stay beside');
    const m = 16, padM = { l: PAD.l - m, t: PAD.t - m, r: PAD.r + m, b: PAD.b + m };
    const d = C.dockSpot(near, B, [ZOOM, PAD], VIEW, PAL, [padM]);
    assert.ok(d && d.tail === 0, 'already docked: it stays docked');
    const far = { l: 120, t: PAD.b + 30, spot: 'br' };
    assert.strictEqual(C.dockSpot(far, B, [ZOOM, PAD], VIEW, PAL, [padM]), null, 'clear by more than the margin: back beside the guide');
});

test('the "Remember?" question keeps its rule: any hard overlap docks it', () => {
    const r = { l: 120, t: 700, spot: 'br' }; /* on Misty only */
    const d = C.dockSpot(r, B, [ZOOM, PAD, MISTY], VIEW, PAL, null);
    assert.ok(d && C.overlap(rect(d), MISTY) === 0 && C.overlap(rect(d), PAD) === 0);
    assert.strictEqual(C.dockSpot(r, B, [ZOOM, PAD, MISTY], VIEW, PAL, [PAD]), null, 'an ordinary line on Misty only is not docked by the joystick rule');
});

test('it never docks somewhere worse than where it was', () => {
    const tall = { w: 370, h: 800 }; /* nothing fits anywhere */
    const r = { l: 10, t: 20, spot: 'ar' };
    const d = C.dockSpot(r, tall, [PAD], VIEW, PAL, [PAD]);
    if (d) { const R = q => ({ l: q.l, t: q.t, r: q.l + tall.w, b: q.t + tall.h }); assert.ok(C.overlap(R(d), PAD) < C.overlap(R(r), PAD)); }
});

test('wiring: every line uses the dock rule for the joystick, and the joystick is kept clear even while faded', () => {
    const s = read('region-pals.js');
    assert.ok(/C\.dockSpot\(r, st\.size, hard,/.test(s), 'placeSay docks through the core rule');
    assert.ok(/if \(st\.asking \|\| must\.length\)/.test(s), 'ordinary lines dock too when they would cover the joystick');
    assert.ok(/C\.PAD_IDS\.indexOf\(o\.k\) >= 0/.test(s), 'the joystick rects are the ones that may never be covered');
    assert.ok(/if \(C\.PAD_IDS\.indexOf\(e\.id\) < 0\) if \(!visible\(e\) && /.test(s), 'a faded joystick is still kept clear');
    assert.ok(/#whPad/.test(s.slice(s.indexOf('const AVOID'), s.indexOf('const AVOID') + 400)), 'the joystick is in the keep-clear list');
    assert.deepStrictEqual(C.PAD_IDS, ['whPad']);
});
