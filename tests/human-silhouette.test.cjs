'use strict';
/* Oct 16, 2026 (evening): the Move workout figure is a plain human silhouette in the app's liquid cell glass. E-man: putting the
   companion's head on a body "broke everything"; keep the liquid cell / bubble style, but a human body. Misty stays on Home and
   everywhere else. The body is drawn at the real size of the joints the workout's move clock already solves, so every rep is in time. */
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
const box = pts => [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
/* the standing skeleton Figure.draw solves (index.html): hip, shoulder, head, one side's limbs */
function standing() {
    const side = o => ({ hp: [96 + o, 102], knee: [96 + o, 142], ank: [96 + o, 182], heel: [92 + o, 182], toe: [111 + o, 182],
        sp: [96 + o, 54], elb: [96 + o, 80], wr: [96 + o, 104], db: false });
    return { hip: [96, 102], sh: [96, 54], hd: [99, 37], n: side(0), f: side(-5) };
}

test('Workout figure: every exercise has a pose and a place (platform, pouf, bed or mat)', () => {
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
    assert.equal(P.stageOf({ base: 'bedsit' }), 'bed', 'sitting up in bed sits on the bed, not on a pouf');
    assert.equal(P.stageOf({ base: 'bed' }), 'bed');
    assert.equal(P.stageOf({ base: 'quad' }), 'mat');
    assert.equal(P.stageOf(null), 'stand');
});

test('Workout figure: a naturally proportioned human body on the real skeleton (no short mascot limbs)', () => {
    const F = load().figure, J = standing(), fr = F.frameOf(J, 'stand');
    assert.ok(fr.fr[0] > 0.99 && Math.abs(fr.fr[1]) < 0.01, 'standing, the chest faces the way the toes point');
    const torso = box(F.torsoPts(J, fr)), head = F.headPts(J, fr), hb = box(head.pts);
    /* the torso spans hip to shoulders with a real chest depth; the head sits above it on a neck */
    assert.ok(torso[3] > 102 + 8 && torso[1] < 54, 'torso runs from below the hip joint to above the shoulder joint');
    const chest = torso[2] - torso[0];
    assert.ok(chest >= 20 && chest <= 26, 'chest depth ' + chest);
    const hh = hb[3] - hb[1], hw = hb[2] - hb[0];
    assert.ok(hh >= 19 && hh <= 24, 'head height ' + hh);
    assert.ok(hw < chest && hw < hh, 'a human head: narrower than the chest, taller than wide');
    assert.ok(hb[3] < torso[1] + 8, 'head above the shoulders');
    const total = 186 - hb[1];
    assert.ok(total / hh > 6.5 && total / hh < 8, 'about 7 heads tall: ' + (total / hh).toFixed(2));
    assert.ok(Math.max(...head.pts.map(p => p[0])) - 99 > Math.abs(Math.min(...head.pts.map(p => p[0])) - 99) - 2, 'the face is on the front of the head');
    /* arms and legs are drawn at the solver's full lengths: thigh 40, shin 40, upper arm 26, forearm 24 */
    const js = read('move-player.js');
    assert.ok(js.includes("const th = pathOf([q.hp, q.knee]), sn = pathOf([q.knee, q.ank])"), 'legs straight from the solved joints');
    assert.ok(js.includes("const ua = pathOf([q.sp, q.elb]), fa = pathOf([q.elb, q.wr])"), 'arms straight from the solved joints');
    /* feet: the sole faces away from the shin, toes forward */
    const foot = box(F.footPts(J.n));
    assert.ok(foot[3] <= 186 && foot[3] > 184, 'sole on the floor');
    assert.ok(foot[2] > 96 + 12 && foot[0] < 96 - 3, 'heel behind, toes in front');
    /* on hands and knees the chest faces the mat */
    const quad = { hip: [122, 108], sh: [74.7, 99.7], hd: [57, 103] };
    assert.ok(F.frameOf(quad, 'mat').fr[1] > 0.9, 'hands and knees: belly down');
    const bed = { hip: [110, 141], sh: [62, 141], hd: [44, 140] };
    assert.ok(F.frameOf(bed, 'bed').fr[1] < -0.9, 'lying on the back: chest up');
    /* the outlines are smooth closed curves with real numbers */
    const d = F.blob(F.torsoPts(J, fr));
    assert.match(d, /^M[\d. -]+C/); assert.ok(d.endsWith('Z')); assert.ok(!/NaN|Infinity/.test(d));
    /* a move with no drawn pose still marches in time */
    const g = F.genericJoints(0.3);
    assert.ok(g.n.knee[1] < g.f.knee[1], 'one knee up');
});

test('Workout figure: the companion is not on the body, the liquid cell glass is, the working parts glow', () => {
    const js = read('move-player.js'), css = read('move-player.css');
    const fig = js.slice(js.indexOf('the workout figure: a human silhouette'), js.indexOf('IN YOUR BODY: glow the pill'));
    assert.ok(fig.length > 2000, 'figure section found');
    /* no companion artwork anywhere in the figure: no clone of her bubble, no head of hers */
    for (const bad of ['cloneNode', 'sp-home-herb', 'function uniq(', 'mistyHead', 'mpj-', 'cw-face', 'lh-face']) assert.ok(!fig.includes(bad), 'no ' + bad);
    assert.ok(!/\.(png|jpe?g|webp)['"]/.test(fig), 'no picture assets');
    /* a whole human: head, neck, torso, upper and lower arms, hands, thighs, shins, feet */
    for (const c of ['mph-rim mph-head', 'mph-rim mph-neck', 'mph-rim mph-torso', 'mph-rim mph-ua', 'mph-rim mph-fa', 'mph-frim mph-hand',
        'mph-rim mph-thigh', 'mph-rim mph-shin', 'mph-frim mph-foot']) assert.ok(fig.includes(c), c);
    /* one liquid outline: every rim of a body part is drawn before every fill, then the soft core, the nucleus and the shine */
    const body = fig.slice(fig.indexOf('const BODY_HTML'), fig.indexOf('let S = null'));
    assert.ok(body.indexOf('mph-rim mph-head') < body.indexOf('mph-fill mph-torso'));
    for (const c of ['mph-fill', 'mph-core', 'mph-shine', 'mph-heart', 'mph-db-bar']) assert.ok(fig.includes(c), c);
    /* the old stick figure stays hidden behind it */
    assert.ok(css.includes('html #app #mv-player.mp #mv-fig.mph-on > :not(.mph) { display: none !important; }'));
    /* glow layers exist only for the parts being worked (lighter on the phone) */
    assert.match(css, /#mv-fig \.mph-glow \{ display: none;/);
    assert.ok(css.includes('#mv-fig.mp-g-ua .mph-ua.mph-glow, #mv-fig.mp-g-fa .mph-fa.mph-glow'));
    assert.ok(css.includes('filter: url(#mpHotF)'));
    const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.ok(rm.includes('html #app #mv-player.mp #mv-fig :is(.mph-glow, .mph-footg, .mph-heart, .mph-belt) { animation: none !important; }'));
    /* reduced motion: the body eases towards each pose */
    assert.ok(js.includes('if (rm) {') && js.includes('S.smooth = J;'));
    /* attributes are only written when they change */
    assert.ok(js.includes('const SET = (el, k, v) => { if (el && el.__v !== v)'));
    assert.ok(js.includes("figure: S ? 'human' : ''") && js.includes('pose: CUR.pose, stage: CUR.stage'));
    /* Misty herself is untouched: her Home bubble code is not part of this figure */
    assert.ok(!css.includes('.mpj-'), 'no old companion-limb styles left');
});
