'use strict';
/* Oct 16, 2026 (Eman: "That Today bar, you haven't updated it."): the Today sheet (#whToday) wears the app's blue glass on black
   space, one row height / radius / gap, no mint, gold, beige or orange chrome, and the bottom X in the same glass. Styling only. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('today-sheet.css'), bare = css.replace(/\/\*[\s\S]*?\*\//g, '');

test('loaded last, same build as the page, precached', () => {
    const html = read('index.html'), sw = read('sw.js');
    const link = html.match(/<link rel="stylesheet" id="tsgCss" href="today-sheet\.css\?v=(\d{8}-\d{6})">/);
    assert.ok(link, 'linked in index.html');
    assert.equal(link[1], html.match(/<meta name="lowi-build" content="(\d{8}-\d{6})">/)[1], 'same build as the page');
    const at = html.indexOf('id="tsgCss"');
    ['lgCss', 'csoCss'].forEach(id => { if (html.includes('id="' + id + '"')) assert.ok(at > html.indexOf('id="' + id + '"'), 'after ' + id); });
    assert.ok(at > html.lastIndexOf('world-home.css'), 'after world-home.css so it wins');
    assert.ok(sw.includes('"today-sheet.css"'), 'in sw.js STATIC');
});

test('every rule stays inside the Today sheet (or the X while it is open)', () => {
    const sels = [...bare.matchAll(/([^{}@]+)\{[^{}]*\}/g)].map(m => m[1].trim()).filter(s => s && !/^(from|to|\d)/.test(s));
    assert.ok(sels.length > 20);
    sels.forEach(s => s.split(',').map(x => x.trim()).forEach(x => {
        assert.ok(/^html\.wh-home(\[data-theme="light"\])?( #whToday\b|$)|^html\.wh-home\.wh-today-open \.wh-x$/.test(x), 'scoped: ' + x);
    }));
});

test('one row height, one radius, one gap; the old tiles and bars all use them', () => {
    assert.match(bare, /--ts-row: 48px;/); assert.match(bare, /--ts-r: 16px;/); assert.match(bare, /--ts-gap: 8px;/);
    ['.sp-status', '.wh-tiles .g2h-tile', '.br-row', '.bt-bar', '.ls-sun', '.lv-tile:not(.lv-scan)'].forEach(sel => {
        const re = new RegExp('#whToday ' + sel.replace(/[.()*:]/g, '\\$&') + '[,\\s{]');
        assert.ok(re.test(bare), 'glass covers ' + sel);
    });
    assert.match(bare, /\.g2h-tile \{ min-height: var\(--ts-row\)/);
    assert.match(bare, /\.ls-sun \{ min-height: var\(--ts-row\)/);
    assert.match(bare, /border-radius: var\(--ts-r\) !important;/);
});

test('blue glass and iOS blue only: no mint, gold, beige or orange left', () => {
    assert.match(bare, /--ts-glass: radial-gradient\(120% 90% at 18% 0%/, 'same wide glass as the weather pill / Daily Quest');
    assert.match(bare, /--ts-blue: linear-gradient\(180deg, rgba\(72,162,255,\.96\), rgba\(10,122,255,\.94\)\)/, 'iOS blue for the main actions');
    assert.match(bare, /#whToday \.sp-next,[\s\S]*?#whToday \.lv-tile\.lv-scan,[\s\S]*?background: var\(--ts-blue\)/, 'Log meal and Scan in iOS blue');
    assert.match(bare, /#whToday \.dr-chip \{[^}]*background: var\(--ts-glass\)/, 'Goal chip in glass, not orange');
    assert.match(bare, /#whToday \.ls-fill \{ background: linear-gradient\(90deg, #3d9bff, #9fe6ff\)/, 'sun bar fills blue');
    assert.match(bare, /\.ls-sun\.full[\s\S]*?--ls-a: #6cc0ff/, 'full sun / surprise glow blue');
    const cols = [...bare.matchAll(/#([0-9a-f]{6})\b|rgba?\((\d+), ?(\d+), ?(\d+)/gi)].map(m => m[1] ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : [+m[2], +m[3], +m[4]]);
    cols.forEach(([r, g, b]) => {
        assert.ok(!(r > 180 && g > 120 && b < 120 && r - b > 90), 'no gold/orange/beige: ' + [r, g, b]);
        assert.ok(!(g > 170 && r < 170 && g - r > 50 && g - b > 10), 'no mint: ' + [r, g, b]);
    });
});

test('the X under the open sheet is the same blue glass, not a white disc', () => {
    const m = bare.match(/html\.wh-home\.wh-today-open \.wh-x \{([^}]*)\}/);
    assert.ok(m, 'X rule');
    assert.match(m[1], /radial-gradient\(closest-side, rgba\(80,170,255,/);
    assert.match(m[1], /color: #fff !important/);
    assert.ok(!/rgba\(255,255,255,\.9\d\)/.test(m[1]));
});

test('styling only: no display:none, no pointer-events, no size cut on any control', () => {
    assert.ok(!/display:\s*none/.test(bare), 'nothing hidden');
    assert.ok(!/pointer-events/.test(bare), 'taps untouched');
    assert.ok(!/(^|[^-])(width|height):\s*0/.test(bare), 'nothing collapsed');
    assert.match(bare, /\.sp-next \{ min-height: 44px !important;/, 'Log meal keeps a 44 px target');
});
