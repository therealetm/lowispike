'use strict';
/* Oct 17, 2026 (E-man, "Kamehameha"): while one finger holds Misty's controller, a double tap with another finger shoots her energy
   the way she is aiming; it heals the world it lands in, with a cooldown so it can't be farmed. Without the controller held the
   double tap stays the World map toggle / way out of a world. misty-turn.js + hooks in misty-pad.js, body-world-3d.js,
   body-world-regions.js and clean-view.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const T = require('../misty-turn.js');
const EC = require('../community-energy.js');
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

test('the double tap is a shot only while the controller is held; otherwise it stays the old double tap', () => {
    assert.equal(T.dblAction(true), 'shot');
    assert.equal(T.dblAction(false), 'zoom');
    const w3 = read('body-world-3d.js');
    assert.match(w3, /if \(padHeld\(\)\) \{ if \(dbl\) \{ lastTap = null; padDouble\(\); \} else lastTap = \{ x, y, t: e\.timeStamp \}; \}\n\s*else if \(dbl\) \{ lastTap = null; opts\.onDouble\(x, y\); \} else \{ lastTap = \{ x, y, t: e\.timeStamp \}; onTap\(x, y\); \}/,
        'held: taps never warp or pet and two of them shoot; not held: tap and double tap exactly as before');
    assert.match(w3, /pts\.size !== 1 \|\| padHeld\(\)\) return;/, 'no long press card mid-shot');
    assert.match(w3, /function padHeld\(\) \{[^\n]*LowiPad\.held\(\)/);
    assert.match(w3, /function padDouble\(\) \{[^\n]*lowi:pad-double/);
    assert.match(read('misty-turn.js'), /W\.addEventListener\('lowi:pad-double', \(\) => \{ shoot\('double'\); \}\);/);
    assert.match(w3, /onDouble: \(x, y\) => \{ if \(!world\) return;[^\n]*LowiWorldHome[^\n]*toggleZoom\(\)/, 'the old double tap (World map / out of a world) is untouched');
});

test('the controller says when a finger is on it (dragging or held still in the middle)', () => {
    const pad = read('misty-pad.js');
    assert.match(pad, /held: \(\) => st\.id != null/);
    assert.match(pad, /lowi:misty-shot/);
    assert.ok(pad.includes('Energiesto\\u00df') && pad.includes('Disparo de energ\\u00eda') && pad.includes('Energy shot'));
});

test('the cooldown reuses the Community energy rate limit: no rapid fire, no farming', () => {
    assert.ok(T.usesEnergyCore());
    assert.equal(typeof EC.bucket, 'function');
    let st = {}, t = 1e6, ok = 0;
    let g = T.shotGate(st, t); assert.ok(g.ok, 'first shot fires'); st = g.st;
    g = T.shotGate(st, t + 200); assert.ok(!g.ok, 'a second one right away is still charging'); st = g.st;
    for (let i = 0; i < 40; i++) { g = T.shotGate(st, t + 1000 + i * 100); st = g.st; if (g.ok) ok++; }
    assert.ok(ok <= T.SHOT.MAX - 1, 'capped however fast you tap');
    g = T.shotGate(st, t + T.SHOT.WIN + 6000); assert.ok(g.ok, 'charged again after a short rest');
});

test('it flies the way she is aiming: her heading, tilted by the controller up / down', () => {
    const f = T.fwdOf(0), d = T.shotDir(f, 0);
    assert.ok(near(d[0], 0) && near(d[1], 0) && near(d[2], -1));
    const up = T.shotDir(f, 1); assert.ok(up[1] > 0.3 && near(Math.hypot(up[0], up[1], up[2]), 1));
    const down = T.shotDir(f, -1); assert.ok(down[1] < -0.3);
    const side = T.shotDir(T.fwdOf(T.turnBy(0, 150)), 0); assert.ok(side[0] > 0.5);
    const a = T.shotAt([0, 0, 0], d, 9, 0), b = T.shotAt([0, 0, 0], d, 9, 0.5), c = T.shotAt([0, 0, 0], d, 9, 1);
    assert.ok(near(a[2], 0) && near(c[2], -9));
    assert.ok(Math.abs(b[2]) > 4.5);
});

test('healing: only inside a world, capped per world per day, spaced out, resets at midnight, never XP', () => {
    const day = new Date(2026, 9, 17, 14, 0, 0).getTime();
    let h = null, o = T.healAdd(h, 'hub', day); assert.equal(o.add, 0); h = o.h;
    o = T.healAdd(h, 'lung', day); assert.equal(o.add, T.SHOT.HEAL); h = o.h;
    o = T.healAdd(h, 'lung', day + 1000); assert.equal(o.add, 0); h = o.h;
    let t = day; for (let i = 0; i < 30; i++) { t += T.SHOT.HEAL_GAP; h = T.healAdd(h, 'lung', t).h; }
    assert.ok(near(T.healOf(h, 'lung', t), T.SHOT.HEAL_MAX, 1e-9));
    assert.equal(T.healOf(h, 'gut', t), 0);
    const tomorrow = new Date(2026, 9, 18, 0, 0, 5).getTime();
    assert.equal(T.healOf(h, 'lung', tomorrow), 0);
    assert.doesNotMatch(read('misty-turn.js'), /LowiXP|award\(|addXP|LowiMistyPower/);
});

test('the healed amount thins the world fog and murk; the shot is drawn with no DOM and no loop of its own', () => {
    const reg = read('body-world-regions.js');
    assert.match(reg, /fog\.density = look\.fog \* \(1 \+ 0\.9 \* [^;]*st\.murk[^;]*\* \(1 - 0\.5 \* shotHeal\(\)\)/);
    assert.match(reg, /function shotHeal\(\) \{[^\n]*LowiMistyTurn[^\n]*heal\(st\.cur\)/);
    const src = read('misty-turn.js');
    assert.match(src, /try \{ shotFrame\(i, dt\); \}/);
    assert.match(src, /p\.name = 'mt-shot'; p\.userData\.lwKeep = true;/);
    assert.match(src, /if \(!SH\.list\.length\) \{ if \(SH\.obj\) SH\.obj\.visible = false; return; \}/);
    assert.match(src, /if \(padHeld\(\)\) \{ if \(SH\.mTap && t - SH\.mTap < K\.TAP_GAP\)/);
});

test('clean flight view lets the second finger through while the controller is held', () => {
    const cv = read('clean-view.js');
    const i = cv.indexOf('if (worldTarget(e.target) && padHeld()) return;'), j = cv.indexOf('if (worldTarget(e.target)) {');
    assert.ok(i > 0 && i < j);
});
