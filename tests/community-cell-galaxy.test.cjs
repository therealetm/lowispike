'use strict';
/* Oct 16, 2026 (E-man on build 181510: "Why are there companions in the background? It's distracting ... We don't see the companions.
   We see that metabolic cellular galaxy outer world"). The far realm behind Community is living cells only, made procedurally. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const sc = read('body-world-3d-scene.js');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const realm = strip(sc.slice(sc.indexOf('const reduceMq = '), sc.indexOf('    function step(dt)')));

test('no companion or face is drawn in the background layer', () => {
    assert.ok(realm.includes('function buildCosmos()') && realm.includes('function cosmosStep(t, dt)'), 'found the realm code');
    for (const bad of ['formTex', 'nameTex', 'dressCosmos', 'community-realm', 'LowiCommunity', '.people(', 'gods', 'p.form', '<svg', 'image/svg', 'new Image(', 'companion'])
        assert.ok(!realm.includes(bad), 'background layer must not draw people/companions: ' + bad);
    assert.ok(!/\.mate\b/.test(realm), 'no companion mate sprites');
    assert.ok(!/LowiCommunity|community-realm|formTex/.test(strip(sc)), 'nothing in the 3D scene reads the Community roster');
    /* the only sprites out there are soft glows (our membrane glow and the haze veils), never a picture of someone */
    const spriteMaps = realm.match(/new THREE\.SpriteMaterial\(\{ map: (\w+)/g) || [];
    assert.ok(spriteMaps.length > 0 && spriteMaps.every(m => m.endsWith('glowTex')), 'sprites only use the glow texture');
});

test('the realm is a procedural cellular galaxy, not a picture', () => {
    assert.ok(!/TextureLoader|\.webp|\.jpe?g|url\(/.test(strip(sc)), 'no image file anywhere in the scene');
    assert.ok(realm.includes('function fillCell(') && realm.includes("ptsObj(cellsA, cellTex, true") && realm.includes('webObj(webV, webC)'), 'each sphere is full of cells, organelles and a node web');
    assert.ok(realm.includes("near.name = 'cosmos-near'") && realm.includes('C.near.quaternion.copy(camera.quaternion)'), 'huge near spheres cut by the screen edges');
    assert.ok(realm.includes("new THREE.CatmullRomCurve3(via, false, 'centripetal')") && realm.includes('q[1] < 270'), 'threads always curve and only join neighbours');
    assert.ok(!/LineSegments\(fGeo/.test(realm), 'the old straight fibres are gone');
    assert.ok(realm.includes('sparks') && realm.includes('const motes = ptsObj(dustA, dotTex, true') && realm.includes('const stars = ptsObj(starA'), 'beads travel on threads, dust drifts, a starry deep');
    assert.ok(realm.includes("(prefers-reduced-motion: reduce)") && realm.includes('tt = still ? 0 : t'), 'reduced motion freezes the drift');
});

test('Today and the World Map are untouched: the realm only exists past the World Map', () => {
    assert.ok(realm.includes('const k = homeish ? smoothC((rig.maxD || 14) * 1.05, 120, d) : 0;') && realm.includes('if (k <= 0 && rv <= 0 && !cosmos) return;') && realm.includes("const rvT = homeish ? Math.max(smoothC(m0, m0 + 36, d), gxOn ? 0.16 : 0) : 0;"));
    assert.ok(realm.includes('C.near.visible = C.g.visible && nearK > 0.01;') && realm.includes('if (!C.g.visible) { return; }'));
});
