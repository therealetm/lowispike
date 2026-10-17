/* Oct 17, 2026: "The camera needs to follow Misty everywhere. Misty should be everywhere." Inside a world the real Misty (her
   flying sprite, sparkles and ring) stays drawn, controlled and followed; the cell pet is only her small sidekick; the Today
   status line agrees with her energy ring / zz. Root cause: entering a world parked EVERY hub object on a hidden layer,
   including Misty's sprite once she had flown before, so only the cell pet (which flies next to her screen spot) was left. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* a tiny stand-in for three.js layers / scene graph, enough to run the real setHubVisible from body-world-regions.js */
function layers() { return { mask: 1, set(n) { this.mask = 1 << n; }, test(o) { return (this.mask & o.mask) !== 0; } }; }
function obj(name, userData = {}, kids = []) {
    const o = { name, userData, layers: layers(), children: kids, isLight: false };
    o.traverse = f => { f(o); kids.forEach(k => k.traverse(f)); };
    return o;
}
function loadPark(scene) {
    const src = read('body-world-regions.js');
    const i = src.indexOf('function setHubVisible(on)'), j = src.indexOf('function setLook(', i);
    assert.ok(i > 0 && j > i, 'setHubVisible is where we expect it');
    const W = { LowiWorld3D: { scene } };
    return new Function('W', 'const w3 = () => W.LowiWorld3D; const parked = [];\n' + src.slice(i, j) + '\nreturn setHubVisible;')(W);
}
function world(misty) {
    const hub = obj('hub-cells', {}, [obj('cell-a'), obj('cell-b')]);
    const place = obj('bwr-muscle', { bwr: true });
    const kids = [hub, place].concat(misty || []);
    return { scene: { children: kids }, hub, place };
}
const camera = { layers: layers() };
const seen = o => o.layers.test(camera.layers);
function mistyParts() {
    return [obj('wh-misty-out', { lwKeep: true }), obj('wh-misty-sparkles', { lwKeep: true }), obj('wh-misty-ring', { lwKeep: true })];
}

for (const how of ['autopilot', 'steering']) {
    test(how + ': after entering a world the real Misty is still drawn; the hub cells are hidden and come back on leaving', () => {
        /* both modes reach the world through the same place switch (travel / warp) -> setHubVisible(false) */
        const parts = mistyParts(), w = world(parts), park = loadPark(w.scene);
        park(false);
        parts.forEach(p => assert.ok(seen(p), p.name + ' must stay visible inside the world (' + how + ')'));
        assert.ok(seen(w.place), 'the world itself is drawn');
        assert.ok(!seen(w.hub) && !seen(w.hub.children[0]), 'the home cells are hidden inside');
        park(true);
        assert.ok(seen(w.hub) && seen(w.hub.children[1]), 'hub back on the way out');
        parts.forEach(p => assert.ok(seen(p), p.name + ' still visible back home'));
    });
}

test('regression guard: without the keep flag the old code would hide her (proves the test catches the bug)', () => {
    const bare = [obj('wh-misty-out')], w = world(bare), park = loadPark(w.scene);
    park(false);
    assert.ok(!seen(bare[0]), 'an unflagged sprite is parked like the old Misty was');
});

test('Home flags Misty\'s sprite, sparkles and ring to stay in every place', () => {
    const s = read('world-home.js');
    assert.match(s, /A\.wand\.name = 'wh-misty-out'; A\.wand\.userData\.lwKeep = true;/);
    assert.match(s, /A\.pts\.name = 'wh-misty-sparkles'; A\.pts\.userData\.lwKeep = true;/);
    assert.match(s, /A\.ring\.name = 'wh-misty-ring'; A\.ring\.userData\.lwKeep = true;/);
    assert.match(read('body-world-regions.js'), /c\.userData\.bwr \|\| c\.userData\.lwKeep/);
});

test('inside, Misty is the controlled and camera-followed actor in autopilot AND steering; the pet never takes over', () => {
    const f = read('misty-flight.js');
    /* she is drawn every frame inside and pulled back onto the camera\'s layer if anything ever parks her */
    assert.match(f, /if \(ctx\.a && ctx\.a\.camera && !wand\.layers\.test\(ctx\.a\.camera\.layers\)\) wand\.layers\.mask = ctx\.a\.camera\.layers\.mask;/);
    /* steering: the camera target is her own position; autopilot / tap-in roam: the camera drifts after her too (not only adventures) */
    assert.match(f, /V\.b\.copy\(S\.inC\)\.lerp\(S\.p, S\.autoX \? 0\.9 : 0\.35\); r\.target\.lerp\(V\.b/); /* item 3: all the way to the cloud wall on a way out */
    assert.doesNotMatch(f, /if \(adv && !r\.fly && !regionsBusy\(\)/, 'camera follow is no longer adventure-only');
    assert.match(f, /if \(off2 > hv\) r\.target\.addScaledVector\(V\.b, 1 - hv \/ off2\)/, 'steering: a hard leash keeps her on screen');
    /* the hunt eats with HER position, and only while you steer */
    assert.match(read('misty-hunt.js'), /if \(steer && d < eatR\) eatBit\(ctx, b, p\)/);
    /* the cell pet only ever reads Misty\'s screen spot to fly beside her; it never drives the flight or the camera */
    const pals = read('region-pals.js');
    assert.match(pals, /MF\.screen\(\)/);
    assert.doesNotMatch(pals, /LowiPad\.(steer|mode)|rig\.target|LowiMistyFlight\.(steer|drive|go)/, 'the pet controls nothing');
    assert.match(pals, /classList\.toggle\('rp-side', st\.side\)/, 'beside her it is drawn as her small helper');
    assert.match(read('region-pals.css'), /\.rp-side \.rp-orb \{ inset: 15px;/);
});

test('the Today status line agrees with her energy ring and zz (shared LowiSun.energyNow)', () => {
    const s = read('spirit.js');
    const i = s.indexOf('function statusModel('), j = s.indexOf('function button(', i);
    const body = s.slice(i, j);
    const mk = (tier, extra = {}) => {
        const window = { LowiSun: { energyNow: () => ({ tier, value: tier === 'thriving' ? 0.9 : 0.2 }) } };
        const fn = new Function('window', 'name', 'lang', 'WATER_GOAL', 'FAST_GOAL', 'tr', body + '\nreturn statusModel;')(window, () => 'Misty', () => extra.lang || 'en', 8, 16, k => k);
        return fn({}, { dry: 0, night: false }, Object.assign({ water: 8, meals: 1, moved: true, scanned: true, checkin: '' }, extra.day || {}));
    };
    const ok = mk('thriving');
    assert.doesNotMatch(mk('weak').title, /bright and awake|glowing/);
    assert.doesNotMatch(mk('tired').title, /bright and awake|glowing/);
    assert.match(mk('weak').title, /low on energy/);
    assert.match(mk('tired', { lang: 'de' }).title, /müde/);
    assert.strictEqual(mk('weak').mood, 'tired');
    assert.notStrictEqual(ok.mood, 'tired', 'a full ring keeps the happy line');
    assert.match(s, /addEventListener\('lowi:misty-power', refresh\)/, 'hunt power-ups repaint it');
    assert.match(read('beta.css'), /#spHome\[data-mood="tired"\] \.sp-status-dot/);
});
