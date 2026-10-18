/* Oct 18 (E-man, iPad: "Move keeps moving into the middle ... and Meals also"). The Move choices used to aim at the
   screen middle, which on iPad and desktop is Misty; the Meals panel was centred over her. Geometry measured from the
   real Home in a browser at each size (Misty's glass, the Move bubble, the other bubbles and cards). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const F = require('../move-bubble.js');
const B = require('../misty-bloom.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const rc = a => ({ l: a[0], t: a[1], r: a[0] + a[2], b: a[1] + a[3] });
const SCREENS = {
    'iPad landscape 1180x820': { vw: 1180, vh: 820, misty: [449, 236, 282, 282], move: [758, 315, 118, 118], avoid: [[304, 315, 118, 118], [758, 500, 118, 118], [304, 500, 118, 118], [370, 113, 440, 81], [14, 9, 1152, 94]] },
    'iPad portrait 820x1180': { vw: 820, vh: 1180, misty: [274, 407, 272, 272], move: [510, 338, 118, 118], avoid: [[209, 324, 118, 118], [493, 638, 118, 118], [192, 625, 118, 118], [130, 1094, 560, 72], [190, 113, 440, 81], [14, 9, 792, 94]] },
    'desktop 1440x900': { vw: 1440, vh: 900, misty: [584, 278, 272, 272], move: [875, 355, 118, 118], avoid: [[447, 355, 118, 118], [871, 512, 118, 118], [451, 515, 118, 118], [16, 16, 216, 868], [482, 113, 440, 81], [14, 9, 1376, 94]] },
    'phone 390x844': { vw: 390, vh: 844, misty: [90, 283, 211, 211], move: [290, 235, 93, 93], avoid: [[8, 234, 93, 93], [289, 447, 93, 93], [8, 443, 93, 93], [10, 744, 370, 68], [14, 61, 362, 73], [14, 9, 362, 44]] }
};
function geom(s) {
    const m = s.misty, b = s.move, orb = Math.round(Math.max(64, Math.min(84, Math.min(s.vw, s.vh) * 0.19)));
    return { cx: b[0] + b[2] / 2, cy: b[1] + b[3] / 2, r: b[2] / 2, orb, n: 4, vw: s.vw, vh: s.vh, top: 6, bottom: 6, misty: { x: m[0] + m[2] / 2, y: m[1] + m[3] / 2, r: m[2] / 2 }, avoid: s.avoid.map(rc) };
}

for (const [name, s] of Object.entries(SCREENS)) {
    test('Move choices fan away from Misty, on screen, apart: ' + name, () => {
        const g = geom(s), f = F.fan(g);
        assert.strictEqual(f.pts.length, 4);
        assert.ok(f.ok, 'a clean spot exists');
        const h = g.orb / 2;
        for (const p of f.pts) {
            assert.ok(Math.hypot(p.x - g.misty.x, p.y - g.misty.y) >= g.misty.r + h, 'orb ' + Math.round(p.x) + ',' + Math.round(p.y) + ' is off Misty');
            assert.ok(p.x - h >= 0 && p.x + h <= g.vw && p.y - h >= 0 && p.y + h <= g.vh, 'orb fully on screen');
        }
        for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) assert.ok(Math.hypot(f.pts[i].x - f.pts[j].x, f.pts[i].y - f.pts[j].y) >= g.orb - 0.5, 'orbs apart');
        const mid = f.pts.reduce((a, p) => ({ x: a.x + p.x / 4, y: a.y + p.y / 4 }), { x: 0, y: 0 });
        assert.ok(Math.hypot(mid.x - g.misty.x, mid.y - g.misty.y) > Math.hypot(g.cx - g.misty.x, g.cy - g.misty.y), 'the fan points away from Misty');
        const n = F.noteSpot(g, f.pts, Math.min(260, g.vw - 24), 48);
        const nx = Math.max(n.l, Math.min(g.misty.x, n.l + 260)), ny = Math.max(n.t, Math.min(g.misty.y, n.t + 48));
        assert.ok(Math.hypot(nx - g.misty.x, ny - g.misty.y) >= g.misty.r, 'the line under the choices is off Misty');
    });
}

test('the old aim (toward the screen middle) put the choices on Misty on iPad: the bug this replaces', () => {
    const g = geom(SCREENS['iPad landscape 1180x820']);
    const toward = Math.atan2(g.vh * 0.5 - g.cy, g.vw * 0.5 - g.cx), dist = g.r + g.orb / 2 + 22, step = (g.orb + 12) / dist;
    const old = [0, 1, 2, 3].map(i => { const a = toward + (i - 1.5) * step; return { x: g.cx + Math.cos(a) * dist, y: g.cy + Math.sin(a) * dist }; });
    assert.ok(old.some(p => Math.hypot(p.x - g.misty.x, p.y - g.misty.y) < g.misty.r + g.orb / 2));
    assert.ok(F._breaks(g, old) > 0);
});

test('with Misty dead against a screen edge it still finds room, or keeps clamped orbs apart', () => {
    const g = { cx: 60, cy: 60, r: 40, orb: 64, n: 4, vw: 320, vh: 480, top: 6, bottom: 6, misty: { x: 160, y: 240, r: 90 }, avoid: [] };
    const f = F.fan(g);
    for (const p of f.pts) assert.ok(p.x >= 32 && p.y >= 32 && p.x <= 288 && p.y <= 448);
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) assert.ok(Math.hypot(f.pts[i].x - f.pts[j].x, f.pts[i].y - f.pts[j].y) >= 60);
});

test('no Misty on screen: the old aim toward the middle stays', () => {
    const f = F.fan({ cx: 100, cy: 100, r: 40, orb: 64, n: 4, vw: 800, vh: 800, misty: null });
    const mid = f.pts.reduce((a, p) => ({ x: a.x + p.x / 4, y: a.y + p.y / 4 }), { x: 0, y: 0 });
    assert.ok(mid.x > 100 && mid.y > 100);
});

/* ---- the Meals / Move panel beside Misty on wide screens ---- */
const natH = w => Math.round(585 * 600 / w);
function dock(s, bub) {
    const m = rc(s.misty), b = bub || s.move;
    return B.dockSpot({ vw: s.vw, vh: s.vh, top: 10, misty: m, bub: { x: b[0] + b[2] / 2, y: b[1] + b[3] / 2 }, natH });
}
const MEALS = { 'iPad landscape 1180x820': [304, 315, 118, 118], 'iPad portrait 820x1180': [209, 324, 118, 118], 'desktop 1440x900': [447, 355, 118, 118] };
for (const [name, bub] of Object.entries(MEALS)) {
    test('Meals panel opens beside Misty, on screen: ' + name, () => {
        const s = SCREENS[name], d = dock(s, bub), m = rc(s.misty);
        assert.ok(d, 'docks');
        assert.ok(d.w >= 340 && d.h >= 320, 'roomy enough');
        assert.ok(d.l >= 10 && d.t >= 10 && d.l + d.w <= s.vw - 10 + 0.5 && d.t + d.h <= s.vh - 10 + 0.5, 'on screen');
        const clear = d.l + d.w <= m.l || d.l >= m.r || d.t + d.h <= m.t || d.t >= m.b;
        assert.ok(clear, 'not over Misty: ' + JSON.stringify(d));
    });
}
test('Meals panel leans to the Meals side and Move panel to the Move side on iPad landscape', () => {
    const s = SCREENS['iPad landscape 1180x820'];
    assert.strictEqual(dock(s, MEALS['iPad landscape 1180x820']).side, 'left');
    assert.strictEqual(dock(s, s.move).side, 'right');
});
test('a phone gets no dock (too little room beside Misty): the floating sheet stays', () => {
    const s = SCREENS['phone 390x844'];
    const d = B.dockSpot({ vw: s.vw, vh: s.vh, top: 10, misty: rc(s.misty), bub: { x: 54, y: 280 }, natH });
    assert.ok(!d || d.side === 'below' || d.side === 'above');
});

test('wiring: openBloom uses fan(), panels from Meals / Move dock, CSS rule exists, old screen-middle aim is gone', () => {
    const mb = read('move-bubble.js'), bl = read('misty-bloom.js'), css = read('misty-panels.css');
    assert.ok(/LowiMoveFan\.fan\(fanGeom\(/.test(mb));
    assert.ok(!/const toward = Math\.atan2\(vh \* 0\.5 - cy, vw \* 0\.5 - cx\)/.test(mb));
    assert.ok(/#whHud \.wh-meals, #whHud \.wh-move/.test(bl));
    assert.ok(/min-width: 700px/.test(bl));
    assert.ok(/\.r2-sh\.mb-on\.mb-dock\s*\{[^}]*position: fixed/.test(css));
});
