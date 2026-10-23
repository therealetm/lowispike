'use strict';
/* Oct 23, 2026 (Eman: people still want chips, a chocolate bar, Haribo, biscuits. When they scan those, give them real
   alternatives they would buy, not "go grab raspberries"). Seller Zone: checked snacks you can order online, and the scanner
   swap that points to them. Strict: only products that pass the scanner standard, no sweetener candy, no sweet potato chips. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
require('../seller-zone-data.js');
require('../seller-zone-core.js');
const D = globalThis.LowiSellerZoneData, C = globalThis.LowiSellerZoneCore;
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('every product is complete, linked to its own shop page and passes (Everyday or Sometimes)', () => {
    const cats = new Set(D.CATS.map(c => c.id)), ids = new Set();
    assert.ok(D.P.length >= 12);
    for (const x of D.P) {
        assert.ok(!ids.has(x.id), 'duplicate ' + x.id); ids.add(x.id);
        assert.ok(cats.has(x.cat), x.id + ' cat');
        assert.match(x.url, /^https:\/\/[^ ]+$/, x.id + ' url');
        assert.doesNotMatch(x.url, /amazon\.|[?&](tag|ref|aff|affiliate)=/i, x.id + ': the own product page, no affiliate tag');
        assert.ok(x.v === 'ja' || x.v === 'selten', x.id + ' verdict');
        assert.ok(x.n && x.b && x.shop && x.ing && x.amz, x.id + ' fields');
        assert.ok(Array.isArray(x.r) && x.r.length && x.r.every(r => ['eu', 'uk', 'us'].includes(r)), x.id + ' region');
        for (const k of ['why', 'por', 'ships']) for (const l of ['en', 'de', 'es']) assert.ok(x[k] && x[k][l], x.id + ' ' + k + ' ' + l);
    }
    for (const c of D.CATS) for (const l of ['en', 'de', 'es']) assert.ok(c.t[l]);
    for (const l of ['en', 'de', 'es']) assert.ok(D.NAME[l], 'the name lives in one place');
});

test('strict: no sweeteners, no added sugar, no sweet potato chips in the zone', () => {
    const bad = /\b(zucker|sugar|az[u\u00fa]car|sirup|syrup|erythrit\w*|stevia|maltit\w*|sucralose|allulose|maltodextrin|dextrose|honig|honey|glukose|glucose)\b/i;
    for (const x of D.P) assert.doesNotMatch(x.ing.replace(/ohne zucker/i, ''), bad, x.id + ' ingredients');
    assert.ok(!D.P.some(x => /s\u00fc\u00dfkartoffel|sweet potato/i.test(x.n)), 'sweet potato chips: 72 g carbs per 100 g');
    assert.ok(D.FAILED.some(f => /S\u00fc\u00dfkartoffel/.test(C.tx(f.n, 'de'))), 'the failed list says why');
    assert.ok(!D.P.some(x => x.cat === 'gummy' && /gumm|haribo|candy/i.test(x.n)), 'no gummy passes; chewy swaps instead');
    for (const k of ['gummy', 'biscuit', 'choc', 'chips']) for (const l of ['en', 'de', 'es']) assert.ok(D.NOTE[k][l]);
});

test('the scanner knows a junk snack by its name', () => {
    const k = n => C.kindOf({ name: n });
    assert.equal(k('Haribo Goldb\u00e4ren'), 'gummy');
    assert.equal(k('Maoam Bloxx'), 'gummy');
    assert.equal(k("Lay's Paprika"), 'chips');
    assert.equal(k('Pringles Original'), 'chips');
    assert.equal(k('funny-frisch Chipsfrisch ungarisch'), 'chips');
    assert.equal(k('Plantain Chips'), 'chips');
    assert.equal(k('Milka Alpenmilch'), 'choc');
    assert.equal(k('Ritter Sport Voll-Nuss'), 'choc');
    assert.equal(k('Kinder Bueno'), 'choc');
    assert.equal(k('Leibniz Butterkeks'), 'biscuit');
    assert.equal(k('Oreo Original'), 'biscuit');
    assert.equal(k('Chocolate Chip Cookies'), 'biscuit');
    assert.equal(k('Schoko Brownie'), 'biscuit');
    assert.equal(k('Tortilla Wraps'), null);
    assert.equal(k('Gouda jung'), null);
    assert.equal(k('Vollmilch 3,5 %'), null);
    assert.equal(k('Lindt Excellence 100% Cacao'), null, 'our own picks are not junk');
    assert.equal(k('KoRo ger\u00f6stete Mandeln'), null);
    assert.equal(k(''), null);
});

test('region from the phone and swaps in that region first', () => {
    assert.equal(C.regionOf('de-DE'), 'eu');
    assert.equal(C.regionOf('es-ES'), 'eu');
    assert.equal(C.regionOf('en-GB'), 'uk');
    assert.equal(C.regionOf('en-US'), 'us');
    assert.equal(C.regionOf('en-AU'), 'ww');
    assert.equal(C.regionOf('de'), 'eu');
    /* the time zone (where the phone is) wins over the language */
    assert.equal(C.regionOf('en-US', 'Europe/Berlin'), 'eu');
    assert.equal(C.regionOf('de-DE', 'Europe/London'), 'uk');
    assert.equal(C.regionOf('de-DE', 'America/New_York'), 'us');
    assert.equal(C.regionOf('en-US', 'Atlantic/Canary'), 'eu');
    assert.equal(C.regionOf('en-GB', 'Asia/Tokyo'), 'uk');
    assert.equal(C.regionOf('en-US', 'Europe/Moscow'), 'us');
    assert.equal(C.regionOf('en-US', ''), 'us');
    for (const kind of ['chips', 'choc', 'gummy', 'biscuit']) for (const r of ['eu', 'uk', 'us', 'ww']) {
        const s = C.swapsFor(D, kind, r, 3);
        assert.ok(s.length >= 1 && s.length <= 3, kind + ' ' + r);
        assert.ok(s.every(x => D.P.includes(x)));
    }
    const eu = C.swapsFor(D, 'chips', 'eu', 3);
    assert.ok(eu.every(x => x.r.includes('eu')), 'a German shopper sees German/EU shops first');
    assert.ok(C.swapsFor(D, 'gummy', 'eu', 3).some(x => /biltong/i.test(x.n)), 'Haribo craving: chewy biltong');
    assert.match(C.amazonUrl('Biltong ohne Zucker', 'eu'), /^https:\/\/www\.amazon\.de\/s\?k=Biltong\+ohne\+Zucker$/);
    assert.match(C.amazonUrl('x', 'us'), /amazon\.com/);
});

test('wired: scanner card, Shop panel entry, files cached, world paused while open', () => {
    const html = read('index.html');
    for (const f of ['seller-zone.css', 'seller-zone-data.js', 'seller-zone-core.js', 'seller-zone.js']) {
        assert.ok(html.includes(f + '?v='), f + ' loaded');
        assert.ok(read('sw.js').includes('"' + f + '"'), f + ' in sw.js');
    }
    const i = html.indexOf('function simpleCardHTML(p){'), body = html.slice(i, i + 4000);
    assert.ok(body.indexOf('szSwapHTML(p)') > 0 && body.indexOf('szSwapHTML(p)') < body.indexOf('sc-prices'), 'buys sit under the verdict, above prices');
    assert.ok(html.indexOf('<script src="seller-zone.js') > html.indexOf('<script src="seller-zone-core.js'));
    const sp = read('store-picks.js');
    assert.match(sp, /LowiSellerZone\.entryHTML/);
    assert.match(sp, /a === 'sellerzone'/);
    assert.match(read('body-world-3d.js'), /sz-open/);
    const ui = read('seller-zone.js');
    assert.match(ui, /rel="noopener noreferrer"/);
    assert.match(ui, /classList\.remove\('sz-open'\)/, 'the pause ends when the zone closes');
});
