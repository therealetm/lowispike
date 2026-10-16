'use strict';
/* Oct 16, 2026 (E-man: "How can we make the people in the community, their companions, stick out more than the galaxy beneath it?")
   Depth of field in Community: the living world steps back, the companions step forward, names stay readable far out. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('community-standout.css'), bare = css.replace(/\/\*[\s\S]*?\*\//g, '');

test('loaded last and precached', () => {
    const html = read('index.html'), sw = read('sw.js');
    const link = html.match(/<link rel="stylesheet" id="csoCss" href="community-standout\.css\?v=(\d{8}-\d{6})">/);
    assert.ok(link, 'linked in index.html');
    assert.equal(link[1], html.match(/<meta name="lowi-build" content="(\d{8}-\d{6})">/)[1], 'same build as the page');
    assert.ok(html.indexOf('id="csoCss"') > html.indexOf('id="lgCss"'), 'after liquid-glass.css so it wins');
    assert.ok(sw.includes('"community-standout.css"'), 'in sw.js STATIC');
});

test('the galaxy steps back only while Community is open, never hidden, mood filter kept', () => {
    const m = bare.match(/html\.wb-on\.wb-comm:not\(\.gx-in\):not\(\.gx-out\) #bw3Back \.bw3-canvas \{([^}]*)\}/);
    assert.ok(m, 'Community-only rule on the world canvas, not during the zoom from Today');
    assert.match(m[1], /filter: var\(--wm-filter, \) brightness\(\.(\d+)\) saturate\(\.\d+\) blur\((\d|\.)[\d.]*px\)/);
    const b = +('.' + m[1].match(/brightness\(\.(\d+)\)/)[1]);
    assert.ok(b >= .5 && b <= .8, 'dimmer, still visible');
    const blur = parseFloat(m[1].match(/blur\(([\d.]+)px\)/)[1]);
    assert.ok(blur > 0 && blur <= 2, 'only a touch soft');
    assert.ok(!/#tab-home|wb-home|#tab-shelf|#tab-move|#tab-scan|rw-scanworld/.test(bare), 'Today, Cook, Move and Scan untouched');
    assert.match(bare, /prefers-reduced-motion: reduce\) \{\s*html\.wb-on\.wb-comm #bw3Back \.bw3-canvas \{ transition: none !important; \}/);
});

test('companions sit on solid blue glass with a light rim, a dark halo and their own colour ring', () => {
    const orb = bare.match(/\.cg-body \.cg-orb\.cg-orb \{([\s\S]*?)\}/)[1];
    assert.match(orb, /rgba\(10, 26, 62, \.9\)/, 'solid dark blue core, the galaxy no longer shows through the disc');
    assert.match(orb, /var\(--c, #8fb4ff\)/, 'person colour ring kept');
    assert.match(orb, /0 0 0 1\.25px rgba\(235, 244, 255, \.8\d\)/, 'crisp light rim');
    assert.match(orb, /0 0 0 5px rgba\(2, 6, 16, \.\d+\)/, 'dark halo separates it from the background');
    assert.match(orb, /0 6px 18px 6px rgba\(0, 0, 0, \.\d+\)/, 'soft shadow');
    assert.ok(!/gold|beige|#ffd27a|#f5deb3/i.test(bare), 'no gold or beige');
    assert.ok(!/backdrop-filter/.test(bare), 'no 30 backdrop blurs on iPad');
});

test('names: white, bold, dark shadow, readable when zoomed out', () => {
    const nm = bare.match(/\.cg-body \.cg-name\.cg-name \{([\s\S]*?)\}/)[1];
    assert.match(nm, /color: #fff !important/);
    assert.match(nm, /font-weight: 700 !important/);
    assert.match(nm, /text-shadow: 0 1px 2px rgba\(0, 0, 0, \.9\d\)/);
    assert.match(nm, /transform: scale\(var\(--nk, 1\)\)/);
    const js = read('community-chat.js');
    assert.ok(js.includes('const f=Math.max(.68,Math.min(1.2,Math.sqrt(cam.z/Z.z0))),fn=Math.max(.8,f),'), 'companions a bit larger far out, names larger still');
    assert.ok(js.includes('nw:el.__nw*fn,'), 'label collision uses the size the name is drawn at');
    assert.ok(js.includes("el.style.setProperty('--nk',(fn/f).toFixed(3));"));
});
