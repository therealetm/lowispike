'use strict';
/* MAYA-HANDOFF 0.32 (Emmanuel, Mon 26 Oct 2026 ~4:07 PM, voice + 2 screenshots): "I don't understand Shop finds yet. It's a bit
   complicated ... 'Pick your shop so your finds are tied to it,' and then Power combos ... OK, I guess Power combos make sense, but
   that other stuff is confusing."
   Pins: one plain purpose line with "companion"; no shopping glow / spirit world / check-in 1/2 / glimmer jargon in EN, DE or ES;
   Power combos right under the scan buttons, before Caught today and the shop row; the shop is picked in one place and the
   Supermarket's shop is reused; Caught today uses the scanner card's verdict words (Lower / Moderate / Higher, never Medium);
   the scanner card's Shop finds note is one short line, or nothing when the scan earned nothing. Rewards stay as they were. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'grocery-hunt.js'), 'utf8');
const C = require('../grocery-hunt-core.js');
const SC = require('../shop-scan-core.js');

function el(tag) {
    const e = { tagName: tag, dataset: {}, attrs: {}, children: [], style: {}, innerHTML: '', textContent: '', className: '',
        classList: { s: new Set(), add(c) { this.s.add(c); }, remove(c) { this.s.delete(c); }, contains(c) { return this.s.has(c); }, toggle() { } },
        setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, removeAttribute(k) { delete this.attrs[k]; },
        addEventListener() { }, removeEventListener() { }, appendChild(c) { this.children.push(c); }, remove() { }, contains: () => false,
        insertAdjacentHTML() { }, insertAdjacentElement() { }, closest: () => null, querySelector: () => null, querySelectorAll: () => [] };
    return e;
}
function boot(lang, opts) {
    opts = opts || {};
    const winL = {};
    const D = { readyState: 'complete', documentElement: { lang: lang || 'en' }, body: el('body'),
        addEventListener() { }, removeEventListener() { }, getElementById: () => null,
        querySelector: () => null, querySelectorAll: () => [], createElement: t => el(t) };
    const storage = Object.assign({}, opts.storage || {});
    const W = { document: D, LowiGroceryCore: C, LowiShopScanCore: SC,
        MutationObserver: function () { this.observe = () => { }; }, requestAnimationFrame: () => 0,
        addEventListener: (t, f) => { (winL[t] = winL[t] || []).push(f); }, removeEventListener() { },
        dispatchEvent() { }, CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; }, setInterval: () => 0, clearInterval() { },
        localStorage: { getItem: k => (k in storage ? storage[k] : null), setItem: (k, v) => { storage[k] = String(v); }, removeItem: k => { delete storage[k]; } } };
    if (opts.storePicks) W.LowiStorePicks = { state: () => JSON.parse(JSON.stringify(opts.storePicks)) };
    W.window = W;
    const ctx = Object.assign(W, { console, Date, Math, String, Number, Object, Array, JSON, Set, Map, Promise, setTimeout: () => 0, clearTimeout() { }, fetch: () => Promise.reject(new Error('offline')) });
    vm.runInNewContext(SRC, ctx);
    const G = W.LowiGrocery;
    const panel = () => { G.open(); const ov = D.body.children[D.body.children.length - 1]; return ov.innerHTML; };
    /* the scanner card's sheet: records what the Shop finds note puts there */
    function scan(bc, name, level) {
        const added = [];
        const more = el('div');
        const sheet = el('div'); sheet.querySelector = s => (s === '.ss-more' ? more : null);
        sheet.insertBefore = (n) => added.push(n); sheet.appendChild = n => added.push(n);
        const card = el('div'); card.querySelector = s => (s === '.ss-sheet' ? sheet : null);
        (winL['lowi:shop-scan'] || []).forEach(f => f({ detail: { barcode: bc, name, level, card } }));
        return added;
    }
    return { G, W, panel, scan, storage };
}
const text = h => h.replace(/<[^>]*>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const JARGON = {
    en: /glow|spirit|check-in|glimmer|\b\d\s*\/\s*2\b/i,
    de: /Leucht|Geist|Check-in|Schimmer|\b\d\s*\/\s*2\b/i,
    es: /brill|esp[ií]rit|check-in|destello|\b\d\s*\/\s*2\b/i
};

for (const lang of ['en', 'de', 'es']) {
    test('Shop finds (' + lang + '): no shopping glow, spirit world, check-in 1/2 or glimmer jargon anywhere on the page', () => {
        const t = text(boot(lang).panel());
        assert.doesNotMatch(t, JARGON[lang]);
    });
    test('Shop finds (' + lang + '): one plain purpose line that names your companion', () => {
        const h = boot(lang).panel();
        const head = /<div class="stp-head">([\s\S]*?)<\/div>/.exec(h);
        assert.ok(head, 'has a head');
        const ps = head[1].match(/<p[ >]/g) || [];
        assert.strictEqual(ps.length, 1, 'exactly one line under the title');
        assert.match(text(head[1]), { en: /companion/, de: /Begleiter/, es: /compañero/ }[lang]);
        assert.doesNotMatch(text(head[1]), /Misty/);
    });
}

test('Shop finds: "pick your shop" shows once, in one place (no second reminder line)', () => {
    for (const lang of ['en', 'de', 'es']) {
        const t = text(boot(lang).panel());
        const re = { en: /pick your shop/gi, de: /w[äa]hl deinen Laden/gi, es: /elige tu tienda/gi }[lang];
        assert.strictEqual((t.match(re) || []).length, 1, lang + ': ' + t);
    }
});

test('Shop finds: Power combos are the hero, right under the scan buttons, before Caught today and the shop row', () => {
    const h = boot('en').panel();
    const scan = h.indexOf('data-gh="scan"'), pc = h.indexOf('Power combos'), ct = h.indexOf('Caught today'), shop = h.indexOf('data-gh="shops"');
    assert.ok(scan > 0 && pc > 0 && ct > 0 && shop > 0, [scan, pc, ct, shop].join(','));
    assert.ok(scan < pc && pc < ct && ct < shop, 'scan, then Power combos, then Caught today, then the shop: ' + [scan, pc, ct, shop].join(','));
    assert.match(h, /class="gh-combos"/, 'combos sit in their own hero block');
});

test('Shop finds: the shop picked in Supermarket is the same shop here (picked once)', () => {
    const sp = { range: 'edeka', store: { id: 'osm:n123', name: 'EDEKA Nord', brand: 'EDEKA', town: 'Flensburg' } };
    const { panel, G } = boot('en', { storePicks: sp });
    const t = text(panel());
    assert.match(t, /EDEKA Nord/);
    assert.doesNotMatch(t, /pick your shop/i);
    assert.strictEqual(G.state().plan.store.id, 'osm:n123', 'finds are tied to that shop');
});

test('Caught today uses the scanner card\'s verdict words: Lower / Moderate / Higher, never Medium', () => {
    const want = { en: ['Lower', 'Moderate', 'Higher'], de: ['Niedriger', 'Mittel', 'Höher'], es: ['Bajo', 'Moderado', 'Alto'] };
    for (const lang of ['en', 'de', 'es']) {
        const b = boot(lang);
        b.G._catch({ via: 'barcode', bc: '4000000000011', name: 'Apfel', lvl: 'none' });
        b.G._catch({ via: 'barcode', bc: '4000000000028', name: 'Mandeln Stifte', lvl: 'mild' });
        b.G._catch({ via: 'barcode', bc: '4000000000035', name: 'Cola', lvl: 'spike' });
        const t = text(b.panel());
        for (const w of want[lang]) assert.ok(t.indexOf(w) >= 0, lang + ' has ' + w);
        assert.doesNotMatch(t, /Medium|Medio\b/, lang + ': no Medium');
    }
});

test('scanner card: the first scan of the day earned nothing, so no Shop finds note at all', () => {
    const b = boot('en');
    assert.strictEqual(b.scan('4000000000011', 'Apfel', 'none').length, 0);
});

test('scanner card: a scan that earns something adds ONE short line, no shop nag, no check-in jargon', () => {
    for (const lang of ['en', 'de', 'es']) {
        const b = boot(lang);
        b.scan('4000000000011', 'Apfel', 'none');
        const added = b.scan('4000000000028', 'Joghurt', 'none');
        assert.strictEqual(added.length, 1, lang + ': one note');
        const h = added[0].innerHTML;
        assert.strictEqual((h.match(/<small/g) || []).length, 1, lang + ': one line');
        assert.match(text(h), /\+10 XP/);
        assert.doesNotMatch(text(h), JARGON[lang]);
        assert.doesNotMatch(text(h), /pick your shop|Laden|tienda/i, lang + ': no shop reminder on the card');
    }
});

test('scanner card: a finished Power combo is the one line', () => {
    const b = boot('en');
    b.scan('4000000000011', 'Speisequark Magerstufe', 'none');
    b.scan('4000000000028', 'Kiwi gold', 'none');
    const added = b.scan('4000000000035', 'Mandeln', 'none');
    assert.strictEqual(added.length, 1);
    assert.match(text(added[0].innerHTML), /Power combo/);
    assert.strictEqual((added[0].innerHTML.match(/<small/g) || []).length, 1);
});

test('Shop finds entry under Scan a product: plain words, no glow', () => {
    const src = SRC.slice(SRC.indexOf('function entryHTML'), SRC.indexOf('function decorate'));
    assert.doesNotMatch(src, /light up your world|'Glow '|glimmers here/);
});

test('rewards still work: two different products on one day give the +10 XP shopping bonus and keep the world boost hook', () => {
    assert.strictEqual(C.XP.trip, 10);
    assert.strictEqual(C.TRIP_MIN, 2);
    assert.match(SRC, /wh\.setBoost\(/);
});
