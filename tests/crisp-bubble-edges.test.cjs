// Crisp bubble edges (Oct 17, E-man: the bubbles have jagged, pixely edges; the menu bar is fine). Every 3D bubble outline (Misty's
// membrane, the living Home bubbles that copy it, the other worlds in the universe) softens its own last pixel with fwidth, so it
// stays smooth without MSAA and without raising the render resolution.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const scene = read('body-world-3d-scene.js'), lb = read('living-bubbles.js'), nav = read('glass-nav.css');
const L = require('../living-bubbles.js');

const lines = scene.split('\n');
const edgeLine = lines.find(l => l.includes('const EDGE_AA ='));
const EDGE_AA = edgeLine ? eval(edgeLine.slice(edgeLine.indexOf('= ') + 2).replace(/;\s*$/, '')) : '';
const frags = lines.filter(l => l.includes("fragmentShader: '")).map(l => {
    const e = l.slice(l.indexOf("fragmentShader: '") + 16).trim().replace(/\s*\}\);\s*$/, '').replace(/,\s*$/, '');
    return eval(e);
});

test('the edge helper uses screen-space derivatives with a safe fallback, on its own preprocessor lines', () => {
    assert.ok(EDGE_AA, 'EDGE_AA is defined in the scene');
    assert.match(EDGE_AA, /\n#if __VERSION__ >= 300 \|\| defined\(GL_OES_standard_derivatives\)\n/);
    assert.match(EDGE_AA, /float lwEdge\(float nv\)\{return smoothstep\(0\.0,fwidth\(nv\)\*2\.0\+0\.02,nv\);\}/);
    assert.match(EDGE_AA, /\n#else\nfloat lwEdge\(float nv\)\{return smoothstep\(0\.0,0\.06,nv\);\}\n#endif\n/, 'no derivatives: a fixed soft edge, never a compile error');
});

test('Misty\'s membrane fades its outline and still ends the way living-bubbles.js expects', () => {
    const mem = frags[0];
    assert.ok(mem.includes('float lwEdge(float nv)'), 'helper is inside the membrane shader');
    assert.ok(mem.includes('float nv=abs(dot(normalize(vN),normalize(vV)));float f=pow(1.0-nv,2.0);'), 'same facing term as before');
    assert.ok(mem.includes('float a=(uBase+f*(0.55+0.45*uGlow)+shimmer*0.04)*lwEdge(nv);'), 'alpha softened only at the outline');
    assert.ok(mem.includes('clamp(a,0.0,0.95)'));
    const faded = L.fadeShader(mem);
    assert.ok(faded && faded.includes('clamp(a,0.0,0.95)*uO') && faded.includes('lwEdge(nv)'), 'living Home bubbles inherit the crisp edge');
    assert.ok(mem.indexOf('lwEdge(float') < mem.indexOf('void main()'), 'helper declared before main');
});

test('the other worlds in the universe get the same soft outline, with their look unchanged inside', () => {
    const cos = frags.find(f => f.includes('uRim2'));
    assert.ok(cos, 'cosmos membrane shader found');
    assert.ok(cos.includes('float f = 1.0 - abs(dot(vN, vV));'), 'rim term unchanged');
    assert.ok(cos.includes('* uO * lwEdge(nv)); }'), 'outline softened');
});

test('derivatives are requested for every membrane material (WebGL1 fallback safe)', () => {
    assert.ok(scene.includes('uniforms: memU, transparent: true, depthWrite: false, extensions: { derivatives: true },'));
    assert.ok(scene.includes('side: THREE.FrontSide, extensions: { derivatives: true },'));
    assert.ok(lb.includes('extensions: { derivatives: true }'), 'living bubbles material too');
});

test('wide liquid drops (Daily Quest, Today) have enough points for a smooth outline', () => {
    assert.deepStrictEqual(L.DROP_SEG, [96, 64]);
    assert.ok(lb.includes('new THREE.SphereGeometry(gR, CORE.DROP_SEG[0], CORE.DROP_SEG[1])'));
    assert.ok(/return \(drops\[n\] = g\);/.test(lb), 'built once per shape and shared');
});

test('no extra render cost: resolution cap, antialias rule and the sharpness floor are unchanged', () => {
    assert.ok(scene.includes("antialias: (window.devicePixelRatio || 1) < 2"), 'no MSAA added on retina screens');
    assert.ok(scene.includes('let dprCap = opts.dprCap || 2'), 'resolution still capped at 2x');
    assert.ok(read('body-world-3d.js').includes('return small ? 1.5 : 2;'));
    assert.ok(!/lwEdge|EDGE_AA/.test(nav), 'the menu bar (already fine) is not touched');
});
