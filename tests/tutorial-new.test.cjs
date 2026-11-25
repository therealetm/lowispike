/* tests/tutorial-new.test.cjs (Nov 5 2026): the complete new tutorial (Emmanuel: "a complete new one that is up to date with our
   version"). Browser walk: tools/tutorial-new/check.cjs and tools/tutorial-short/check.cjs. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const S = require('../tutorial-steps.js');
const card = id => S.STEPS.find(s => s.id === id);

test('the new tour follows a day: Misty, Scan, Gap, Water/Move/Sleep, Shopping, Supermarket, Community, Settings, flying', () => {
    /* changed 25 Nov 2026: the Studio card after Community (Emmanuel: "update the tutorial ... understand the full app now") */
    assert.deepStrictEqual(S.plan({}).map(s => s.id), ['hello', 'scan', 'gap', 'day', 'mirror', 'fuel', 'shop-week', 'community', 'studio', 'settings', 'done']);
    assert.ok(S.VERSION >= 38, 'the tour version moved on, so What\'s new knows the tour changed');
    for (const s of S.plan({})) for (const l of ['en', 'de', 'es']) {
        assert.ok(s.text[l] && s.title[l], s.id + ' has ' + l);
        assert.ok(s.text[l].length <= 200, s.id + '.' + l + ' stays short (' + s.text[l].length + ')');   /* Nov 5 2026: whole spoken sentences */
    }
});

test('Scan covers a meal photo and a packaged product, and what comes after the verdict', () => {
    const s = card('scan');
    assert.match(s.text.en, /meal or at a product/); assert.match(s.text.en, /log it as eaten/); assert.match(s.text.en, /cart/);
    assert.match(s.text.de, /Essen oder auf ein Produkt/); assert.match(s.text.de, /als gegessen ein/); assert.match(s.text.de, /Korb/);
    assert.match(s.text.es, /comida o a un producto/); assert.match(s.text.es, /anotas/); assert.match(s.text.es, /carrito/);
    assert.ok(s.covers.includes('barcode') && s.covers.includes('log-meal'));
    assert.strictEqual(s.demo.open, 'scan-demo', 'the tour never opens the real camera');
    const sc = read('shop-scan.js'); assert.match(sc, /Log as eaten|Als gegessen|Eintragen/i); assert.match(sc, /cart|Korb/i);
});

/* changed 24 Nov 2026 (Emmanuel: "Nuke [the supermarket] completely ... a game"): Shopping is the Grocery Run game now (grocery-run.js) */
test('Shopping names its three doors by their purpose, and Supermarket names Plan my week and the cart', () => {
    const f = card('fuel'), w = card('shop-week');
    assert.match(f.text.en, /Tap Shopping to play Grocery Run\. Spin a budget or type your own/);
    assert.match(f.text.de, /spiel den Einkaufs-Run\. Dreh ein Budget oder gib dein eigenes ein/);
    assert.match(f.text.es, /juega a la Carrera del súper/);
    assert.match(w.text.en, /tap a product and it flies into your cart\. Stay in budget for three stars/);
    assert.strictEqual(f.demo.open, 'grocery-run'); assert.strictEqual(w.demo.open, 'grocery-run', 'both cards open the game read-only');
    assert.match(read('tutorial.js'), /'grocery-run': \{ stage: '\.gr', go: \(\) => \{ if \(W\.LowiGroceryRun && !W\.LowiGroceryRun\.isOpen\(\)\) W\.LowiGroceryRun\.open\(\); \}/);
});

test('a tour left on an old card continues on the card that took it over, never from the start', () => {
    assert.deepStrictEqual(S.MOVED, { water: 'day', move: 'day', sleep: 'day' });
    assert.strictEqual(S.moved('water'), 'day'); assert.strictEqual(S.moved('scan'), 'scan'); assert.strictEqual(S.moved(''), '');
    for (const [o, n] of Object.entries(S.MOVED)) { assert.ok(!card(o), o + ' is gone'); assert.ok(card(n), n + ' exists'); }
    assert.match(read('tutorial.js'), /const want = S\.moved \? S\.moved\(o\.at\) : o\.at;/, 'start({ at }) maps old ids');
});

test('the Settings card holds the Community bubble; leaving Shop does not hide the next card', () => {
    const js = read('tutorial.js'), st = card('settings');
    assert.deepStrictEqual(st.demo, { g: 'hold', open: 'settings-sheet' });
    assert.match(js, /'settings-sheet': \{ stage: '\.cme-ov'/);
    assert.match(js, /el\.closest\('\.stp-ov\.out'\)/, 'Shop closing does not hide the next card');
    /* changed 25 Nov 2026: the Studio card's For You page (foryou-feed) keeps the card at the bottom too */
    assert.ok(js.includes("if (opened === 'community-tab' || opened === 'foryou-feed' || opened === 'supermarket' || opened === 'move-page') where = 'bottom';"), 'the Supermarket card leaves Shop\'s header and tabs readable, the Mirror card the Mirror mode card (Nov 5 2026)');
});

test('every user can start the tour from Settings; the tour changes no entries', () => {
    assert.match(read('community-me.js'), /tutorial/i, 'Settings has the Tutorial row');
    const t = read('tutorial.js');
    assert.doesNotMatch(t, /localStorage\.(removeItem|clear)\(\s*['"](lowi[^'"]*(meal|water|sleep|move|cart|log))/i, 'the tour never wipes entries');
});
