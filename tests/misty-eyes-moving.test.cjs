'use strict';
/* Oct 18, 2026 (E-man, iPad, flying out in a dark world): "Btw when it move we don't see its eyes bc it's transparent."
   Cause: out in the world misty-flight drew her body at (0.55 + 0.43 x energy) opacity (a tired Misty = 70%) and her face plane
   copied that; her cell body is glass anyway (cytoplasm 12-16% opaque), so her dark eyes (#183d42) had nothing behind them.
   Fix: misty-face gives her flying body art a solid inner layer under the glass, draws her face solid whenever any of it points at
   you (it shrinks into her rim instead of fading when she turns away), and her energy no longer fades her body. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const F = require('../misty-face.js');

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 310"><g class="lh-creature"><g class="cw-membrane">'
    + '<ellipse class="lh-body cw-wall" cx="130" cy="170" rx="62" ry="59.5" fill="url(#cyto)" stroke="#1cf7f9"/><g class="cw-inside"><circle r="3"/></g></g>'
    + '<g class="lh-face" transform="translate(130 165)"><g class="lh-eyes"><ellipse cx="-11" cy="-2" rx="4.1" ry="6" fill="#183d42"/></g></g></g></svg>';

test('her flying body art gets a solid inner layer right under the glass body: same ellipse, filled, at least 85% opaque', () => {
    const s = F.splitArt(SVG);
    assert.ok(s && s.back, 'inner layer added');
    const back = /<ellipse class="mf-body-back"[^>]*\/>/.exec(s.body);
    assert.ok(back, 'the layer is in the body art');
    assert.ok(s.body.indexOf(back[0]) < s.body.indexOf('lh-body'), 'drawn under her glass body (her membrane, glow and inside stay on top)');
    for (const [n, v] of [['cx', '130'], ['cy', '170'], ['rx', '62'], ['ry', '59.5']]) assert.ok(back[0].includes(n + '="' + v + '"'), n + ' matches her body');
    const a = +/fill-opacity="([\d.]+)"/.exec(back[0])[1];
    assert.ok(a >= 0.85, 'opaque enough that the world does not show through her face: ' + a);
    assert.ok(!/mf-body-back/.test(s.face), 'the face itself is untouched');
});

test('the inner layer is light enough that her dark eyes read on it over ANY world (contrast > 4.5:1, black or white world)', () => {
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
    const lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const lum = rgb => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
    const eye = lum(hex('#183d42')), b = hex(F.K.BACK.fill), A = F.K.BACK.a;
    for (const world of [[0, 0, 0], [0.16, 0.1, 0.03], [1, 1, 1]]) {
        const c = lum(b.map((x, i) => x * A + world[i] * (1 - A)));
        const ratio = (Math.max(c, eye) + 0.05) / (Math.min(c, eye) + 0.05);
        assert.ok(ratio > 4.5, 'eyes vs body over world ' + world + ': ' + ratio.toFixed(1));
    }
});

test('her face is solid (opacity 1) whenever any of it points at you, never a ghost; only her back hides it', () => {
    for (let a = 0; a <= Math.PI + 1e-9; a += 0.01) {
        const d = Math.cos(a), L = F.faceLook(d, 1);
        assert.ok(L.op === 0 || L.op === 1, 'never half see-through: ' + L.op + ' at d=' + d.toFixed(2));
        if (F.faceVis(d) > 0) assert.equal(L.op, 1, 'part of her face toward you: solid (d=' + d.toFixed(2) + ')');
        else assert.equal(L.op, 0, 'only her back toward you: no face showing through');
    }
    assert.equal(F.faceLook(0, 1).op, 1, 'flying sideways (3/4 profile): solid');
    assert.equal(F.faceLook(-0.2, 1).op, 1, 'turning past sideways, a sliver of face left: still solid');
    assert.equal(F.faceLook(-1, 1).op, 0);
});

test('turning away still has no pop: past her edge the face shrinks into her rim, in small steps', () => {
    let prev = 1;
    for (let a = 0; a <= Math.PI; a += 0.05) {
        const k = F.faceLook(Math.cos(a), 1).k;
        assert.ok(k <= prev + 1e-9 && prev - k < 0.2, 'monotonic, small steps'); prev = k;
    }
    assert.equal(F.faceLook(1, 1).k, 1, 'facing you: full size');
});

test('only her own fade in / out lowers the face, and the face follows it exactly (never floats alone)', () => {
    assert.equal(F.faceLook(1, 0.4).op, 0.4);
    assert.equal(F.faceLook(1, 0).op, 0);
    assert.equal(F.faceLook(0.5, 1).op, 1);
});

test('wiring: her energy no longer fades her body; the face is drawn by faceLook, on top, unshaded by depth', () => {
    const fl = read('misty-flight.js'), wh = read('world-home.js'), mf = read('misty-face.js');
    const place = fl.slice(fl.indexOf('function place(ctx'), fl.indexOf('function place(ctx') + 3000);
    assert.ok(!/0\.55 \+ 0\.43 \* k/.test(place), 'misty-flight place(): no energy-scaled opacity');
    assert.ok(/const op = clamp\(alpha, 0, 1\);/.test(place), 'body opacity = her fade only');
    assert.ok(!/0\.55 \+ 0\.43 \* k/.test(wh), 'world-home: no energy-scaled opacity either');
    assert.ok(!/advWarp \? 1 - 0\.55/.test(fl), 'adventure warp: she no longer turns see-through');
    const fr = mf.slice(mf.indexOf('function faceRender('), mf.indexOf('function camBasis('));
    assert.ok(/faceLook\(F\.d, w\.material\.opacity/.test(fr), 'faceRender uses faceLook');
    assert.ok(!/F\.vis \* \(w\.material\.opacity/.test(fr), 'no more fading the face by how far she has turned');
    const ro = +/m\.renderOrder = (\d+)/.exec(mf)[1];
    assert.ok(ro > 61, 'face drawn after her body (wand renderOrder 61): ' + ro);
    assert.ok(/depthTest: false/.test(mf.slice(mf.indexOf('function buildMesh'), mf.indexOf('function faceRender'))), 'nothing in the world hides it by depth');
});

test('frame loop cost: values are only written when they change (no per-frame churn), no DOM work per frame', () => {
    const mf = read('misty-face.js'), fl = read('misty-flight.js');
    const fr = mf.slice(mf.indexOf('function faceRender('), mf.indexOf('function camBasis('));
    assert.ok(/if \(m\.material\.opacity !== op\) m\.material\.opacity = op;/.test(fr));
    assert.ok(/!m\.material\.color\.equals\(w\.material\.color\)/.test(fr));
    assert.ok(!/getImageData|getBoundingClientRect|getComputedStyle|querySelector/.test(fr), 'no readback / layout in the frame');
    assert.ok(/if \(wand\.material\.opacity !== op\) wand\.material\.opacity = op;/.test(fl));
});
