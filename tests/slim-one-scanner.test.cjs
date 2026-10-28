'use strict';
/* Oct 28 2026 slim structure batch 5 (Emmanuel: "Ich möchte, dass du jetzt alles umsetzt"): one scanner for everything.
   F-04: the kitchen / shop scan is the same Scan screen with the same title, shopping is only the switch inside it.
   X-09: "report a product" (only on this phone) sits right in the scan result instead of a form reachable only by code.
   X-30: the Seller Zone is no page of its own; its buys already sit in the scan result, an old open() lands there.
   S-02: holding Scan no longer opens the "Alle Blasen" overview (tests/scan-hold.test.cjs has the gesture side). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const idx = read('index.html');

function loadZone(card) {
    const calls = [];
    const docEl = { lang: 'de', classList: { add() { }, remove() { } } };
    const ctx = {
        console, setTimeout, clearTimeout, requestAnimationFrame: f => f(),
        localStorage: { getItem: () => null, setItem() { }, removeItem() { } },
        navigator: { language: 'de', languages: ['de'] }, Intl,
        document: {
            documentElement: docEl, addEventListener() { }, removeEventListener() { }, body: { appendChild() { calls.push('PAGE'); } },
            createElement() { calls.push('PAGE'); return { addEventListener() { }, classList: { add() { }, remove() { } }, querySelector: () => null }; },
            querySelector: sel => (sel === '#b3Card' && card ? { querySelector: q => (q === '.sz-swap' && card === 'swap' ? { scrollIntoView(o) { calls.push('SWAP:' + o.block); } } : null), scrollIntoView(o) { calls.push('CARD:' + o.block); } } : null),
            activeElement: null
        },
        addEventListener() { },
        LowiDex: { scan(m) { calls.push('SCAN:' + (m || '')); } }
    };
    ctx.window = ctx; ctx.globalThis = ctx;
    vm.createContext(ctx);
    for (const f of ['seller-zone-data.js', 'seller-zone-core.js', 'seller-zone.js']) vm.runInContext(read(f), ctx, { filename: f });
    return { Z: ctx.LowiSellerZone, D: ctx.LowiSellerZoneData, C: ctx.LowiSellerZoneCore, calls };
}

test('F-04: the kitchen scan opens the same openScanner as the Scan bubble', () => {
    assert.match(read('kitchen-game.js'), /LowiDex\.scan\('shop'\)|openScanner\('shop'\)/, 'kitchen scan goes through the one scanner');
    assert.match(idx, /window\.LowiDex = \{open:openDex, scan:openScanner,/, 'LowiDex.scan is openScanner');
});

test('F-04: shopping mode keeps the one title "Scannen", no "Einkaufs-Scan" screen title', () => {
    const s = idx.slice(idx.indexOf('function shopMode(on)'), idx.indexOf('function shopResume()'));
    assert.match(s, /tt\.textContent = t\("scanBig"\)/);
    assert.doesNotMatch(s, /LowiShopScan\.title\(\)/);
});

test('X-09: the found card offers "Produkt melden" next to the label details', () => {
    assert.match(idx, /data-b3="label">' \+ esc\(\["Label details & evidence"[^\]]*\]\[LI\(\)\]\) \+ '<\/button>' \+ newProdHTML\(\)/);
});

test('X-09: the not-found result offers it too, beside Don\'t save', () => {
    assert.match(idx, /'<div class="nf-act"><button class="r2-link b3-skip" data-b3="close">' \+ esc\(t\("dontSave"\)\) \+ '<\/button>' \+ newProdHTML\(\) \+ '<\/div><\/div>'/);
});

test('X-09: the button text is in EN, DE and ES and only shows when the product form exists', () => {
    const m = idx.match(/function newProdHTML\(\)\{[^\n]*\n/);
    assert.ok(m, 'newProdHTML exists');
    assert.match(m[0], /"Report this product", "Produkt melden", "Comunicar producto"/);
    assert.match(m[0], /typeof window !== "undefined" && window\.LowiDiscovery && window\.LowiDiscovery\.openForm \?/);
    assert.match(m[0], /: ""; \}/, 'nothing when the form is missing');
});

test('X-09: an unknown product opens the new-product form, a known one the correct/confirm form', () => {
    assert.match(idx, /case "newprod": if \(window\.LowiDiscovery && LowiDiscovery\.openForm\) LowiDiscovery\.openForm\(CUR && CUR\.id \? "correct" : "first", Object\.assign\(\{\}, CUR \|\| \{\}\)\); break;/);
    assert.match(read('discovery.js'), /function openForm\(kind,p\)/, 'the form it opens still exists');
});

test('X-30: the scanner card\'s buys have no "See all in Seller Zone" page button any more', () => {
    const { Z } = loadZone(false);
    const h = Z.swapHTML({ name: 'Vollmilch Schokolade', verdict: 'spike', cat: 'sweets' });
    assert.match(h, /class="sc-sec sz-swap"/, 'the buys still show in the result');
    assert.doesNotMatch(h, /sz-all|data-sz-open/);
});

test('X-30: an old open() with a scan result showing scrolls to its buys (or the card), never the camera, no page opens', () => {
    let { Z, calls } = loadZone('swap');
    Z.open('chips');
    assert.deepEqual(calls, ['SWAP:center']);
    ({ Z, calls } = loadZone('card'));
    Z.open('chips');
    assert.deepEqual(calls, ['CARD:start']);
    assert.equal(Z.isOpen(), false);
});

test('X-30: an old open() without a scan result opens the one scanner, no page opens', () => {
    const { Z, calls } = loadZone(false);
    Z.open('chips');
    assert.deepEqual(calls, ['SCAN:']);
    assert.equal(Z.isOpen(), false);
});

test('S-02: the tutorial Scan card no longer covers the hold-all overview, bloom-ring.js is exempt with a reason', () => {
    const T = require('../tutorial-steps.js');
    const s = T.STEPS.find(x => x.id === 'scan');
    assert.ok(s && !(s.covers || []).includes('scan-hold-all'));
    assert.match(read('tutorial-steps.js'), /'bloom-ring\.js': 'Oct 28 2026 slim structure \(S-02 deleted\)/);
});
