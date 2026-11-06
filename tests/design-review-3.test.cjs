'use strict';
/* Nov 6 2026 design review point 3 (Emmanuel): the hold ring.
   On every Home bubble with a long press, a thin ring fills while you hold, in a hologram look (hold-ring.js / .css). It is only a
   picture: the bubbles' own code still decides what a hold does. It fills in exactly that bubble's hold time, goes when the finger
   lifts, slides off or a second finger lands; with reduced motion it does not fill (a still ring).
   Browser walk (scratch, Chromium, local site, network blocked), recorded in DECISIONS.md. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const R = require('../hold-ring.js');
const js = read('hold-ring.js'), css = read('hold-ring.css'), bare = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

test('every Home bubble with a long press, with exactly its own hold time', () => {
    const blooms = read('home-blooms-v2.js'), ss = read('home-settings-sleep-v2.js'), wh = read('world-home.js');
    const holdBlooms = +blooms.match(/\n    const HOLD_MS = (\d+);\n    function onDown\(e\)/)[1];
    assert.match(blooms, /if \(kind !== 'move' && kind !== 'gap'\) return;/, 'Move and Gap are the bubbles home-blooms-v2.js holds');
    const holdSettings = +ss.match(/HOLD_MS = (\d+);/)[1];
    assert.match(ss, /const el = e\.target && e\.target\.closest && e\.target\.closest\('\[data-orbit="settings"\]'\);/, 'Community (settings) holds for profile and settings');
    const holdWater = +wh.match(/el\.classList\.remove\('wh-holding'\); waterUndoLast\(\); \}, (\d+)\);/)[1];
    assert.deepEqual(Object.assign({}, R.HOLDS), { water: holdWater, move: holdBlooms, gap: holdBlooms, settings: holdSettings });
    assert.deepEqual([holdWater, holdBlooms, holdSettings], [600, 550, 480]);
    assert.equal(R.SLOP, 12, 'the same slide that cancels the holds cancels the ring');
    assert.match(wh, /Math\.hypot\(e\.clientX - lp\.x, e\.clientY - lp\.y\) > 12\) lpCancel\(\)/);
    assert.match(blooms, /Math\.hypot\(e\.clientX - st\.hold\.x, e\.clientY - st\.hold\.y\) > 12\)/);
});

test('a thin ring just outside the bubble that fills in the hold time; only a picture', () => {
    assert.deepEqual(R.geom(88), { size: 104, r: 48, c: 301.59 }, 'a line 4 px outside an 88 px bubble');
    assert.match(js, /fill\.style\.transition = 'stroke-dashoffset ' \+ ms \+ 'ms linear';/);
    assert.match(js, /stroke-dasharray="' \+ g\.c \+ '" stroke-dashoffset="' \+ g\.c \+ '"/, 'starts empty');
    assert.match(js, /cur = \{ el, box, x: e\.clientX, y: e\.clientY, t: setTimeout\(\(\) => end\(true\), ms\) \};/);
    assert.match(js, /W\.addEventListener\('pointerdown', onDown, \{ capture: true, passive: true \}\);/);
    assert.match(js, /\['pointerup', 'pointercancel', 'blur'\]\.forEach/);
    assert.match(js, /if \(e\.isPrimary === false\) \{ end\(false\); return; \}/, 'a second finger is a pinch: the ring goes');
    assert.match(js, /if \(\(e\.button && e\.button !== 0\) \|\| !H\.classList\.contains\('wh-home'\)\) return;/, 'only on Home');
    assert.doesNotMatch(bare(js), /preventDefault|stopPropagation|stopImmediatePropagation|addEventListener\('click'/, 'never takes a tap or a hold away from the bubble');
    assert.match(css, /\.hr-ring \{ position: fixed; z-index: 9100; pointer-events: none;/);
});

test('hologram look; reduced motion: a still ring, no filling, no flicker', () => {
    assert.match(js, /<stop offset="0" stop-color="#8ff3ff"\/><stop offset="\.55" stop-color="#c7a6ff"\/><stop offset="1" stop-color="#8ff3ff"\/>/, 'cyan to violet');
    assert.match(css, /filter: drop-shadow\(0 0 3px rgba\(143, 243, 255, \.9\)\) drop-shadow\(0 0 9px rgba\(199, 166, 255, \.5\)\);/, 'the glow');
    assert.match(css, /\.hr-ring circle \{ fill: none; stroke-width: 2\.5; stroke-linecap: round; \}/, 'thin');
    assert.match(css, /\.hr-ring\.on:not\(\.hr-still\) \.hr-fill \{ animation: hr-flicker \.8s ease-in-out infinite; \}/);
    assert.match(js, /box\.className = 'hr-ring' \+ \(reduced\(\) \? ' hr-still' : ''\);/);
    assert.match(js, /\} else fill\.setAttribute\('stroke-dashoffset', '0'\);/, 'reduced motion: full at once, nothing moves');
    assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\n\s+\.hr-ring, \.hr-ring\.done \{ transition: none; \}\n\s+\.hr-ring \.hr-fill \{ animation: none !important; transition: none !important; \}/);
});

test('the module loads with the page, is cached, and the gesture scan knows it is only a picture', () => {
    const html = read('index.html');
    assert.match(html, /<link rel="stylesheet" href="hold-ring\.css\?v=[^"]+">\n<script src="hold-ring\.js\?v=[^"]+"><\/script>/);
    assert.match(read('sw.js'), /STATIC\.push\("hold-ring\.js", "hold-ring\.css"\);/);
    assert.match(read('tutorial-steps.js'), /'hold-ring\.js': 'Nov 6 2026 the hold ring on Home/);
});
