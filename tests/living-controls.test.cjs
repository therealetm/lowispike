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
    assert.ok(!k.weather.shape, 'weather is a round bubble now (sym-home, Oct 17)');
    assert.strictEqual(k.quest.shape, 'box', 'Daily Quest keeps its rounded box');
    for (const kind of ['vr', 'sound', 'map', 'daynight']) assert.ok(!k[kind].shape, kind + ' stays round');
    assert.ok(L.AUTO.includes('#spFast') && L.AUTO.includes('#whHud .wh-water'), 'fasting and water untouched');
});

test('one shader for all: controls are built by the same build() and material as fasting and water', () => {
    assert.ok(js.includes('s.mat = makeMat(THREE);') && js.split('makeMat(THREE)').length === 3, 'single material path');
    assert.ok(js.includes("new THREE.Mesh((s.opts.shape === 'pill' || s.opts.shape === 'box') ? dropGeo(CORE.dropN(s.opts.shape)) : geo, s.mat)"), 'a pill only swaps the geometry, never the material');
    assert.ok(js.includes('new THREE.SphereGeometry(gR, CORE.DROP_SEG[0], CORE.DROP_SEG[1])') && !js.includes('CapsuleGeometry'), 'pill = Misty\'s sphere pulled into a drop, no capsule (no straight lines)');
    assert.ok(!/requestAnimationFrame\(|setInterval\(\(\) => \{[^}]*frame/.test(js.replace("setInterval(() => { if (D.hidden) return; if (homeShown()) scan(); else unlive(); }, 1500);", '')), 'no new loop');
});

test('pill and box are liquid drops: curved everywhere, no straight top or bottom line, just past the control', () => {
    // sym-home (Oct 17): "I still see the straight lines, so it doesn't really look like a water bubble"
    for (const [shape, n] of [['pill', 2.6], ['box', 3]]) {
        assert.strictEqual(L.dropN(shape), n);
        // walk along the top edge: the height keeps falling from the middle out (a capsule would stay flat for w - h)
        let prev = Infinity;
        for (let i = 0; i <= 10; i++) {
            const a = (i / 10) * (Math.PI / 2) * 0.98, q = L.dropPoint(Math.sin(a), Math.cos(a), 0, n);
            assert.ok(q.y < prev, shape + ' top edge curves at step ' + i); prev = q.y;
            assert.ok(Math.abs(Math.pow(Math.abs(q.x), n) + Math.pow(Math.abs(q.y), n) - 1) < 1e-9, 'on the superellipsoid');
            assert.ok(Math.abs(Math.hypot(q.nx, q.ny, q.nz) - 1) < 1e-9, 'unit normal');
        }
    }
    const t = L.dropAxes(196, 50, 'pill'), d = L.dropAxes(362, 72, 'box');
    assert.ok(t.ax > 98 && t.ay > 25 && t.ax < 110 && t.ay < 32, 'Today drop just past its 196x50 box');
    assert.ok(d.ax > 181 && d.ay > 36 && d.ax < 200 && d.ay < 45, 'Daily Quest drop just past its 362x72 box');
    assert.ok(js.includes('s.mesh.scale.set(a.ax * b, a.ay * b, Math.min(a.ax, a.ay) * b)'), 'drop stretched over the control, never turned out of shape');
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
