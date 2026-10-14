'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const H = require('../herb-touch.js'), K = require('../spirit-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('a thrown herb springs back to its resting spot and stays inside the wall', () => {
    const b = {x: 0, y: 0, vx: 1800, vy: -1200};
    let settled = false, maxOut = 0, t = 0;
    for (let i = 0; i < 400 && !settled; i++) {
        settled = H.spring(b, 1 / 60, 100, 140, K.bound);
        maxOut = Math.max(maxOut, Math.hypot(b.x, b.y));
        assert(Math.hypot(b.x / 100, b.y / 140) <= 1.000001);
        t += 1 / 60;
    }
    assert(settled, 'settles');
    assert(maxOut > 40, 'actually flies out first');
    assert(t < 3, 'settles within 3 s, took ' + t);
    assert.deepEqual(b, {x: 0, y: 0, vx: 0, vy: 0});
});

test('the spring overshoots a little (springy, not a slow glide) and no longer rests at the bottom', () => {
    const b = {x: 0, y: 80, vx: 0, vy: 0};
    let crossed = false;
    for (let i = 0; i < 300; i++) {
        if (H.spring(b, 1 / 60, 100, 140, K.bound)) break;
        if (b.y < -1) crossed = true;
    }
    assert(crossed, 'overshoots past the rest spot');
    assert.equal(b.y, 0);
    assert(H.atRest({x: 0, y: 0, vx: 0, vy: 0}));
    assert(!H.atRest({x: 0, y: 30, vx: 0, vy: 0}));
});

test('poke zones come from the herb parts: leaves, face, sides, pot', () => {
    const r = (l, t, w, h) => ({left: l, top: t, right: l + w, bottom: t + h, width: w, height: h});
    const rects = {face: r(130, 150, 40, 30), body: r(100, 120, 100, 110), pot: r(105, 240, 90, 50)};
    assert.equal(H.zone({x: 150, y: 60}, rects), 'leaves');
    assert.equal(H.zone({x: 150, y: 165}, rects), 'face');
    assert.equal(H.zone({x: 104, y: 200}, rects), 'left');
    assert.equal(H.zone({x: 196, y: 200}, rects), 'right');
    assert.equal(H.zone({x: 150, y: 270}, rects), 'pot');
    assert.equal(H.zone({x: 1, y: 1}, {}), 'face');
});

test('each poke has its own face, push and line in German, English and Spanish', () => {
    const left = H.poke('left', 'de', 0), right = H.poke('right', 'en', 0), pot = H.poke('pot', 'es', 1), face = H.poke('face', 'de', 0);
    assert(left.vx > 0 && right.vx < 0, 'leans away from the finger');
    assert(pot.vy < 0, 'pot poke hops up');
    assert.equal(face.face, 'squint');
    assert.equal(left.face, 'surprised');
    assert.match(left.line, /Seite/);
    assert.match(face.line, /Nase|Gesicht/);
    assert.match(pot.line, /salt|arriba/i);
    assert.equal(H.poke('nope', 'fr', 3).zone, 'face');
    for (const z of Object.keys(H.POKE)) for (const set of H.POKE[z].lines) assert(set.length >= 2 && set.every(Boolean));
});

test('held faces: grab is surprised, a still hold or big stretch squints, shaking makes it dizzy', () => {
    assert.equal(H.heldFace({}), 'surprised');
    assert.equal(H.heldFace({moved: true, speed: 300}), 'surprised');
    assert.equal(H.heldFace({hold: true}), 'squint');
    assert.equal(H.heldFace({hold: true, moved: true, stretch: 1.6}), 'squint');
    assert.equal(H.heldFace({moved: true, speed: 2000}), 'dizzy');
    const trail = [];
    for (let i = 0; i < 8; i++) trail.push({x: i % 2 ? 60 : 0, y: 0, t: i * 60});
    assert(H.shakes(trail, 480) >= 4);
    assert.equal(H.heldFace({moved: true, shakes: H.shakes(trail, 480)}), 'dizzy');
    assert.equal(H.shakes([{x: 0, t: 0}, {x: 30, t: 50}, {x: 60, t: 100}], 120), 0);
    assert.equal(H.releaseFace(2000).face, 'dizzy');
    assert.equal(H.releaseFace(100).face, 'squint');
    assert(H.speedOf([{x: 0, y: 0, t: 0}, {x: 100, y: 0, t: 50}], 60) > 1900);
});

test('wiring: loaded before spirit.js, cached offline, used by the herb world, reduced motion kept', () => {
    const loader = read('apple-ui.js'), sw = read('sw.js'), ui = read('spirit.js'), css = read('herb-touch.css');
    assert(loader.indexOf("'herb-touch.js'") > 0 && loader.indexOf("'herb-touch.js'") < loader.indexOf("'spirit.js'"));
    assert.match(loader, /herb-touch\.css\?v=/);
    assert.equal((sw.match(/"herb-touch\.js"/g) || []).length, 2);
    assert.equal((sw.match(/"herb-touch\.css"/g) || []).length, 2);
    assert.match(ui, /H\.spring\(body, dt, b\.x, b\.y, K\.bound\)/);
    assert.match(ui, /function poke\(g\)/);
    assert.match(ui, /T\.pet\(\)/, 'tap reactions and the fast-tap dizzy stay');
    assert.match(ui, /if \(reduced\(\)\) \{\s*body\.x = body\.y = body\.vx = body\.vy = 0;/);
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.match(css, /#spBubble\[data-pressed\]/);
    for (const f of ['herb-touch.js', 'spirit.js', 'apple-ui.js']) new vm.Script(read(f));
});
