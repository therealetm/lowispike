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

test('one round back button in the top-left corner, below the status bar (22 Nov 2026, was bottom centre)', () => {
    const css = read('bottom-close.css');
    assert.match(css, /\.lw-bx\{position:fixed;left:calc\(env\(safe-area-inset-left, 0px\) \+ 14px\);top:calc\(env\(safe-area-inset-top, 0px\) \+ 10px\);bottom:auto/);
    assert.match(css, /border-radius:50%/);
    assert.match(read('bottom-close.js'), /b\.innerHTML = ICON\.back \+ \(named/, 'always an arrow, never an X');
    assert.match(read('world-home.css'), /html body \.wh-x \{ left: calc\(env\(safe-area-inset-left, 0px\) \+ 14px\); top: calc\(env\(safe-area-inset-top, 0px\) \+ 10px\)/, 'Home sheets use the same corner');
    /* the screen's own top-left arrow / top-corner X stays for its logic but is out of sight */
    assert.match(css, /\.lw-bx-src\{opacity:0!important;pointer-events:none!important\}/);
});

test('a sheet that is closing never takes the button from the page that opened over it (Settings > Your details)', () => {
    const js = read('bottom-close.js');
    const shown = js.slice(js.indexOf('function shown(el)'), js.indexOf('function layerZ('));
    assert.ok(shown.includes("el.closest('.r2-ov.off')"), 'controls inside a closing .r2-ov.off sheet are skipped');
});

test('a sheet that is closing never keeps the button hidden, and a tap presses the layer on top right now (Settings > Your details quick tap)', () => {
    const js = read('bottom-close.js');
    const settling = js.slice(js.indexOf('function settling('), js.indexOf('function syncUpdate('));
    assert.ok(settling.includes("t.closest('.r2-ov.off')"), 'animations inside a closing .r2-ov.off sheet do not hold the X back');
    const press = js.slice(js.indexOf('function pressTop('), js.indexOf('const typing ='));
    assert.ok(/pick\(\)\.top/.test(press), 'the press picks the top layer again before pressing it');
    const click = js.slice(js.indexOf("btn.addEventListener('click'"), js.indexOf('D.body.appendChild(btn)'));
    assert.ok(/bx-settle[\s\S]*pendingPress = performance\.now\(\)/.test(click), 'a tap while the X waits for motion to end is kept');
    const upd = js.slice(js.indexOf('function update('), js.indexOf('function schedule('));
    assert.ok(/toggle\('bx-catch'/.test(upd) && /pendingPress && !moving[\s\S]*pressTop\(\)/.test(upd), 'the kept tap is pressed once the motion ends');
    const css = read('bottom-close.css');
    assert.ok(/\.lw-bx\.on\.bx-settle\.bx-catch\{visibility:visible;pointer-events:auto\}/.test(css), 'the X spot takes the tap while it waits');
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
