'use strict';
/* Bottom-center back / close (owner request 15, 28 Oct 2026): "the back button and x button should always be in the middle down,
   basically the home button, so it's convenient to use for one hand". Static checks; the browser check is tools/check-bottom-close.cjs. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(R, f), 'utf8');

test('bottom-close loads on every page and is cached offline', () => {
    const html = read('index.html'), sw = read('sw.js');
    assert.match(html, /<link rel="stylesheet" href="bottom-close\.css\?v=\d{8}-\d{6}">\n<script src="bottom-close\.js\?v=\d{8}-\d{6}"><\/script>\n<\/body>/);
    assert.ok(sw.includes('"bottom-close.js"') && sw.includes('"bottom-close.css"'));
});

test('one round button at the bottom center, above the home indicator', () => {
    const css = read('bottom-close.css');
    assert.match(css, /\.lw-bx\{position:fixed;left:50%;bottom:calc\(env\(safe-area-inset-bottom, 0px\) \+ 14px \+ var\(--bx-lift, 0px\)\)/);
    assert.match(css, /border-radius:50%/);
    assert.match(css, /transform:translateX\(-50%\)/);
    /* the screen's own top-left arrow / top-corner X stays for its logic but is out of sight */
    assert.match(css, /\.lw-bx-src\{opacity:0!important;pointer-events:none!important\}/);
});

test('a sheet that is closing never takes the button from the page that opened over it (Settings > Your details)', () => {
    const js = read('bottom-close.js');
    const shown = js.slice(js.indexOf('function shown(el)'), js.indexOf('function layerZ('));
    assert.ok(shown.includes("el.closest('.r2-ov.off')"), 'controls inside a closing .r2-ov.off sheet are skipped');
});

test('it presses the screen\'s own back / close, steps away while typing, and rises above fields, the composer and the bin', () => {
    const js = read('bottom-close.js');
    assert.ok(js.includes('t.click()'), 'presses the original control');
    assert.ok(/if \(!top \|\| typing\(\)\)/.test(js), 'hidden while a text field has focus');
    assert.ok(js.includes('.kg-bin') && js.includes('.cc-composer') && js.includes('textarea'), 'clears the bin, composer and text fields');
    /* per-item remove buttons are never treated as a close */
    for (const c of ['.stp-snack-x', '.mr-add-x', '.cg-photo-x']) assert.ok(js.includes(c), c);
    /* back / close labels in all three languages */
    assert.ok(/zur\(ü\|u\)ck/.test(js) && /cerrar/.test(js) && /schlie/.test(js));
});
