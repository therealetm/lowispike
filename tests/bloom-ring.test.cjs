'use strict';
/* Oct 23 2026, bloom ring (bloom-ring.js + home-blooms-v2.js): Emmanuel's "Rundung" symmetry for the secondary bubbles on Home,
   the zoom-out that makes room for them, and the two-finger tap on Misty that opens all of them at once.
   "Right now it looks very just scattered. It doesn't look symmetrical ... It's just a mess." / "Add a zoom out effect when the
   secondary bubbles open, so the view expands rather than cramping the elements on the screen."
   Browser check: tools/sim/bloom-ring.cjs (360x640, 390x844, iPad 820x1180). */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..');
const BR = require('../bloom-ring.js');
const ORBIT = require('../home-orbit-v2.js');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const VIEWS = [
    { name: 'small phone 360x640', w: 360, h: 640, safe: { t: 20, r: 0, b: 0, l: 0 } },
    { name: 'iPhone 390x844', w: 390, h: 844, safe: { t: 47, r: 0, b: 34, l: 0 } },
    { name: 'iPad 820x1180', w: 820, h: 1180, safe: { t: 24, r: 0, b: 20, l: 0 } }
];
/* the real Home ring from home-orbit-v2's own fit(), Misty in the middle of the screen */
function ringFor(v) {
    const mistyR = Math.round(Math.min(v.w, v.h) * 0.2);
    const L = ORBIT.fit({ vw: v.w, vh: v.h, cx: v.w / 2, cy: v.h * 0.5, mistyR, safe: v.safe });
    assert.ok(L.ok, v.name + ': ring fits');
    const ring = Object.keys(L.spots).map(k => ({ key: k, x: L.spots[k].x, y: L.spots[k].y, r: L.d / 2 }));
    return { c: { x: L.cx, y: L.cy }, mistyR, ring, L };
}
function solveFor(v, groups) {
    const g = ringFor(v);
    const d = Math.round(Math.max(60, Math.min(78, Math.min(v.w, v.h) * 0.17)));
    const out = BR.solve({ c: g.c, mistyR: g.mistyR, ring: g.ring, groups, d, gap: 10, between: 8,
        view: { w: v.w, h: v.h, t: v.safe.t + 6, r: v.safe.r, b: v.safe.b, l: v.safe.l }, margin: 8,
        maxS: groups.length > 1 ? 0.9 : 0.96, minS: 0.5, minD: 54 });
    return { g, out };
}
const ALL = [{ key: 'fuel', n: 3 }, { key: 'water', n: 2 }, { key: 'move', n: 3 }];
const ang = (a, b) => { let x = (a - b) % (Math.PI * 2); if (x > Math.PI) x -= Math.PI * 2; if (x < -Math.PI) x += Math.PI * 2; return x; };

for (const v of VIEWS) {
    for (const groups of [ALL, [{ key: 'move', n: 3 }], [{ key: 'fuel', n: 3 }], [{ key: 'water', n: 2 }]]) {
        const label = v.name + ' / ' + groups.map(x => x.key).join('+');
        test('one round, symmetrical: ' + label, () => {
            const { g, out } = solveFor(v, groups);
            const total = groups.reduce((t, x) => t + x.n, 0);
            assert.equal(out.orbs.length, total, 'every orb placed');
            assert.ok(out.fit, 'fits on screen');
            /* every orb on ONE circle round Misty */
            out.orbs.forEach(p => assert.ok(Math.abs(Math.hypot(p.x - g.c.x, p.y - g.c.y) - out.rho) < 0.5, 'on the circle'));
            /* the same angle between neighbours inside every group, and each group centred on its own centre */
            out.groups.forEach(gr => {
                const mine = out.orbs.filter(p => p.key === gr.key).sort((a, b) => a.i - b.i);
                for (let i = 1; i < mine.length; i++) assert.ok(Math.abs(Math.abs(ang(mine[i].a, mine[i - 1].a)) - out.step) < 1e-6, 'same spacing');
                const mid = mine.reduce((t, p) => t + ang(p.a, gr.c), 0) / mine.length;
                assert.ok(Math.abs(mid) < 1e-6, 'mirror-symmetric about its centre line');
            });
            /* centred on the bubble's own direction unless a neighbour pushed it (then both stay close to home) */
            if (groups.length === 1) out.groups.forEach(gr => assert.ok(Math.abs(ang(gr.c, gr.a)) < 1e-6, 'a single bloom faces its bubble exactly'));
            /* no two orbs touch */
            const r = out.d / 2;
            for (let i = 0; i < out.orbs.length; i++) for (let j = i + 1; j < out.orbs.length; j++)
                assert.ok(Math.hypot(out.orbs[i].x - out.orbs[j].x, out.orbs[i].y - out.orbs[j].y) >= out.d + 4, 'orbs apart');
            /* fully on screen, inside the safe area */
            out.orbs.forEach(p => {
                assert.ok(p.x - r >= 8 - 0.5 && p.x + r <= v.w - 8 + 0.5, 'inside left/right');
                assert.ok(p.y - r >= v.safe.t + 6 + 8 - 0.5 && p.y + r <= v.h - v.safe.b - 8 + 0.5, 'inside top/bottom');
            });
            /* never on a Home bubble or on Misty once the ring has pulled back (scale s round Misty's centre) */
            g.ring.forEach(b => {
                const bx = g.c.x + (b.x - g.c.x) * out.s, by = g.c.y + (b.y - g.c.y) * out.s, br = b.r * out.s;
                out.orbs.forEach(p => assert.ok(Math.hypot(p.x - bx, p.y - by) >= r + br, 'clear of ' + b.key));
            });
            out.orbs.forEach(p => assert.ok(Math.hypot(p.x - g.c.x, p.y - g.c.y) >= g.mistyR * out.s + r, 'clear of Misty'));
            /* the view really zooms out (the pull-back), never in, and never below half */
            assert.ok(out.s < 1 && out.s >= 0.5, 'zoom out ' + out.s);
            /* orbs keep a readable size */
            assert.ok(out.d >= 54, 'orb size ' + out.d);
        });
    }
}

test('all blooms at once still pull back (the view opens up instead of cramming)', () => {
    for (const v of VIEWS) { const all = solveFor(v, ALL).out; assert.ok(all.s <= 0.9, v.name + ': ' + all.s); }
});

test('pack keeps groups apart by one step and moves the bigger group less', () => {
    const step = 0.3;
    const g = BR.pack([{ key: 'a', a: 0, n: 4 }, { key: 'b', a: 0.2, n: 1 }], step);
    const A = g.find(x => x.key === 'a'), B = g.find(x => x.key === 'b');
    assert.ok(Math.abs(ang(B.c, A.c)) >= A.h + B.h + step - 1e-5, 'apart');
    assert.ok(Math.abs(ang(A.c, 0)) < Math.abs(ang(B.c, 0.2)), 'bigger group moved less');
});

test('two-finger tap: both fingers on Misty, close together in time, short and still', () => {
    const base = { downs: [{ x: 0, y: 0, t: 0 }, { x: 30, y: 0, t: 60 }], onTarget: [true, true], upAt: 300, moved: 4, spreadChange: 3 };
    assert.equal(BR.isTwoFingerTap(base), true, 'a clean two-finger tap');
    assert.equal(BR.isTwoFingerTap(Object.assign({}, base, { moved: 40 })), false, 'fingers moving = a drag');
    assert.equal(BR.isTwoFingerTap(Object.assign({}, base, { spreadChange: 60 })), false, 'a pinch is never a two-finger tap');
    assert.equal(BR.isTwoFingerTap(Object.assign({}, base, { upAt: 900 })), false, 'held too long = not a tap');
    assert.equal(BR.isTwoFingerTap(Object.assign({}, base, { onTarget: [true, false] })), false, 'one finger off Misty');
    assert.equal(BR.isTwoFingerTap(Object.assign({}, base, { extra: true })), false, 'three fingers');
    assert.equal(BR.isTwoFingerTap(Object.assign({}, base, { downs: [base.downs[0]] })), false, 'one finger');
    assert.equal(BR.isTwoFingerTap(Object.assign({}, base, { downs: [{ x: 0, y: 0, t: 0 }, { x: 30, y: 0, t: 500 }] })), false, 'second finger far later');
});

test('wiring: shipped, precached, loaded after the blooms, and the blooms use it', () => {
    const html = read('index.html'), sw = read('sw.js'), hb = read('home-blooms-v2.js'), br = read('bloom-ring.js');
    const iBlooms = html.indexOf('<script src="home-blooms-v2.js'), iRing = html.indexOf('<script src="bloom-ring.js');
    assert.ok(iBlooms > 0 && iRing > iBlooms, 'bloom-ring.js loads after home-blooms-v2.js');
    assert.match(html, /<link rel="stylesheet" id="brCss" href="bloom-ring\.css\?v=/, 'its stylesheet is in the page');
    assert.match(sw, /"bloom-ring\.js", "bloom-ring\.css"/, 'offline cache has both files');
    assert.ok(fs.existsSync(path.join(ROOT, 'bloom-ring.css')), 'css exists');
    assert.match(hb, /LowiBloomRing/, 'blooms use the ring');
    assert.match(hb, /openAll, isAll: \(\) => st\.open === 'all'/, 'openAll / isAll in the API');
    assert.match(hb, /unzoom\('blooms'\)/, 'closing a bloom brings the view back');
    assert.match(br, /B\.openAll\(\)/, 'two-finger tap opens every bloom');
    assert.match(br, /getElementById\('spBubble'\)/, 'the two-finger tap is on Misty');
});

test('Misty keeps her gestures: hold = stats, double tap = talk + heart; a second finger cancels the hold', () => {
    const wh = read('world-home.js'), br = read('bloom-ring.js');
    assert.match(wh, /if \(t && pid != null && e\.pointerId !== pid\) \{ stop\(\); pid = null; return; \}/, 'second finger cancels the hold');
    assert.match(wh, /openMisty\('aura'\); \}, 520\)/, 'hold still opens her stats');
    /* a two-finger tap swallows the click that follows, so it never counts as a tap or a double tap on Misty */
    assert.match(br, /addEventListener\('dblclick', onClick, true\)/, 'double tap after a two-finger tap is swallowed');
    assert.match(br, /swallowUntil = Date\.now\(\) \+ 600/, 'only right after the two-finger tap');
});

test('the ring holds still while the view is pulled back (never re-measured from a scaled Misty)', () => {
    const o = read('home-orbit-v2.js');
    assert.match(o, /if \(H\.classList\.contains\('br-zoom'\) && last && last\.ok\) return last;/);
    assert.match(o, /spots, mistyR \};/, 'the layout carries Misty\'s radius for the ring maths');
});
