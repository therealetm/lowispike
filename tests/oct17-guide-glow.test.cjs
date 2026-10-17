/* guide glow (Oct 17, E-man, changing his mind about the 3-second flash in the dark zones): "Instead of my companion glowing in
   the dark ... since the cell companion is always next to me, that's the one that should be glowing." The flash belongs to the
   cell guide (#rpPal) that flies beside Misty, not to Misty. The faint home glow of the world she came from stays as it was. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MF = require(path.join(ROOT, 'misty-flight.js'));
const mf = fs.readFileSync(path.join(ROOT, 'misty-flight.js'), 'utf8');
const D = MF.DARK, G = MF.GUIDE, HM = MF.HOME;
const vd = mf.slice(mf.indexOf('function veilDraw'), mf.indexOf('function darkFrame'));

test('guide glow: the guide dims deep in the dark and lights up fully at each 3-second flash', () => {
    assert.strictEqual(MF.guideLight(0, 0), 1, 'outside the dark the guide is as usual');
    assert.ok(Math.abs(MF.guideLight(D.MAX, 0) - G.DIM) < 1e-9, 'deep in the dark it is dim like everything else');
    assert.strictEqual(MF.guideLight(D.MAX, 1), 1, 'at the peak of a flash it is fully lit');
    assert.ok(MF.guideLight(D.MAX, MF.darkGlow(3 + D.FLASH / 2)) > 0.95, 'the 3-second flash lights the guide');
    assert.ok(Math.abs(MF.guideLight(D.MAX, MF.darkGlow(4.5)) - G.DIM) < 1e-9, 'between flashes it is dim again');
    assert.strictEqual(MF.guideLight(G.D0, 0), 1, 'no jump when the dark styling switches on (html.mf-dark at dk > 0.5)');
    let prev = Infinity;
    for (let dk = 0; dk <= 1; dk += 0.02) { const o = MF.guideLight(dk, 0); assert.ok(o <= prev + 1e-12, 'never brighter as it gets darker'); prev = o; }
    assert.strictEqual(D.PULSE, 3); assert.ok(D.FLASH < 0.5, 'still only a split second');
});

test('guide glow: the flash comes from the guide on screen, not from Misty', () => {
    assert.match(vd, /const gd = guideSpot\(\), gg = gd \? glow : 0;/, 'the flash follows the guide');
    assert.match(vd, /DV\.u\.uC\.value\.set\(ux, uy\)/, 'the veil opens round the guide');
    assert.match(vd, /gd\.r \* GUIDE\.HOLE/, 'a small opening, sized by the guide');
    assert.match(vd, /DV\.s\.position\.copy\(DV\.gp\)/, 'the soft light sits where the guide is');
    assert.ok(!/DV\.s\.position\.copy\(S\.p\)/.test(vd), 'no light at Misty');
    assert.ok(!/DV\.u\.uC\.value\.set\(\(DV\.v\.x/.test(vd), 'the veil no longer opens round Misty');
    assert.match(vd, /else \{ DV\.u\.uG\.value = 0; DV\.s\.visible = false; \}/, 'no guide showing: Misty still gives off no light');
    assert.match(vd, /DV\.u\.uG\.value = glow \* GUIDE\.OPEN/, 'the opening never clears the dark completely');
    assert.ok(G.OPEN < 1 && G.LIT < 1, 'subtle, local light');
    const gs = mf.slice(mf.indexOf('function guideSpot'), mf.indexOf('function guideCss'));
    assert.match(gs, /getElementById\('rpPal'\)/, 'the cell guide of region-pals.js');
    assert.match(gs, /\.rp-orb/, 'measured at its orb (full guide and small sidekick alike)');
});

test('guide glow: the guide lights up in CSS, its speech bubbles still dim, the controller is never touched', () => {
    assert.match(vd, /guideCss\(guideLight\(dk, gg\), gg\)/);
    assert.match(vd, /html\.mf-dark #rpPal \.rp-body\{opacity:var\(--mf-go,\.1\)!important/, 'the guide itself follows its own light');
    assert.match(vd, /html\.mf-dark #rpPal \.rp-body::after\{[^}]*opacity:var\(--mf-gg,0\)/, 'a soft halo round it at each flash');
    assert.match(vd, /html\.mf-dark #rpPal \.rp-say,[^{]*\.rp-say\{opacity:\.1!important/, 'its speech bubbles dim with the dark as before');
    assert.ok(!/html\.mf-dark #rpPal[,{]/.test(vd), 'the whole guide is no longer pinned at .1, so it can glow');
    assert.ok(!/#whPad|wh-pad/.test(vd), 'the controller is never dimmed');
    const off = mf.slice(mf.indexOf('function veilOff'), mf.indexOf('function guideSpot'));
    assert.match(off, /removeProperty\('--mf-go'\)/, 'leaving the dark leaves nothing behind');
    const css = fs.readFileSync(path.join(ROOT, 'clean-view-core.js'), 'utf8');
    assert.match(css, /'#rpPal'/, 'the clean flight view still keeps the guide');
});

test('guide glow: the faint home glow and the hard dark stay exactly as they were', () => {
    assert.match(vd, /ws = homeGlow\(edge\)/, 'the world she came from still glows faintly');
    assert.match(vd, /DV\.w\.copy\(S\.inC\)\.project\(cam\)/, 'where it really is');
    assert.ok(MF.homeGlow(D.DEEP) > 0 && MF.homeGlow(D.FULL) <= 0.3, 'faint and never gone');
    assert.ok(HM.TINT.toLowerCase() !== G.COLOR.toLowerCase(), 'the guide\'s cyan is not home\'s warm light');
    assert.strictEqual(MF.darkAmt(D.DEEP), D.MAX); assert.strictEqual(D.MAX, 0.95);
    const df = mf.slice(mf.indexOf('function darkFrame'), mf.indexOf('/* ---------- world-exit: out of a world'));
    assert.ok(!/S\.p\.(lerp|add|addScaledVector)\(/.test(df), 'nothing moves her: steering stays yours');
});
