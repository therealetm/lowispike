'use strict';
/* Nov 5 2026 (Emmanuel: "Why is it that when I long press on the joystick, it's not everything that opens? ... the supermarket doesn't
   open at all ... You can make the bubbles smaller ... It's just important to me that they're still all in that circle ... symmetrical").
   Every bubble with orbs is in the all-bubbles circle now: Water, Move and Sleep (3 each), Gap (2) and Einkaufen (3) = 14 orbs on ONE
   even circle (bloom-ring.js solve, even), smaller orbs where needed (never below 54 px); Gap's two orbs open Gap's own bloom at its
   time step; "Supermarket" gets one break point after "Super" so the smaller orbs keep a readable type size. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../bloom-ring.js');
const HB = require('../home-blooms-v2.js');
const core = HB.core || HB;
const SRC = fs.readFileSync(path.join(__dirname, '..', 'home-blooms-v2.js'), 'utf8');

/* Home's ring as home-orbit-v2 lays it out (R 130, bubbles 64 px) round the companion (150 px), the overview's five groups */
function overview(w, h, c) {
    const keys = ['settings', 'water', 'move', 'scan', 'joy', 'sleep', 'gap', 'fuel'];
    const ring = keys.map((k, i) => { const t = -Math.PI / 2 + i * Math.PI / 4; return { key: k, x: c.x + 130 * Math.cos(t), y: c.y + 130 * Math.sin(t), r: 32 }; });
    const groups = [{ key: 'water', n: 3 }, { key: 'move', n: 3 }, { key: 'sleep', n: 3 }, { key: 'gap', n: 2 }, { key: 'fuel', n: 3 }];
    const d = Math.round(Math.max(60, Math.min(78, Math.min(w, h) * 0.17)));
    return R.solve({ c, mistyR: 75, ring, groups, d, gap: 10, between: 8, even: true, view: { w, h, t: 6, r: 0, b: 0, l: 0 }, margin: 8, maxS: 0.9, minS: 0.5, minD: 54 });
}

for (const [w, h, cy] of [[390, 844, 388], [375, 667, 320], [430, 932, 430]]) {
    test('all 14 orbs fit ONE even circle at ' + w + 'x' + h + ': same radius, same angle apart, on screen, never below 54 px', () => {
        const c = { x: w / 2, y: cy }, L = overview(w, h, c);
        assert.equal(L.fit, true, 'it fits');
        assert.equal(L.orbs.length, 14);
        assert.ok(L.d >= 54, 'orb size ' + L.d);
        for (const o of L.orbs) assert.ok(Math.abs(Math.hypot(o.x - c.x, o.y - c.y) - L.rho) < 1e-6, 'on the circle');
        const a = L.orbs.map(o => Math.atan2(o.y - c.y, o.x - c.x)).sort((p, q) => p - q);
        for (let i = 0; i < a.length; i++) { const d = ((a[(i + 1) % a.length] - a[i]) + 2 * Math.PI) % (2 * Math.PI); assert.ok(Math.abs(d - 2 * Math.PI / 14) < 1e-6, 'even: ' + d); }
        for (const o of L.orbs) assert.ok(o.x - L.d / 2 >= 8 - 0.5 && o.x + L.d / 2 <= w - 8 + 0.5 && o.y - L.d / 2 >= 14 - 0.5 && o.y + L.d / 2 <= h - 8 + 0.5, 'on screen');
        for (const k of ['water', 'move', 'sleep', 'gap', 'fuel']) assert.ok(L.orbs.some(o => o.key === k), k + ' is in the circle');
    });
}

test('"Supermarket" may break after "Super" and nowhere else; other labels stay whole', () => {
    assert.equal(core.softLabel('Supermarket'), 'Super\u00admarket');
    assert.equal(core.softLabel('Supermarkt'), 'Super\u00admarkt');
    assert.equal(core.softLabel('Supermercado'), 'Super\u00admercado');
    for (const s of ['Seller Zone', 'Help out', 'Glass', 'Super', 'Steady', 'First meal']) assert.equal(core.softLabel(s), s);
    assert.match(SRC, /'<b>' \+ esc\(softLabel\(a\.label\)\) \+ '<\/b>'/, 'orb labels use it');
    assert.match(SRC, /const p = w\.split\('\\u00ad'\); return p\.map\(\(x, i\) => \(i < p\.length - 1 \? x \+ '-' : x\)\);/, 'the type size is fitted to the parts');
});

test('the overview holds every bubble; Gap\'s orbs there open Gap at its time step', () => {
    assert.match(SRC, /const ALL = BLOOMS;/);
    assert.match(SRC, /function open\(kind, src, pick\) \{/);
    assert.match(SRC, /st\.gapPick = kind === 'gap' && \(pick === 'last' \|\| pick === 'first'\) \? pick : null;/);
    assert.match(SRC, /const pick = st\.gapPick; st\.gapPick = null; if \(pick\) open\('gap', null, pick\); return;/);
});
