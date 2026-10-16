'use strict';
/* Oct 16 (E-man): Move/Cook -> Home must glide like iPhone home screens: one surface, no seam, no page turning black, no ghost. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('the world stays the fixed wallpaper while Home slides in, and moves into Home only once it lands', () => {
    const js = read('body-world-3d.js');
    assert.match(js, /if \(mode === 'back' && \(t\.classList\.contains\('lg-in'\) \|\| t\.classList\.contains\('lg-peek'\)\)\) return true;/);
    assert.match(js, /H\.classList\.toggle\('wb-home', homeIn\)/);
    assert.match(js, /H\.classList\.remove\('wb-on', 'wb-comm', 'wb-home'\)/);
    const css = read('body-world-3d.css');
    assert.match(css, /html\.wb-on\.wb-home #bw3Back::after \{ opacity: 0;/);
    assert.match(css, /html\.wb-on #bw3Stage#bw3Stage \{ box-shadow: none !important; \}/);
});

test('the page that slid out hides at once (no fading ghost over the new page)', () => {
    const js = read('liquid-glass.js');
    assert.match(js, /a\.style\.transition = 'none'; a\.classList\.remove\('lg-out'\);/);
});

test('Home keeps its world layout while it slides out', () => {
    const js = read('world-home.js');
    assert.match(js, /out = !act && !!\(th && th\.classList\.contains\('lg-out'\)\); H\.classList\.toggle\('wh-home', act \|\| out\); H\.classList\.toggle\('wh-leave', out\);/);
});

test('tabs arrive whole while paging: no per-child rise or fade-in', () => {
    const html = read('index.html');
    assert.match(html, /if \(root\.classList\.contains\("tab"\) && document\.documentElement\.classList\.contains\("lg"\)\) return;/);
    assert.match(html, /function tabIn\(\)\{ const a = \$\("\.tab\.active"\); if \(!a \|\| RM\(\) \|\| document\.documentElement\.classList\.contains\("lg"\)\) return;/);
    assert.match(read('liquid-glass.css'), /html\.lg #app #main > \.tab > \.r2-rise \{ animation: none !important; \}/);
});
