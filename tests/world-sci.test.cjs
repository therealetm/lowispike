'use strict';
/* Real science names in the cell worlds (Oct 23, 2026): world-sci-core.js data, the guides' cell names, the mesh tags and the
   loader wiring. Browser check: tools/sim/sci-names-probe.cjs. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../world-sci-core.js'), P = require('../region-pals-core.js');
const IDS = ['brain', 'lung', 'heart', 'liver', 'pancreas', 'gut', 'muscle'];

test('every cell world has its real name: organ and tissue, in en, de, es, short', () => {
    for (const id of IDS) {
        for (const lang of ['en', 'de', 'es']) {
            const w = C.world(id, lang);
            assert.ok(w && w.place && w.name, id + ' ' + lang);
            assert.ok(w.place.length <= 22 && w.name.length <= 22, 'short: ' + w.place + ' / ' + w.name);
        }
    }
    assert.strictEqual(C.world('hub', 'en'), null, 'the bloodstream is home, not a cell world');
    assert.strictEqual(C.world('gut', 'en').place, 'Small intestine', 'villi mean the small intestine');
    assert.strictEqual(C.world('liver', 'de').name, 'Leberl\u00e4ppchen');
});

test('each guide is named after its real cell type, no invented names', () => {
    const want = { brain: 'Neuron', lung: 'Alveolar cell', heart: 'Cardiomyocyte', liver: 'Hepatocyte', pancreas: 'Beta cell', gut: 'Enterocyte', muscle: 'Muscle fibre' };
    for (const id of IDS) assert.strictEqual(P.pal(id, 'en').name, want[id]);
    assert.strictEqual(P.pal('liver', 'de').name, 'Hepatozyt');
    assert.strictEqual(P.pal('pancreas', 'es').name, 'C\u00e9lula beta');
    const all = JSON.stringify(P.PALS) + JSON.stringify(P.GOSSIP);
    for (const old of ['Hexa', 'Isla', 'Villo', 'Puff', 'Spark', 'Pulse', 'Flex']) assert.ok(all.indexOf(old) < 0, 'no ' + old);
    /* the beta cell never claims glucagon: that is the alpha cells */
    for (const row of P.GOSSIP.pancreas) assert.ok(!/I (only )?send glucagon/i.test(row[0]));
    for (const id of IDS) for (const li of [0, 1, 2]) assert.match(P.lines(id, li)[0] || '', /^(Hi, I\u2019m|Hallo, ich bin|Hola, soy) /);
});

test('labels: two or three key objects per world, one plain sentence each, all languages', () => {
    for (const id of IDS) {
        const t = C.TAGS[id];
        assert.ok(t.length >= 2 && t.length <= 3, id);
        for (const x of t) {
            assert.strictEqual(x.name.length, 3); assert.strictEqual(x.say.length, 3);
            for (const s of x.say) {
                assert.ok(s.length <= 96, 'short: ' + s);
                assert.ok((s.match(/[.!?](\s|$)/g) || []).length <= 2, 'at most a label and one sentence: ' + s);
            }
            for (const n of x.name) assert.ok(n.length <= 22, 'small label: ' + n);
        }
    }
    assert.ok(C.SOURCES.length >= 5, 'sources listed');
});

test('every label points at a real object in its world (mesh name sci:<kind>)', () => {
    const src = R('body-world-regions.js');
    for (const id of IDS) for (const x of C.TAGS[id]) {
        assert.ok(src.indexOf("'sci:" + x.k + "'") >= 0 || src.indexOf("sciTag(g, '" + x.k + "')") >= 0, id + ' ' + x.k + ' is tagged');
    }
});

test('pick: nearest object that is in front and on screen, within reach', () => {
    const c = [{ k: 'a', x: 100, y: 300, z: 0.9, d: 12 }, { k: 'b', x: 200, y: 300, z: 0.95, d: 8 }, { k: 'c', x: 10, y: 300, z: 0.5, d: 2 }, { k: 'd', x: 150, y: 300, z: 1.2, d: 1 }];
    assert.strictEqual(C.pick(c, 390, 844, 26, 40).k, 'b');
    assert.strictEqual(C.pick(c, 390, 844, 5, 40), null, 'nothing near enough');
    assert.strictEqual(C.pick([], 390, 844, 26), null);
});

test('loaded with the guides and cached offline', () => {
    const ui = R('apple-ui.js'), sw = R('sw.js'), js = R('world-sci.js');
    assert.ok(ui.indexOf("'region-pals.js','world-sci-core.js','world-sci.js'") >= 0);
    const list = sw.match(/const STATIC = \[[^\]]*\]/)[0];
    for (const f of ['world-sci-core.js', 'world-sci.js', 'world-sci.css']) assert.ok(list.includes('"' + f + '"'), f);
    assert.match(js, /lowi:world-region/);
    assert.match(js, /bwrWorldName/);
    assert.ok((js.match(/data-clean-keep/g) || []).length >= 2, 'clean view keeps the name bubble and the label inside worlds');
    const css = R('world-sci.css');
    assert.match(css, /\.bwr-wn \{[^}]*pointer-events: none/, 'the name bubble never takes a tap');
    assert.match(css, /prefers-reduced-motion/);
});
