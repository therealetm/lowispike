/* Oct 16 (E-man's iPad screenshots, 23:53): Misty's adventures, a silvery dark-blue world, unified glass bubbles, bug fixes. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('no leftover Today words over the world: tiles hidden on the world Home, mirrored into the Today sheet', () => {
    const css = read('world-home.css'), js = read('world-home.js');
    assert.match(css, /html\.wh-home #tab-home #g2hTiles \{ display: none !important; \}/);
    assert.match(css, /html\.wh-home \.wh-today > \.wh-tiles \{ display: grid;/);
    assert.match(js, /function mirrorTiles\(\)/);
    assert.match(js, /row\.className = 'wh-tiles'/);
    assert.match(js, /#whToday \.wh-tiles \[data-g2h-open\]'\)\) \{ if \(st\.today\) openToday\(false\); return; \}/);
});
