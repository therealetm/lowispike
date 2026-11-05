'use strict';
/* Nov 5 2026, Calm mode (was Still galaxy). Owner, after the zoom-and-save Still galaxy broke Home on the iPhone (Misty and the
   hologram UI gone, Community empty, Move long press dead, a ghost bubble behind every bubble, a ring around Misty): "Without them
   zooming out, zooming in, all of that" - four levels, each adding to the one before, every tap still working, no restart, and
   "The bubble is our thing": no new circles. Pure part: galaxy-still-core.js. Browser check: node tools/galaxy-still/calm-flow.cjs */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const C = require(path.join(__dirname, '..', 'galaxy-still-core.js'));

test('stored level: 0..4, anything broken or out of range reads safely', () => {
    assert.strictEqual(C.parse(null), null);
    assert.strictEqual(C.parse(''), null);
    assert.strictEqual(C.parse('abc'), null);
    assert.strictEqual(C.parse('0'), 0);
    assert.strictEqual(C.parse('3'), 3);
    assert.strictEqual(C.parse('9'), 4);
    assert.strictEqual(C.parse('-2'), 0);
    assert.strictEqual(C.parse('2.6'), 3);
    assert.strictEqual(C.KEY, 'lowi.calm');
    assert.strictEqual(C.MAX, 4);
});

test('the first Still galaxy carries over as level 2 once (galaxy still, interface kept); off or broken carries nothing', () => {
    assert.strictEqual(C.migrate('{"v":1,"on":true,"at":1}'), 2);
    assert.strictEqual(C.migrate('{"v":1,"on":false}'), null);
    assert.strictEqual(C.migrate('{oops'), null);
    assert.strictEqual(C.migrate(null), null);
    assert.strictEqual(C.OLD.KEY, 'lowi.galaxyStill');
});

test('levels build on each other: each one keeps everything the one before does', () => {
    assert.deepStrictEqual(C.classes(0), []);
    assert.deepStrictEqual(C.classes(1), ['cm-on', 'cm-nav']);
    assert.deepStrictEqual(C.classes(2), ['cm-on', 'cm-nav', 'cm-bg']);
    assert.deepStrictEqual(C.classes(3), ['cm-on', 'cm-nav', 'cm-bg', 'cm-nobg']);
    assert.deepStrictEqual(C.classes(4), ['cm-on', 'cm-nav', 'cm-bg', 'cm-nobg', 'cm-all']);
    for (let lv = 1; lv <= 4; lv++) C.classes(lv - 1).forEach(c => assert.ok(C.classes(lv).includes(c), lv + ' keeps ' + c));
    const row = lv => [C.navOff(lv), C.bgStill(lv), C.bgGone(lv), C.allStill(lv)];
    assert.deepStrictEqual(row(0), [false, false, false, false]);
    assert.deepStrictEqual(row(1), [true, false, false, false]);
    assert.deepStrictEqual(row(2), [true, true, false, false]);
    assert.deepStrictEqual(row(3), [true, true, true, false]);
    assert.deepStrictEqual(row(4), [true, true, true, true]);
});

test('no background: plain black in the dark looks, plain light in Day; the glass, Misty and the lights are what stays', () => {
    assert.strictEqual(C.plainBg('dark'), 0x000000);
    assert.strictEqual(C.plainBg('black'), 0x000000);
    assert.strictEqual(C.plainBg('light'), 0xf2f2f7);
    assert.ok(C.keeps({ isLight: true }));
    assert.ok(C.keeps({ name: 'lowi-hub' }));
    assert.ok(C.keeps({ name: 'lowi-living-bubbles', userData: { lwKeep: true } }));
    assert.ok(C.keeps({ name: 'mf-misty-face', userData: { lwKeep: true } }));
    assert.ok(!C.keeps({ name: 'lowi-rbc', userData: {} }));
    assert.ok(!C.keeps({ name: 'cosmos' }));
    assert.ok(!C.keeps(null));
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


test('words in German, English and Spanish: same keys everywhere, every level named and described, no companion name hard-coded', () => {
    const keys = Object.keys(C.TX.en).sort();
    for (const l of ['de', 'es']) assert.deepStrictEqual(Object.keys(C.TX[l]).sort(), keys, l);
    for (const l of ['en', 'de', 'es']) {
        for (let i = 0; i <= 4; i++) { assert.ok(C.TX[l]['l' + i], l + ' l' + i); assert.ok(C.TX[l]['d' + i], l + ' d' + i); }
        assert.ok(!/zoom|save the view|Ansicht speichern/i.test(Object.values(C.TX[l]).join(' ')), l + ': no framing words left');
    }
    assert.strictEqual(C.levelName(3, 'de'), 'Kein Hintergrund');
    assert.strictEqual(C.t('xx', 'row'), 'Calm mode');
});
