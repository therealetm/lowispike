// Living Home bubbles (Oct 17): fasting, water and later Home bubbles get Misty's real 3D membrane, their text sits inside, no extra Edit button.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const L = require('../living-bubbles.js');
const js = read('living-bubbles.js'), css = read('living-bubbles.css'), scene = read('body-world-3d-scene.js'), sw = read('sw.js'), html = read('index.html'), spirit = read('spirit.js');

test('uses Misty\'s own membrane shader, with one fade uniform added', () => {
    const frag = scene.slice(scene.indexOf('fragmentShader:'), scene.indexOf('fragmentShader:') + 1400);
    assert.ok(frag.includes('clamp(a,0.0,0.95)'), 'the membrane shader still ends the way living-bubbles.js expects');
    const out = L.fadeShader('void main(){ gl_FragColor=vec4(c,clamp(a,0.0,0.95)); }');
    assert.ok(out.startsWith('uniform float uO;') && out.includes('clamp(a,0.0,0.95)*uO'));
    assert.strictEqual(L.fadeShader('void main(){}'), null, 'a changed shader turns the 3D bubbles off (CSS fallback) instead of drawing wrong');
    assert.ok(js.includes('uIn: U.uIn, uRim: U.uRim, uHi: U.uHi, uGlow: U.uGlow, uBase: U.uBase, uT: U.uT'), 'the very same uniform values: clock, glow, theme');
    assert.ok(js.includes('o.material.uniforms === a.memU'), 'finds Misty\'s membrane by her uniforms');
});

test('breathes like Misty\'s cell and sizes like her bubble', () => {
    assert.ok(scene.includes('Math.sin(t * 1.55)') && scene.includes('0.015'), 'Misty breathing in the scene');
    assert.strictEqual(L.breath(0, 0, false), 1);
    assert.ok(Math.abs(L.breath(Math.PI / 2 / 1.55, 0, false) - 1.015) < 1e-9);
    assert.strictEqual(L.breath(3, 1, true), 1, 'reduced motion: still');
    assert.ok(Math.abs(L.radiusFor(100) - 52) < 1e-9);
    const u = L.unitsPerPx(1.2, 55, 844);
    assert.ok(Math.abs(u * 844 - 2 * 1.2 * Math.tan(27.5 * Math.PI / 180)) < 1e-9);
    const n = L.ndc(195, 422, 390, 844); assert.ok(Math.abs(n.x) < 1e-12 && Math.abs(n.y) < 1e-12);
    const c = L.ndc(0, 0, 390, 844); assert.strictEqual(c.x, -1); assert.strictEqual(c.y, 1);
});

test('no new loop, no new WebGL context, drawn on top of the world, hidden off Home', () => {
    assert.ok(js.includes('offFrame = a.onFrame(frame)'), 'rides the world\'s own frame');
    assert.ok(!/requestAnimationFrame\(/.test(js), 'no own animation loop');
    assert.ok(!/getContext\(|new\s+\w*\.?WebGLRenderer/.test(js), 'no own WebGL context');
    assert.ok(js.includes('depthTest: false') && js.includes('renderOrder = 20'));
    assert.ok(js.includes("(wh-cosmos|wb-on)") && js.includes('isOpen()'), 'off when you leave Home or open the full 3D world');
    assert.ok(!js.includes("(wh-away|"), 'inside a cell world the living membrane stays (no fallback to the old flat shell)');
    assert.ok(js.includes('userData.lwKeep = true'), 'stays when you are inside a world');
});

test('long press = edit; the tap after it does nothing else', () => {
    assert.strictEqual(L.isLong(600, 3), true);
    assert.strictEqual(L.isLong(300, 3), false);
    assert.strictEqual(L.isLong(800, 30), false, 'a drag is not a long press');
    assert.ok(js.includes("kind === 'fast' ? { kind, onLong: fastLong }"));
    assert.ok(js.includes('FE.open()') && js.includes('no fast running: a normal tap'));
    assert.ok(js.includes('if (swallow && performance.now() - swallow < 900)'));
});

test('the shell turns clear like Misty\'s, text inside, Edit button gone, same squish', () => {
    assert.ok(/html\.lb3d\.wh-home #spHome #spFast\.lb-bub,[\s\S]*?background: transparent !important;[\s\S]*?border-color: transparent !important;/.test(css));
    assert.ok(css.includes('html.lb3d.wh-home #whHud .lb-bub::after { display: none !important; }'));
    assert.ok(css.includes('#spHome #feBub { display: none !important; }'));
    assert.ok(css.includes('html.wh-home .lb-bub[data-pressed] { scale: .92;'));
    assert.ok(css.includes('inset: 9%;') && css.includes('white-space: nowrap;'), 'fasting text fits inside the circle');
    assert.ok(spirit.includes('<i class="sp-u"> h </i>') && spirit.includes('<i class="sp-u"> min</i>'), 'small units so the time fits');
    assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
});

test('open for the movement bubble and later Home bubbles; loaded and cached', () => {
    for (const s of ['#whHud .wh-move', '#whHud [data-hb]', '.lw-bub']) assert.ok(L.AUTO.includes(s), s);
    assert.ok(js.includes("'lowi:home-bubble-added'") && js.includes('W.LowiBubbles = API') && js.includes('W.LowiLivingBubble'));
    assert.ok(/<script src="living-bubbles\.js\?v=[\d-]+"><\/script>/.test(html));
    assert.strictEqual(sw.split('"living-bubbles.js"').length - 1, 2);
    assert.strictEqual(sw.split('"living-bubbles.css"').length - 1, 2);
});
