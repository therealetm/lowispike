'use strict';
/* Oct 16, 2026 (E-man, voice note on Community zoomed out: "There's a transparent cylinder ... it looks like there's a line cutting
   through it. I would rather have it be like light frequency"). The bloodstream tube (an open CylinderGeometry, radius 15, 180 long)
   used to stay at 3% opacity past the World Map while still writing depth, so it stuck out of our bubble and cut a straight-edged
   slice out of the membranes behind it. Now it fades out completely and a soft light frequency takes its place. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const sc = fs.readFileSync(path.join(__dirname, '..', 'body-world-3d-scene.js'), 'utf8');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const code = strip(sc);
const build = code.slice(code.indexOf('function buildCosmos()'), code.indexOf('function cosmosStep(t, dt)'));
const stepFn = code.slice(code.indexOf('function cosmosStep(t, dt)'), code.indexOf('function step(dt)'));

test('the bloodstream tube fades out completely past the World Map and never writes depth while fading', () => {
    assert.ok(stepFn.includes('const wo = 1 - walls;'), 'tube opacity reaches 0 out in the spirit world');
    assert.ok(!/1 - walls \* 0\.9\d/.test(stepFn), 'no leftover floor that keeps a faint cylinder on screen');
    assert.ok(stepFn.includes('wall.visible = wo > 0.02'), 'the tube is hidden once faded');
    assert.ok(stepFn.includes('wallMat.depthWrite = !wallMat.transparent'), 'a fading tube cannot clip the membranes');
    /* inside the World Map the vessel is unchanged: opaque, depth-writing, back side */
    assert.ok(code.includes("const wallMat = new THREE.MeshStandardMaterial({ color: PAL.dark.wall, map: wallTex(), roughness: 0.7, metalness: 0.2, side: THREE.BackSide"));
    assert.ok(code.includes('new THREE.CylinderGeometry(VR, VR, LEN * 2'), 'Home keeps its 360 bloodstream');
});

test('no cylinder, clipping plane or cut sphere in the outer world', () => {
    assert.ok(!/CylinderGeometry|clippingPlanes|clipIntersection/.test(build), 'nothing tube-like or clipping is built for the realm');
    assert.ok(!/SphereGeometry\([^)]*,[^)]*,[^)]*,[^)]*,/.test(build), 'membrane spheres are whole (no phi/theta length)');
});

test('a soft light frequency takes the tube\'s place inside our bubble', () => {
    assert.ok(build.includes("freq.name = 'light-frequency'") && build.includes('g.add(freq)'), 'light frequency strands in the realm group');
    const mats = build.slice(build.indexOf('const FREQ_SEG'), build.indexOf('g.add(freq)'));
    assert.ok(mats.includes('depthWrite: false') && mats.includes('blending: THREE.AdditiveBlending') && mats.includes('m.frustumCulled = false'), 'additive light, no depth write');
    assert.ok(build.includes('exp(-vS * vS * 4.0)') && build.includes('pow(sin(3.14159 * vU), 1.6)'), 'soft across the width, fades to nothing at both ends');
    assert.ok(build.includes('uLen: { value: COSMOS.R * 1.5 }'), 'stays inside our membrane (its visible part is well within the radius)');
    for (const c of ["'brain'", "'misty'", "'heart'"]) assert.ok(mats.includes(c), 'palette colour ' + c);
    assert.ok(stepFn.includes('const fo = smoothC(0.3, 1, walls) * 0.6 * calm;'), 'appears as the tube fades, calmer on Community');
    assert.ok(stepFn.includes('m.material.uniforms.uT.value = tt;') && stepFn.includes('tt = still ? 0 : t'), 'reduced motion holds the waves still');
    assert.ok(stepFn.includes('C.freq.visible = fo > 0.005'), 'hidden (free) inside the World Map');
});
