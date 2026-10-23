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

test('three taps on the moon/sun button open the Day & night adjuster (Oct 17: no more hold); a tap still flips Day/Night', () => {
    const tb = read('top-bar.js'), atm = read('atmosphere.js'), css = read('top-bar.css');
    assert.match(tb, /if \(taps === 3\) \{ taps = 0; lastTap = 0; tripleTheme\(before\); \}/);
    assert.match(tb, /return A\.openSheet\(\);/);
    assert.match(atm, /openSheet: \(\) => \{/);
    assert.match(atm, /<div class="r2-look"><\/div>/);
    assert.match(css, /#tbTheme\{-webkit-touch-callout:none/);
});

test('the world is silvery dark blue, not red; light mode is a lighter blue, not white', () => {
    const sc = read('body-world-3d-scene.js'), ss = read('season.js');
    assert.match(sc, /dark: \{ bg: '#121c33', wall: '#2a3a5a'/);
    assert.match(sc, /light: \{ bg: '#7f94b4', wall: '#9aacc8'/);
    assert.doesNotMatch(sc, /#5a1a33|#c8324a|#b95b9f'\, 6/);
    assert.match(sc, /rbcMat = new THREE\.MeshStandardMaterial\(\{ color: '#9fb2d2'/); /* Oct 23 17:20: the silvery red cells are back */
    assert.match(ss, /lerp\(new a\.THREE\.Color\(th === 'light' \? '#8ea3c2' : '#1a2846'\), 0\.85\)/);
});

test('every bubble is Misty\'s glass: fasting, water, VR, World map, Sound, Today, Daily Quest, menu bar', () => {
    const css = read('world-home.css');
    assert.match(css, /--wh-glass-bg: radial-gradient\(circle at 32% 24%, rgba\(255,255,255,\.34\)/);
    assert.match(css, /html\.wh-home #spHome #spFast, html\.wh-home #whHud \.wh-water \{\n    border: 1\.5px solid var\(--wh-glass-rim\) !important; background: var\(--wh-glass-bg\) !important;/);
    assert.match(css, /html\.wh-home #tab-home #f3Board \{\n    background: var\(--wh-glass-wide\) !important;/);
    /* Oct 21: menu bar removed, check dropped */
    assert.match(css, /html\.wh-home \.wh-hud \.wh-todaybtn, html\.wh-home \.hs-gift,/);
});

test('fasting bubble: "Edit" sits above the bubble, stage numbers do not run into the text on Home', () => {
    const css = read('world-home.css'), fe = read('fast-edit.js');
    assert.match(css, /html\.wh-home #spHome \.fe-bub \{ left: calc\(50% - var\(--wh-sx\)\) !important; top: calc\(var\(--wh-cy\) \+ var\(--wh-sy\) - var\(--wh-fs\) \/ 2 - 8px\) !important;/);
    assert.match(css, /html\.wh-home #spHome #spFast \.fb-lab \{ display: none !important; \}/);
    assert.match(fe, /en: \{ editHome: 'Edit',/);
    assert.match(css, /pointer-events: auto; z-index: 7 !important; \}/);
});

test('Misty\'s adventures: no "In the garden" label; you see her out in the world, strong or weak', () => {
    const sm = read('sun-meter.js'), wh = read('world-home.js'), css = read('world-home.css'), sc = read('body-world-3d-scene.js'), bw = read('body-world-3d.js');
    assert.match(sm, /function awayBadge\(\) \{[\s\S]*?const b = D\.querySelector\('#spBubble \.ls-away'\); if \(b\) b\.remove\(\);\n    \}/);
    assert.doesNotMatch(sm, /In the garden|in the garden/);
    assert.match(wh, /function adventure\(dt, r\)/);
    assert.match(wh, /A\.wand = new THREE\.Sprite\(mat\); A\.wand\.name = 'wh-misty-out'/);
    assert.match(wh, /A\.vigor = en \? en\.value : Math\.max\(0, Math\.min\(1, 0\.55 \+ 0\.45 \* ratio - 0\.75 \* mood\)\)/, 'energy (sun-meter energyNow) drives the flight, old formula only as fallback');
    assert.match(wh, /mu\.uIn\.value\.set\(base\)\.lerp\(A\.red, A\.redK\)/);
    assert.match(wh, /const show = r\.mode === 'full' && !inRegion\(\) && !st\.adv\.away;/);
    assert.match(css, /#spHome\[data-misty="weak"\] #spBubble::after/);
    assert.match(sc, /return \{ scene, camera, hub, regions, onFrame, memU,/);
    assert.match(bw, /memU: world\.memU \|\| null/);
});
