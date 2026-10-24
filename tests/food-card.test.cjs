/* scanfe-g1 (Oct 23 2026): the Food Intelligence result card (food-card-core.js) on the scanned-product card. Spec section 12:
   verdict as a traffic light, impact + uncertainty, Why? (2-3), serving nutrition, quality, better choice; glucose / quality /
   cravings / confidence / policy version in Details. No estimate = no card; never "no spike". */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const C = require('../food-card-core.js');

const ULTJE = { barcode: '4004980506206', name: 'Ültje Süß & Salzig', brand: 'Ultje', cat: 'snack', facts: { c: 36, s: 29, f: 5.6, p: 16, fat: 33, kcal: 517 }, ingredients: '' };
const SKYR = { barcode: '4002468000001', name: 'Skyr Natur', brand: 'Test', cat: 'dairy', facts: { c: 4, s: 4, p: 11, fat: 0.2 }, ingredients: 'Magermilch, Milchsäurekulturen' };
const COLA = { barcode: '5000112000002', name: 'Cola', brand: 'Test', cat: 'drink', facts: { c: 10.6, s: 10.6, drink: 1 }, ingredients: 'Wasser, Zucker, Kohlensäure' };
const BROKEN = { barcode: '4000000000003', name: 'Broken label', cat: 'snack', facts: { c: 10, s: 20 }, ingredients: '' };
const BAD = /no blood sugar spike|kein Blutzucker-Spike|no te sube el azúcar|No spike|Kein Spike/i;
const clone = o => JSON.parse(JSON.stringify(o));

test('food card: Ultje Süß & Salzig is NEIN with the spec reasons, a 30 g serving, poor quality and plain almonds', () => {
    const m = C.model(clone(ULTJE));
    assert.equal(m.verdict, 'NEIN');
    assert.equal(m.impact, 'moderate', 'impact is the same key as the spike estimate above it');
    assert.equal(m.serving.g, 30);
    assert.deepEqual(m.reasons.map(r => r.text.en), ['29 g sugar per 100 g', 'Fat and protein may slow it down, but don’t cancel the carbs', 'Sweet and salty: easy to keep snacking']);
    assert.equal(m.quality.key, 'poor');
    assert.equal(m.alternative.key, 'sweet_nut_snack');
    const h = C.cardHTML(clone(ULTJE), 0);
    assert.match(h, /class="sc-sec fc-card fc-nein"/);
    assert.match(h, /<strong class="fc-word">Skip it<\/strong>/);
    assert.match(h, /Blood sugar impact: <b>Moderate<\/b>/);
    assert.match(h, /Per 30 g serving/);
    assert.match(h, /25–30 g plain roasted almonds/);
    assert.equal((h.match(/<li>/g) || []).length, 3);
});

test('food card: verdict words and texts in EN, DE and ES, never "no spike"', () => {
    const words = { 0: ['Skip it', 'Everyday'], 1: ['Lieber nicht', 'Alltag'], 2: ['Mejor no', 'Diario'] };
    for (const li of [0, 1, 2]) {
        const u = C.cardHTML(clone(ULTJE), li), s = C.cardHTML(clone(SKYR), li), d = C.detailsHTML(clone(ULTJE), li);
        assert.ok(u.includes('<strong class="fc-word">' + words[li][0] + '</strong>'), 'ultje word ' + li);
        assert.ok(s.includes('<strong class="fc-word">' + words[li][1] + '</strong>'), 'skyr word ' + li);
        for (const h of [u, s, d]) assert.doesNotMatch(h, BAD);
    }
    assert.match(C.cardHTML(clone(ULTJE), 1), /29 g Zucker pro 100 g/);
    assert.match(C.cardHTML(clone(ULTJE), 2), /29 g de azúcar por 100 g/);
    assert.match(C.cardHTML(clone(ULTJE), 1), /10,8 g<\/b> Kohlenhydrate/);
});

test('food card: JA has no better choice, NEIN drinks do; insufficient data shows no card', () => {
    const s = C.model(clone(SKYR)), c = C.model(clone(COLA));
    assert.equal(s.verdict, 'JA'); assert.equal(s.alternative, null);
    assert.doesNotMatch(C.cardHTML(clone(SKYR), 0), /fc-alt/);
    assert.equal(c.verdict, 'NEIN'); assert.equal(c.impact, 'higher'); assert.ok(c.alternative);
    assert.equal(C.model(clone(BROKEN)), null);
    assert.equal(C.cardHTML(clone(BROKEN), 0), '');
    assert.equal(C.detailsHTML(clone(BROKEN), 0), '');
    assert.equal(C.cardHTML({ notFound: true }, 0), '');
    assert.equal(C.cardHTML(null, 0), '');
});

test('food card details: blood sugar basis, quality, cravings + fullness, confidence with reasons, label-photo check, policy version', () => {
    const p = clone(SKYR); p.labelCheck = { source: 'label-photo-confirmed', fields: ['c', 's', 'p'] };
    const d = C.detailsHTML(p, 0);
    for (const k of ['Blood sugar', 'Quality', 'Cravings and fullness', 'Data confidence']) assert.ok(d.includes('<dt>' + k + '</dt>'), k);
    assert.match(d, /an estimate, not a measurement/);
    assert.match(d, /Label values checked by you from photos: 3/);
    assert.match(d, /lowispike-policy\.v1/);
    assert.ok(!d.includes('<details'), 'no nested details: the card keeps one Details');
    const u = C.detailsHTML(clone(ULTJE), 1);
    assert.match(u, /Datenlage<\/dt><dd><b>(Hoch|Mittel|Niedrig)<\/b>/);
});

test('food card: product text is escaped', () => {
    const p = clone(ULTJE); p.name = '<img src=x onerror=alert(1)>';
    const h = C.cardHTML(p, 0) + C.detailsHTML(p, 0);
    assert.ok(!h.includes('<img'));
});

test('food card in the real simpleCardHTML: header > spike estimate > food card > prices, Details holds the engine details, one <details>', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const src = html.slice(html.indexOf('const SC_TX = {'), html.indexOf('function actsHTML(p)'));
    const ctx = {
        LI: () => 0, esc: s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]),
        t: k => k, isMine: () => false, D: { mine: {} }, pkey: p => p.barcode, whyText: w => String(w), CAT_E: { other: '?' },
        factsHTML: () => '<div class="b3-facts">facts</div>', fillNoteHTML: () => '', LowiFoodCard: C
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(src + '\nthis.out = simpleCardHTML(P);', Object.assign(ctx, { P: Object.assign(clone(ULTJE), { verdict: 'better', why: ['10.8 g carbs in a 30 g serving'] }) }));
    const h = ctx.out, at = n => { const i = h.indexOf(n); assert.ok(i >= 0, n); return i; };
    assert.ok(at('class="sc-verd') < at('fc-card') && at('fc-card') < at('class="sc-sec sc-prices"'));
    assert.ok(at('<details class="sc-more" open>') < at('class="fc-det"') && at('class="fc-det"') < at('</details>'));
    assert.equal((h.match(/<details/g) || []).length, 1);
});

test('food card files load after the engine and are in the offline cache', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    const i = html.indexOf('src="spike-core.js'), j = html.indexOf('src="food-card-core.js'), k = html.indexOf('href="food-card.css');
    assert.ok(i > 0 && j > i && k > 0);
    assert.equal((sw.match(/"food-card-core\.js", "food-card\.css"/g) || []).length, 2);
});
