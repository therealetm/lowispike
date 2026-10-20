// Liquid fill shares the bubble outline (Oct 18, Emmanuel on his iPad: "The liquid in the bubble still doesn't match." The fill was a
// flat DOM layer clipped to a CSS circle - and the fasting water a separate 2D canvas - while the glass is Misty's 3D membrane: radius
// 0.52 x width, vertex wobble, breathing, perspective. Two different outlines. Asked before: "like water inside a balloon", same
// boundary, clipped by it, sloshing as it moves.) The liquid is now drawn by the membrane mesh itself: a child mesh with the SAME
// geometry, the SAME vertex shader (same wobble, same clock) and the same edge softening, so its outline is the glass outline by
// construction. Live pixel proof: tests/bubble-fill-shape-live.cjs.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const L = require('../living-bubbles.js');
const js = read('living-bubbles.js'), css = read('living-bubbles.css'), scene = read('body-world-3d-scene.js'), fb = read('fast-bubble.js');
const memFrag = (() => { const i = scene.indexOf('fragmentShader:', scene.indexOf('const memMat')); return scene.slice(i, i + 1400); })();
const EDGE = (() => { const m = scene.match(/const EDGE_AA = '([^']*)'/); return m[1].replace(/\\n/g, '\n'); })();
const mistyFs = L.fadeShader('uniform vec3 uIn;varying vec3 vN;varying vec3 vV;varying vec3 vP;' + EDGE + 'void main(){float nv=abs(dot(normalize(vN),normalize(vV)));float a=0.5*lwEdge(nv);gl_FragColor=vec4(vec3(1.0),clamp(a,0.0,0.95));\n#include <colorspace_fragment>\n}');

test('the liquid shader is built from the membrane\'s own edge softening (same outline, same last pixel)', () => {
    assert.ok(memFrag.includes('lwEdge(nv)'), 'Misty\'s membrane still softens its outline with lwEdge');
    assert.strictEqual(typeof L.liquidShader, 'function');
    const src = L.liquidShader(mistyFs);
    assert.ok(src, 'a liquid shader comes out of the membrane shader');
    assert.ok(src.includes('float lwEdge(float nv){return smoothstep(0.0,fwidth(nv)*2.0+0.02,nv);}'), 'the very same edge function as the glass');
    assert.ok(/lwEdge\(nv\)\s*\*\s*uO/.test(src), 'the liquid fades out at the glass edge exactly like the glass');
    assert.ok(src.includes('varying vec3 vN;') && src.includes('varying vec3 vV;'), 'reads the membrane vertex shader\'s own varyings');
    assert.ok(src.includes('#include <colorspace_fragment>'), 'same colour space as the glass');
    assert.strictEqual(L.liquidShader('void main(){}'), null, 'a changed membrane shader: no 3D liquid (the flat fill stays), never a wrong outline');
});

test('the liquid is a child of the membrane mesh: same geometry, same vertex shader, same clock, no transform of its own', () => {
    assert.ok(/new THREE\.Mesh\(s\.mesh\.geometry,/.test(js), 'same geometry object as the glass');
    assert.ok(/vertexShader:\s*s\.mat\.vertexShader/.test(js), 'same vertex shader (the wobble) as the glass');
    assert.ok(js.includes('uT: s.mat.uniforms.uT'), 'same clock uniform, so it wobbles in the same frame as the glass');
    assert.ok(js.includes('s.mesh.add(s.liq)'), 'rides the membrane: position, turn, breathing and press squish');
    assert.ok(js.includes('s.liq.renderOrder = 19'), 'drawn just under the glass (renderOrder 20)');
    assert.ok(js.includes("userData.lbLiquid = true"));
});

test('fill level: progress maps to the height of the glass; full is full (Water 8/6), empty draws nothing', () => {
    assert.strictEqual(L.liquidLevel(0), null);
    assert.strictEqual(L.liquidLevel(-1), null);
    assert.ok(Math.abs(L.liquidLevel(0.5)) < 1e-9, 'half: the surface through the middle');
    assert.ok(Math.abs(L.liquidLevel(0.25) + 0.5) < 1e-9);
    assert.ok(L.liquidLevel(1) >= 1.6, 'full: above the top even with the largest slosh');
    assert.strictEqual(L.liquidLevel(8 / 6), L.liquidLevel(1), '8 of 6 cups is capped at full');
    assert.ok(L.liquidLevel(1) - L.SLOSH_MAX > 1, 'a full glass never shows a surface, however it sloshes');
});

test('slosh: the water lags the bubble\'s motion, springs back and settles; still when motion is reduced', () => {
    const st = L.sloshState();
    L.slosh(st, 6, 0, 1 / 60, false); /* bubble jumps right */
    for (let i = 0; i < 4; i++) L.slosh(st, 0, 0, 1 / 60, false);
    assert.ok(st.tilt < 0, 'moving right piles the water up on the left (surface tilts)');
    assert.ok(Math.abs(st.tilt) <= L.SLOSH_MAX);
    let sign = Math.sign(st.tilt), flips = 0;
    for (let i = 0; i < 600; i++) { L.slosh(st, 0, 0, 1 / 60, false); if (Math.sign(st.tilt) && Math.sign(st.tilt) !== sign) { flips++; sign = Math.sign(st.tilt); } }
    assert.ok(flips >= 1, 'it swings back like water');
    assert.ok(Math.abs(st.tilt) < 0.005 && Math.abs(st.bob) < 0.005, 'and settles');
    const big = L.sloshState(); L.slosh(big, 500, 500, 1 / 60, false); for (let i = 0; i < 30; i++) L.slosh(big, 0, 0, 1 / 60, false);
    assert.ok(Math.abs(big.tilt) <= L.SLOSH_MAX && Math.abs(big.bob) <= L.SLOSH_MAX, 'a big jump (relayout) is clamped');
    const calm = L.sloshState(); L.slosh(calm, 6, 6, 1 / 60, true);
    assert.strictEqual(calm.tilt, 0); assert.strictEqual(calm.bob, 0); assert.strictEqual(calm.wave, 0);
});

test('colours: each bubble keeps its own liquid colour, read from its own fill (item 32: each liquid is a planet, brand-palette.js)', () => {
    const c = L.parseGradient('linear-gradient(rgba(130, 251, 252, 0.55), rgba(28, 247, 249, 0.8))');
    assert.deepStrictEqual(c.top, [130, 251, 252]); assert.deepStrictEqual(c.bot, [28, 247, 249]);
    assert.ok(c.a1 > 0.55 && c.a2 > 0.8 && c.a2 <= 0.92, 'a touch stronger under the glass so a full glass reads full');
    assert.strictEqual(L.parseGradient('none'), null);
    const f = L.liquidColors('fast', false, false), d = L.liquidColors('fast', false, true);
    assert.deepStrictEqual(f.top, [251, 243, 150]); assert.deepStrictEqual(d.top, [252, 247, 182]); /* the Pancreas liquid: running, goal reached */
});

test('while the 3D liquid is drawn the flat fill and the fasting 2D water hide, and the fasting water loop sleeps (no extra heat)', () => {
    assert.ok(/\.lb-bub\.lb-liq \.wh-cell-fill[^{]*\{[^}]*opacity: 0 !important/.test(css), 'flat fill hidden under the 3D liquid');
    assert.ok(/#spFast\.lb-liq \.fb-cv[^{]*\{[^}]*opacity: 0 !important/.test(css), 'fasting 2D water hidden under the 3D liquid');
    assert.ok(fb.includes("b.el.classList.contains('lb-liq')"), 'fast-bubble.js pauses its own loop while the 3D liquid draws');
    assert.ok(/if \(s\.liqOn !== on\)/.test(js), 'the class is written only when it changes, not every frame');
});

test('no per-frame layout thrash: the fill level is read with the 180 ms visibility pass, not every frame', () => {
    const fr = js.slice(js.indexOf('function frame('), js.indexOf('/* ---------- press squish'));
    assert.ok(!/offsetHeight|getComputedStyle|querySelector/.test(fr), 'frame() reads only the box it already read');
    const rv = js.slice(js.indexOf('function refreshVis('), js.indexOf('function live('));
    assert.ok(rv.includes('readFill(el, s)'), 'fill read with the visibility pass');
    assert.ok(!/requestAnimationFrame\(/.test(js), 'still no own loop');
});

test('look() reports the liquid so the live check can prove it shares the glass', () => {
    assert.ok(js.includes('liquid: s.liq ?'), 'look() exposes the liquid');
    assert.ok(js.includes('sameGeometry: s.liq.geometry === s.mesh.geometry'));
    assert.ok(js.includes('sameVertexShader: s.liq.material.vertexShader === s.mat.vertexShader'));
});
