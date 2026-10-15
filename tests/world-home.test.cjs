// World-first Home: the 3D world is Home, Misty sits in it, today is a see-through sheet, one X closes every sheet.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const C = require('../world-home-core.js');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const js = read('world-home.js'), css = read('world-home.css'), loader = read('apple-ui.js'), sw = read('sw.js'), w3 = read('body-world-3d.js');

test('auras unlock by XP and a locked one never sticks', () => {
    assert.strictEqual(C.AURAS.length, 8);
    assert.strictEqual(C.cleanAura('gold', 10), 'dew');
    assert.strictEqual(C.cleanAura('gold', 150), 'gold');
    assert.strictEqual(C.cleanAura('nope', 9999), 'dew');
    const items = C.auraItems(200, 'gold');
    assert.strictEqual(items.find(i => i.id === 'gold').status, 'on');
    assert.strictEqual(items.find(i => i.id === 'ocean').status, 'ready');
    assert.strictEqual(items.find(i => i.id === 'coral').status, 'locked');
    assert.strictEqual(items.find(i => i.id === 'coral').left, 100);
    for (const a of C.AURAS) assert.strictEqual(a.n.length, 3, a.id + ' has de/en/es names');
});

test('cell stages follow the herb thresholds', () => {
    assert.strictEqual(C.stage(0).index, 0);
    assert.strictEqual(C.stage(150).index, 1);
    assert.ok(Math.abs(C.stage(200).pct - 0.5) < 1e-9);
    assert.strictEqual(C.stage(200).left, 100);
    assert.strictEqual(C.stage(99999).next, null);
    assert.strictEqual(C.stage(99999).pct, 1);
});

test('hero view faces the weighted cluster and keeps the camera level', () => {
    const samples = [];
    for (let i = 0; i < 30; i++) samples.push([8 + Math.random(), Math.random() * 0.5, Math.random() - 0.5, 2]);
    samples.push([-6, 0, 0, 0.2], [0, 0, -6, 0.2]);
    const v = C.heroView(samples, { camDist: 6.5 });
    assert.ok(v.dir[0] > 0.8, 'looks towards +x: ' + v.dir);
    const ang = C.rigAngles(v.dir, 0.55);
    assert.ok(Math.abs(ang.pitch) <= 0.55);
});

test('turns take the short way and zoom toggles out and back', () => {
    assert.ok(Math.abs(C.nearAngle(0.1, Math.PI * 2 - 0.1) - (-0.1)) < 1e-9);
    assert.deepStrictEqual(C.zoomTarget(6.5, 2, 13, 6.5), { to: 13, out: true });
    assert.deepStrictEqual(C.zoomTarget(13, 2, 13, 6.5), { to: 6.5, out: false });
});

test('wired in: loader, offline cache, css, no second WebGL context', () => {
    assert.ok(/'world-home-core\.js','world-home\.js'/.test(loader));
    for (const f of ['world-home-core.js', 'world-home.js', 'world-home.css']) assert.strictEqual(sw.split('"' + f + '"').length - 1, 2, f + ' in both sw.js lists');
    assert.ok(js.includes("replace('world-home.js', 'world-home.css')"));
    assert.ok(!/getContext\(\s*['"]webgl/.test(js), 'reuses LowiWorld3D');
    assert.ok(/wh-on'\) \? '\.sp-world\.on, \.ht-world\.on'/.test(w3), 'world keeps rendering behind see-through sheets');
});

test('one X for every sheet, sheets stay see-through, HUD lives in #spHome', () => {
    for (const s of ['topR2', 'topHost', 'st.today', 'topWorld']) assert.ok(js.includes(s), s);
    assert.ok(/getElementById\('spHome'\)/.test(js.slice(js.indexOf('function ensureHud'), js.indexOf('function ensureHud') + 300)));
    assert.ok(css.includes('.wh-x {') && css.includes('left: 50%'));
    assert.ok(/backdrop-filter: blur\(22px\)/.test(css));
    assert.ok(/html\.wh-on\.wh-r2-on \.r2-ov:not\(\.full\) \.r2-x \{ display: none/.test(css));
    assert.ok(/#spHome[^{]*\{ animation: none !important; transform: none !important/.test(css), 'no transform turns the wrapper into the containing block');
});

test('Misty goes into the 3D cell even when her SVG carries a stray attribute', () => {
    assert.ok(js.includes('removeAttributeNode'));
    assert.ok(js.includes("st.misty.name = 'wh-misty'"));
});

test('day & night slider sits in the 3D world', () => {
    assert.ok(js.includes("'wh-atmbtn'") && js.includes('<div class="r2-look"></div>'));
    assert.ok(css.includes('.wh-atm-pop'));
});
