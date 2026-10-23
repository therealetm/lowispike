/* galaxy breakout (Oct 17, E-man): steer Misty into the edge of the home world and keep pushing; the edge strains, then gives
   way and she flies out into the bigger galaxy in one continuous camera move. Hidden: no button, only a cryptic What's New line. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const G = require(path.join(ROOT, 'misty-galaxy.js'));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const push = { mode: 'drive', mag: 1, out: 1, edge: 1, busy: false };
function hold(s, secs, inp, dt = 1 / 60) {
    let fires = 0, h = { s, p: 0 };
    for (let t = 0; t < secs - 1e-9; t += dt) { h = G.breakHold(h.s, Object.assign({ dt }, inp)); if (h.fire) fires++; }
    return { s: h.s, p: h.p, fires };
}

test('pushing outward at the edge for the whole hold breaks out exactly once, not before', () => {
    let r = hold(null, G.GAL.HOLD - 0.15, push);
    assert.strictEqual(r.fires, 0); assert.ok(r.p > 0.9 && r.p < 1);
    r = hold(r.s, 0.3, push);
    assert.strictEqual(r.fires, 1); assert.strictEqual(r.p, 1);
    r = hold(r.s, 2, push);
    assert.strictEqual(r.fires, 0, 'keeps pushing after: no second break');
});

test('autopilot, home, a weak push, pushing sideways, away from the edge or while busy never break out', () => {
    for (const bad of [{ mode: 'auto' }, { mode: 'home' }, { mag: 0.2 }, { out: 0.3 }, { busy: true }]) {
        const r = hold(null, 6, Object.assign({}, push, bad));
        assert.strictEqual(r.fires, 0, JSON.stringify(bad));
    }
    const r = hold(null, 6, Object.assign({}, push, { edge: 0.8 }));
    assert.strictEqual(r.fires, 0); assert.strictEqual(r.p, 0);
});

test('letting go resets the count; a short slip off the edge is forgiven', () => {
    let r = hold(null, 2, push);
    r = hold(r.s, 0.1, Object.assign({}, push, { mag: 0 }));
    assert.strictEqual(r.p, 0);
    r = hold(null, 2, push);
    r = hold(r.s, 0.2, Object.assign({}, push, { edge: 0.9 }));
    assert.ok(r.p > 0.5, 'slip under the grace keeps the count');
});

test('the edge bulges more the longer you push, by a fraction of the world', () => {
    assert.strictEqual(G.tentOf(0, 11), 0);
    assert.ok(G.tentOf(0.5, 11) < G.tentOf(1, 11));
    assert.ok(Math.abs(G.tentOf(1, 11) - 11 * G.GAL.TENT) < 1e-9);
});

test('the camera backs out continuously as she leaves, and stays clear of the hand-over to Community', () => {
    const d0 = 6.5, reach = 11;
    assert.ok(Math.abs(G.camDist(reach, d0, reach) - d0) < 1e-9, 'no jump at the edge');
    let prev = d0;
    for (let L = reach; L <= 300; L += 2) { const d = G.camDist(L, d0, reach); assert.ok(d >= prev - 1e-9); assert.ok(d - prev < 6, 'no jump at L=' + L); prev = d; }
    /* the breakout camera stays well inside the far zoom-out (fk 0.9, log scale from maxD 13 to outerD 300: about 219); since Oct 23 that edge no longer opens Community */
    assert.ok(G.camDist(1000, d0, reach) < 13 * Math.pow(300 / 13, 0.9) * 0.6);
});

test('out there she flies faster (same pace on screen), never slower, never absurd', () => {
    assert.strictEqual(G.speedK(6.5, 6.5), 1);
    assert.strictEqual(G.speedK(3, 6.5), 1);
    assert.ok(G.speedK(64, 6.5) > 5);
    assert.ok(G.speedK(1e6, 6.5) <= G.GAL.SPEED_MAX);
});

test('the edge rings out and settles after she slips through', () => {
    assert.ok(Math.abs(G.ringOut(1, 2.4)) < 0.01);
});

test('the galaxy has a place registry ready for other ecosystems (today only your own world)', () => {
    const p = G.places();
    assert.strictEqual(p.length, 1); assert.strictEqual(p[0].id, 'home');
    p[0].pos[0] = 99; assert.strictEqual(G.places()[0].pos[0], 0, 'callers get copies');
    assert.match(read('misty-galaxy.js'), /consent/i);
});

test('wired in: flight uses it instead of the hard edge, ends reset it, Home does not hand over or hide while out there', () => {
    const mf = read('misty-flight.js'), wh = read('world-home.js');
    assert.match(mf, /GX\.step\(ctx, S, V, mode, mag, K\)/);
    assert.match(mf, /GX\.speed\(ctx, S\)/);
    assert.match(mf, /GX\.cam\(/);
    assert.match(mf, /LowiMistyGalaxy\.reset\(ctx, S\)/);
    assert.match(wh, /mf-galaxy/);
    /* Oct 23, 2026: Home's far edge no longer hands over to Community at all (E-man: "Nuke that connection") */
    assert.ok(!wh.includes('farGo') && !/goTab\('foryou'\)/.test(wh), 'zooming out never opens Community');
    assert.match(read('index.html'), /<script src="misty-galaxy\.js\?v=/);
    assert.match(read('sw.js'), /"misty-galaxy\.js"/);
});

test('a secret: no button and no tour step for it', () => {
    const html = read('index.html');
    assert.ok(!/id="[^"]*galaxy[^"]*btn/i.test(html));
});

test("What's New only hints at it, in English, German and Spanish", () => {
    const n = JSON.parse(read('version.json')).news;
    assert.match(n.text.en, /Some edges give way if you push long enough\./);
    assert.match(n.text.de, /Manche Ränder geben nach/);
    assert.match(n.text.es, /Algunos bordes ceden/);
    assert.ok(!/galaxy|Galaxie|galaxia/i.test(n.text.en.split('\n')[0]));
});
