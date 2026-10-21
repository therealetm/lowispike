'use strict';
/* Oct 17, 2026 (Emmanuel, "Okay. Go ahead."): the menu bar, the weather pill and the Day/Night button are made of the same
   liquid glass as Misty's bubble (blue core, violet fresnel rim, cyan edge highlight). Look only: no moving targets, no new controls,
   no animation, weather and Day/Night keep their identity and behaviour. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const css = read('glass-nav.css');
const scene = read('body-world-3d-scene.js');
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

test('glass-nav.css is linked late (before cook-shop) with the build tag and cached offline', () => {
    const build = (read('sw.js').match(/SHELL_BUILD = "([^"]+)"/) || [])[1];
    assert.ok(build);
    assert.ok(html.includes('<link rel="stylesheet" id="gnCss" href="glass-nav.css?v=' + build + '">\n<link rel="stylesheet" id="cshCss"'));
    const sw = read('sw.js');
    assert.equal(sw.split('"glass-nav.css"').length - 1, 2, 'in STATIC and in the network-first list');
});

test('the rim uses the same three colours as Misty\'s 3D bubble membrane', () => {
    for (const hex of ['#3a9fe0', '#9b87d2', '#8fe7ff']) assert.ok(scene.includes(hex), 'membrane colour ' + hex + ' still in the scene');
    const rim = rules.match(/:root\s*\{[\s\S]*?--gn-rim:([^;]+);/)[1];
    assert.match(rim, /143,\s*231,\s*255/); // #8fe7ff cyan edge
    assert.match(rim, /58,\s*159,\s*224/);  // #3a9fe0 blue core
    assert.match(rim, /155,\s*135,\s*210/); // #9b87d2 violet fresnel
});

test('Day/Night button and weather pill get the same glass and ring (menu bar removed Oct 21)', () => {
    for (const sel of ['#tbTheme#tbTheme', '#spHome .sp-weather.sp-weather']) {
        assert.ok(rules.includes(sel + ',') || rules.includes(sel + ' {'), 'surface rule for ' + sel);
        assert.ok(rules.includes(sel + '::before'), 'ring for ' + sel);
    }
    assert.match(rules, /background: var\(--gn-fill\)/);
    assert.match(rules, /box-shadow: var\(--gn-sh\)/);
    /* Oct 21: menu bar removed, check dropped */
    /* Oct 21: menu bar removed, check dropped */
});

test('look only: no size, position, spacing, display or icon changes, no animation, rings never catch taps', () => {
    assert.doesNotMatch(rules, /(^|[;{\s])(width|height|min-width|min-height|top|left|right|bottom|margin[a-z-]*|padding-(top|left|right|bottom)|transform|font[a-z-]*|gap|flex[a-z-]*|grid[a-z-]*|order)\s*:/m);
    assert.doesNotMatch(rules, /@keyframes|animation\s*:(?!\s*none)|transition\s*:/);
    assert.doesNotMatch(rules, /backdrop-filter/, 'blur stays what it was');
    assert.doesNotMatch(rules, /opacity\s*:\s*0[;\s]/);
    const rings = rules.match(/::before\s*\{[^}]*\}/g);
    assert.ok(rings.length >= 2);
    for (const r of rings) if (!/display: none/.test(r)) assert.match(r, /pointer-events: none/);
    // the one padding is the ring thickness inside the pseudo-element
    for (const m of rules.matchAll(/padding:\s*([^;]+);/g)) assert.match(m[1], /^1(\.5)?px$/);
    // position: relative only on the static weather pill (grid item, does not move)
    for (const m of rules.matchAll(/([^{}]+)\{[^}]*position:\s*relative/g)) assert.match(m[1], /sp-weather/);
});

test('light mode, Reduce Transparency, Increase Contrast and a no-mask fallback are covered', () => {
    assert.match(rules, /html:is\(\[data-theme="light"\], \[data-ui="light"\]\)\s*\{[\s\S]*?--gn-rim/);
    assert.match(rules, /@media \(prefers-reduced-transparency: reduce\)/);
    assert.match(rules, /@media \(prefers-contrast: more\)/);
    assert.match(rules, /@supports not \(\(mask-composite: exclude\) or \(-webkit-mask-composite: xor\)\)/);
});

test('weather pill and Day/Night markup and handlers are untouched', () => {
    assert.ok(read('top-bar.js').includes('tbTheme'));
    assert.doesNotMatch(css, /content:\s*"[^"]+"/, 'no text or icon injected');
});
