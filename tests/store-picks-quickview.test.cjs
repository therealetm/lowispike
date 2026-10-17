'use strict';
/* Oct 18, 2026 (E-man in Lidl Flensburg, looking at "Bio Linsen" in What can I buy here?, could not tap it: "It should be
   linked in there ... ideally ... a little window next to best. Just like Amazon, so we can actually see ... an image of the
   product. So when we're grocery shopping, we know exactly what to go for." and "what are we basing this off?", "Why are we
   saying it's best?"). Rows are tappable, show a lazy thumbnail, and open a quick view with the real photo, the label, why it
   is rated, the source page, and what the list is not (not the shelf of one shop, not medical advice). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../store-picks-core.js');
const J = f => JSON.parse(read('data/shop/' + f + '.json'));
const OFF = ['lidl', 'aldi', 'edeka', 'rewe', 'kaufland', 'netto', 'penny', 'famila'];

test('photo(): the compact im column turns back into the exact Open Food Facts image URL', () => {
    assert.equal(C.photo({ g: '4056489408512', im: 'front_es.3' }),
        'https://images.openfoodfacts.org/images/products/405/648/940/8512/front_es.3.200.jpg');
    assert.equal(C.photo({ g: '4056489408512', im: 'front_es.3' }, 400),
        'https://images.openfoodfacts.org/images/products/405/648/940/8512/front_es.3.400.jpg');
    assert.equal(C.photo({ g: '20281915', im: 'front_de.41' }), 'https://images.openfoodfacts.org/images/products/20281915/front_de.41.200.jpg');
    assert.equal(C.photo({ g: '123', im: '000/000/000/0123/front_fr.2' }), 'https://images.openfoodfacts.org/images/products/000/000/000/0123/front_fr.2.200.jpg');
    assert.equal(C.photo({ g: '20281915', im: null }), null);
    assert.equal(C.photo({ g: '', im: 'front_de.1' }), null);
    // nothing from outside the OFF image host can be injected through the data file
    assert.equal(C.photo({ g: '1', im: '//evil.example/x' }), null);
    assert.equal(C.photo({ g: '1', im: 'front"onerror="x' }), null);
});

test('link(): Open Food Facts lists link the product page by barcode; Salling only when OFF has the product', () => {
    const lidl = { chain: 'lidl', source: 'Open Food Facts: products shoppers tagged as sold at Lidl in Germany' };
    assert.equal(C.link({ g: '20281915' }, lidl).url, 'https://world.openfoodfacts.org/product/20281915');
    assert.equal(C.link({ g: '' }, lidl), null);
    const sal = { chain: 'salling', source: 'Salling Group online range (Bilka ToGo)', sourceUrl: 'https://www.bilkatogo.dk/' };
    assert.equal(C.link({ g: '5712875677649', im: null }, sal), null);
    assert.equal(C.link({ g: '5712875677649', im: 'front_da.4' }, sal).url, 'https://world.openfoodfacts.org/product/5712875677649');
});

test('explain(): Best/Good comes from the same numbers the list uses, with the limits spelled out', () => {
    const r = C.rate({ n: 'Bio-Linsen rot', b: 'Lidl', k: 'legumes|seeds|legume-seeds|pulses|lentils|red-lentils', c: 49, s: 1.5, f: 7.6, p: 27, fat: 1.4, kcal: 333, u: 'g' });
    const e = C.explain(r);
    assert.equal(e.gl, r.gl);
    assert.equal(e.gi, r.gi);
    assert.equal(e.serve, r.serve);
    assert.equal(e.carbs, r.carbs);
    assert.equal(e.limits.best, 2);
    assert.equal(e.limits.gl, 5);
    assert.equal(e.limits.sugar, 6);
    assert.equal(e.verdict, r.best ? 'best' : r.pass ? 'good' : r.fail === 'sugar' ? 'sugar' : 'spikes');
    assert.equal(e.estimatedGI, true);
    const chicken = C.explain(C.rate({ n: 'Hähnchenbrust', k: 'meats|poultries|chickens|chicken-breasts', c: 0, s: 0, f: 0, p: 23, fat: 2 }));
    assert.equal(chicken.verdict, 'best');
});

test('data: every Open Food Facts range has a photo column filled from OFF, with its source named', () => {
    OFF.concat('salling').forEach(f => {
        const d = J(f);
        assert.ok(d.cols.includes('im'), f + ' has im');
        assert.ok(d.images && /Open Food Facts/.test(d.images.source), f + ' names the photo source');
        const ii = d.cols.indexOf('im');
        const withPhoto = d.rows.filter(r => r[ii]).length;
        assert.equal(withPhoto, d.images.withPhoto, f + ' photo count matches');
        d.rows.forEach(r => { if (r[ii]) assert.match(r[ii], /^([0-9]{3}\/[0-9]{3}\/[0-9]{3}\/[0-9]+\/|[0-9]+\/)?(front|image)[A-Za-z0-9_.-]*$/, f + ' im shape ' + r[ii]); });
    });
    const lidl = J('lidl');
    assert.ok(lidl.images.withPhoto > lidl.count * 0.6, 'most Lidl products have a photo');
    const rows = C.rows(lidl);
    const lentils = rows.find(p => p.n === 'Bio-Linsen rot' && p.g === '20281915');
    assert.ok(lentils, 'Bio-Linsen rot is in the Lidl list');
    assert.equal(C.photo(lentils), 'https://images.openfoodfacts.org/images/products/20281915/front_de.41.200.jpg');
});

test('list rows are buttons with a lazy thumbnail (no src until scrolled near), and open the quick view', () => {
    const js = read('store-picks.js');
    assert.match(js, /data-stp-item="/);
    assert.match(js, /<button type="button" class="stp-item/);
    assert.match(js, /class="stp-th[^"]*"/);
    assert.match(js, /data-src="/, 'thumbnails wait in data-src');
    const thumb = js.slice(js.indexOf('function thumbHTML('), js.indexOf('function itemHTML('));
    assert.ok(thumb.length > 50, 'thumbHTML exists');
    assert.doesNotMatch(thumb, /\ssrc="/, 'no thumbnail starts with a src in the list markup');
    assert.match(js, /IntersectionObserver/);
    assert.match(js, /rootMargin/);
    assert.match(js, /loading="lazy"/);
    assert.match(js, /onerror|addEventListener\('error'/);
    assert.match(js, /function openQuick\(/);
    assert.match(js, /function closeQuick\(/);
});

test('quick view: real photo, label, why, source link and the honest limits, in EN/DE/ES', () => {
    const js = read('store-picks.js');
    assert.match(js, /className = 'stp-qv'/);
    assert.match(js, /role="dialog" aria-modal="true"/);
    assert.match(js, /C\.photo\(p, 400\)/);
    assert.match(js, /C\.link\(p, data\)/);
    assert.match(js, /C\.explain\(/);
    assert.match(js, /rel="noopener noreferrer"/);
    assert.match(js, /target="_blank"/);
    assert.match(js, /No photo yet/);
    assert.match(js, /Noch kein Foto/);
    assert.match(js, /Aún no hay foto/);
    assert.match(js, /not checked against the shelf/i);
    assert.match(js, /not medical advice/i);
    assert.match(js, /data-stp="qv-close"/);
    // Escape closes the quick view first, the list stays open
    assert.match(js, /if \(qv\) return closeQuick\(\)/);
    const css = read('store-picks.css');
    assert.match(css, /\.stp-qv\s*\{/);
    assert.match(css, /\.stp-th\s*\{/);
    assert.match(css, /\.stp-item:focus-visible/);
});
