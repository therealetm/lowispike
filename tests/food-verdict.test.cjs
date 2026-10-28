/* scanfe-h (Oct 23, 2026): every consumer reads the same verdict as the Food check card.
   Bug: the card said NO for Ultje Suss & Salzig (sugar heavy) and for cooked ham (pork), but Cook > Products > Shuffle and
   the Buy pool still used them, because scan-sort only read the blood sugar estimate (better / ok).
   LowiSpikeCore.foodVerdict / tighten: the estimate made stricter by the Food check (NEIN -> spike, SELTEN -> at least better). */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const S = require('../spike-core.js');
const SS = require('../scan-sort-core.js');

const ULTJE = { name: 'Ültje Süß & Salzig', barcode: '', facts: { c: 36, s: 29, f: 5.5, p: 15, fat: 38, kcal: 555 }, ingredients: '' };
const HAM = { name: 'Schinken gekocht', facts: { c: 1, s: 1, p: 20, fat: 3 }, ingredients: 'Schweinefleisch, Salz' };
/* Oct 26 scan-why: plain nuts now default to the policy's own 30 g portion (ja.nuts_moderate), so a bag with no printed serving
   reads Everyday at a small handful. This fixture keeps its RARELY by printing a 50 g serving on the pack (policy.nuts_large). */
const PEANUTS = { name: 'Gesalzene Erdnüsse', facts: { c: 10, s: 4, f: 8, p: 25, fat: 50, sv: 50 }, ingredients: 'Erdnüsse, Salz' };
const PEANUTS_30 = { name: 'Gesalzene Erdnüsse', facts: { c: 10, s: 4, f: 8, p: 25, fat: 50 }, ingredients: 'Erdnüsse, Salz' };
/* 28 Oct 2026: a big nut portion is an energy note, not RARELY any more (owner: calories are not blood sugar). The RARELY
   fixture for every consumer below is now poultry salami (policy.processed_meat). */
const RARE = { name: 'Geflügelsalami', facts: { c: 1, s: 0.5, p: 22, fat: 14 }, ingredients: 'Putenfleisch, Hähnchenfleisch, Salz, Gewürze' };
const YOG = { name: 'Naturjoghurt', cat: 'dairy', facts: { c: 4, s: 4, p: 4, fat: 3.5 }, ingredients: 'Milch, Joghurtkulturen' };
const BEER = { name: 'Bier', cat: 'drink', facts: { c: 3, s: 0 }, ingredients: 'Wasser, Gerstenmalz, Hopfen, Alkohol' };
const rate = p => S.assess(p);

test('foodVerdict follows the Food check card: NEIN -> spike, SELTEN -> at least better, JA keeps the estimate', () => {
    assert.equal(S.assess(ULTJE).verdict, 'better', 'blood sugar estimate alone');
    assert.equal(S.foodVerdict(ULTJE), 'spike', 'Ultje: card says NO');
    assert.equal(S.assess(HAM).verdict, 'ok');
    assert.equal(S.foodVerdict(HAM), 'spike', 'pork: card says NO');
    assert.equal(S.foodVerdict(BEER), 'spike', 'alcohol: card says NO');
    assert.equal(S.foodVerdict(PEANUTS), 'ok', 'nuts, 50 g serving: card says YES with an energy note (28 Oct 2026)');
    assert.equal(S.foodVerdict(RARE), 'better', 'poultry salami: card says RARELY');
    assert.equal(S.foodVerdict(PEANUTS_30), 'ok', 'nuts at the usual 30 g handful: card says EVERYDAY');
    assert.equal(S.foodVerdict(YOG), 'ok', 'plain yoghurt: card says YES');
});

test('foodVerdict never gets milder and never guesses', () => {
    const sweet = { name: 'Cola Zero', cat: 'drink', facts: { c: 0, s: 0 }, ingredients: 'Wasser, Kohlensäure, Süßstoff (Aspartam)' };
    assert.equal(S.assess(sweet).verdict, 'spike');
    assert.equal(S.foodVerdict(sweet), 'spike');
    assert.equal(S.foodVerdict({ name: 'Mystery', facts: {}, ingredients: '' }), 'unknown', 'no label data, no verdict');
    assert.equal(S.foodVerdict({ name: 'x', notFound: true }), 'unknown');
    assert.equal(S.foodVerdict(null), 'unknown');
    assert.equal(S.tighten(HAM, { verdict: 'spike' }), 'spike', 'a stricter estimate stays');
    assert.equal(S.tighten(HAM, { verdict: 'unknown' }), 'unknown');
});

test('foodVerdict uses the serving the user picked, like the card', () => {
    assert.equal(S.foodVerdict(ULTJE, { servingG: 60 }), 'spike');
});

test('scan-sort: Shuffle and the Buy pool agree with the card (fails on the old scan-sort)', () => {
    assert.equal(SS.verdictOf(ULTJE, rate), 'spike');
    assert.equal(SS.verdictOf(HAM, rate), 'spike');
    assert.equal(SS.verdictOf({ ...HAM, verdict: 'ok' }, rate), 'spike', 'a stale stored ok row cannot leak');
    assert.equal(SS.verdictOf(RARE, rate), 'better');
    assert.equal(SS.verdictOf(YOG, rate), 'ok');
    const out = SS.split([ULTJE, HAM, RARE, YOG, BEER], { rate });
    assert.deepEqual(out.keep.map(i => i.product.name).sort(), ['Geflügelsalami', 'Naturjoghurt']);
    assert.deepEqual(out.toss.map(i => i.product.name).sort(), ['Bier', 'Schinken gekocht', 'Ültje Süß & Salzig']);
});

test('scan-sort: a manual entry or a rate() without the engine keeps its own rating', () => {
    assert.equal(SS.verdictOf({ ...HAM, manual: true }, () => ({ verdict: 'ok', engine: {} })), 'ok');
    assert.equal(SS.verdictOf(HAM, () => ({ verdict: 'ok' })), 'ok');
});

/* scanfe-h2 (Oct 23, 2026): the shop scan reads the live Food check verdict first (it used to trust a stored verdict before
   the live one), and salami named after another animal is not pork by name (Gefluegelsalami was a pork NEIN). */
const SH = require('../shop-scan-core.js');
const E = require('../food-engine-core.js');

test('shop scan: live Food check verdict first, a stored ok cannot hide a NO', () => {
    assert.equal(SH.verdictOf(Object.assign({ verdict: 'ok' }, ULTJE), rate), 'spike', 'Ultje: stored ok, card says NO');
    assert.equal(SH.verdictOf(Object.assign({ verdict: 'ok' }, HAM), rate), 'spike', 'ham: stored ok, card says NO');
    assert.equal(SH.verdictOf(Object.assign({ verdict: 'ok' }, RARE), rate), 'mild', 'poultry salami: card says RARELY');
    assert.equal(SH.verdictOf(Object.assign({ verdict: 'spike' }, YOG), rate), 'spike', 'a stored spike still wins');
    assert.equal(SH.verdictOf(YOG, rate), 'none', 'plain yoghurt stays Lower');
});

test('poultry or beef salami is processed meat (RARELY), not a pork NO; pork salami stays NO', () => {
    const per100 = { carbs: 1, sugar: 0.5, protein: 22, fat: 14 };
    const v = (name, extra) => E.scanFood(Object.assign({ name, per100 }, extra || {}), 30);
    for (const name of ['Geflügelsalami', 'Delikatess Geflügel Edelsalami', 'Wilhelm Brandenburg Rindfleisch salami', 'Puten-Chorizo']) {
        const r = v(name, { ingredients: 'Putenfleisch, Hähnchenfleisch, Salz, Gewürze' });
        assert.equal(r.verdict, 'SELTEN', name + ' ' + r.policy.decidedBy);
        assert.equal(r.policy.decidedBy, 'policy.processed_meat', name);
    }
    assert.equal(v('Salami Milano').verdict, 'NEIN', 'plain salami: pork by name');
    assert.equal(v('Schweinesalami').verdict, 'NEIN');
    assert.equal(v('Geflügelsalami', { ingredients: 'Putenfleisch, Schweinespeck, Salz' }).verdict, 'NEIN', 'pork in the ingredients still NO');
    assert.equal(v('Geflügelsalami', { categories: 'en:pork-and-its-products' }).verdict, 'NEIN', 'explicit pork tag still NO');
    assert.notEqual(v('Geflügelsalami').verdict, 'JA', 'never a whole-food poultry YES');
    assert.equal(S.foodVerdict({ name: 'Geflügelsalami', facts: { c: 1, s: 0.5, p: 22, fat: 14 }, ingredients: 'Putenfleisch, Salz' }), 'better');
});

/* scanfe-h3 (Oct 23, 2026): 'Putenspeck' slipped past \bspeck\b and read as a whole-food poultry YES; and the spike lists
   (Spike catch) used the blood sugar estimate alone, so a product the card says NO to could sit under "Likely won't spike". */
const SCL = require('../spike-catch.js').lists.core;

test('Putenspeck and other compound speck names: processed meat or pork, never a poultry YES', () => {
    const per100 = { carbs: 1, sugar: 0.5, protein: 20, fat: 18 };
    const v = (name, extra) => E.scanFood(Object.assign({ name, per100 }, extra || {}), 30);
    for (const name of ['Putenspeck', 'Geflügel Bauchspeck', 'Hähnchenspeck gewürfelt']) {
        const r = v(name, { ingredients: 'Putenfleisch, Salz, Rauch' });
        assert.equal(r.verdict, 'SELTEN', name + ' ' + r.policy.decidedBy);
        assert.equal(r.policy.decidedBy, 'policy.processed_meat', name);
    }
    assert.equal(v('Frühstücksspeck').verdict, 'NEIN', 'plain bacon: pork by name');
    assert.equal(v('Putenspeck', { ingredients: 'Putenfleisch, Schweinespeck, Salz' }).verdict, 'NEIN', 'pork in the ingredients still NO');
    assert.equal(v('Putenbrust').verdict, 'JA', 'plain turkey breast stays a poultry YES');
});

test('spike lists follow the Food check card when rate() carries the engine (fails on the old split)', () => {
    const out = SCL.split([ULTJE, HAM, RARE, YOG], rate, '', false, null);
    assert.deepEqual(out.spike.map(p => p.name).sort(), ['Schinken gekocht', 'Ültje Süß & Salzig']);
    assert.deepEqual(out.ok.map(p => p.name), ['Naturjoghurt']);
    const manual = SCL.split([{ ...HAM, manual: true }], () => ({ verdict: 'ok', engine: {} }), '', false, null);
    assert.deepEqual(manual.ok.map(p => p.name), ['Schinken gekocht'], 'manual entry keeps its own rating');
});

/* scanfe-h4 (Oct 23, 2026): Store picks / grocery hunt / Emergency shop (store-picks-core.js) rated with an estimated GI per
   food group lowered by fibre, protein and fat; the spec forbids invented GI values, and a product the card says NO to
   (pork salami, Ültje sweet & salty) could still be listed as Good or Best. Now: engine impact + Food check. */
const SP = require('../store-picks-core.js');

test('store picks: no estimated GI, impact is the engine category at the group serving (fails on the old formula)', () => {
    const r = SP.rate({ n: 'Test', k: 'Kolonial > Pasta > Pasta', c: 10, s: 0, f: 0, p: 0, fat: 0 });
    assert.strictEqual(r.gi, undefined);
    assert.strictEqual(r.gl, undefined);
    const chk = E.scanFood({ name: 'Test', unit: 'g', per100: { carbs: 10, sugar: 0, fibre: 0, protein: 0, fat: 0 }, ingredients: '' }, r.serve);
    assert.strictEqual(r.impact, chk.glucose.key);
    assert.strictEqual(SP.explain(r).estimatedGI, false);
});

test('store picks: a Food check NO is never Good or Best, even with a Lower impact (fails on the old formula)', () => {
    const salami = SP.rate({ n: 'Salami', k: 'Fleisch & Wurst > Wurst > Salami', c: 1, s: 0.5, f: 0, p: 22, fat: 30, kcal: 360 });
    assert.strictEqual(salami.impact, 'lower');
    assert.strictEqual(salami.verdict, 'NEIN');
    assert.strictEqual(salami.pass, false);
    assert.strictEqual(salami.fail, 'policy');
    assert.strictEqual(SP.explain(salami).verdict, 'policy');
    const water = SP.rate({ n: 'Mineralwasser', k: 'Drikkevarer > Vand > Kildevand', c: 0, s: 0, p: 0, fat: 0, kcal: 0, u: 'ml' });
    assert.ok(water.pass && water.best, 'plain water stays Best');
});

/* scanfe-h5 (Oct 23, 2026): the policy pork name rule knew 'salami' but not the Italian 'Salame', so Leichte Salame Bella
   Festa (Dulano, Lidl) passed Store picks as a Lower-impact Good pick; and Misty's scan reaction (spirit.js) used the blood
   sugar estimate alone, so she could say "Yes, I like this one!" to a product the Food check card says NO to. */
const K = require('../spirit-core.js');

test('Salame is pork by name like salami; poultry or beef salame stays processed meat (fails on the old rule)', () => {
    const per100 = { carbs: 0.5, sugar: 0.5, protein: 32, fat: 16 };
    const v = (name, extra) => E.scanFood(Object.assign({ name, per100 }, extra || {}), 30);
    assert.equal(v('Leichte Salame Bella Festa').verdict, 'NEIN', 'Italian salame: pork by name');
    assert.equal(v('Salame Napoli').verdict, 'NEIN');
    for (const name of ['Salame di tacchino Geflügel', 'Rind Salame']) assert.equal(v(name).verdict, 'SELTEN', name + ' is processed meat, not pork');
    const sp = SP.rate({ n: 'Leichte Salame Bella Festa', k: 'meats-and-their-products|meats|prepared-meats|cured-sausages|salami', c: 0.5, s: 0.5, p: 32, fat: 16, kcal: 274 });
    assert.strictEqual(sp.verdict, 'NEIN');
    assert.strictEqual(sp.pass, false, 'no longer a Store pick');
});

test('Misty scan reaction follows the Food check card (fails on the old estimate-only verdict)', () => {
    assert.strictEqual(typeof K.scanVerdict, 'function');
    assert.strictEqual(K.scanVerdict(HAM, rate, S), 'spike', 'ham: card says NO');
    assert.strictEqual(K.scanVerdict(ULTJE, rate, S), 'spike', 'Ultje: card says NO');
    assert.strictEqual(K.scanVerdict(RARE, rate, S), S.tighten(RARE, rate(RARE)), 'same verdict as the spike lists');
    assert.notStrictEqual(K.scanVerdict(RARE, rate, S), 'ok', 'poultry salami is RARELY, never a plain YES');
    assert.strictEqual(K.scanVerdict({ ...HAM, manual: true }, () => ({ verdict: 'ok', engine: {} }), S), 'ok', 'manual entry keeps its own rating');
    assert.strictEqual(K.scanVerdict({ notFound: true, verdict: 'spike' }, rate, S), 'spike', 'not found keeps its stored verdict');
    assert.strictEqual(K.scanVerdict({ notFound: true }, rate, S), 'unknown');
});

/* scanfe-h6 (Oct 23, 2026): stored dex rows keep the verdict from the day they were caught. Bug: cooked ham caught before the
   Food check still showed "ok" in the Dex grid and My catches although the card says NO. */
test('rerate / rerateRows make stored dex rows stricter with the Food check, never milder, never guessing', () => {
    const row = (p, v, extra) => Object.assign({}, p, { verdict: v, why: [['s_low', 1, 1]] }, extra || {});
    const ham = row(HAM, 'ok'), ultje = row(ULTJE, 'better'), nuts = row(RARE, 'ok'), yog = row(YOG, 'spike');
    const manual = row(HAM, 'ok', { source: 'manual' }), lost = row(HAM, 'ok', { notFound: true });
    const bare = { name: 'Mystery bar', verdict: 'ok', facts: {}, ingredients: '' }, unk = row(HAM, 'unknown'), unkYog = row(YOG, 'unknown');
    assert.equal(S.rerate(ham), 'spike', 'pork: card says NO');
    assert.equal(S.rerate(ultje), 'spike');
    assert.equal(S.rerate(nuts), 'better', 'poultry salami: card says RARELY');
    assert.equal(S.rerate(yog), 'spike', 'never milder than the stored verdict');
    assert.equal(S.rerate(manual), 'ok', 'manual entries keep their own rating');
    assert.equal(S.rerate(lost), 'ok', 'not found keeps the stored verdict');
    assert.equal(S.rerate(bare), 'ok', 'no label data: nothing guessed');
    assert.equal(S.rerate(unk), 'spike', 'unknown only ever becomes spike');
    assert.equal(S.rerate(unkYog), 'unknown', 'unknown never becomes ok');
    const rows = [ham, ultje, nuts, yog, manual, lost, bare, unk, unkYog];
    assert.equal(S.rerateRows(rows), 4);
    assert.deepEqual(rows.map(r => r.verdict), ['spike', 'spike', 'better', 'spike', 'ok', 'ok', 'ok', 'spike', 'unknown']);
    assert.deepEqual(ham.why[0], ['c_no']);
    assert.deepEqual(nuts.why[0], ['c_rare']);
    assert.equal(manual.why[0][0], 's_low', 'untouched rows keep their reasons');
    assert.equal(S.rerateRows(rows), 0, 'running it again changes nothing');
    assert.ok(S.text(['c_no'], 1).startsWith('Food-Check: Nicht insulinfreundlich'));
});

test('index.html re-rates stored dex rows on load', () => {
    const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
    assert.match(html, /const mineList = \(\) => \{ rerateDex\(\);/, 'My catches / stats read re-rated rows');
    assert.match(html, /function dexItems\(\)\{ rerateDex\(\);/, 'the Dex grid reads re-rated rows');
    assert.match(html, /D\.comm = \(r\.data \|\| \[\]\)\.map\(fromRow\);[^\n]*LowiSpikeCore\.rerateRows\(D\.comm\)/, 'fresh Community rows too');
});
