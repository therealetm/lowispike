/* Oct 22 2026 (Emmanuel, voice note): "There's a World map button, that's old. It's from before the cell world. We should just
   remove it completely." No World map button in the cell world or on Home, no World map in the profile hub's More places, no
   tutorial card or gesture for it, and the bottom-centre X is the way out of a cell world back to Misty. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../home-settings-sleep-v2.js');
const S = require('../tutorial-steps.js');
const CV = require('../clean-view-core.js');

test('no World map button is built anywhere', () => {
    const wh = read('world-home.js');
    assert.ok(!wh.includes("btn('wh-zoom'"), 'the HUD has no zoom stick / World map button');
    assert.ok(!/T\('World map'/.test(wh), 'no World map label');
    assert.ok(!read('home-orbit-v2.js').includes('.wh-zoom'));
    assert.ok(!CV.worldCss().includes('wh-zoom'), 'the cell world keeps nothing called World map');
});

test('the profile hub and Settings offer no World map', () => {
    const all = { has: () => true };
    assert.ok(!C.MORE.includes('map'));
    assert.ok(!C.EXPLORE_LIGHT.includes('map'));
    assert.ok(!('map' in C.EXPLORE_MOVED));
    assert.strictEqual(C.MORE_REMOVED.map, 'removed');
    assert.ok(!C.entries('more', all).includes('map'));
    const me = read('community-me.js');
    assert.ok(!/HOME_FIRST = \[[^\]]*'map'/.test(me));
    assert.ok(!/World map|Weltkarte|Mapa del mundo|whole world from above/.test(me));
    assert.ok(!/World map|Weltkarte|Mapa del mundo/.test(read('home-settings-sleep-v2.js')));
});

test('no tutorial card or gesture mentions the World map, in EN, DE or ES', () => {
    for (const s of S.STEPS) {
        for (const l of ['en', 'de', 'es']) {
            const words = (s.title[l] || '') + ' ' + (s.text[l] || '');
            assert.ok(!/World map|Weltkarte|mapa del mundo|Zoom y mapa/i.test(words), s.id + ' ' + l + ': ' + words);
        }
        assert.ok(!(s.target || []).some(t => t.includes('wh-zoom')), s.id + ' targets the old button');
        assert.ok(!(s.teaches || []).includes('map-button'), s.id);
    }
    assert.ok(!read('tutorial-steps.js').includes("G('map-button'"));
});

test('inside a cell world the bottom-centre X shows and flies back to Misty', () => {
    const wh = read('world-home.js');
    assert.match(wh, /const away = H\.classList\.contains\('wh-away'\);/);
    assert.match(wh, /const on = !!\(r \|\| st\.today \|\| w \|\| hs \|\| away\);/);
    assert.match(wh, /if \(H\.classList\.contains\('wh-away'\)\) \{ try \{ W\.LowiWorldRegions\.travel\('hub'\);/);
});

test('an old saved route or tap on the map id does nothing instead of crashing', () => {
    const env = { has: id => id !== 'map' };
    assert.ok(!C.entries('more', env).includes('map'));
    assert.ok(!C.entries('more', { has: () => true }).includes('map'));
});
