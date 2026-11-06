'use strict';
/* Nov 6 2026 design review point 2 (Emmanuel): your companion shows what is missing.
   The Home bubble for the first open line of the "What's missing" list pulses gently (missing-pulse.js): one bubble at a time, no
   text, no sound; it stops when that line is done; off in Calm mode and with reduced motion; the name and % under the companion stay.
   Which bubble: water -> Water, move -> Move, fuel and scan -> Scan (a meal is logged from Scan; Einkaufen is shopping).
   Browser walk (scratch, Chromium, local site, network blocked), recorded in DECISIONS.md. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const M = require('../missing-pulse.js');
const js = read('missing-pulse.js'), css = read('missing-pulse.css'), bare = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

test('the bubble for the first open line of the list, and only one', () => {
    const row = (k, done, act) => ({ k, done, act });
    assert.deepEqual(M.pick({ rows: [row('sugar', true, 'move'), row('fuel', false, 'fuel'), row('water', false, 'water')] }), { k: 'fuel', bubble: 'scan' }, 'a missing meal: Scan, where a meal is logged');
    assert.deepEqual(M.pick({ rows: [row('fuel', true, 'fuel'), row('water', false, 'water'), row('move', false, 'move')] }), { k: 'water', bubble: 'water' }, 'done lines pass the turn on');
    assert.deepEqual(M.pick({ rows: [row('water', true, 'water'), row('move', false, 'move')] }), { k: 'move', bubble: 'move' });
    assert.deepEqual(M.pick({ rows: [row('sweet', false, 'scan')] }), { k: 'sweet', bubble: 'scan' });
    assert.equal(M.pick({ rows: [row('water', true, 'water'), row('move', true, 'move')] }), null, 'nothing missing, nothing pulses');
    assert.equal(M.pick({ rows: [row('night', false, ''), row('water', false, 'water')] }), null, 'the first open line has no bubble (night): nothing pulses');
    assert.equal(M.pick(null), null);
    assert.deepEqual(Object.assign({}, M.BUBBLE), { water: 'water', move: 'move', fuel: 'scan', scan: 'scan' }, 'Einkaufen (shopping) never stands in for a meal');
    const order = read('misty-peak.js').match(/const order = p\.rows\.filter\(r => !r\.done\)\.concat\(p\.rows\.filter\(r => r\.done\)\);/);
    assert.ok(order, 'the panel lists the missing lines first, in the same order the pulse reads them');
});

test('one bubble at a time, no words, no sound, off in Calm mode and with reduced motion', () => {
    assert.match(js, /if \(calm\(\) \|\| reduced\(\)\) return null;/);
    assert.match(js, /const calm = \(\) => H\.classList\.contains\('cm-on'\);/, 'galaxy-still.js puts html.cm-on for any Calm mode level');
    assert.match(js, /D\.querySelectorAll\('\.mp-pulse'\)\.forEach\(n => \{ if \(n !== t\) n\.classList\.remove\('mp-pulse'\); \}\);/, 'the class leaves every other bubble');
    assert.doesNotMatch(bare(js), /toast|speak|LowiVoice|Audio|vibrate|aria-live|textContent|innerHTML/, 'no text and no sound');
    assert.match(js, /halo\.setAttribute\('aria-hidden', 'true'\)/);
    assert.match(js, /\['lowi:reward', 'lowi:state', 'lowi:water', 'lowi:meal', 'lowi:meal-logged', 'lowi:fast', 'lowi:move', 'lowi:world-mood', 'lowi:cell-state', 'lowi:calm', 'storage', 'focus'\]/, 'it follows the moments the list changes');
    assert.doesNotMatch(bare(js), /MutationObserver\([^)]*\)\.observe\(D\.body|subtree: true/, 'no page-wide observer');
    assert.match(css, /html\.hb2-open #whHud \.mp-halo, html\.cm-on #whHud \.mp-halo \{ display: none !important; \}/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ html #whHud \.mp-halo \{ display: none !important; animation: none !important; \} \}/);
});

test('the halo sits around the bubble from the ring\'s own place variables; the bubble keeps its size and place', () => {
    assert.match(js, /\['--o8-x', '--o8-y'\]\.forEach\(k => halo\.style\.setProperty\(k, t\.style\.getPropertyValue\(k\)\)\);/);
    assert.match(js, /watch\.observe\(t, \{ attributes: true, attributeFilter: \['style'\] \}\);/, 'it follows the bubble when the ring moves');
    assert.match(css, /html\.o8\.wh-home #whHud \.mp-halo \{\n\s+display: block; position: absolute; z-index: 1; left: var\(--o8-x\); top: var\(--o8-y\);\n\s+width: calc\(var\(--o8-d\) \+ 12px\); height: calc\(var\(--o8-d\) \+ 12px\); border-radius: 50%; pointer-events: none;/);
    assert.match(css, /animation: mp-halo 2\.8s ease-in-out infinite;/, 'gentle: one slow swell');
    assert.doesNotMatch(bare(css), /\.mp-pulse\s*\{|\.mp-pulse\s*,/, 'no style on the bubble itself');
    assert.doesNotMatch(read('misty-peak.js'), /LowiMissingPulse|mp-pulse/, 'the companion\'s name and % are not touched');
});

test('the module loads with the page and is cached', () => {
    const html = read('index.html');
    assert.match(html, /<script src="misty-peak\.js\?v=[^"]+"><\/script>\n<link rel="stylesheet" href="missing-pulse\.css\?v=[^"]+">\n<script src="missing-pulse\.js\?v=[^"]+"><\/script>/);
    assert.match(read('sw.js'), /STATIC\.push\("missing-pulse\.js", "missing-pulse\.css"\);/);
});
