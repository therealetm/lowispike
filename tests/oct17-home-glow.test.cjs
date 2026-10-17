/* home glow (Oct 17, E-man, after nearly getting lost deep in a dark zone): "just a little bit see the cell world ... glow, but
   just very very ... not too much. It should still be difficult." Out in the dark the world she came from glows very faintly where
   it really is; the dark stays near black, her 3-second flash stays, nothing points or pulls. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MF = require(path.join(ROOT, 'misty-flight.js'));
const mf = fs.readFileSync(path.join(ROOT, 'misty-flight.js'), 'utf8');
const D = MF.DARK, H = MF.HOME;

test('home glow: still there all the way out in the dark, faint, and fainter the further out you are', () => {
    assert.ok(MF.homeGlow(D.DEEP) > 0, 'never gone, even at the very end of the dark: ' + MF.homeGlow(D.DEEP));
    assert.ok(MF.homeGlow(D.DEEP * 1.5) > 0, 'past the deepest point too');
    assert.ok(MF.homeGlow(D.FULL) <= 0.3, 'faint even close by: ' + MF.homeGlow(D.FULL));
    assert.ok(MF.homeGlow(D.DEEP) < MF.homeGlow(D.FULL), 'fainter far out than just past the shell');
    let prev = Infinity;
    for (let e = D.FULL; e <= D.DEEP + 1e-9; e += 0.05) { const v = MF.homeGlow(e); assert.ok(v <= prev + 1e-12, 'never brighter going deeper at ' + e.toFixed(2)); prev = v; }
    assert.strictEqual(MF.homeGlow(2.2), MF.homeGlow(2.2), 'a pure function of depth');
});

test('home glow: the dark stays near black, even right over the world, so it is still hard', () => {
    const wr = 0.35;
    for (const e of [D.FULL, 2, D.DEEP]) {
        const s = MF.homeGlow(e), dk = MF.darkAmt(e);
        assert.ok(MF.veilAt(dk, 0, wr, s) >= 0.75, 'over the world itself the veil still covers most: ' + MF.veilAt(dk, 0, wr, s).toFixed(3) + ' at ' + e);
        assert.ok(MF.homeAt(0, wr, s).lift <= 0.25, 'a dim light, not a beacon: ' + MF.homeAt(0, wr, s).lift.toFixed(3));
        assert.strictEqual(MF.veilAt(dk, 3 * wr, wr, s), dk, 'away from the world the dark is exactly as dark as before');
    }
    assert.ok(MF.veilAt(MF.darkAmt(D.DEEP), 0, wr, MF.homeGlow(D.DEEP)) < MF.darkAmt(D.DEEP), 'but over the world you can just make it out');
});

test('home glow: it is where the world really is: brightest over it, fading with distance, a lighter side toward home', () => {
    const s = MF.homeGlow(D.DEEP);
    for (const wr of [0.1, 0.35, 0.8]) {
        let prev = Infinity;
        for (let dw = 0; dw <= 3; dw += 0.02) { const l = MF.homeAt(dw, wr, s).lift; assert.ok(l <= prev + 1e-12, 'never brighter further from the world (wr ' + wr + ', dw ' + dw.toFixed(2) + ')'); prev = l; }
        /* far out the world is off the screen edge: the edge facing it gets a trace of its light, the opposite edge almost none */
        const near = MF.homeAt(wr * 2.5, wr, s).lift, far = MF.homeAt(wr * 2.5 + 1, wr, s).lift;
        assert.ok(near > 0.01, 'a trace of light on the side toward home (wr ' + wr + '): ' + near.toFixed(3));
        assert.ok(far < near * 0.5, 'clearly less on the far side: ' + far.toFixed(3) + ' vs ' + near.toFixed(3));
    }
    assert.strictEqual(MF.homeAt(0, 0.3, 0).lift, 0, 'no strength, no glow (outside the dark / outside a world)');
});

test('home glow wiring: drawn in the dark veil at the projected world, no arrow, no pull, darkness and the flash unchanged', () => {
    const vb = mf.slice(mf.indexOf('function veilBuild'), mf.indexOf('function veilOff'));
    assert.match(vb, /uniform vec2 uW;uniform float uWR;uniform float uWS;/);
    assert.match(vb, /float see=uWS\*/, 'the veil thins over the world');
    assert.match(vb, /uWT\*lift/, 'and a dim warm light spreads from it');
    assert.match(vb, /uG\*\(1\.0-smoothstep\(uR\*0\.3,uR,length\(d\)\)\)/, 'her flash hole is untouched');
    const vd = mf.slice(mf.indexOf('function veilDraw'), mf.indexOf('function darkFrame'));
    assert.match(vd, /DV\.w\.copy\(S\.inC\)\.project\(cam\)/, 'placed where the world really is (its own middle, projected)');
    assert.match(vd, /addScaledVector\(V\.up, reach\)\.project\(cam\)/, 'sized by the world\'s real size on screen');
    assert.match(vd, /ws = homeGlow\(edge\)/);
    assert.ok(!/clamp\(\(DV\.w\.x/.test(vd), 'never pinned to the screen edge like an arrow');
    const df = mf.slice(mf.indexOf('function darkFrame'), mf.indexOf('/* ---------- world-exit: out of a world'));
    assert.match(df, /veilDraw\(a, S\.dk, S\.dkG, reach, edge\)/);
    assert.match(df, /want = darkAmt\(L \/ reach\)/, 'how dark it gets is unchanged');
    assert.ok(!/S\.p\.(lerp|add|addScaledVector)\(/.test(df), 'the glow never moves her: finding the way back is yours');
    assert.strictEqual(D.MAX, 0.95); assert.strictEqual(D.PULSE, 3); assert.strictEqual(D.DEEP, 3);
    assert.ok(MF.darkGlow(3 + D.FLASH / 2) > 0.95, 'the 3-second flash is still there');
    assert.ok(H.TINT && H.TINT.toLowerCase() !== '#bff3ff', 'a different colour from her own cyan flash, so you can tell home from Misty');
});
