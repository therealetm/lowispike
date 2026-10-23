/* Oct 23, 23:40 (Eman): (1) flying Misty out of her bubble, the universe popped in ("boop") instead of showing through gradually;
   (2) every time she flew into a world, it disappeared (the body-place veil faded the place she was heading to behind a bubble
   that the clean flight view had already hidden). Source checks; the browser probes are tools/cosmos-reveal-probe.cjs and
   tools/veil-entry-probe.cjs. */
'use strict';
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const scene = fs.readFileSync(path.join(__dirname, '..', 'body-world-3d-scene.js'), 'utf8');
const shell = fs.readFileSync(path.join(__dirname, '..', 'body-world-3d.js'), 'utf8');

test('the spirit world fades in through one eased reveal instead of switching on at 72 %', () => {
    assert.match(scene, /cosmosRv \+= \(rvT - cosmosRv\) \* Math\.min\(1, dt \* \(rvT > cosmosRv \? 1\.4 : 4\)\)/);
    assert.match(scene, /const far = Math\.max\(smoothC\(55, 190, d\), 0\.72 \* cosmosGx\) \* rv;/);
    assert.match(scene, /memW = mem \* deep \* rv;/);
    assert.match(scene, /const show = Math\.max\(k, rv\) > 0\.001;\s*C\.g\.visible = show;/);
    /* at Home (camera inside the World Map distance, no breakout) the reveal target is 0: Home unchanged */
    assert.match(scene, /const rvT = homeish \? Math\.max\(smoothC\(m0, m0 \+ 36, d\), gxOn \? 0\.16 : 0\) : 0;/);
});

test('a place Misty flies to is never veiled', () => {
    assert.match(scene, /if \(rig\.fly \|\| document\.documentElement\.classList\.contains\('mf-on'\)\) return false;/);
    assert.match(shell, /if \(H\.classList\.contains\('mf-on'\) \|\| H\.classList\.contains\('mf-galaxy'\)\) return \[\];/);
    assert.match(shell, /if \(!veilVisible\(el\)\) return;/);
});
