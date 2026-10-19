// Bug hunt BH-003 (Oct 19, 2026): Misty's praise line ("I'm so proud of you!") sat right above her head after every logged
// action. On the 8-bubble ring that spot is on Settings, Water and Fuel, so it hid them for its whole reading time (live build
// 20261019-101824: 42-44% of Settings, 10-15% of Water and Fuel at 390x844). It must never cover a ring bubble or the joystick:
// when neither above nor below Misty is clear, it docks at the top or bottom of the screen with no tail.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const P = require('../praise.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const ov = (p, b, o) => Math.max(0, Math.min(p.l + b.w, o.right) - Math.max(p.l, o.left)) * Math.max(0, Math.min(p.t + b.h, o.bottom) - Math.max(p.t, o.top));

/* the ring at 390x844 as measured on the live build: Misty's bubble 120..270 x 330..480, 8 bubbles every 45 degrees */
const view = { w: 390, h: 844, top: 8 };
const misty = { x: 195, top: 330, bottom: 480 };
const R = 47, cx = 195, cy = 405, rad = 140;
const ring = [0, 45, 90, 135, 180, 225, 270, 315].map(d => { const a = (d - 90) * Math.PI / 180, x = cx + rad * Math.cos(a), y = cy + rad * Math.sin(a); return { left: x - R - 4, top: y - R - 4, right: x + R + 4, bottom: y + R + 4 }; });
const b = { w: 160, h: 38 };

test('on the ring the praise line covers no bubble and no joystick', () => {
    const p = P.place(misty, b, null, view, 14, ring);
    for (const o of ring) assert.equal(ov(p, b, o), 0, 'covers a ring bubble at ' + JSON.stringify(p));
    assert.ok(p.dock, 'no clear spot beside Misty on the ring, so it docks');
    assert.ok(p.t >= view.top && p.t + b.h <= view.h, 'stays on screen');
    assert.ok(p.l >= 10 && p.l + b.w <= view.w - 10);
});

test('docking never lands on the Daily Quest when the other end is free', () => {
    const quest = { left: 30, top: 50, right: 360, bottom: 140 };
    const p = P.place(misty, b, quest, view, 14, ring);
    assert.ok(p.dock);
    assert.equal(ov(p, b, quest), 0, 'docked on the Daily Quest');
    for (const o of ring) assert.equal(ov(p, b, o), 0);
});

test('with room beside Misty it is still a speech bubble coming out of her (no dock, tail on her)', () => {
    /* flying in a world, joystick far below: above her is clear */
    const pad = { left: 150, top: 720, right: 240, bottom: 810 };
    const p = P.place({ x: 200, top: 360, bottom: 440 }, b, null, view, 14, [pad]);
    assert.ok(!p.dock && p.up && p.t + b.h <= 360);
    assert.ok(Math.abs(p.l + p.tail - 200) < 1, 'tail points at Misty');
    /* joystick right above her: goes below instead */
    const q = P.place({ x: 195, top: 560, bottom: 640 }, b, null, view, 14, [{ left: 140, top: 480, right: 250, bottom: 560 }]);
    assert.ok(!q.dock && !q.up && q.t >= 640, 'below Misty, clear of the joystick');
    /* no controls passed: exactly the old placement */
    const old = P.place(misty, b, null, view, 14);
    assert.ok(old.up && !old.dock);
});

test('wiring: the toast reads the ring bubbles and the joystick (even faded) and drops its tail when docked', () => {
    const js = read('praise.js'), css = read('sun-meter.css');
    assert.ok(/querySelectorAll\('\[data-orbit\], #whPad'\)/.test(js), 'ring bubbles + joystick are the obstacles');
    assert.ok(/e\.id !== 'whPad' && e\.checkVisibility/.test(js), 'a faded joystick still counts');
    assert.ok(/place\(a, \{ w, h \}, quest, \{ w: vw, h: vh, top: 8 \+ safeTop\(\) \}, gap, obs\)/.test(js), 'show() passes the controls');
    assert.ok(/p\.dock \? 'lp-dock'/.test(js) && /'lp-dock'\)/.test(js), 'dock class set and cleared');
    assert.ok(/\.lp-praise\.lp-said\.lp-dock::after \{ display: none; \}/.test(css), 'no tail when docked');
});
