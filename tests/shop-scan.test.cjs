'use strict';
/* Oct 16, 2026 (E-man: "When I'm grocery shopping ... I scan it and I just quickly want to see if it's estimated to spike my insulin or
   not. Then I put it into my cart in real life and also digitally. Other detailed information is optional below that."):
   shopping mode of the Scan camera (shop-scan-core.js / shop-scan.js / shop-scan.css + small hooks in index.html). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../shop-scan-core.js');

test('verdict: the scanner rating maps to one big spike / mild / no spike / not sure', () => {
    assert.equal(C.level('spike'), 'spike');
    assert.equal(C.level('better'), 'mild');
    assert.equal(C.level('ok'), 'none');
    assert.equal(C.level('unknown'), 'unknown');
    assert.equal(C.level('weird'), 'unknown');
    assert.equal(C.level(), 'unknown');
    // scanfe-h2: the live rating wins; a stored verdict only fills in, except a stored spike, which always wins
    assert.equal(C.verdictOf({ verdict: 'spike' }), 'spike');
    assert.equal(C.verdictOf({ verdict: 'ok' }, () => ({ verdict: 'spike' })), 'spike', 'an old ok row cannot hide a live spike');
    assert.equal(C.verdictOf({ verdict: 'ok' }, () => ({ verdict: 'better' })), 'mild', 'live first');
    assert.equal(C.verdictOf({ verdict: 'spike' }, () => ({ verdict: 'ok' })), 'spike', 'a stored spike still wins');
    assert.equal(C.verdictOf({ verdict: 'better' }, () => ({ verdict: 'unknown' })), 'mild', 'stored fills in when there is no live rating');
    assert.equal(C.verdictOf({ verdict: 'unknown', facts: { s: 30 } }, () => ({ verdict: 'spike' })), 'spike');
    assert.equal(C.verdictOf({ facts: { s: 4 } }, () => ({ verdict: 'better' })), 'mild');
    assert.equal(C.verdictOf({ facts: {} }, () => ({ verdict: 'unknown' })), 'unknown');
    assert.equal(C.verdictOf({ facts: {} }, () => { throw new Error('x'); }), 'unknown', 'a failing rating is not a verdict');
    assert.equal(C.verdictOf({ barcode: '1', notFound: true }, () => ({ verdict: 'ok' })), 'unknown', 'unknown barcode: never a guess');
    assert.equal(C.verdictOf(null), 'unknown');
});

test('verdict words: every key in English, German and Spanish, always labelled as an estimate', () => {
    for (const k of Object.keys(C.TX)) {
        assert.equal(C.TX[k].length, 3, k);
        C.TX[k].forEach((s, i) => assert.ok(typeof s === 'string' && s.trim().length, k + ' ' + i));
    }
    for (const v of C.LEVELS) { assert.ok(C.TX['v_' + v], v); assert.ok(C.TX['s_' + v], v); }
    assert.equal(C.tx('v_none', 0), 'Insulin-friendly');
    assert.equal(C.tx('v_none', 1), 'Insulinfreundlich');
    assert.equal(C.tx('v_none', 2), 'Apto para la insulina');
    assert.equal(C.tx('est', 1), 'Schätzung');
    assert.equal(C.tx('add', 2), 'Añadir al carro');
    assert.equal(C.tx('again', 0, 3), 'In your cart · 3×');
    assert.equal(C.langIndex('de-DE'), 1); assert.equal(C.langIndex('es'), 2); assert.equal(C.langIndex('fr'), 0); assert.equal(C.langIndex(), 0);
    assert.match(C.tx('legal', 0), /not medical advice/);
});

test('add to cart: a new product goes on the list ticked (in the cart), with barcode and verdict; undo takes it off', () => {
    const list = [];
    let n = 0;
    const r = C.cartAdd(list, { name: 'Skyr Natur', barcode: '4012345678901', level: 'none', img: 'https://images.openfoodfacts.org/images/x.jpg' }, () => 'id' + (++n));
    assert.equal(r.action, 'added');
    assert.equal(list.length, 1);
    assert.deepEqual({ id: list[0].id, n: list[0].n, done: list[0].done, via: list[0].via, bc: list[0].bc, v: list[0].v, s: list[0].s, q: list[0].q },
        { id: 'id1', n: 'Skyr Natur', done: true, via: 'scan', bc: '4012345678901', v: 'none', s: 'any', q: 1 });
    assert.equal(list[0].photo, 'https://images.openfoodfacts.org/images/x.jpg');
    assert.equal(C.cartCount(list), 1);
    r.undo(list);
    assert.equal(list.length, 0);
    assert.equal(C.cartCount(list), 0);
});

test('add to cart: the same product again counts up, an open list item is ticked off, never duplicated', () => {
    const list = [{ id: 'a', pid: '', n: 'Haferflocken', e: '🛒', s: 'any', p: null, u: '', rec: '', done: false }];
    const t = C.cartAdd(list, { name: 'haferflocken', barcode: '4000000000001', level: 'mild' });
    assert.equal(t.action, 'ticked');
    assert.equal(list.length, 1);
    assert.equal(list[0].done, true);
    assert.equal(list[0].bc, '4000000000001');
    t.undo(list);
    assert.equal(list[0].done, false, 'undo puts the list item back open');
    assert.equal(list[0].bc, undefined);

    const a = C.cartAdd(list, { name: 'Cola', barcode: '5000112637922', level: 'spike' });
    const b = C.cartAdd(list, { name: 'Coca-Cola 0,5 l', barcode: '5000112637922', level: 'spike' });
    assert.equal(a.action, 'added'); assert.equal(b.action, 'again');
    assert.equal(list.filter(i => i.via === 'scan').length, 1);
    assert.equal(b.item.q, 2);
    assert.equal(C.cartCount(list), 2);
    b.undo(list);
    assert.equal(C.cartCount(list), 1);
    // a product without a barcode (typed name) also works; nothing at all does not
    assert.equal(C.cartAdd(list, { name: 'Bananen', level: 'mild' }).action, 'added');
    assert.equal(C.cartAdd(list, { name: '  ', barcode: '' }), null);
    assert.equal(C.cartAdd(null, { name: 'x' }), null);
});

test('add to cart: only known label photo hosts reach the list (the list puts the photo in an <img src>)', () => {
    assert.equal(C.safeImg('https://images.openfoodfacts.org/a.jpg'), 'https://images.openfoodfacts.org/a.jpg');
    assert.equal(C.safeImg('https://abc.supabase.co/storage/v1/object/public/x.jpg'), 'https://abc.supabase.co/storage/v1/object/public/x.jpg');
    assert.equal(C.safeImg('http://images.openfoodfacts.org/a.jpg'), '');
    assert.equal(C.safeImg('https://evil.example/a.jpg'), '');
    assert.equal(C.safeImg('https://images.openfoodfacts.org/a.jpg" onerror="x'), '');
    const list = [];
    C.cartAdd(list, { name: 'X', img: 'javascript:alert(1)' });
    assert.equal(list[0].photo, '');
});

test('scanning on: the same code is ignored for a moment after a hit; shopping mode lasts a shopping trip', () => {
    assert.equal(C.repeatHit('1', { code: '1', at: 1000 }, 1000 + C.SAME_MS - 1), true);
    assert.equal(C.repeatHit('1', { code: '1', at: 1000 }, 1000 + C.SAME_MS + 1), false);
    assert.equal(C.repeatHit('2', { code: '1', at: 1000 }, 1001), false);
    assert.equal(C.repeatHit('1', null, 1), false);
    const now = 10 * C.TRIP_MS;
    assert.equal(C.tripOn(now - 60000, now), true);
    assert.equal(C.tripOn(now - C.TRIP_MS - 1, now), false);
    assert.equal(C.tripOn(null, now), false);
    assert.equal(C.tripOn(now + 5000, now), false, 'a stamp from the future does not count');
    assert.deepEqual(C.factRows({ s: 4.5, c: 3.6, f: null, p: 10, fat: 0.2 }).map(r => r[0]), ['f_s', 'f_c', 'f_p']);
});

test('wiring: the Scan camera is reused (no second camera or barcode reader), loaded and cached offline', () => {
    const html = read('index.html'), sw = read('sw.js'), js = read('shop-scan.js');
    const build = (html.match(/name="lowi-build" content="([^"]+)"/) || [])[1];
    for (const f of ['shop-scan.css', 'shop-scan-core.js', 'shop-scan.js']) {
        assert.ok(html.includes(f + '?v=' + build), f + ' loaded with the build');
        assert.ok(sw.split(f).length - 1 >= 2, f + ' in STATIC and the network-first list');
    }
    assert.ok(html.indexOf('shop-scan-core.js') < html.indexOf('shop-scan.js?'), 'core first');
    assert.doesNotMatch(js, /getUserMedia|BarcodeDetector|ZXing/, 'no copy of the camera or barcode code');
    // the scanner's hooks
    assert.match(html, /function shopMode\(on\)/);
    assert.match(html, /function shopResume\(\)/);
    assert.match(html, /if \(CAM\.busy \|\| CAM\.hold \|\|/, 'a hit holds the scan loop while the card is open');
    // Oct 26 one scanner (Emmanuel: "Sync them ... one thing, one ultimate scanner"): every camera shows this card and keeps the stream on
    assert.match(html, /if \(window\.LowiShopScan\) \{ const now = performance\.now\(\); if \(CAM\.hold \|\| \(window\.LowiShopScanCore && LowiShopScanCore\.repeatHit/);
    assert.match(html, /LowiShopScan\.found\(code, CAM\.el, \{ctx:scanCtx\(\)\}\); return; \}\n  CAM\.done = true; stopStream\(\);/, 'every camera keeps the stream on; the old close-and-reveal path is only a fallback without shop-scan.js');
    assert.match(html, /search:searchName, shopMode, shopResume/);
    assert.match(html, /addScanned:p => \{ const C = window\.LowiShopScanCore, r = C && C\.cartAdd\(SH\.list, p, uid\); if \(!r\) return null; shSave\(\);/);
    /* Oct 28 2026 late: the live barcode layer from the photo Scan screen is its own layer too (tests/scan-live-exit.test.cjs) */
    assert.match(html, /mode !== "shop"( && !live)?\)\{LowiSpirit\.scannerHost\(\)/, 'from Shop it opens as its own layer');
    assert.match(html, /LowiShopScan\.decorate\(m, s\)/, 'no camera: search by name');
    assert.match(js, /X\(\)\.scan\('shop'\)/);
    assert.match(js, /'tdShop', 'lsCart'/, 'Scan a product in Shop mode and in the cart');
});

test('look: black space and iOS blue glass, one big verdict and Add to cart, details folded, no gold or beige', () => {
    const css = read('shop-scan.css'), js = read('shop-scan.js'), bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(bare, /#(?:d4af37|c9a227|f5f5dc|e8d9b5|ffd700|e6c97a|c8a96a|d9b77e)|gold|beige|goldenrod|wheat|tan\b/i);
    assert.match(css, /\.ss-vw \{[^}]*font-size: 32px/);
    assert.match(css, /\.ss-add \{[^}]*min-height: 58px/);
    assert.match(css, /#0a84ff/);
    // order in the card: verdict, then Add to cart, then the folded details
    const r = js.slice(js.indexOf('function result('), js.indexOf('function unknown('));
    // Oct 26 one scanner: verdict, then the buttons (Add to cart first outside Log meal), then the better pick / bubble, then the folded details
    assert.match(r, /verdictHTML\(lvl, o\.est, q, rr\.g\) \+ acts \+ extrasHTML\(pv, lvl\) \+ detailsHTML\(q, r\)/, 'verdict, buttons, extras, details');
    assert.match(r, /: kIn \? kitB\(true\) \+ cartB\(false\) : cartB\(true\) \+ kitB\(false\) \+ \(ctx === 'scan' \? ateS : ''\);/, 'Add to cart is the big button outside Log meal and the Kitchen (Oct 28: small Log as eaten under it on the Scan camera)');
    assert.match(r, /data-ss="add"/);
    assert.match(js, /<details class="ss-more">/, 'details closed by default');
    assert.doesNotMatch(js, /<details class="ss-more" open/);
    assert.match(js, /T\('graphL'\)/, 'the verdict says Estimate, not a measurement (Oct 26 scan-why: on the curve)');
    assert.match(css, /prefers-reduced-motion/);
});
