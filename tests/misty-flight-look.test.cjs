'use strict';
/* Oct 18 2026, evening. After 20261018-190146 (the "eyes stay visible while she flies" fix) Misty glowed pale white whenever she
   left her Home bubble: a 90% opaque pale layer sat under her glass body, and her energy no longer made her body see-through.
   E-man: "That doesn't make sense that she changes when she's out of the bubble. All I wanted is to keep her eyes basically the
   same... it felt like the eyes were going transparent. That's all I wanted you to fix, actually."
   Rule now: out of the bubble her BODY looks exactly as before 183729 (her own glass art, (0.55 + 0.43 x energy) x fade, the same
   tint); ONLY her face plane (eyes, highlights, cheeks, mouth) is solid whenever any of it points at you. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const F = require('../misty-face.js');

/* her real face art (herb-tamagotchi.js), inside a body like hers */
const ht = read('herb-tamagotchi.js');
const FACE = /const face='(<g class="lh-face"[\s\S]*?<\/g>)';/.exec(ht)[1].replace(/'\+faceY\+'/g, '165');
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 310"><g class="lh-creature"><g class="cw-membrane">'
    + '<ellipse class="lh-body cw-wall" cx="130" cy="170" rx="62" ry="59.5" fill="url(#cyto)" stroke="#1cf7f9"/><g class="cw-inside"><circle r="3"/></g></g>'
    + FACE + '</g></svg>';

/* the two lines exactly as they read before 20261018-183729 (git af789ff), the look Emmanuel knows */
const OLD_BODY = (k, alpha) => (0.55 + 0.43 * k) * Math.max(0, Math.min(1, alpha));
const OLD_TINT = k => [1, 0.78 + 0.22 * k, 0.78 + 0.22 * k];

test('with her real face art: body = her art minus the face, nothing added; the face carries her eyes, white highlights and both cheeks', () => {
    const s = F.splitArt(SVG);
    assert.ok(s && s.back === false);
    assert.ok(!/mf-body-back/.test(s.body));
    assert.ok(s.body.includes('<ellipse class="lh-body cw-wall" cx="130" cy="170" rx="62" ry="59.5" fill="url(#cyto)" stroke="#1cf7f9"/>'), 'her glass body untouched');
    assert.ok(!/lh-eyes|lh-blush/.test(s.body), 'eyes and cheeks are not in the body (so its transparency never reaches them)');
    assert.equal((s.face.match(/fill="#183d42"/g) || []).length, 2, 'both eyes in the solid face');
    assert.equal((s.face.match(/fill="white"/g) || []).length, 2, 'both eye highlights in the solid face');
    assert.equal((s.face.match(/class="lh-blush"/g) || []).length, 2, 'both cheeks in the solid face');
});

test('simulated flight, tired to full energy: body opacity matches the pre-Oct-18 look exactly, the face is fully opaque whenever it faces you', () => {
    for (const k of [0, 0.15, 0.35, 0.6, 0.85, 1]) {
        const body = OLD_BODY(k, 1);
        assert.ok(body < 1, 'her glass body stays a little see-through like before (k=' + k + ': ' + body.toFixed(3) + ')');
        for (let a = 0; a <= Math.PI + 1e-9; a += 0.02) {
            const d = Math.cos(a), L = F.faceLook(d, 1); /* presence 1: she is out and settled */
            if (F.faceVis(d) > 0) assert.equal(L.op, 1, 'face solid over a ' + body.toFixed(2) + ' opaque body (k=' + k + ', d=' + d.toFixed(2) + ')');
            else assert.equal(L.op, 0, 'only her back toward you: no face');
        }
    }
    /* the tired fixture Misty the old live check measured on build 175840: body 0.697 */
    assert.ok(Math.abs(OLD_BODY(0.34, 1) - 0.696) < 0.002);
});

test('her fade in / out still dims body and face together (the face never floats on its own)', () => {
    for (const alpha of [0, 0.2, 0.5, 0.8, 1]) assert.equal(F.faceLook(1, alpha).op, alpha < 0.01 ? 0 : alpha);
});

test('misty-flight place(): the same body opacity and tint lines as before Oct 18, plus only the presence hand-off', () => {
    const fl = read('misty-flight.js');
    const place = fl.slice(fl.indexOf('function place(ctx'), fl.indexOf('function place(ctx') + 3000);
    assert.ok(place.includes('wand.material.color.setRGB(1, 0.78 + 0.22 * k, 0.78 + 0.22 * k)'), 'tint unchanged');
    assert.deepEqual(OLD_TINT(0.5), [1, 0.89, 0.89]);
    const m = /const pr = clamp\(alpha, 0, 1\), op = \(0\.55 \+ 0\.43 \* k\) \* pr;/.exec(place);
    assert.ok(m, 'body opacity = (0.55 + 0.43 x energy) x fade');
    /* evaluate the formula as written against the old one */
    const expr = /op = (\(0\.55 \+ 0\.43 \* k\) \* pr)/.exec(place)[1];
    const fn = new Function('k', 'pr', 'return ' + expr);
    for (const k of [0, 0.3, 0.7, 1]) for (const a of [0, 0.5, 1]) assert.equal(fn(k, a), OLD_BODY(k, a));
    assert.ok(/wand\.userData\.mfPresence = pr/.test(place));
});

test('world-home: the non-flight body eases to the same energy look as before; presence goes to 1 once she is there', () => {
    const wh = read('world-home.js');
    assert.ok(wh.includes('wand.material.opacity += ((fade ? 0.55 + 0.43 * k : 0) - wand.material.opacity) * Math.min(1, dt * 2.5);'));
    assert.ok(!/fade \? 1 : 0\) - wand\.material\.opacity/.test(wh), 'no forced-solid body');
    assert.ok(/wand\.userData\.mfPresence = p2/.test(wh));
});

test('misty-face reads her presence for the face, never her body opacity when presence is known', () => {
    const mf = read('misty-face.js');
    const fr = mf.slice(mf.indexOf('function faceRender('), mf.indexOf('function camBasis('));
    assert.ok(/const pr = w\.userData && w\.userData\.mfPresence/.test(fr));
    assert.ok(/faceLook\(F\.d, pr == null \? \(w\.material\.opacity \|\| 0\) : pr\)/.test(fr));
    assert.ok(/presence: S\.wand && S\.wand\.userData\.mfPresence/.test(mf), 'state() reports presence for the live check');
});
