/* Mirror mode, deadlift / hip hinge (Oct 23 2026): pure logic + wiring checks. Real camera runs are only possible on a device. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const HC = require('../mirror-hinge-core.js');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const VIEW = { W: 390, H: 844 };
/* landmarks (view px) for a side-on person in a hinge pose. opt: round (deg the head curls down), knees (extra shin tilt),
   hands (px the hands drift forward), lean (torso lean override), front (stand front-on), hide (indices not seen) */
function person(d, opt) {
    opt = opt || {};
    const A = HC.defaultAnchor(VIEW.W, VIEW.H, opt.dir || 1), P = HC.pose(d);
    if (opt.knees) P.s += opt.knees;
    if (opt.lean != null) P.tau = opt.lean;
    const G = HC.ghost(A, P), dir = G.dir;
    let head = G.head;
    if (opt.round) {   /* rotate the head around the shoulder towards the floor */
        const v = [head[0] - G.sh[0], head[1] - G.sh[1]], a = opt.round * Math.PI / 180 * dir;
        head = [G.sh[0] + v[0] * Math.cos(a) - v[1] * Math.sin(a), G.sh[1] + v[0] * Math.sin(a) + v[1] * Math.cos(a)];
    }
    const wr = [G.wr[0] + dir * (opt.hands || 0), G.wr[1]];
    const lm = Array.from({ length: 33 }, () => ({ x: G.hip[0], y: G.hip[1], v: 0.1 }));
    const put = (i, p, v) => { lm[i] = { x: p[0], y: p[1], v: v == null ? 0.95 : v }; };
    const near = { 11: G.sh, 13: G.el, 15: wr, 23: G.hip, 25: G.knee, 27: G.ankle, 29: G.heel, 31: G.toe, 7: head };
    for (const k in near) put(+k, near[k]);
    const spread = opt.front ? A.torso * 0.8 : 4;
    put(12, [G.sh[0] + spread, G.sh[1]], 0.6); put(24, [G.hip[0] + spread * 0.7, G.hip[1]], 0.6);
    put(0, [head[0] + dir * A.headR * 0.8, head[1] + A.headR * 0.1], 0.9);
    for (const i of opt.hide || []) lm[i].v = 0.05;
    return lm;
}
const ang = (d, opt) => HC.angles(HC.measure(person(d, opt), VIEW.W, VIEW.H));
/* feed a list of depths at 30 fps through the rep counter */
function run(seq, opt, t0) {
    const r = new HC.Reps(), out = []; let t = t0 || 0;
    for (const d of seq) { const e = r.feed(t, ang(d, opt)); if (e) out.push(e); t += 1 / 30; }
    return { r, out };
}
function rep(frames) { const s = []; for (let i = 0; i < 20; i++) s.push(0); for (let i = 0; i <= frames; i++) s.push(i / frames); for (let i = 0; i < 10; i++) s.push(1); for (let i = frames; i >= 0; i--) s.push(i / frames); for (let i = 0; i < 20; i++) s.push(0); return s; }

test('measure: side-on person, facing, angles at the top and the bottom', () => {
    const top = ang(0), bot = ang(1), left = ang(1, { dir: -1 });
    assert.ok(Math.abs(top.tau) < 3, 'tall at the top: ' + top.tau);
    assert.ok(top.hipA > 170, 'hip open at the top: ' + top.hipA);
    assert.ok(bot.tau > 65 && bot.tau < 75, 'torso lean at the bottom ~70: ' + bot.tau);
    assert.ok(bot.kneeA > 130 && bot.kneeA < 150, 'soft knees, a hinge not a squat: ' + bot.kneeA);
    assert.ok(Math.abs(left.tau - bot.tau) < 1, 'facing left reads the same');
    assert.ok(Math.abs(bot.hands) < HC.T.hands, 'hands hang close to the legs: ' + bot.hands);
    assert.ok(bot.curl < HC.T.back, 'neutral head is not rounding: ' + bot.curl);
    assert.ok(bot.kneeFwd < HC.T.knee, 'knees behind the toes: ' + bot.kneeFwd);
});

test('reps: a full hinge counts once, clean', () => {
    const { r, out } = run(rep(45));
    assert.strictEqual(r.n, 1); assert.strictEqual(out.filter(e => e.type === 'rep').length, 1);
    assert.ok(out[0].clean, JSON.stringify(out[0]));
    assert.ok(out[0].depth >= 65);
});

test('reps: three in a row count three; a half rep does not count and says go deeper', () => {
    const three = run([].concat(rep(40), rep(40), rep(40)));
    assert.strictEqual(three.r.n, 3);
    const half = run(rep(30).map(d => d * 0.5));
    assert.strictEqual(half.r.n, 0);
    assert.ok(half.out.some(e => e.type === 'cue' && e.cue === 'deeper'), JSON.stringify(half.out));
});

test('reps: a jolt faster than 0.7 s is not a rep', () => {
    assert.strictEqual(run(rep(4)).r.n, 0);
});

test('form: rounding, knees forward, hands away are caught and make the rep not clean', () => {
    const cases = [['backr', { round: 60 }], ['knees', { knees: 26 }], ['hands', { hands: 90 }]];
    for (const [f, opt] of cases) {
        const seq = rep(45), r = new HC.Reps(); let t = 0, ev = null;
        for (const d of seq) { const e = r.feed(t, ang(d, d > 0.5 ? opt : {})); if (e && e.type === 'rep') ev = e; t += 1 / 30; }
        assert.ok(ev, f + ': rep still counts');
        assert.ok(!ev.clean && ev.faults.includes(f), f + ': ' + JSON.stringify(ev));
    }
});

test('form: not standing tall at the top says so; leaning back at the top says so', () => {
    const seq = Array(20).fill(0); for (let i = 0; i <= 40; i++) seq.push(i / 40); for (let i = 0; i < 10; i++) seq.push(1); for (let i = 40; i >= 8; i--) seq.push(i / 40); for (let i = 0; i < 60; i++) seq.push(0.12);   /* stops short of tall, hips still bent */
    const r = new HC.Reps(); let t = 0; const out = [];
    for (const d of seq) { const a = ang(d); if (d === 0.12) { a.tau = 10; a.hipA = 150; } const e = r.feed(t, a); if (e) out.push(e); t += 1 / 30; }
    assert.ok(out.some(e => e.cue === 'tall'), JSON.stringify(out));
    const lb = run(Array(30).fill(0), { lean: -20 });
    assert.ok(lb.out.some(e => e.cue === 'leanb'));
});

test('flow: align -> hold -> 3-2-1 -> follow; front-on asks to turn; a whole set then rest then next set', () => {
    const f = new HC.Flow({ lang: 'de', plan: { sets: 2, reps: 2, rest: 3 } });
    const m = (d, o) => HC.measure(person(d, o), VIEW.W, VIEW.H);
    let now = 0, s;
    s = f.update(now, m(0, { front: true }), VIEW); assert.strictEqual(s.hint, 'turn'); assert.strictEqual(s.hintText, 'Dreh dich seitlich zum Handy');
    s = f.update(now += 33, m(0, { hide: [27, 25] }), VIEW); assert.strictEqual(s.hint, 'body');
    for (let i = 0; i < 40; i++) s = f.update(now += 33, m(0), VIEW);
    assert.strictEqual(s.phase, 'count');
    assert.ok(f.anchor && Math.abs(f.anchor.torso - HC.defaultAnchor(390, 844).torso) < 2, 'calibrated from your body');
    for (let i = 0; i < 95; i++) s = f.update(now += 33, m(0), VIEW);
    assert.strictEqual(s.phase, 'follow');
    const evs = [];
    const doRep = () => { for (const d of rep(40)) { s = f.update(now += 33, m(d), VIEW); evs.push(...f.drain()); } };
    doRep(); assert.strictEqual(s.rep, 1);
    doRep(); assert.strictEqual(s.phase, 'rest'); assert.ok(evs.some(e => e.type === 'set' && e.set === 1 && e.clean === 2));
    for (let i = 0; i < 100; i++) { s = f.update(now += 33, m(0), VIEW); evs.push(...f.drain()); }
    assert.strictEqual(s.phase, 'follow'); assert.strictEqual(s.set, 2); assert.strictEqual(s.rep, 0);
    doRep(); doRep();
    assert.strictEqual(s.phase, 'done'); assert.strictEqual(s.done, 4); assert.strictEqual(s.clean, 4);
    assert.ok(evs.some(e => e.type === 'set' && e.last));
    assert.strictEqual(evs.filter(e => e.type === 'rep').length, 4);
});

test('flow: the guide waits for you at the top; losing you pauses; skip rest works', () => {
    const f = new HC.Flow({ plan: { sets: 2, reps: 1, rest: 40 } });
    const m = d => HC.measure(person(d), VIEW.W, VIEW.H);
    let now = 0, s;
    for (let i = 0; i < 140; i++) s = f.update(now += 33, m(0), VIEW);
    assert.strictEqual(s.phase, 'follow');
    for (let i = 0; i < 300; i++) s = f.update(now += 33, m(0), VIEW);   /* 10 s standing */
    assert.strictEqual(s.rep, 0); assert.ok(s.depth < 0.01, 'outline waits tall at the top: ' + s.depth);
    for (let i = 0; i < 45; i++) s = f.update(now += 33, { seen: false }, VIEW);
    assert.strictEqual(s.phase, 'lost');
    for (let i = 0; i < 30; i++) s = f.update(now += 33, m(0), VIEW);
    assert.strictEqual(s.phase, 'follow');
    for (const d of rep(40)) s = f.update(now += 33, m(d), VIEW);
    assert.strictEqual(s.phase, 'rest');
    f.skipRest(); s = f.update(now += 33, m(0), VIEW);
    assert.strictEqual(s.phase, 'follow'); assert.strictEqual(s.set, 2);
});

test('flow without camera: the guide counts one rep per cycle', () => {
    const f = new HC.Flow({ mode: 'free', plan: { sets: 1, reps: 3, rest: 5 } });
    let now = 0, s;
    for (let i = 0; i < 3 * 30 + 3 * HC.PER * 30 + 30; i++) s = f.update(now += 33.4, null, VIEW);
    assert.strictEqual(s.phase, 'done'); assert.strictEqual(s.done, 3);
});

test('guide: depth cycle and the outline stay in proportion', () => {
    assert.strictEqual(HC.depthAt(0), 0);
    assert.strictEqual(HC.depthAt(HC.PLAN.tempo.top + HC.PLAN.tempo.down + 0.1), 1);
    const A = HC.defaultAnchor(390, 844), G = HC.ghost(A, HC.pose(0));
    assert.ok(G.head[1] > 0 && G.toe[1] < 844, 'whole outline on an iPhone screen');
    const G2 = HC.ghost(HC.defaultAnchor(1180, 820), HC.pose(1));
    assert.ok(G2.hip[0] < 590 && G2.head[0] > 590, 'hips back, head forward at the bottom');
    for (const k of Object.keys(HC.HINTS)) for (const l of ['en', 'de', 'es']) assert.ok(HC.HINTS[k][l], k + ' ' + l);
});

test('wiring: scripts load in order, cached offline, reachable from the hero and the chooser', () => {
    const html = read('index.html'), sw = read('sw.js'), mm = read('mirror-move.js'), css = read('mirror-move.css');
    const i = f => html.indexOf('src="' + f);
    assert.ok(i('mirror-move-core.js') > 0 && i('mirror-hinge-core.js') > i('mirror-move-core.js') && i('mirror-hinge.js') > i('mirror-hinge-core.js') && i('mirror-move.js') > i('mirror-hinge.js'), 'script order');
    assert.ok(sw.includes('mirror-hinge-core.js') && sw.includes('mirror-hinge.js'), 'offline cache');
    assert.ok(/data-mm=\\?"hinge\\?"/.test(mm) && mm.includes("k === 'hinge'"), 'one tap from the Move hero');
    assert.ok(mm.includes('hingeCard()') && mm.includes("k === 'skiprest'"), 'chooser card and skip rest');
    assert.ok(/\.mm-hero-dl[^{]*\{[^}]*min-height:\s*(4[4-9]|5\d)px/.test(css), 'thumb-sized deadlift button');
    assert.ok(/\.mh-rep\.pop/.test(css) && /\.mh-misty/.test(css), 'rep bubble and Misty styles');
});
