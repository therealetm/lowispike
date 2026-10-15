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

test('holding the moon/sun button opens the Day & night adjuster; a tap still flips Day/Night', () => {
    const tb = read('top-bar.js'), atm = read('atmosphere.js'), css = read('top-bar.css');
    assert.match(tb, /btn\.addEventListener\('pointerdown'/);
    assert.match(tb, /A\.openSheet\(\); \}, 480\)/);
    assert.match(tb, /if \(held\) \{ held = false; return; \} toggleTheme\(\);/);
    assert.match(atm, /openSheet: \(\) => \{/);
    assert.match(atm, /<div class="r2-look"><\/div>/);
    assert.match(css, /#tbTheme\{-webkit-touch-callout:none/);
});

test('the world is silvery dark blue, not red; light mode is a lighter blue, not white', () => {
    const sc = read('body-world-3d-scene.js'), ss = read('season.js'), ride = read('body-ride.js');
    assert.match(sc, /dark: \{ bg: '#121c33', wall: '#2a3a5a'/);
    assert.match(sc, /light: \{ bg: '#7f94b4', wall: '#9aacc8'/);
    assert.doesNotMatch(sc, /#5a1a33|#c8324a|#b95b9f'\, 6/);
    assert.match(sc, /rbcMat = new THREE\.MeshStandardMaterial\(\{ color: '#9fb2d2'/);
    assert.match(ss, /lerp\(new a\.THREE\.Color\(th === 'light' \? '#8ea3c2' : '#1a2846'\), 0\.85\)/);
    assert.doesNotMatch(ride, /#7a1c3c|#e0384f/);
});
