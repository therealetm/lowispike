'use strict';
/* Nov 5 2026, Dark (true black): Emmanuel "I finally want a dark mode, for the whole entire app, from the galaxy to the app
   interface"; the old Night look is navy. These pin the colour rule, the switch and the wiring; tools/true-black/*.cjs are the
   browser probes (screenshots, blue-tint share, switching, persistence). */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../true-black-core.js');

test('navy surfaces become neutral: the deepest ones pure black, the glass the iOS dark greys', () => {
    assert.equal(C.rewrite('#03050a'), '#000000');
    assert.equal(C.rewrite('#050f2a'), '#060606');
    assert.equal(C.rewrite('#1a2540'), '#1b1b1b');
    assert.equal(C.rewrite('rgba(20, 30, 60, .72)'), 'rgba(22, 22, 22, 0.72)');
    assert.equal(C.rewrite('hsl(225, 50%, 10%)'), 'rgb(8, 8, 8)');
    const g = C.rewrite('linear-gradient(180deg, #0b1530 0%, rgba(12,20,48,.6) 60%, #ffd166 100%)');
    assert.ok(g.includes('#0c0c0c') && g.includes('#ffd166') && !/#0b1530/.test(g), 'gradients keep their warm stops');
});

test('accents, warm colours, status colours and text are never touched', () => {
    for (const c of ['#8aa7d6', '#0a84ff', '#ffd166', '#ff6b6b', '#34c759', '#3a2a12', '#2a0f12', '#ffffff', 'rgba(235,235,245,.62)', '#1c1c1e', 'transparent', 'currentColor'])
        assert.equal(C.rewrite(c), null, c);
});

test('a faint wash of a bright blue reads as navy on black and goes neutral; a solid accent stays', () => {
    assert.ok(/^rgba\(\d+, \d+, \d+, 0\.14\)$/.test(C.rewrite('rgba(10,132,255,.14)')));
    const [r, g, b] = C.rewrite('rgba(10,132,255,.14)').match(/\d+/g).map(Number);
    assert.ok(r === g && g === b);
    assert.equal(C.rewrite('rgba(10,132,255,.8)'), null);
});

test('url() contents (SVG data URIs) are left alone, the light theme\'s own rules are skipped', () => {
    const v = 'url("data:image/svg+xml,%3Csvg fill=\'%230b1530\'%3E") no-repeat, #0b1530';
    const out = C.rewrite(v);
    assert.ok(out.startsWith('url("data:image/svg+xml,%3Csvg fill=\'%230b1530\'%3E")') && out.endsWith('#0c0c0c'));
    assert.ok(C.skipSelector('html[data-theme="light"] .card') && C.skipSelector('html[data-ui="light"] .stp-plan') && !C.skipSelector('html[data-theme="dark"] .card'));
});

test('Dark is the dark look by default; Night stays one tap away; Day is never black', () => {
    assert.equal(C.kindOf(null), 'black');
    assert.equal(C.kindOf('night'), 'night');
    assert.ok(C.isOn(null, 'dark') && C.isOn('black', 'dark') && !C.isOn('night', 'dark') && !C.isOn('black', 'light'));
    assert.equal(C.KEY, 'lowi.theme.dark');
});

test('loaded first in <head>, right after the class guard, and cached for offline', () => {
    const html = read('index.html'), sw = read('sw.js');
    const guard = html.indexOf('<script id="spdGuard">'), css = html.indexOf('href="true-black.css'), core = html.indexOf('src="true-black-core.js'), js = html.indexOf('src="true-black.js');
    assert.ok(guard > 0 && guard < css && css < core && core < js && js < html.indexOf('</head>'));
    const firstOther = html.indexOf('<script', js + 10);
    assert.ok(firstOther > js, 'nothing paints before the hooks');
    for (const f of ['true-black.css', 'true-black-core.js', 'true-black.js']) assert.ok(sw.includes('"' + f + '"'), f + ' in the service worker');
});

test('the switch: Look & sound has Dark, Night, Day and Auto, and only Dark / Night change the dark kind', () => {
    const atm = read('atmosphere.js'), core = read('atmosphere-core.js'), html = read('index.html'), tb = read('top-bar.js');
    assert.ok(atm.includes('data-atm-quick="black"') && atm.includes('data-atm-quick="night"'));
    assert.ok(atm.includes("TB.set(which)") && atm.includes("(blk ? 'black' : 'night')"));
    assert.ok(core.includes("dark: ['Dark', 'Dunkel', 'Oscuro']"));
    assert.ok(html.includes('if (t === "black" || t === "night") {'), 'plain "dark" keeps the chosen kind');
    assert.ok(html.includes('data-r2theme="black"') && html.includes('data-r2theme="night"'));
    assert.ok(tb.includes("'blackOn'"));
});

test('the galaxy and the 3D world: a black palette, black realm tissue, neutral veils, the sky and fog pure black', () => {
    const sc = read('body-world-3d-scene.js'), w = read('body-world-3d.js'), tb = read('true-black.js');
    assert.ok(sc.includes("black: { bg: '#000000'") && sc.includes("black = t === 'black'"));
    assert.ok(sc.includes("cosmos.tissue.set(black ? '#000000' : '#050f2a')"));
    assert.ok(w.includes("H.hasAttribute('data-black') ? 'black' : 'dark'") && w.includes("attributeFilter: ['data-theme', 'data-black']"));
    assert.ok(tb.includes('v = deep ? 0'), 'scene background and fog render pure black');
    assert.ok(tb.includes('finally { for (let i = keep.length - 1; i >= 0; i--) keep[i][0].setHex(keep[i][1]); }'), 'colours are put back after each frame');
});

test('accessibility: reduce transparency makes the glass solid, increase contrast adds edges', () => {
    const css = read('true-black.css');
    assert.ok(css.includes('@media (prefers-reduced-transparency: reduce)') && css.includes('backdrop-filter: none !important'));
    assert.ok(css.includes('@media (prefers-contrast: more)'));
    assert.ok(css.includes('html[data-black][data-black] body #app { background: #000 !important; }') || css.includes('body #app { background: #000 !important; }'));
});

test('the look buttons press and spring back, never under Reduce Motion or battery saver', () => {
    const css = read('true-black.css');
    assert.ok(css.includes('.atm-quick button:active, [data-r2theme]:active { transform: scale(.94);'));
    assert.ok(/prefers-reduced-motion: reduce\) \{ \.atm-quick button, \[data-r2theme\] \{ transition: none; \}/.test(css));
    assert.ok(css.includes('html.lowi-saver .atm-quick button:active'));
});
