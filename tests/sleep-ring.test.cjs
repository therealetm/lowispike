'use strict';
/* Oct 23 2026, 18:03: Eman's iPhone, live build after 20261023-173928.
   "Sleeping isn't aligned": tapping Sleep showed its three answers as a loose row bottom left with a question line under them.
   "Da fehlt doch was": two fingers on Misty opened Log meal, Cook, Shop, Sips, Cup, Bottle, Casual, Steady, Epic and nothing else,
   so the lower left stayed empty and the ring was a lopsided arc.
   "Every bubble needs to look like the bubble of our bubble style": the secondary bubbles were dark navy discs with a hard rim.
   A red dot with a pink ring (a glowing body place) sat right on the edge of the Sleep bubble.
   Browser check: tools/sim/sleep-ring.cjs (iPhone and iPad, local or live). */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..');
const BR = require('../bloom-ring.js');
const ORBIT = require('../home-orbit-v2.js');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const TAU = Math.PI * 2;
const ang = (a, b) => { let x = (a - b) % TAU; if (x > Math.PI) x -= TAU; if (x < -Math.PI) x += TAU; return x; };

const VIEWS = [
    { name: 'small phone 360x640', w: 360, h: 640, safe: { t: 20, r: 0, b: 0, l: 0 } },
    { name: 'iPhone 390x844', w: 390, h: 844, safe: { t: 47, r: 0, b: 34, l: 0 } },
    { name: 'iPhone landscape 844x390', w: 844, h: 390, safe: { t: 0, r: 47, b: 21, l: 47 } },
    { name: 'iPad 820x1180', w: 820, h: 1180, safe: { t: 24, r: 0, b: 20, l: 0 } },
    { name: 'iPad landscape 1180x820', w: 1180, h: 820, safe: { t: 24, r: 0, b: 20, l: 0 } }
];
function ringFor(v) {
    const mistyR = Math.round(Math.min(v.w, v.h) * 0.2);
    const L = ORBIT.fit({ vw: v.w, vh: v.h, cx: v.w / 2, cy: v.h * 0.5, mistyR, safe: v.safe });
    const ring = Object.keys(L.spots).map(k => ({ key: k, x: L.spots[k].x, y: L.spots[k].y, r: L.d / 2 }));
    return { c: { x: L.cx, y: L.cy }, mistyR, ring, L };
}
function solveFor(v, groups, even) {
    const g = ringFor(v);
    const d = Math.round(Math.max(60, Math.min(78, Math.min(v.w, v.h) * 0.17)));
    const out = BR.solve({ c: g.c, mistyR: g.mistyR, ring: g.ring, groups, d, gap: 10, between: 8, even,
        view: { w: v.w, h: v.h, t: v.safe.t + 6, r: v.safe.r, b: v.safe.b, l: v.safe.l }, margin: 8,
        maxS: groups.length > 1 ? 0.9 : 0.96, minS: 0.5, minD: 54 });
    return { g, out };
}
const ALL4 = [{ key: 'fuel', n: 3 }, { key: 'water', n: 3 }, { key: 'move', n: 3 }, { key: 'sleep', n: 3 }];

for (const v of VIEWS) {
    test('two fingers: all 12 orbs on ONE full, even circle, nothing off screen or overlapping (' + v.name + ')', () => {
        const { g, out } = solveFor(v, ALL4, true);
        assert.ok(out && out.even, 'even layout used');
        assert.equal(out.orbs.length, 12, 'Fuel 3 + Water 3 + Move 3 + Sleep 3');
        const step = TAU / 12;
        const as = out.orbs.map(o => Math.atan2(o.y - g.c.y, o.x - g.c.x)).sort((a, b) => a - b);
        for (let i = 0; i < as.length; i++) {
            const gap = ang(as[(i + 1) % as.length], as[i]);
            assert.ok(Math.abs(Math.abs(gap) - step) < 1e-6, 'every orb exactly 30 degrees from the next (' + gap + ')');
        }
        out.orbs.forEach(o => {
            const r = Math.hypot(o.x - g.c.x, o.y - g.c.y);
            assert.ok(Math.abs(r - out.rho) < 1e-6, 'all on the same circle');
            assert.ok(o.x - out.d / 2 >= -0.5 && o.x + out.d / 2 <= v.w + 0.5 && o.y - out.d / 2 >= -0.5 && o.y + out.d / 2 <= v.h + 0.5, o.key + ' on screen');
        });
        for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
            const a = out.orbs[i], b = out.orbs[j];
            assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= out.d + 7.9, 'no two orbs touch');
        }
        /* each group stays together and sits on the side of its own bubble */
        for (const k of ['fuel', 'water', 'move', 'sleep']) {
            const gr = out.groups.find(x => x.key === k);
            assert.ok(gr, k + ' group placed');
            assert.ok(Math.abs(ang(gr.c, gr.a)) < Math.PI / 3, k + ' stays near its bubble (' + (ang(gr.c, gr.a) * 180 / Math.PI).toFixed(1) + ' deg)');
        }
        const sl = out.orbs.filter(o => o.key === 'sleep');
        assert.equal(sl.length, 3, 'Sleep has its three answers in the ring');
        sl.forEach(o => { assert.ok(o.x < g.c.x + 1 && o.y > g.c.y - out.rho * 0.5, 'Sleep fills the lower left'); });
    });
    test('tap on Sleep: its three answers bloom on the ring like Water or Move (' + v.name + ')', () => {
        const { g, out } = solveFor(v, [{ key: 'sleep', n: 3 }], false);
        assert.equal(out.orbs.length, 3);
        const a0 = out.groups[0].a;
        const as = out.orbs.map(o => ang(Math.atan2(o.y - g.c.y, o.x - g.c.x), a0));
        assert.ok(Math.abs(as[1]) < 1e-6, 'middle answer straight out from the Sleep bubble');
        assert.ok(Math.abs(as[0] + as[2]) < 1e-6, 'symmetrical either side');
        out.orbs.forEach(o => assert.ok(o.x - out.d / 2 >= -0.5 && o.x + out.d / 2 <= v.w + 0.5 && o.y - out.d / 2 >= -0.5 && o.y + out.d / 2 <= v.h + 0.5, 'on screen'));
    });
}

test('wiring: Sleep joins the bloom ring and the two-finger ring', () => {
    const hb = read('home-blooms-v2.js'), ss = read('home-settings-sleep-v2.js');
    assert.match(hb, /const ALL = \['fuel', 'water', 'move', 'sleep'\]/, 'two fingers open Sleep too');
    assert.match(hb, /R\.place\(groups, \{ even: true \}\)/, 'the two-finger ring is one even circle');
    assert.match(hb, /kind === 'sleep'[\s\S]{0,1600}SL\.set\(b\)/, 'Sleep answers write through LowiHomeSettingsSleepV2.sleep.set');
    assert.match(hb, /sub: T\('last night', 'letzte Nacht', 'anoche'\)/, 'the question lives inside each bubble');
    assert.match(hb, /D\.addEventListener\('lowi:sleep', onData\)/, 'a new answer refreshes the open ring');
    assert.match(ss, /if \(k === 'sleep'\) \{ const B = ringBlooms\(\);/, 'a tap on Sleep opens the shared ring, not the old loose row');
    assert.match(ss, /if \(kind === 'sleep'\) \{ const B = ringBlooms\(\); if \(B\) \{ close\(false\); if \(B\.open\('sleep'\)\) return true; \} \}/, 'show(sleep) uses the ring too');
});

test('bubble style: every orb wears the Home bubble membrane, no navy disc, no hard rim', () => {
    const hb = read('home-blooms-v2.js'), lb = read('living-bubbles.js');
    const css = read('home-blooms-v2.css').replace(/\/\*[\s\S]*?\*\//g, ''), brc = read('bloom-ring.css').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.match(hb, /LB\.add\(el, \{ kind: 'orb' \}\)/, 'orbs registered with the living membrane');
    assert.match(hb, /LB\.adopt\(old, el, \{ kind: 'orb' \}\)/, 'a re-draw hands the membrane over (no flicker)');
    assert.match(lb, /function adopt\(from, to, opts\)/);
    assert.match(lb, /const API = \{ add, remove, adopt,/);
    assert.match(lb, /querySelector\('\.wh-cell-fill, \.hb2-fill'\)/, 'the orb liquid is drawn in 3D like the Home bubbles');
    assert.match(css, /html\.lb3d\.wh-home \.hb2-bloom \.hb2-orb\.lb-bub \{[^}]*background: transparent !important/, 'clear shell over the membrane');
    assert.doesNotMatch(css, /rgba\(8, 26, 66/, 'no navy disc');
    assert.doesNotMatch(css, /0 0 0 2px rgba\(143,231,255/, 'selected is not a hard ring');
    assert.doesNotMatch(brc, /\[data-group\]::after/, 'no tinted rim per group');
    assert.match(css, /\.hb2-orb\[data-group="sleep"\] \.hb2-fill/, 'Sleep keeps its violet liquid');
});

test('body places step aside from a bubble instead of sitting on its edge (Oct 24: and never vanish)', () => {
    const sc = read('body-world-3d-scene.js'), bw = read('body-world-3d.js');
    assert.match(sc, /function setVeil\(list\)/);
    assert.match(sc, /b\.aside = beaconAside\(b, aOff\);/);
    assert.doesNotMatch(sc, /const vT = beaconVeiled\(b\) \? 0 : 1;/, 'Oct 24: the fade-to-nothing veil is gone');
    assert.match(sc, /resize, setVeil, veilLook, setFocus/, 'exported');
    assert.match(bw, /const VEIL_SEL = '\.lb-bub, \.lb-ctl, \.hb2-orb, \.ss2-chip';/);
    assert.match(bw, /world\.setVeil\(veilCircles\(\)\)/);
});
