'use strict';
/* Nov 5 2026, Still galaxy (owner: an optional Settings battery-save mode that turns the galaxy into a beautiful STATIC background,
   chosen by zooming and framing on Home and saved with Save in the corner). Pure part: galaxy-still-core.js.
   Browser check: node tools/galaxy-still/flow.cjs */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const C = require(path.join(__dirname, '..', 'galaxy-still-core.js'));

test('saved state: only a v1 record that is on counts; anything broken reads as off', () => {
    assert.strictEqual(C.parse(null), null);
    assert.strictEqual(C.parse(''), null);
    assert.strictEqual(C.parse('{oops'), null);
    assert.strictEqual(C.parse('{"v":1,"on":false}'), null);
    assert.strictEqual(C.parse('{"v":2,"on":true}'), null);
    const r = C.parse(JSON.stringify(C.record({ w: 780, h: 1688, pic: 'idb', at: 5 })));
    assert.deepStrictEqual(r, { v: 1, on: true, at: 5, w: 780, h: 1688, pic: 'idb' });
});

test('the 3D world at launch: off when a still view is saved, live otherwise and on the one launch asked for to choose a new view', () => {
    const saved = C.record({ pic: 'idb' });
    assert.strictEqual(C.worldAtLaunch(saved, false), 'off');
    assert.strictEqual(C.worldAtLaunch(saved, true), 'live');
    assert.strictEqual(C.worldAtLaunch(null, false), 'live');
    assert.strictEqual(C.worldAtLaunch(null, true), 'live');
});

test('which background is painted, and where the picture ended up: the truth when storage fails', () => {
    assert.strictEqual(C.pick(true, true), 'full');
    assert.strictEqual(C.pick(false, true), 'thumb');
    assert.strictEqual(C.pick(false, false), 'plain');
    assert.strictEqual(C.storedAs(true, true), 'idb');
    assert.strictEqual(C.storedAs(false, true), 'thumb');
    assert.strictEqual(C.storedAs(false, false), 'none');
    for (const l of ['de', 'en', 'es']) {
        assert.notStrictEqual(C.savedText('idb', l), C.savedText('thumb', l));
        assert.notStrictEqual(C.savedText('thumb', l), C.savedText('none', l));
    }
    assert.match(C.savedText('thumb', 'en'), /lower quality/);
    assert.match(C.savedText('none', 'en'), /could not store/);
});

test('picture size keeps the shape and never grows past the cap', () => {
    assert.deepStrictEqual(C.fitSize(780, 1688, 2600), { w: 780, h: 1688 });
    assert.deepStrictEqual(C.fitSize(1290, 2796, 2600), { w: 1200, h: 2600 });
    assert.deepStrictEqual(C.fitSize(0, 0, 10), { w: 1, h: 1 });
});

test('every geometry, material and texture of a scene is found once and released (shared ones too, shader uniforms too)', () => {
    let disposed = [];
    const tex = n => ({ isTexture: true, n, dispose() { disposed.push('t' + n); } });
    const geo = n => ({ n, dispose() { disposed.push('g' + n); } });
    const mat = (n, extra) => Object.assign({ n, dispose() { disposed.push('m' + n); } }, extra || {});
    const g1 = geo(1), sharedM = mat(1, { map: tex(1) });
    const objs = [
        { geometry: g1, material: sharedM },
        { geometry: g1, material: sharedM },
        { geometry: geo(2), material: [mat(2, { alphaMap: tex(2) }), mat(3, { uniforms: { a: { value: tex(3) }, b: { value: [tex(4)] }, c: { value: 2 } } })] },
        { name: 'group' }
    ];
    const scene = { background: tex(5), traverse(f) { objs.forEach(f); } };
    const c = C.collect(scene);
    assert.strictEqual(c.geo.size, 2);
    assert.strictEqual(c.mat.size, 3);
    assert.strictEqual(c.tex.size, 5);
    const n = C.disposeAll(scene);
    assert.deepStrictEqual(n, { geometries: 2, materials: 3, textures: 5 });
    assert.strictEqual(new Set(disposed).size, disposed.length, 'nothing disposed twice');
    disposed = [];
    assert.deepStrictEqual(C.disposeAll(null), { geometries: 0, materials: 0, textures: 0 });
});

test('words in German, English and Spanish, no missing keys, no companion name hard-coded', () => {
    const keys = Object.keys(C.TX.en);
    for (const l of ['de', 'es']) for (const k of keys) assert.ok(C.TX[l][k], l + ' ' + k);
    assert.strictEqual(C.t('de', 'row'), 'Ruhige Galaxie');
    assert.strictEqual(C.t('de', 'save'), 'Speichern');
    assert.strictEqual(C.t('xx', 'save'), 'Save');
    const all = JSON.stringify(C.TX);
    assert.doesNotMatch(all, /Misty|Maya/);
    assert.doesNotMatch(all, /screensaver|Bildschirmschoner/i, 'a still picture, not a screensaver');
    assert.doesNotMatch(all, /\d+ ?%|hours?|Stunden/i, 'no battery numbers promised');
});
