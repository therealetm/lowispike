'use strict';
/* Oct 16, 2026: Misty gets limbs in the Move workout player. Her own bubble is the body; short glass jelly arms and legs,
   mitten hands and little sneakers follow the joints the workout's move clock already solves, so every rep is in time. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function load() {
    const doc = { documentElement: { lang: 'en', classList: { add() {}, remove() {}, contains: () => false, toggle() {} } } };
    const win = { document: doc, matchMedia: () => ({ matches: false }) };
    win.window = win;
    vm.runInNewContext(read('move-player.js'), Object.assign(win, { performance: { now: () => 0 }, setTimeout, clearTimeout, requestAnimationFrame: () => 0, cancelAnimationFrame: () => {} }));
    return win.LowiMovePlayer;
}
/* every exercise in the Move library (index.html: id: {n:"Name", cue:"..."}) */
function moveIds() {
    return [...new Set([...read('index.html').matchAll(/\b([a-z_]+): ?\{ ?n: ?"[^"]*", ?cue: ?"/g)].map(m => m[1]))];
}

test('Misty limbs: every exercise has a pose and a place (platform, pouf, bed or mat)', () => {
    const P = load(), ids = moveIds();
    assert.ok(ids.length >= 35, 'found the move library');
    for (const id of ids) assert.ok(P.POSE[id], 'pose for ' + id);
    assert.equal(P.poseOf('curl'), 'bicep-curl');
    assert.equal(P.poseOf('bridge'), 'glute-bridge');
    assert.equal(P.poseOf('sit_stand'), 'squat');
    assert.equal(P.poseOf('unknown_move', { base: 'walk' }), 'walk');
    assert.equal(P.poseOf('unknown_move', null), 'generic');
    assert.equal(P.stageOf({ base: 'walk' }), 'stand');
    assert.equal(P.stageOf({ base: 'seat' }), 'seat');
    assert.equal(P.stageOf({ base: 'bedsit' }), 'seat');
    assert.equal(P.stageOf({ base: 'bed' }), 'bed');
    assert.equal(P.stageOf({ base: 'quad' }), 'mat');
    assert.equal(P.stageOf(null), 'stand');
});

test('Misty limbs: the solved skeleton is re-rooted on her bubble, short and following the move', () => {
    const P = load();
    const side = (dx, ex, wy) => ({ hp: [96, 128], knee: [96 + dx, 128], ank: [96 + dx, 168], heel: [92 + dx, 168], toe: [111 + dx, 168],
        sp: [96, 80], elb: [96 + ex, 106], wr: [96 + ex + 10, wy], db: false });
    const J = { hip: [96, 128], sh: [96, 80], n: side(40, 6, 120), f: side(36, 4, 128) };
    const r = P.rig(J, 'seat', 'march');
    const R = 30, d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    for (const s of ['n', 'f']) {
        assert.ok(d(r[s].ar, r.C) <= R * 1.05, 'arm starts on her bubble');
        assert.ok(d(r[s].hr, r.C) <= R * 1.05, 'leg starts on her bubble');
        assert.ok(d(r[s].elb, r[s].ar) < 26 * 0.8, 'short jelly upper arm');
        assert.ok(d(r[s].knee, r[s].hr) < 40 * 0.6, 'short jelly thigh');
    }
    /* the knee lifts when the move lifts it */
    const up = P.rig(Object.assign({}, J, { n: side(40, 6, 120) }), 'seat', 'march');
    J.n = Object.assign(side(40, 6, 120), { knee: [130, 108], ank: [134, 148] });
    const lifted = P.rig(J, 'seat', 'march');
    assert.ok(lifted.n.knee[1] < up.n.knee[1] - 5, 'knee goes up with the move');
    assert.ok(Math.abs(lifted.tilt) <= 45);
});

test('Misty limbs: drawn in code in her own glass, the working parts glow, reduced motion calms it', () => {
    const js = read('move-player.js'), css = read('move-player.css');
    assert.ok(js.includes("'<g class=\"mpj-body\">"), 'her bubble is the body');
    for (const c of ['mpj-glow', 'mpj-rim', 'mpj-fill', 'mpj-core', 'mpj-shine', 'mpj-mit', 'mpj-shoe-up', 'mpj-db-bar']) assert.ok(js.includes(c), c);
    assert.ok(!/\.(png|jpe?g|webp)['"]/.test(js.slice(js.indexOf('Misty with limbs'))), 'no picture assets');
    assert.ok(js.includes('function readJoints(svg)') && js.includes('function rig(J, stage, pose)'));
    assert.ok(js.includes('function genericJoints(t)'), 'a move without a drawn pose still marches in time');
    /* the old stick figure is hidden behind her, never drawn on top */
    assert.ok(css.includes('html #app #mv-player.mp #mv-fig.mpj-on > :not(.mpj) { display: none !important; }'));
    assert.ok(css.includes('#mv-fig:is(.mp-g-ua, .mp-g-fa) .mpj-arm .mpj-glow { animation: mpjHot'));
    assert.ok(css.includes('#mv-fig:is(.mp-g-thigh, .mp-g-shin) .mpj-leg .mpj-glow,'));
    const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.ok(rm.includes('html #app #mv-player.mp #mv-fig :is(.mpj-glow, .mpj-aura, .mpj-belt) { animation: none !important; }'));
    /* reduced motion: no squash wobble, limbs ease towards each pose */
    assert.ok(js.includes('const wob = rm ? 0 :'));
    assert.ok(js.includes('if (rm) {') && js.includes('S.smooth = J;'));
    /* state exposes the pose for the player */
    assert.ok(js.includes('pose: CUR.pose, stage: CUR.stage'));
});
