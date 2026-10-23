'use strict';
/* Oct 23 2026, 14:57 (Eman's iPhone screenshot with the bloom ring open: a flat dark phone-shaped box in the middle, a pale gradient
   round it, "everything has disappeared. There's nothing in my universe"). bloom-ring.js scaled #spHome .sp-heroes, and that layer
   also holds the 3D stage (#bw3Stage + its WebGL canvas), so the whole universe shrank into a box and Home's layout then moved the
   camera IN. The zoom-out must be the camera pulling back inside the full world; only the DOM bubbles shrink.
   Browser check: tools/check-world-behind-bloom.cjs <w>x<h> [root|url] (live 20261023-152119: 5/9, the four open cases a box). */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('the bloom zoom never scales the 3D stage, only the bubbles beside it', () => {
    const br = read('bloom-ring.js');
    assert.doesNotMatch(br, /const layers = \(\) => \[D\.getElementById\('whHud'\), D\.querySelector\('#spHome \.sp-heroes'\)\]/, 'the whole .sp-heroes layer (with the 3D stage inside) is no longer a scaled layer');
    assert.match(br, /\[\.\.\.heroes\.children\]\.forEach\(el => \{ if \(!isWorld\(el\)\) out\.push\(el\); \}\)/, 'children of .sp-heroes are scaled one by one, the world skipped');
    assert.match(br, /el\.id === 'bw3Stage'/, 'the 3D stage counts as the world');
    assert.match(br, /closest\('#spFast, #spBubble'\)/, 'the Gap bubble\'s own little canvas still shrinks with the ring');
    const css = read('bloom-ring.css');
    assert.match(css, /html\.br-zoom #spHome \.sp-heroes, html\.br-zoom #bw3Stage, html\.br-zoom #bw3Stage canvas \{ scale: none !important; \}/, 'CSS guard: the stage is never scaled while zoomed');
    assert.doesNotMatch(css, /html\.br-zoom #whHud, html\.br-zoom #spHome \.sp-heroes \{/, 'no will-change scale on the whole heroes layer');
});

test('the zoom-out is the 3D camera pulling back, and it comes forward again on close', () => {
    const br = read('bloom-ring.js');
    assert.match(br, /new CustomEvent\('lowi:bloom-zoom', \{ detail: \{ s, on: true \} \}\)/, 'zoom tells the world the bubbles\' scale');
    assert.match(br, /detail: \{ s: 1, on: false, start: true \}/, 'close brings the camera forward together with the bubbles');
    const w3 = read('body-world-3d.js');
    assert.match(w3, /W\.addEventListener\('lowi:bloom-zoom', e => \{ const d = \(e && e\.detail\) \|\| \{\}; api\.setPull\(d\.on && d\.s > 0 \? 1 \/ d\.s : 1\); \}\)/, 'pull = 1 / scale');
    assert.match(w3, /world\.setPull\(mode === 'home' \? api\.pull : 1\)/, 'only on Home');
    const sc = read('body-world-3d-scene.js');
    assert.match(sc, /function setPull\(k\) \{ k = \+k; rig\.pullT = isFinite\(k\) && k > 0 \? Math\.max\(1, Math\.min\(2\.5, k\)\) : 1; \}/, 'pull is clamped 1..2.5 and never moves the camera in');
    assert.match(sc, /const camD = rig\.dist \* rig\.pull;/, 'camera distance carries the pull, rig.dist (World Map limit, pinch) untouched');
    assert.match(sc, /setPull, setGyro/, 'world exposes setPull');
    assert.match(sc, /rig\.mode = m; rig\.lastHome = false; rig\.pullT = 1;/, 'leaving Home drops the pull');
});

test('pull maths: the scaled bubbles and the pulled-back camera agree', () => {
    const clamp = k => (isFinite(k) && k > 0 ? Math.max(1, Math.min(2.5, k)) : 1);
    for (const s of [0.694, 0.644, 0.647]) { const k = clamp(1 / s); assert.ok(k > 1.03 && k < 1.7, 's=' + s + ' -> pull ' + k); }
    assert.equal(clamp(1 / 1), 1); assert.equal(clamp(0), 1); assert.equal(clamp(NaN), 1); assert.equal(clamp(0.5), 1, 'never in');
});
