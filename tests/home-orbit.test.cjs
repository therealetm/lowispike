/* Oct 17 (handoff 6, E-man): zoomed-out Home is the default, Misty in the middle, Meals / Move / Water / Fasting circling her
   like Dragon Balls (sym-home.js orbit), and the camera physically pulls back to that view (one 3D camera, no page switch). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../sym-home.js');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const js = read('sym-home.js'), css = read('sym-home.css'), scene = read('body-world-3d-scene.js'), wh = read('world-home.js'), mf = read('misty-flight.js');

const near = (a, b, eps) => Math.abs(a - b) < (eps || 0.01);

test('ring: phase 0 is the symmetric layout (Meals upper-left, Move upper-right, Water lower-right, Fasting lower-left)', () => {
    const s = C.spots(195, 388, 124, 0);
    assert.ok(s.meals.x < 195 && s.meals.y < 388, 'Meals upper-left');
    assert.ok(s.move.x > 195 && s.move.y < 388, 'Move upper-right');
    assert.ok(s.water.x > 195 && s.water.y > 388, 'Water lower-right');
    assert.ok(s.fast.x < 195 && s.fast.y > 388, 'Fasting lower-left');
    assert.ok(near(s.meals.x, C.mirrorX(s.move.x, 195)) && near(s.meals.y, s.move.y), 'Meals mirrors Move at rest');
});

test('ring: every bubble sits on one circle around Misty, evenly spaced, never touching her or each other', () => {
    const mistyR = 75, bubR = 42, R = C.ringR(mistyR, bubR, 12);
    assert.strictEqual(R, 129);
    for (const ph of [0, 0.4, 1.3, 2.9, 5.5]) {
        const s = C.spots(200, 400, R, ph), pts = C.ORDER.map(k => s[k]);
        pts.forEach(p => { const d = Math.hypot(p.x - 200, p.y - 400); assert.ok(near(d, R), 'on the ring'); assert.ok(d >= mistyR + bubR, 'clear of Misty'); });
        for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) assert.ok(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) > 2 * bubR, 'bubbles never overlap');
    }
    assert.deepStrictEqual(C.ORDER, ['meals', 'move', 'water', 'fast']);
});

test('ring turns clockwise and slowly (one lap >= 60 s), wrapping cleanly', () => {
    assert.ok(C.LAP_S >= 60);
    const a = C.spots(0, 0, 100, 0).meals, b = C.spots(0, 0, 100, C.advance(0, 1)).meals;
    assert.ok(b.x > a.x, 'Meals moves right across the top = clockwise on screen');
    assert.ok(near(C.advance(0, C.LAP_S), 0, 1e-9) || near(C.advance(0, C.LAP_S), 2 * Math.PI, 1e-9), 'one lap returns home');
    const speed = 2 * Math.PI * 130 / C.LAP_S; assert.ok(speed < 12, 'a bubble on a 130 px ring moves under 12 px/s: easy to tap');
    assert.strictEqual(C.advance(1, -5), 1, 'no going backwards on a negative dt');
});

test('ring fit: portrait phones and iPads fit; a sideways phone or a control in the path falls back to the static layout', () => {
    // iPhone 390x844: Misty 150 px at the rest zoom, bubbles 84 px, centre at 46 %
    assert.ok(C.ringClear(195, 388, C.ringR(75, 42, 12), 42, [], 390, 844, 30));
    // iPhone SE 375x667
    assert.ok(C.ringClear(187, 280, C.ringR(72, 44, 12), 44, [], 375, 667, 30));
    // iPad 820x1180 and 1180x820
    assert.ok(C.ringClear(410, 543, C.ringR(114, 59, 12), 59, [], 820, 1180, 30));
    assert.ok(C.ringClear(590, 377, C.ringR(114, 59, 12), 59, [], 1180, 820, 30));
    // iPhone on its side 844x390: not enough height for a ring
    assert.strictEqual(C.ringClear(422, 179, C.ringR(68, 42, 12), 42, [], 844, 390, 30), false);
    // a control straddling the ring path blocks it; one far outside or wholly inside the hole does not
    const R = C.ringR(75, 42, 12);
    assert.strictEqual(C.ringClear(195, 388, R, 42, [{ left: 300, right: 350, top: 370, bottom: 410 }], 390, 844, 30), false);
    assert.ok(C.ringClear(195, 388, R, 42, [{ left: 0, right: 390, top: 780, bottom: 844 }], 390, 844, 30), 'tab bar far below');
});

test('orbit runs inside the world frame, holds still for touch / sheets / flight / reduced motion, and keeps taps and long press', () => {
    assert.ok(js.includes('a.onFrame(dt =>'), 'driven by LowiWorld3D.onFrame');
    const orbit = js.slice(js.indexOf('const ORB = {'));
    assert.ok(!orbit.split('W.LowiMealsBubble')[0].includes('requestAnimationFrame'), 'no extra animation loop');
    assert.ok(js.includes("(prefers-reduced-motion: reduce)") && js.includes('ORB.down > 0 || now - ORB.touchT < 3000'));
    assert.ok(js.includes("D.querySelector('.wm-bloom, .r2-ov, .fe-ov')"), 'Move picker, sheets and fast edit hold it still');
    assert.ok(/lw-clean\|lw-clean-out\|mf-roam\|wh-padfly\|wh-away/.test(js), 'still while Misty flies or is away');
    assert.ok(js.includes('if (ORB.on) return; /* the orbit below places all four bubbles */'));
    assert.ok(css.includes('html.wh-home.ho-orbit #whHud .wh-cell[data-ho],') && css.includes('html.wh-home.ho-orbit #spHome #spFast[data-ho] { left: var(--ho-x) !important; top: var(--ho-y) !important; }'));
    assert.ok(!/data-ho[^}]*(pointer-events|display:\s*none)/.test(css), 'orbiting bubbles stay tappable');
});

test('zoomed-out Home is the default: the scene rests pulled back, everything that returns home lands there', () => {
    assert.ok(scene.includes('const HOME_OUT = 1.4;'));
    assert.ok(scene.includes('rig.homeRest = rig.homeDist * HOME_OUT;'));
    assert.ok(scene.includes(': HOME_OUT;'), 'first arrival on Home starts at the rest view');
    assert.ok(1 / 1.4 > 0.6, 'rest zoom stays above wh-mapview (Misty keeps her name)');
    assert.ok(wh.includes("function baseDist(r) { return r && r.mode === 'home' ? (r.homeRest || r.homeDist || 3.2) : 6.5; }"));
    assert.ok(mf.includes('S.dHome = r.homeRest || r.homeDist || 3.2;'), 'flying back from outer worlds lands on the rest view');
    /* Oct 21 (open instantly): no opening glide from Misty's close-up any more; Home opens at the rest view, ring controls still */
    assert.ok(!wh.includes('r.dist = r.homeDist; st.zoomAnim = { to: r.homeRest, rel: 1, t: 0, rate: 1.8, log: true };'), 'no opening glide back from the close-up');
    assert.ok(wh.includes("if (!st.restIntro && r.homeRest && homeActive() && H.classList.contains('wh-world-live')) st.restIntro = true;"), 'the once-per-session flag is still set, so nothing replays an intro');
});
