'use strict';
/* Nov 6 2026 design review point 2 (Emmanuel): your companion shows what is missing: the Home bubble for the first open line of the
   "What's missing" list pulses gently, one bubble at a time, no text, no sound, stops when done, off in Calm mode and with reduced
   motion, the name and % under the companion stay.
   Nov 7 2026 (test changed, why: Emmanuel, screenshot of the camera with a ring round it: "why is the camera pulsating ... it
   shouldn't have an extra circle pulsating the whole time. That just kills the symmetrical logic"): no ring outside a bubble; a soft
   light inside the bubble breathes three times when you come to Home (or the line changes), then rests; only Water and Move (one tap
   fixes them), never the camera (missing-pulse.js / .css). Browser walk (scratch, Chromium, local site, network blocked) in DECISIONS.md. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const M = require('../missing-pulse.js');
const js = read('missing-pulse.js'), css = read('missing-pulse.css'), bare = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

test('only a line one tap fixes lights its bubble: Water or Move, never the camera', () => {
    const row = (k, done, act) => ({ k, done, act });
    assert.deepEqual(M.pick({ rows: [row('sugar', true, 'move'), row('water', false, 'water'), row('move', false, 'move')] }), { k: 'water', bubble: 'water' });
    assert.deepEqual(M.pick({ rows: [row('water', true, 'water'), row('move', false, 'move')] }), { k: 'move', bubble: 'move' }, 'done lines pass the turn on');
    assert.equal(M.pick({ rows: [row('fuel', false, 'fuel'), row('water', false, 'water')] }), null, 'a missing meal first: nothing lights (the camera never glows)');
    assert.equal(M.pick({ rows: [row('sweet', false, 'scan')] }), null);
    assert.equal(M.pick({ rows: [row('night', false, ''), row('water', false, 'water')] }), null, 'the first open line decides; the night line has no bubble');
    assert.equal(M.pick({ rows: [row('water', true, 'water'), row('move', true, 'move')] }), null, 'nothing missing, nothing glows');
    assert.equal(M.pick(null), null);
    assert.deepEqual(Object.assign({}, M.BUBBLE), { water: 'water', move: 'move' });
    assert.ok(/const order = p\.rows\.filter\(r => !r\.done\)\.concat\(p\.rows\.filter\(r => r\.done\)\);/.test(read('misty-peak.js')), 'the panel lists the missing lines first, in the order the glow reads them');
});

test('three breaths, then still: again only for a new line or after the rest', () => {
    const w = { k: 'water', bubble: 'water' };
    assert.equal(M.due(null, w, 1000), true, 'first time');
    assert.equal(M.due({ k: 'water', bubble: 'water', at: 1000 }, w, 1000 + 60000), false, 'not again a minute later');
    assert.equal(M.due({ k: 'water', bubble: 'water', at: 1000 }, w, 1000 + M.REST_MS), true, 'after the rest');
    assert.equal(M.due({ k: 'water', bubble: 'water', at: 1000 }, { k: 'move', bubble: 'move' }, 2000), true, 'a new line at once');
    assert.equal(M.due(null, null, 1000), false);
    assert.equal(M.REST_MS, 180000);
    assert.match(css, /opacity: 0; animation: mp-breathe 2\.4s ease-in-out 3;/, 'three slow breaths, never "the whole time"');
    assert.match(js, /g\.addEventListener\('animationend', \(\) => \{ if \(g\.parentNode\) g\.remove\(\);/, 'the light leaves when it is done');
    assert.match(js, /if \(back \|\| due\(last, w, now\)\) \{ breathe\(el\);/, 'coming to Home counts as a new moment');
});

test('inside the bubble, nothing outside it, nothing moves; off in Calm mode, reduced motion and blooms', () => {
    assert.match(css, /html\.o8\.wh-home #whHud \.lb-bub\[data-orbit\] > \.mp-glow \{\n\s+display: block; position: absolute; inset: 12%; z-index: 0; border-radius: 50%; pointer-events: none;/, 'a light inside the bubble (the bubble clips it)');
    assert.doesNotMatch(bare(css), /\.mp-halo|box-shadow|scale\(|transform:/, 'no ring, no growing, no moving');
    assert.doesNotMatch(bare(js), /mp-halo|insertBefore/, 'nothing is added beside the bubble');
    assert.match(css, /html\.o8\.wh-home #whHud \.lb-bub\[data-orbit\]\.mp-pulse > \.wh-cell-tx \{ position: relative; z-index: 1; \}/, 'the symbol stays above the light');
    assert.match(css, /html\.hb2-open #whHud \.mp-glow, html\.cm-on #whHud \.mp-glow \{ display: none !important; \}/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ html #whHud \.mp-glow \{ display: none !important; animation: none !important; \} \}/);
    assert.match(js, /if \(calm\(\) \|\| reduced\(\)\) return null;/);
    assert.doesNotMatch(bare(js), /toast|speak|LowiVoice|Audio|vibrate|aria-live|textContent|innerHTML/, 'no text and no sound');
    assert.match(js, /g\.setAttribute\('aria-hidden', 'true'\)/);
    assert.doesNotMatch(read('misty-peak.js'), /LowiMissingPulse|mp-pulse|mp-glow/, 'the companion\'s name and % are not touched');
});

test('the module loads with the page and is cached', () => {
    const html = read('index.html');
    assert.match(html, /<script src="misty-peak\.js\?v=[^"]+"><\/script>\n<link rel="stylesheet" href="missing-pulse\.css\?v=[^"]+">\n<script src="missing-pulse\.js\?v=[^"]+"><\/script>/);
    assert.match(read('sw.js'), /STATIC\.push\("missing-pulse\.js", "missing-pulse\.css"\);/);
});
