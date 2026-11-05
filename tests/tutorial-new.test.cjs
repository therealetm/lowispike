/* tests/tutorial-new.test.cjs (Nov 5 2026): the complete new tutorial (Emmanuel: "a complete new one that is up to date with our
   version"). Browser walk: tools/tutorial-new/check.cjs and tools/tutorial-short/check.cjs. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const S = require('../tutorial-steps.js');
const card = id => S.STEPS.find(s => s.id === id);

test('the new tour follows a day: Misty, Scan, Gap, Water/Move/Sleep, Shopping, Supermarket, Community, Settings, flying', () => {
    assert.deepStrictEqual(S.plan({}).map(s => s.id), ['hello', 'scan', 'gap', 'day', 'fuel', 'shop-week', 'community', 'settings', 'done']);
    assert.ok(S.VERSION >= 38, 'the tour version moved on, so What\'s new knows the tour changed');
    for (const s of S.plan({})) for (const l of ['en', 'de', 'es']) {
        assert.ok(s.text[l] && s.title[l], s.id + ' has ' + l);
        assert.ok(s.text[l].length <= 125, s.id + '.' + l + ' stays one short sentence (' + s.text[l].length + ')');
    }
});

test('Scan covers a meal photo and a packaged product, and what comes after the verdict', () => {
    const s = card('scan');
    assert.match(s.text.en, /meal or a pack/); assert.match(s.text.en, /log it as eaten/); assert.match(s.text.en, /cart/);
    assert.match(s.text.de, /Essen oder eine Packung/); assert.match(s.text.de, /eintragen/); assert.match(s.text.de, /Korb/);
    assert.match(s.text.es, /comida o a un paquete/); assert.match(s.text.es, /anotas/); assert.match(s.text.es, /carrito/);
    assert.ok(s.covers.includes('barcode') && s.covers.includes('log-meal'));
    assert.strictEqual(s.demo.open, 'scan-demo', 'the tour never opens the real camera');
    const sc = read('shop-scan.js'); assert.match(sc, /Log as eaten|Als gegessen|Eintragen/i); assert.match(sc, /cart|Korb/i);
});

test('Shopping names its three doors by their purpose, and Supermarket names Plan my week and the cart', () => {
    const f = card('fuel'), w = card('shop-week');
    assert.match(f.text.en, /Supermarket to shop and plan, Seller Zone for ready snacks, Help out to pay/);
    assert.match(f.text.de, /Supermarkt zum Einkaufen und Planen, Seller Zone für Snacks, Hilf mit zum Mitbezahlen/);
    assert.strictEqual(f.demo.open, 'fuel-bloom');
    assert.strictEqual(w.demo.open, 'supermarket', 'the Supermarket card opens Shop read-only');
    assert.match(w.text.en, /Plan my week/); assert.match(w.text.de, /Meine Woche planen/); assert.match(w.text.es, /Planear mi semana/);
    const sp = read('store-picks.js'); for (const word of ['Seller Zone', 'Hilf mit', 'Meine Woche planen']) assert.ok(sp.includes(word), 'store-picks.js really has ' + word);
});

test('a tour left on an old card continues on the card that took it over, never from the start', () => {
    assert.deepStrictEqual(S.MOVED, { water: 'day', move: 'day', sleep: 'day' });
    assert.strictEqual(S.moved('water'), 'day'); assert.strictEqual(S.moved('scan'), 'scan'); assert.strictEqual(S.moved(''), '');
    for (const [o, n] of Object.entries(S.MOVED)) { assert.ok(!card(o), o + ' is gone'); assert.ok(card(n), n + ' exists'); }
    assert.match(read('tutorial.js'), /const want = S\.moved \? S\.moved\(o\.at\) : o\.at;/, 'start({ at }) maps old ids');
});

test('the Settings card opens the real Settings page over Community and closes both after', () => {
    const js = read('tutorial.js');
    assert.match(js, /'settings-sheet': \{ over: 'community-tab', stage: '\.cme-ov'/);
    assert.match(js, /const ours = s =>/, 'a page laid over the card\'s own page belongs to the card');
    assert.match(js, /el\.closest\('\.stp-ov\.out'\)/, 'Shop closing does not hide the next card');
    assert.match(js, /back: \(\) => \{ if \(W\.LowiCommunityMe\) W\.LowiCommunityMe\.close\(\); goHome\(\); \}/);
});

test('every user can start the tour from Settings; the tour changes no entries', () => {
    assert.match(read('community-me.js'), /tutorial/i, 'Settings has the Tutorial row');
    const t = read('tutorial.js');
    assert.doesNotMatch(t, /localStorage\.(removeItem|clear)\(\s*['"](lowi[^'"]*(meal|water|sleep|move|cart|log))/i, 'the tour never wipes entries');
});
