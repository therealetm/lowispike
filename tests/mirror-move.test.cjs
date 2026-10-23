/* Mirror mode (camera follow-along): pure logic + wiring checks. Real camera/pose runs are in the browser checks, not here. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../mirror-move-core.js');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const VIEW = { W: 390, H: 844 };
/* landmarks (view px, mirrored) for a person exactly in the outline's pose */
function person(P, A, opt) {
    opt = opt || {};
    const G = C.ghost(A || C.defaultAnchor(VIEW.W, VIEW.H), P || C.REST), v = opt.v == null ? 0.95 : opt.v;
    const lm = Array.from({ length: 33 }, () => ({ x: G.hip[0], y: G.hip[1], v: 0.1 }));
    const put = (i, p, vis) => { lm[i] = { x: p[0], y: p[1], v: vis == null ? v : vis }; };
    put(0, G.head); put(11, G.L.sh); put(12, G.R.sh); put(13, G.L.el); put(14, G.R.el); put(15, G.L.wr); put(16, G.R.wr);
    put(23, G.hipL, opt.hipV); put(24, G.hipR, opt.hipV);
    if (opt.swap) { for (const [a, b] of [[11, 12], [13, 14], [15, 16], [23, 24]]) { const t = lm[a]; lm[a] = lm[b]; lm[b] = t; } }
    return lm;
}
const M = (lm, view) => C.measure(lm, (view || VIEW).W, (view || VIEW).H);

test('routines: chair, standing, floor; in bed and treadmill stay camera-free', () => {
    assert.deepStrictEqual(Object.keys(C.ROUTINES), ['chair', 'stand', 'floor']);
    for (const k of Object.keys(C.ROUTINES)) {
        const R = C.ROUTINES[k], P = C.plan(k);
        assert.ok(P.total >= 180 && P.total <= 330, k + ' total ' + P.total);
        assert.ok(R.place.length >= 3 && R.place.every(p => p.en && p.de && p.es), k + ' placement guide in 3 languages');
        for (const [m] of R.moves) assert.ok(C.MOVES[m], m);
    }
    assert.strictEqual(C.cameraOk('bed'), false);
    assert.strictEqual(C.cameraOk('chair'), true);
    assert.ok(/without the camera/i.test(C.BED.en));
});

test('the outline is a human: head above the shoulders, natural proportions, arms follow the angles', () => {
    const A = C.defaultAnchor(VIEW.W, VIEW.H);
    const down = C.ghost(A, C.REST);
    assert.ok(down.head[1] < down.shMid[1] - A.w * 0.5, 'head above shoulders');
    assert.ok(Math.abs(down.headR / A.w - 0.27) < 0.01, 'head about a quarter of shoulder width');
    assert.ok(down.L.wr[1] > down.L.sh[1] && down.R.wr[1] > down.R.sh[1], 'resting hands below shoulders');
    assert.ok(down.L.sh[0] < down.R.sh[0], 'L is the screen-left side');
    const t = C.ghost(A, { aL: 90, eL: 0, aR: 90, eR: 0, lean: 0 });
    assert.ok(Math.abs(t.L.wr[1] - t.L.sh[1]) < 1 && t.L.wr[0] < t.L.sh[0] - A.ua, 'T pose left arm out to the left');
    assert.ok(Math.abs(t.R.wr[1] - t.R.sh[1]) < 1 && t.R.wr[0] > t.R.sh[0] + A.ua, 'T pose right arm out to the right');
    const up = C.ghost(A, { aL: 175, eL: 0, aR: 12, eR: 15, lean: 0 });
    assert.ok(up.L.wr[1] < up.head[1], 'reach: hand above the head');
    const goal = C.ghost(A, { aL: 90, eL: 90, aR: 90, eR: 90, lean: 0 });
    assert.ok(goal.L.wr[1] < goal.L.el[1] - A.fa * 0.9, 'goal post: forearm points up');
    const lean = C.ghost(A, { aL: 12, eL: 15, aR: 12, eR: 15, lean: 14 });
    assert.ok(lean.shMid[0] > lean.hip[0] + A.torso * 0.2, 'positive lean tips the top to screen right');
});

test('every move is smooth and stays within comfortable ranges', () => {
    for (const id of Object.keys(C.ROUTINES)) {
        const P = C.plan(id); let prev = null;
        for (let t = 0; t < P.total; t += 0.1) {
            const p = C.poseAt(P, t).pose;
            for (const k of ['aL', 'aR']) assert.ok(p[k] >= 0 && p[k] <= 175, id + ' ' + k + ' ' + p[k]);
            assert.ok(Math.abs(p.lean) <= 14.01, 'side bend stays gentle');
            if (prev) for (const k of ['aL', 'aR', 'eL', 'eR', 'lean']) assert.ok(Math.abs(p[k] - prev[k]) < 20, id + ' jump in ' + k + ' at ' + t.toFixed(1) + ': ' + prev[k] + ' -> ' + p[k]);
            prev = p;
        }
    }
});

test('measure: screen sides come from where the shoulders are, not from the model labels', () => {
    const P = { aL: 170, eL: 5, aR: 12, eR: 15, lean: 0 };
    const a = M(person(P)), b = M(person(P, null, { swap: true }));
    assert.ok(a.okSh && a.okArms && a.okNose);
    assert.deepStrictEqual(a.L.el, b.L.el);
    assert.ok(a.L.wr[1] < a.R.wr[1], 'raised arm is the screen-left one');
    assert.strictEqual(M(person(P, null, { v: 0.2 })).okSh, false, 'low confidence does not count');
    assert.strictEqual(M(null), null);
});

test('match: same pose scores high, a different pose scores low, missing joints are skipped', () => {
    const P = { aL: 90, eL: 6, aR: 90, eR: 6, lean: 0 };
    const u = C.userPose(M(person(P)), [0, -1]);
    assert.ok(Math.abs(u.aL - 90) < 1 && Math.abs(u.aR - 90) < 1, 'reads back the arm angles');
    assert.ok(C.match(u, P) > 0.98);
    assert.ok(C.match(u, C.REST) < 0.1);
    const half = C.userPose(M(person({ aL: 50, eL: 6, aR: 50, eR: 6, lean: 0 })), [0, -1]);
    const q = C.match(half, P); assert.ok(q > 0.15 && q < 0.75, 'halfway is partial: ' + q);
    const lm = person(P); lm[13].v = 0.1; lm[15].v = 0.1; lm[14].v = 0.1; lm[16].v = 0.1;
    assert.strictEqual(C.match(C.userPose(M(lm), [0, -1]), P), null, 'no arms, no score');
    const L = { aL: 150, eL: 35, aR: 18, eR: 15, lean: 14 };
    const ul = C.userPose(M(person(L)), [0, -1]);
    assert.ok(Math.abs(ul.lean - 14) < 1.5, 'side bend read from hips: ' + ul.lean);
    assert.ok(C.match(ul, L, true) > 0.95);
});

function run(flow, from, to, lmFn, step, view) {
    let s, sum = 0, n = 0; for (let t = from; t <= to; t += step || 50) { s = flow.update(t, lmFn ? lmFn(t) : { seen: false }, view || VIEW); if (t > from + 18000) { sum += s.score; n++; } }
    s.mean = n ? sum / n : s.score; return s;
}

test('flow: get in place hints (mirror directions, distance, light) before anything starts', () => {
    const f = new C.Flow({ routine: 'chair' });
    let s = f.update(0, { seen: false }, VIEW); assert.strictEqual(s.phase, 'align'); assert.strictEqual(s.hint, 'find');
    f.setDark(true); s = f.update(50, { seen: false }, VIEW); assert.strictEqual(s.hint, 'dark'); f.setDark(false);
    const A = C.defaultAnchor(VIEW.W, VIEW.H);
    const big = Object.assign({}, A, { w: A.w * 1.9, torso: A.torso * 1.9, ua: A.ua * 1.9, fa: A.fa * 1.9 }); big.hip = [A.sh[0], A.sh[1] + big.torso];
    s = f.update(100, M(person(C.REST, big)), VIEW); assert.strictEqual(s.hint, 'back');
    const leftA = Object.assign({}, A, { sh: [A.sh[0] - A.w * 0.95, A.sh[1]] }); leftA.hip = [leftA.sh[0], leftA.sh[1] + A.torso];
    s = f.update(150, M(person(C.REST, leftA)), VIEW); assert.strictEqual(s.hint, 'right', 'image too far screen-left: move to your right (a mirror)');
    const lm = person(C.REST); lm[14].v = 0.1;
    s = f.update(200, M(lm), VIEW); assert.strictEqual(s.hint, 'arms');
    const nh = person(C.REST); nh[0].v = 0.1;
    s = f.update(250, M(nh), VIEW); assert.strictEqual(s.hint, 'head');
    assert.strictEqual(s.elapsed, 0, 'routine clock has not moved');
});

test('flow: hold still 1 s, 3-2-1, then the routine clock runs; it pauses while you are out of view', () => {
    const f = new C.Flow({ routine: 'chair' }), inPlace = () => M(person(C.REST));
    let s = run(f, 0, 900, inPlace); assert.strictEqual(s.phase, 'hold'); assert.strictEqual(s.hint, 'hold');
    s = run(f, 950, 1100, inPlace); assert.strictEqual(s.phase, 'count'); assert.strictEqual(s.count, 3);
    assert.ok(f.anchor && Math.abs(f.anchor.w - C.defaultAnchor(390, 844).w) < 1, 'calibrated to your own shoulder width');
    s = run(f, 1150, 4200, inPlace); assert.strictEqual(s.phase, 'follow');
    s = run(f, 4250, 9200, inPlace); assert.ok(Math.abs(s.elapsed - 5) < 0.3, 'about 5 s of routine: ' + s.elapsed);
    s = run(f, 9250, 10300, null); assert.strictEqual(s.phase, 'follow', 'a short miss is tolerated');
    s = run(f, 10350, 11000, null); assert.strictEqual(s.phase, 'lost'); assert.strictEqual(s.hint, 'lost');
    const at = s.elapsed;
    s = run(f, 11050, 20000, null); assert.strictEqual(s.elapsed, at, 'clock waits while lost');
    s = run(f, 20050, 20800, inPlace); assert.strictEqual(s.phase, 'follow', 'back in view: continues');
    f.pause(true); s = run(f, 20850, 25000, inPlace); assert.ok(s.paused); assert.ok(Math.abs(s.elapsed - at) < 0.3);
});

test('flow: following the outline gives a high match, standing still during raises gives a low one', () => {
    const f = new C.Flow({ routine: 'chair' });
    run(f, 0, 4300, () => M(person(C.REST)));
    assert.strictEqual(f.phase, 'follow');
    /* copy the outline (with a small lag) through the reach move */
    let s = run(f, 4350, 34000, t => M(person(C.poseAt(f.P, Math.max(0, f.t - 0.3)).pose, f.anchor)));
    assert.ok(s.mean > 0.85, 'following: ' + s.mean.toFixed(2));
    const f2 = new C.Flow({ routine: 'chair' });
    run(f2, 0, 4300, () => M(person(C.REST)));
    s = run(f2, 4350, 34000, () => M(person(C.REST, f2.anchor)));
    assert.ok(s.mean < 0.6, 'not moving: ' + s.mean.toFixed(2));
});

test('flow: start where I am after 8 s of being visible but off target; without camera never waits for you', () => {
    const f = new C.Flow({ routine: 'stand' }), A = C.defaultAnchor(390, 844);
    const off = Object.assign({}, A, { sh: [A.sh[0], A.sh[1] + A.w * 1.5] }); off.hip = [off.sh[0], off.sh[1] + A.torso];
    let s = run(f, 0, 7000, () => M(person(C.REST, off))); assert.strictEqual(s.canHere, false); assert.strictEqual(s.hint, 'lower');
    s = run(f, 7050, 8200, () => M(person(C.REST, off))); assert.strictEqual(s.canHere, true);
    f.startHere(); s = run(f, 8250, 9400, () => M(person(C.REST, off))); assert.strictEqual(s.phase, 'count');
    const g = new C.Flow({ routine: 'floor', mode: 'free' });
    s = run(g, 0, 3100, null); assert.strictEqual(s.phase, 'follow');
    s = run(g, 3150, 3150 + g.P.total * 1000 + 500, null, 200); assert.strictEqual(s.phase, 'done');
});

test('flow: switching to without camera mid-session keeps your progress', () => {
    const f = new C.Flow({ routine: 'chair' });
    run(f, 0, 9000, () => M(person(C.REST)));
    const at = f.t; f.toFree(); assert.strictEqual(f.mode, 'free');
    const s = run(f, 9050, 12000, null); assert.strictEqual(s.phase, 'follow'); assert.ok(s.elapsed > at + 2.5);
});

test('toView: object-fit cover mapping and mirroring', () => {
    const p = C.toView({ x: 0.25, y: 0.5, visibility: 0.9 }, 640, 480, 390, 844, true);
    const s = 844 / 480, ox = (390 - 640 * s) / 2;
    assert.ok(Math.abs(p.x - ((1 - 0.25) * 640 * s + ox)) < 1e-6); assert.ok(Math.abs(p.y - 422) < 1e-6); assert.strictEqual(p.v, 0.9);
    const q = C.toView({ x: 0.25, y: 0.5 }, 640, 480, 390, 844, false); assert.ok(q.x < p.x);
});

test('wiring: loaded on the Move screen, cached shell, world pauses behind it, model vendored', () => {
    const html = read('index.html');
    assert.ok(/<script src="mirror-move-core\.js\?v=[^"]+"><\/script>\s*(?:<script src="mirror-hinge(?:-core)?\.js\?v=[^"]+"><\/script>\s*)*<script src="mirror-move\.js\?v=/.test(html));
    assert.ok(/id="mmCss" href="mirror-move\.css\?v=/.test(html));
    assert.ok(html.includes('LowiMirror.heroHTML()'), 'hero card on the Move screen (Oct 22: moved up from the strip)');
    const sw = read('sw.js');
    for (const f of ['mirror-move.css', 'mirror-move-core.js', 'mirror-move.js']) assert.ok(sw.includes('"' + f + '"'), f + ' in sw STATIC');
    assert.ok(!/pose_landmarker|vision_wasm/.test(sw), 'the 24 MB model is not precached');
    assert.ok(read('body-world-3d.js').includes("H.classList.contains('mm-open')) return false"));
    for (const f of ['vision_bundle.mjs', 'pose_landmarker_lite.task', 'wasm/vision_wasm_internal.wasm', 'wasm/vision_wasm_internal.js', 'wasm/vision_wasm_nosimd_internal.wasm']) assert.ok(fs.existsSync(path.join(root, 'vendor/mediapipe-0.10.14', f)), f);
});

test('privacy and lifecycle: no audio, no upload, no storage of frames, camera stops on close / background / without camera', () => {
    const js = read('mirror-move.js');
    assert.ok(/getUserMedia\(\{ audio: false/.test(js));
    assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|MediaRecorder|toDataURL|toBlob|localStorage|indexedDB/.test(js), 'no network, recording or storage of frames');
    assert.ok(/visibilitychange[\s\S]{0,400}stopCamera\(\)/.test(js), 'stops when the app goes to the background');
    assert.ok(/function close\(\) \{\s*stopAll\(\)/.test(js), 'stops on close');
    assert.ok(/function goFree\(\) \{[^}]*stopCamera\(\)/.test(js), 'stops when switching to without camera');
    assert.ok(/function finish\(s\) \{[^}]*stopCamera\(\)/.test(js), 'stops when the routine ends');
    assert.ok(/nobody is recognised/.test(js) && /cannot tell if your form is safe/.test(js), 'privacy and form wording');
    assert.ok(!/correct form|perfect form/i.test(js + read('mirror-move-core.js')), 'never claims correct form');
});
