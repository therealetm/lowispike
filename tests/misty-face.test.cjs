'use strict';
/* Oct 17, 2026 (E-man): "Misty is basically just staring you down" - she should look where she flies, so sometimes you see her
   back or her top. misty-face.js + its hooks in misty-flight.js (place) and world-home.js (art, wand texture). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const F = require('../misty-face.js');
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const vnear = (a, b, e = 1e-6) => a.every((x, i) => near(x, b[i], e));
const len = v => Math.hypot(v[0], v[1], v[2]);
/* a camera looking down -z: right +x, up +y, toward you +z */
const CR = [1, 0, 0], CU = [0, 1, 0], CF = [0, 0, 1];

test('facing you: the whole face, in the middle of her body, upright', () => {
    const f = F.faceFrame(CF, CR, CU, CF, 0);
    assert.ok(near(f.vis, 1) && near(f.sx, 0) && near(f.sy, 0));
    assert.ok(vnear(f.x, CR) && vnear(f.y, CU) && vnear(f.z, CF));
});

test('flying away from you: no face at all, you see her back', () => {
    const f = F.faceFrame([0, 0, -1], CR, CU, CF, 0);
    assert.equal(f.vis, 0);
    const g = F.faceFrame(F.unit([0.3, 0.1, -1]), CR, CU, CF, 0);
    assert.equal(g.vis, 0, 'away and a bit to the side: still her back');
});

test('flying sideways: her face slides to that edge and turns to a 3/4 profile', () => {
    const f = F.faceFrame(CR, CR, CU, CF, 0);
    assert.ok(near(f.sx, 1) && near(f.sy, 0), 'face at her right edge');
    assert.ok(f.vis > 0.7 && f.vis < 1, 'a readable profile, a little softer than full front');
    assert.ok(Math.abs(f.x[2]) > 0.6 && Math.abs(f.x[2]) < 0.95, 'the face is turned well away (3/4), not a flat edge-on line');
    assert.ok(F.dot(f.z, CR) > 0.8, 'facing toward her right');
    assert.ok(vnear(f.y, CU), 'turning sideways keeps her face upright');
    const l = F.faceFrame([-1, 0, 0], CR, CU, CF, 0);
    assert.ok(near(l.sx, -1), 'and the other way to the left edge');
});

test('flying up: her face moves to her top and tips away from you (you see the top of her head)', () => {
    const f = F.faceFrame(CU, CR, CU, CF, 0);
    assert.ok(near(f.sy, 1) && near(f.sx, 0));
    assert.ok(f.y[2] < -0.6, 'the face\'s up now tips away from you');
    const down = F.faceFrame(F.unit([0, -1, -1]), CR, CU, CF, 0);
    assert.equal(down.vis, 0, 'diving away: the top / back of her, no face');
});

test('her lean / bank (sprite roll) rolls the face with her body', () => {
    const r = 0.3, f = F.faceFrame(CF, CR, CU, CF, r);
    assert.ok(vnear(f.x, [Math.cos(r), Math.sin(r), 0]) && vnear(f.y, [-Math.sin(r), Math.cos(r), 0]));
});

test('visibility fades smoothly from front to back (no pop)', () => {
    let prev = 1;
    for (let a = 0; a <= Math.PI; a += 0.05) {
        const v = F.faceVis(Math.cos(a)); assert.ok(v <= prev + 1e-9 && prev - v < 0.2, 'monotonic, small steps'); prev = v;
        if (Math.cos(a) < -0.3) assert.equal(v, 0, 'turned past her edge: gone (no face showing through from behind)');
    }
    assert.equal(F.faceVis(-1), 0);
});

test('she turns smoothly with a top speed, and a full turn-around swings her sideways (never through a flip)', () => {
    let L = [0, 0, 1]; const D = [0, 0, -1], dt = 1 / 60;
    let maxStep = 0;
    for (let i = 0; i < 240; i++) {
        const n = F.turnToward(L, D, dt, F.K.TURN, F.K.TURN_MAX, [0, 1, 0]);
        const step = Math.acos(Math.max(-1, Math.min(1, F.dot(L, n))));
        maxStep = Math.max(maxStep, step);
        assert.ok(near(len(n), 1, 1e-9));
        assert.ok(Math.abs(n[1]) < 1e-9, 'stays level: the turn-around is a yaw, not a somersault');
        L = n;
    }
    assert.ok(maxStep <= F.K.TURN_MAX * dt + 1e-9, 'never faster than TURN_MAX');
    assert.ok(F.dot(L, D) > 0.999, 'she gets there');
    const one = F.turnToward([0, 0, 1], [1, 0, 0], 0.016, F.K.TURN, F.K.TURN_MAX);
    assert.ok(one[0] > 0 && one[0] < 0.2, 'one frame = a small part of the way, eased');
    assert.ok(vnear(F.turnToward([0, 0, 1], [0, 0, 1], 0.016), [0, 0, 1]), 'already there: stays');
});

test('where she looks: heading when you hold / turn her (also backing up), her path when flying, glances when idle', () => {
    const hd = [0, 0, -1], back = [0, 0, 1], side = [1, 0, 0];
    assert.deepEqual(F.pickDir({ drive: true, hd, th: -1, moving: true, vdir: back }).d, hd, 'reversing: she still faces forward');
    assert.deepEqual(F.pickDir({ drive: true, hd, turning: true }).d, hd, 'dragging on her: she faces where the dots point');
    assert.equal(F.pickDir({ drive: true, hd, th: 1 }).why, 'heading');
    assert.deepEqual(F.pickDir({ drive: true, hd, moving: true, vdir: side }).d, side, 'just the stick: she looks where she goes');
    assert.deepEqual(F.pickDir({ moving: true, vdir: side, hd }).d, side, 'autopilot / roaming / circling a world: along her path');
    assert.deepEqual(F.pickDir({ moving: false, idleDir: [0, 1, 0], base: side }).d, [0, 1, 0], 'idle: her glance');
    assert.equal(F.pickDir({}).d, null, 'nothing known: keep looking where she looks');
});

test('idle she looks around, and only now and then at you: not locked on the viewer', () => {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const base = [0, 0, -1]; let you = 0, total = 0, sides = 0, sawYou = 0;
    for (let i = 0; i < 2000; i++) {
        const g = F.glance(base, CF, rnd, [0, 1, 0]);
        assert.ok(near(len(g.dir), 1, 1e-9) && g.hold > 0.9);
        total += g.hold; if (F.dot(g.dir, CF) > 0.9) you += g.hold;
        if (g.at === 'side') { sides++; assert.ok(F.dot(g.dir, base) < 0.95, 'a side glance really turns her head'); }
        if (g.at === 'you') sawYou++;
    }
    assert.ok(you / total < 0.15, 'looking at you is a small part of the time (' + (you / total).toFixed(2) + ')');
    assert.ok(sawYou > 100, 'but she does look at you sometimes');
    assert.ok(sides > 1000, 'mostly glances left / right / up / down');
});

test('moving / still has a gap between thresholds (no flicker), measured in her own size', () => {
    assert.equal(F.movingNow(false, 0.35, 1), false);
    assert.equal(F.movingNow(true, 0.35, 1), true);
    assert.equal(F.movingNow(true, 0.2, 1), false);
    assert.equal(F.movingNow(false, 0.05, 0.1), true, 'small Misty inside a world: same rule, scaled');
});

test('the art splits into her body without the face and the face on its own (balanced groups)', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 310"><g class="lh-creature"><g class="lh-foliage"><ellipse class="lh-body" cx="130" cy="179" rx="37" ry="46" fill="red"/></g>'
        + '<g class="lh-face" transform="translate(130 179)"><g class="lh-eyes" style="transform:scaleY(.4)"><ellipse cx="-11" cy="-2" rx="4" ry="6"/></g><g class="lh-sleep-eyes"><path d="M0 0"/></g><path class="lh-smile" d="M-7 9q7 8 14 0"/></g>'
        + '<g class="lh-tail"/></g></svg>';
    const s = F.splitArt(svg);
    assert.ok(s);
    assert.ok(!/lh-face|lh-eyes|lh-smile/.test(s.body), 'no face left on the body');
    assert.ok(/lh-body/.test(s.body) && /lh-tail/.test(s.body) && /<\/g><\/svg>$/.test(s.body), 'the rest of her body intact');
    assert.ok(/lh-eyes/.test(s.face) && /lh-smile/.test(s.face) && /scaleY\(\.4\)/.test(s.face), 'face keeps its current expression');
    assert.ok(/viewBox="-34 -16 68 38"/.test(s.face) && !/translate\(130/.test(s.face), 'face cropped round its own origin');
    assert.equal(s.fy, 179); assert.equal(s.fx, 130); assert.equal(s.rx, 37); assert.equal(s.ry, 46);
    assert.equal((s.face.match(/<g\b/g) || []).length, (s.face.match(/<\/g>/g) || []).length, 'balanced');
    assert.equal(F.splitArt('<svg></svg>'), null, 'no face group: keep the old whole Misty');
});

test('the real face markup (herb-tamagotchi) fits the crop box', () => {
    const src = read('herb-tamagotchi.js');
    assert.match(src, /<g class="lh-face" transform="translate\(130 '\+faceY\+'\)">/);
    assert.match(src, /class="lh-blush" cx="-21" cy="9" rx="7" ry="4"/, 'blush spans -28..28, 5..13: inside -34..34, -16..22');
    assert.match(src, /class="lh-body" cx="130" cy="'\+faceY\+'"/, 'her body is centred on the face origin');
});

test('wired in: misty-flight places it every frame, world-home keeps the faceless body on, page and offline cache load it', () => {
    const mf = read('misty-flight.js');
    assert.match(mf, /const MFc = W\.LowiMistyFace;\s*if \(MFc && MFc\.draw\) \{ try \{ MFc\.draw\(\{ a: ctx\.a, wand, p: S\.p, hs: S\.hs, mode: ctx\.PD && ctx\.PD\.mode, hd: S\.hd/);
    const wh = read('world-home.js');
    assert.match(wh, /wand\.material\.map !== st\.misty\.material\.map && !\(wand\.userData\.mfFaceT > performance\.now\(\) - 400\)/);
    assert.match(wh, /W\.LowiWorldHome\.mistyFaceArt = mistyFaceArt;/);
    const html = read('index.html');
    assert.match(html, /<script src="misty-turn\.js\?v=[^"]+"><\/script>\n<script src="misty-face\.js\?v=[^"]+"><\/script>/);
    assert.match(read('sw.js'), /"misty-turn\.js", "misty-face\.js"/);
    const me = read('misty-face.js');
    assert.ok(!/requestAnimationFrame|setInterval|new THREE\.WebGLRenderer/.test(me), 'no own loop, no second renderer');
    assert.match(me, /m\.onBeforeRender = faceRender/, 'placed from the wand as it is really drawn');
});
