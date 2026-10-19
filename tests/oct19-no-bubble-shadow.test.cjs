'use strict';
/*
 * Oct 19 2026, Emmanuel (iPad screenshot): "all bubbles have this shadow ... just remove it on all bubbles."
 * He circled two things in the 3D scene:
 *   1. a light crescent on the upper-left of a plain translucent cell bubble (the cosmos membrane's
 *      fixed-direction glint, pow(dot(n, (-0.45,0.6,0.65)), 22), which sits at 0.75 R towards 10-11 o'clock)
 *   2. an oval "ground shadow" under the cell bubble with organelles (Misty). The 3D Misty sprite, her
 *      flight body and her face art are all drawn from mistySvg(), which kept the cell's .lh-reflection
 *      ellipse (CY+R+28 below the cell). Page CSS cannot hide it inside an <img>, so it was baked in.
 * The Oct 18 release (950c3e8) only cleared shadows on the ring Home; worlds, blooms and the old Home
 * kept them. These checks hold the rule for every bubble.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('3D Misty art (sprite, flight body, face) drops the ground reflection ellipse', () => {
    const src = read('world-home.js');
    const fn = src.slice(src.indexOf('function mistySvg('));
    const body = fn.slice(0, fn.indexOf('\n    }\n') > 0 ? fn.indexOf('\n    }\n') : 1200);
    const rm = body.match(/querySelectorAll\('([^']+)'\)\.forEach\(n => n\.remove\(\)\)/);
    assert.ok(rm, 'mistySvg still strips the extras from the cloned SVG');
    assert.ok(rm[1].split(',').map(s => s.trim()).includes('.lh-reflection'),
        'mistySvg must remove .lh-reflection, or the oval under the cell is baked into every 3D Misty texture');
});

test('the companion reflection ellipse is hidden everywhere, not only on the ring Home', () => {
    const css = read('herb-tamagotchi.css');
    const rule = css.match(/(^|\n)\s*\.lh-reflection\s*\{([^}]*)\}/);
    assert.ok(rule, 'herb-tamagotchi.css owns the base .lh-reflection rule');
    assert.match(rule[2], /display\s*:\s*none\s*!important/, 'the bare .lh-reflection rule hides it in worlds, blooms and the old Home too');
    assert.doesNotMatch(rule[2], /animation\s*:/, 'no animation left on a hidden element (no wasted style work)');
});

test('no dark offset drop shadow under the Misty sprite in any Home layout', () => {
    const css = read('world-home.css');
    const m = css.match(/html\.wh-home #spBubble \.tmg-plant\s*\{([^}]*)\}/);
    assert.ok(m, 'world-home.css still styles the Misty sprite');
    const f = m[1];
    assert.doesNotMatch(f, /drop-shadow\(\s*0\s+[1-9]\d*px[^)]*rgba\(\s*0\s*,\s*0\s*,\s*0/, 'a downward black drop-shadow reads as a ground shadow under her');
});

test('cosmos cell membranes have no off-centre glint crescent, rim and veins stay', () => {
    const src = read('body-world-3d-scene.js');
    const i = src.indexOf('function membraneMat(');
    assert.ok(i > 0, 'membraneMat still exists');
    const shader = src.slice(i, src.indexOf('\n    }\n', i));
    assert.doesNotMatch(shader, /vec3\(\s*-0\.45\s*,\s*0\.6\s*,\s*0\.65\s*\)/, 'the fixed upper-left glint direction is gone');
    assert.doesNotMatch(shader, /float hl\s*=/, 'no lopsided highlight lobe on the membrane');
    assert.match(shader, /rim/, 'the symmetric fresnel rim (the glass look) stays');
    assert.match(shader, /veins|vein/, 'the membrane veins stay');
    assert.match(shader, /AdditiveBlending/, 'membranes stay additive (they can only add light, never darken)');
});

test('Misty home membrane stays symmetric (no fixed light direction, no lit material)', () => {
    const src = read('body-world-3d-scene.js');
    const i = src.indexOf('const memMat');
    assert.ok(i > 0);
    const shader = src.slice(i, src.indexOf('});', i));
    assert.doesNotMatch(shader, /normalize\(vec3\(\s*-?\d/, 'no fixed light direction in the home membrane');
    assert.doesNotMatch(shader, /Lambert|Standard|Phong/, 'the membrane is unlit');
});

test('no bubble mesh uses a real shadow map (castShadow / receiveShadow / shadowMap)', () => {
    const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.js') && f !== 'sw.js');
    for (const f of files) {
        const s = read(f);
        assert.doesNotMatch(s, /castShadow\s*=\s*true|receiveShadow\s*=\s*true|shadowMap\.enabled\s*=\s*true/, f + ' turns on a shadow map');
    }
});
