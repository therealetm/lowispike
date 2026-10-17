// Home controls in Misty's living bubble (Oct 17): VR, Sound, World map, Day/Night, Today pill, weather pill and Daily Quest get the
// same shared 3D membrane as fasting and water - not glass colours - and keep their own shape, place and function.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const L = require('../living-bubbles.js');
const js = read('living-bubbles.js'), css = read('living-bubbles.css');

test('all seven Home controls are on the shared membrane list, with their own shape', () => {
    const k = Object.fromEntries(L.CTL.map(c => [c.kind, c]));
    for (const kind of ['vr', 'sound', 'map', 'daynight', 'today', 'weather', 'quest']) assert.ok(k[kind], kind + ' is a living bubble');
    assert.strictEqual(k.today.shape, 'pill', 'Today stays a pill');
    assert.strictEqual(k.weather.shape, 'pill', 'weather stays a pill');
    assert.strictEqual(k.quest.shape, 'box', 'Daily Quest keeps its rounded box');
    for (const kind of ['vr', 'sound', 'map', 'daynight']) assert.ok(!k[kind].shape, kind + ' stays round');
    assert.ok(L.AUTO.includes('#spFast') && L.AUTO.includes('#whHud .wh-water'), 'fasting and water untouched');
});

test('one shader for all: controls are built by the same build() and material as fasting and water', () => {
    assert.ok(js.includes('s.mat = makeMat(THREE);') && js.split('makeMat(THREE)').length === 3, 'single material path');
    assert.ok(js.includes('new THREE.Mesh(s.pg || geo, s.mat)'), 'a pill only swaps the geometry, never the material');
    assert.ok(js.includes('new THREE.CapsuleGeometry(gR,'), 'pill = Misty\'s membrane as a capsule with her radius');
    assert.ok(!/requestAnimationFrame\(|setInterval\(\(\) => \{[^}]*frame/.test(js.replace("setInterval(() => { if (D.hidden) return; if (homeShown()) scan(); else unlive(); }, 1500);", '')), 'no new loop');
});

test('pill and box geometry land on the control\'s own outline', () => {
    const gR = 1.4;
    // pill 196x50: caps radius 0.52h, straight middle = w - h
    assert.ok(Math.abs(L.radiusForBox(196, 50, 'pill') - 26) < 1e-9);
    const Lp = L.capsuleLen(196, 50, gR), scalePx = 26 / gR; // px per geometry unit
    assert.ok(Math.abs(Lp * scalePx - (196 - 50)) < 1e-9, 'pill straight part = width - height');
    assert.ok(Math.abs((Lp / 2 + gR) * scalePx - (98 + 1)) < 1e-9, 'pill reaches 1px past each end, like a bubble');
    // Daily Quest 362x72, corner 26: corners = its own radius, height 0.52h
    const R = L.radiusForBox(362, 72, 'box', 26), Lb = L.capsuleLen(362, 72, gR, 26), pb = R / gR;
    assert.ok(Math.abs(R - 26 * 1.04) < 1e-9);
    assert.ok(Math.abs((Lb / 2 + gR) * pb - (181 + 0.04 * 26)) < 1e-9, 'box half width just past its edge');
    assert.ok(Math.abs(gR * pb * L.stretchY(72, 26) - 72 * 0.52) < 1e-9, 'box half height just past its edge');
    assert.strictEqual(L.cornerOf(362, 72, 80), 36, 'corner never more than half the height');
    assert.strictEqual(L.stretchY(50), 1, 'a pill is not stretched');
    assert.strictEqual(L.capsuleLen(44, 44, gR), 0, 'a square pill is a sphere');
    assert.ok(js.includes('tmp.x, rx ? 0 : s.spin'), 'a stretched box never turns out of shape');
    assert.ok(js.includes('Math.abs(L - s.pL) > Math.max(0.02, s.pL * 0.03)'), 'pill rebuilt only when Today\'s text really changes width');
});

test('controls keep their own tap, hold, drag and press; no float, no squish, no forced circle', () => {
    assert.ok(js.includes("if (list.get(el).opts.ctl) return;"), 'pointerdown leaves controls alone');
    assert.ok(js.includes("el.classList.add(s.opts.ctl ? 'lb-ctl' : 'lb-bub')"), 'controls are not .lb-bub');
    const sec = css.slice(css.indexOf('/* 5. home-controls'));
    assert.ok(sec.length > 100);
    assert.ok(!/animation\s*:|border-radius|transform\s*:|scale\s*:|left\s*:|top\s*:|width\s*:|height\s*:/.test(sec), 'no animation, shape, size or position change');
    assert.ok(!/@keyframes/.test(sec));
});

test('shell turns clear only while the membrane is drawn, on Home; on-states and accessibility kept', () => {
    const sec = css.slice(css.indexOf('/* 5. home-controls'));
    assert.ok(sec.includes(':not([data-state="on"]):not([data-on="1"]):not(.is-out)'), 'VR on, Sound on and World map out keep their fill');
    assert.ok((sec.match(/\.lb-ctl\.lb-live/g) || []).length >= 8, 'every clear rule needs .lb-live');
    assert.ok(/html\.lb3d\.wh-home body #tbTheme#tbTheme\.lb-ctl\.lb-live/.test(sec), 'Day/Night only clear on Home');
    assert.ok(sec.includes('@media (prefers-contrast: more)') && sec.includes('@media (prefers-reduced-transparency: reduce)'));
    assert.ok(sec.includes('::before { display: none !important; }'), 'glass ring steps aside, no ring on a ring');
    assert.ok(js.includes("live(el, s.oT > 0 && !!s.mesh)") && js.includes('else unlive();'), 'class follows the real membrane and is dropped off Home');
    assert.ok(js.includes("classList.remove('lb-bub', 'lb-ctl', 'lb-live')"), 'removing restores the old look');
});

test('inside a world the Daily Quest membrane also wraps the hunt count line it carries', () => {
    assert.ok(js.includes("el.classList.contains('hc-joined') ? D.getElementById('hcLine') : null"));
    assert.ok(js.includes('height: j.bottom - r.top'), 'one box from the top of the quest to the bottom of the line');
    assert.ok(css.includes('#tab-home:has(#f3Board.hc-joined.lb-live) #hcLine.hc-line'), 'the line turns clear together with the box');
});
