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
    const V = opt.v || 'rdl', A = HC.defaultAnchor(VIEW.W, VIEW.H, opt.dir || 1, V), P = HC.pose(d, V);
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
    const r = new HC.Reps((opt && opt.v) || 'rdl'), out = []; let t = t0 || 0;
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
        const seq = rep(45), r = new HC.Reps('rdl'); let t = 0, ev = null;
        for (const d of seq) { const e = r.feed(t, ang(d, d > 0.5 ? opt : {})); if (e && e.type === 'rep') ev = e; t += 1 / 30; }
        assert.ok(ev, f + ': rep still counts');
        assert.ok(!ev.clean && ev.faults.includes(f), f + ': ' + JSON.stringify(ev));
    }
});

test('form: not standing tall at the top says so; leaning back at the top says so', () => {
    const seq = Array(20).fill(0); for (let i = 0; i <= 40; i++) seq.push(i / 40); for (let i = 0; i < 10; i++) seq.push(1); for (let i = 40; i >= 8; i--) seq.push(i / 40); for (let i = 0; i < 60; i++) seq.push(0.12);   /* stops short of tall, hips still bent */
    const r = new HC.Reps('rdl'); let t = 0; const out = [];
    for (const d of seq) { const a = ang(d); if (d === 0.12) { a.tau = 10; a.hipA = 150; } const e = r.feed(t, a); if (e) out.push(e); t += 1 / 30; }
    assert.ok(out.some(e => e.cue === 'tall'), JSON.stringify(out));
    const lb = run(Array(30).fill(0), { lean: -20 });
    assert.ok(lb.out.some(e => e.cue === 'leanb'));
});

test('flow: align -> hold -> 3-2-1 -> follow; front-on asks to turn; a whole set then rest then next set', () => {
    const f = new HC.Flow({ lang: 'de', variant: 'rdl', plan: { sets: 2, reps: 2, rest: 3 } });
    const m = (d, o) => HC.measure(person(d, o), VIEW.W, VIEW.H);
    let now = 0, s;
    s = f.update(now, m(0, { front: true }), VIEW); assert.strictEqual(s.hint, 'turn'); assert.strictEqual(s.hintText, 'Dreh dich seitlich zum Handy');
    s = f.update(now += 33, m(0, { hide: [27, 25] }), VIEW); assert.strictEqual(s.hint, 'body');
    for (let i = 0; i < 40; i++) s = f.update(now += 33, m(0), VIEW);
    assert.strictEqual(s.phase, 'count');
    assert.ok(f.anchor && Math.abs(f.anchor.torso - HC.defaultAnchor(390, 844, 1, 'rdl').torso) < 2, 'calibrated from your body');
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
    const f = new HC.Flow({ variant: 'rdl', plan: { sets: 2, reps: 1, rest: 40 } });
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
    const G2 = HC.ghost(HC.defaultAnchor(1180, 820, 1, 'rdl'), HC.pose(1, 'rdl'));
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

/* Oct 24 2026: Deadlift split into Romanian, Conventional and Sumo (Emmanuel: "Deadlift (Romanian, conventional und sumo) separat aufteil als options") */
test('deadlift variants: three, in order, named in all three languages, one-word pill labels', () => {
    assert.deepStrictEqual(HC.VORDER, ['rdl', 'conv', 'sumo']);
    const want = { en: ['Romanian Deadlift', 'Conventional Deadlift', 'Sumo Deadlift'], de: ['Rumänisches Kreuzheben', 'Kreuzheben (konventionell)', 'Sumo-Kreuzheben'], es: ['Peso muerto rumano', 'Peso muerto convencional', 'Peso muerto sumo'] };
    const words = { en: ['Romanian', 'Conventional', 'Sumo'], de: ['Rumänisch', 'Konventionell', 'Sumo'], es: ['Rumano', 'Convencional', 'Sumo'] };
    for (const l of ['en', 'de', 'es']) HC.VORDER.forEach((k, i) => {
        const V = HC.VARIANTS[k];
        assert.strictEqual(HC.txt(V.n, l), want[l][i]); assert.strictEqual(HC.txt(V.w, l), words[l][i]);
        assert.ok(!/\s/.test(HC.txt(V.w, l)), 'one word: ' + HC.txt(V.w, l));
        for (const f of ['sub', 'cue']) assert.ok(HC.txt(V[f], l).length > 10, k + ' ' + f + ' ' + l);
        const R = HC.routineFor(k);
        assert.strictEqual(R.variant, k); assert.strictEqual(HC.txt(R.n, l), want[l][i]); assert.ok(R.place && R.fine, 'keeps the shared placement and fine print');
    });
    assert.strictEqual(HC.txt(HC.ROUTINE.n, 'de'), 'Kreuzheben', 'the group (hero button, chooser card) stays one Deadlift entry');
    assert.ok(/Rumänisch, konventionell oder Sumo/.test(HC.txt(HC.ROUTINE.sub, 'de')));
});

test('deadlift variants: no pick or an unknown one is conventional (older deadlifts map there)', () => {
    assert.strictEqual(HC.VDEF, 'conv');
    for (const v of [undefined, null, '', 'hinge', 'deadlift', 'xyz']) assert.strictEqual(HC.vid(v), 'conv');
    const f = new HC.Flow({ lang: 'en' });
    assert.strictEqual(f.variant, 'conv'); assert.strictEqual(f.R.variant, 'conv');
    const s = f.snap(); assert.strictEqual(s.variant, 'conv'); assert.strictEqual(s.kind, 'hinge');
    assert.strictEqual(new HC.Flow({ variant: 'sumo' }).snap().moveName, 'Sumo Deadlift');
    assert.strictEqual(new HC.Flow({ variant: 'rdl', lang: 'de' }).snap().moveName, 'Rumänisches Kreuzheben');
});

test('deadlift variants: each has its own outline, and each counts its own full rep once, clean', () => {
    const bot = {}; for (const v of HC.VORDER) bot[v] = ang(1, { v });
    assert.ok(bot.rdl.tau > bot.conv.tau && bot.conv.tau > bot.sumo.tau, 'chest most upright in sumo, most forward in Romanian: ' + [bot.rdl.tau, bot.conv.tau, bot.sumo.tau].map(Math.round));
    assert.ok(bot.rdl.kneeA > bot.conv.kneeA + 15 && bot.rdl.kneeA > bot.sumo.kneeA + 15, 'Romanian keeps the knees softest: ' + [bot.rdl.kneeA, bot.conv.kneeA, bot.sumo.kneeA].map(Math.round));
    assert.ok(bot.conv.kneeA > 95 && bot.sumo.kneeA > 95, 'conventional and sumo bend the knees, not a full squat');
    for (const v of HC.VORDER) {
        const T = HC.thresholds(v), b = bot[v];
        assert.ok(b.tau > T.deep + 5, v + ' bottom is deep enough for its own rule: ' + b.tau + ' vs ' + T.deep);
        assert.ok(b.kneeFwd < T.knee && b.kneeA > T.kneeAng && Math.abs(b.hands) < T.hands && b.curl < T.back, v + ' good form reads as good: ' + JSON.stringify(b));
        const { r, out } = run(rep(45), { v });
        assert.strictEqual(r.n, 1, v + ' one rep'); assert.ok(out[0].clean, v + ' clean ' + JSON.stringify(out[0]));
        const three = run([].concat(rep(40), rep(40), rep(40)), { v });
        assert.strictEqual(three.r.n, 3, v + ' three in a row');
    }
    /* the variant's own cues */
    const half = run([].concat(new Array(20).fill(0), Array.from({ length: 31 }, (_, i) => i / 30 * 0.62), new Array(10).fill(0.62), Array.from({ length: 31 }, (_, i) => 0.62 * (1 - i / 30)), new Array(30).fill(0)), { v: 'conv' });
    assert.strictEqual(half.r.n, 0, 'a half conventional rep does not count');
    assert.ok(half.out.some(e => e.type === 'cue' && e.cue === 'deeper'), JSON.stringify(half.out));
    assert.strictEqual(HC.txt(HC.hintFor('deeper', 'conv'), 'de'), 'Weiter runter: Hände bis zu den Schienbeinen');
    assert.strictEqual(HC.txt(HC.hintFor('knees', 'sumo'), 'en'), 'Push your knees out over the toes, not forward');
    assert.strictEqual(HC.hintFor('round', 'sumo'), HC.HINTS.round, 'shared cues stay shared');
});

test('deadlift variants: the whole movement fits on iPhone, small iPhone and iPad', () => {
    for (const [W, H] of [[390, 844], [375, 667], [820, 1180], [1180, 820]]) for (const v of HC.VORDER) for (const dir of [1, -1]) {
        const A = HC.defaultAnchor(W, H, dir, v), G1 = HC.ghost(A, HC.pose(1, v)), G0 = HC.ghost(A, HC.pose(0, v));
        const xs = [G1.head[0] - G1.headR, G1.head[0] + G1.headR, G1.hip[0] - G1.w * 0.6, G1.hip[0] + G1.w * 0.6, G1.toe[0], G1.heel[0], G0.head[0]];
        assert.ok(Math.min(...xs) >= 0 && Math.max(...xs) <= W, v + ' ' + W + 'x' + H + ' dir ' + dir + ': ' + xs.map(Math.round));
        assert.ok(G0.head[1] - G0.headR >= 0, v + ' head on screen when standing');
    }
});

test('deadlift variants wiring: picker in the setup sheet, remembered, passed to the flow, done event carries it', () => {
    const mm = read('mirror-move.js'), mh = read('mirror-hinge.js'), css = read('mirror-move.css');
    assert.ok(/HG\(\)\.pickHTML\(dlv\(\)/.test(mm), 'pills in the deadlift setup sheet');
    assert.ok(/G\.makeFlow\(mode, lang\(\), dlv\(\)\)/.test(mm), 'flow gets the variant');
    assert.ok(/k === 'dlv'/.test(mm) && /G\.setPick\(v\)/.test(mm) && /'lowi\.mm\.dl'/.test(mh), 'tap picks and remembers');
    assert.ok(!/localStorage/.test(mm), 'mirror-move.js still stores nothing');
    assert.ok(/routine: 'hinge', variant: s\.variant/.test(mm), 'lowi:mirror-done keeps routine hinge and adds the variant');
    assert.ok(/role="radiogroup"/.test(mh) && /role="radio"/.test(mh) && /aria-checked/.test(mh), 'a real radio group');
    assert.ok(/data-mm="hinge">' \+ esc\(T\('Another one'/.test(mh), 'Another one goes straight back to the deadlift setup');
    assert.ok(/\.mh-var \{[^}]*justify-content: center[^}]*margin: 12px auto/.test(css), 'centred pill row');
    assert.ok(/\.mh-vb \{[^}]*min-height: 44px[^}]*white-space: nowrap/.test(css), 'thumb-sized, one line');
    /* the pill markup */
    const T = (e, d, s) => d, esc = x => String(x), w = { LowiHingeCore: HC };
    const html = new Function('window', 'document', mh + '; return window.LowiMirrorHinge;')(w, { createElement: () => ({}), getElementById: () => null, head: { appendChild() {} } });
    assert.ok(html && html.pickHTML, 'pickHTML exported');
    const store = {}; w.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
    assert.strictEqual(html.getPick(), 'conv', 'nothing stored: conventional');
    html.setPick('rdl'); assert.strictEqual(store['lowi.mm.dl'], 'rdl'); assert.strictEqual(html.getPick(), 'rdl');
    store['lowi.mm.dl'] = 'deadlift'; assert.strictEqual(html.getPick(), 'conv', 'unknown stored word: conventional');
    {
        const h = html.pickHTML('sumo', T, esc, 'de');
        assert.ok(/aria-checked="true"[^>]*data-v="sumo"[^>]*aria-label="Sumo-Kreuzheben">Sumo</.test(h), h);
        assert.ok(/data-v="rdl" aria-label="Rumänisches Kreuzheben">Rumänisch</.test(h), h);
        assert.ok(/Breiter Stand/.test(h));
    }
});
