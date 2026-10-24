/* 24 Oct 2026, Emmanuel (funny-frisch "Sweet & Spicy Curry Style" chips, German UI): "It says spike, but then it tells the person
   they can eat it sometimes ... what is sometimes?". One verdict per food, three tiers with the same words everywhere
   (Everyday / Small portion / Skip it; Alltag / Kleine Portion / Lieber nicht; Diario / Porción pequeña / Mejor no), no frequency,
   and the Food check light is never milder than the spike estimate above it. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const C = require('../food-card-core.js');
const K = require('../food-knowledge-core.js');
const S = require('../spike-core.js');
const P = require('../food-policy-core.js');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const clone = o => JSON.parse(JSON.stringify(o));

/* per 30 g on the screenshot: 14.7 g carbs, 0.9 g sugar, 1.8 g protein, 9.9 g fat, 159 kcal */
const CHIPS = { barcode: '4003586000999', name: 'Sweet & Spicy Curry Style', brand: 'funny-frisch', cat: 'snack',
    facts: { c: 49, s: 3, p: 6, fat: 33, f: 4, kcal: 530, salt: 1.5, q: '110 g' },
    ingredients: 'Kartoffeln, Sonnenblumenöl, Gewürzmischung (Zucker, Salz, Gewürze, Currypulver, Paprikapulver, Zwiebelpulver, Knoblauchpulver, Hefeextrakt, Säuerungsmittel Citronensäure, Raucharoma)' };
const NOBRAND = Object.assign(clone(CHIPS), { brand: 'Hausmarke', name: 'Paprika Style' });
const FRIES = { barcode: '4000000000101', name: 'Backofen Frites', brand: 'Test', cat: 'frozen', facts: { c: 24, s: 0.5, p: 2.5, fat: 5, kcal: 150 }, ingredients: 'Kartoffeln, Sonnenblumenöl, Salz' };
const SKYR = { barcode: '4002468000001', name: 'Skyr Natur', brand: 'Test', cat: 'dairy', facts: { c: 4, s: 4, p: 11, fat: 0.2 }, ingredients: 'Magermilch, Milchsäurekulturen' };
const COLA = { barcode: '5000112000002', name: 'Cola', brand: 'Test', cat: 'drink', facts: { c: 10.6, s: 10.6, drink: 1 }, ingredients: 'Wasser, Zucker, Kohlensäure' };
const ULTJE = { barcode: '4004980506206', name: 'Ültje Süß & Salzig', brand: 'Ultje', cat: 'snack', facts: { c: 36, s: 29, f: 5.6, p: 16, fat: 33, kcal: 517 }, ingredients: '' };
const YOG = { barcode: '4000000000202', name: 'Erdbeer Joghurt', brand: 'Test', cat: 'dairy', facts: { c: 14, s: 13, p: 3.5, fat: 3 }, ingredients: 'Joghurt, Zucker, Erdbeeren 8 %, Stärke' };
const FREQ = /now and then|now-and-then|ab und zu|de vez en cuando|once in a while|okay sometimes|\bRARELY\b|\bA VECES\b|keep it occasional|lieber selten/i;
/* For the whole-file scan: the phrases in any case, the old badge words only as the upper-case badge they were
   ("Rarely" is also the reminders frequency setting, which is not a food verdict). */
const FREQ_PHRASE = /now and then|now-and-then|ab und zu|de vez en cuando|once in a while|okay sometimes|keep it occasional|lieber selten/i;
const FREQ_BADGE = /\bRARELY\b|\bA VECES\b/;
/* Lines that use these words for something other than a food verdict shown to people: a workout cue (arm moves
   now and then), the reminders block comment (the orb speaks up now and then) and a block-comment line in
   spike-core.js that names the old Shuffle label. */
const NOT_FOOD = /Armübungen zwischendurch|The scan orb speaks up now and then|while Shuffle still used them as "Now and then"/;

test('the funny-frisch chips: one verdict, Skip it, matching the higher spike estimate, never "okay sometimes"', () => {
    const m = C.model(clone(CHIPS), 30);
    assert.equal(m.impact, 'higher');
    assert.equal(m.verdict, 'NEIN');
    for (const li of [0, 1, 2]) assert.doesNotMatch(C.cardHTML(clone(CHIPS), li, 30), FREQ);
    const de = C.cardHTML(clone(CHIPS), 1, 30, { swaps: true });
    assert.match(de, /<strong class="fc-word">Lieber nicht<\/strong>/);
    assert.match(de, /Höhere Spike-Schätzung/);
    assert.match(de, /Isst du es trotzdem\? Kleine Portion direkt nach einer Mahlzeit, danach zehn Minuten gehen\./);
    assert.doesNotMatch(de, /Ab und zu|SELTEN/);
    assert.doesNotMatch(de, /Zugesetzter Zucker/, '3 g sugar per 100 g is low sugar: no added sugar reason');
    assert.doesNotMatch(de, /\(zucker\)/);
    assert.doesNotMatch(de, /Natur-Variante/, 'the generic plain-version line does not fit chips');
    assert.doesNotMatch(de, /fc-alt/, 'Seller Zone swaps on the card: no second "better choice"');
    assert.doesNotMatch(de, /Lebensmittelqualität/, 'under Skip it the quality line would only repeat the light');
    assert.match(de, /14,7 g/, 'German decimals');
    const alone = C.model(clone(CHIPS), 30);
    assert.equal(alone.alternative.key, 'crunchy_veg', 'without Seller Zone swaps the better choice matches the product type');
});

test('crisps without "chips" in the name: a crisps brand, or potatoes first with crisps-level fat; oven fries are not crisps', () => {
    const cats = p => (P.applyPolicy ? null : null);
    const v = p => C.model(clone(p), 30);
    assert.equal(v(CHIPS).policyVerdict, 'NEIN');
    assert.equal(v(NOBRAND).policyVerdict, 'NEIN');
    assert.ok(v(NOBRAND).reasons.length);
    const fr = C.model(clone(FRIES), 150);
    assert.ok(fr, 'fries get a card');
    assert.notEqual(fr.alternative && fr.alternative.key, 'crunchy_veg');
    void cats;
});

test('the Food check light is never milder than the spike estimate (higher = Skip it, moderate = at least Small portion)', () => {
    const R = { JA: 0, SELTEN: 1, NEIN: 2 };
    for (const [p, g] of [[CHIPS, 30], [NOBRAND, 30], [SKYR, 150], [COLA, 330], [ULTJE, 30], [YOG, 150], [FRIES, 150], [CHIPS, 110]]) {
        const m = C.model(clone(p), g);
        if (!m) continue;
        assert.ok(R[m.verdict] >= R[K.IMPACT_TIER[m.impact]], p.name + ' ' + m.verdict + ' vs ' + m.impact);
        assert.ok(R[m.verdict] >= R[m.policyVerdict], p.name + ' keeps the food rules');
        if (m.impact === 'higher') assert.equal(m.verdict, 'NEIN');
    }
    assert.equal(K.tierFor('SELTEN', 'higher'), 'NEIN');
    assert.equal(K.tierFor('JA', 'moderate'), 'SELTEN');
    assert.equal(K.tierFor('NEIN', 'lower'), 'NEIN', 'a food rule NEIN stays NEIN with a low estimate (pork), with its own line, not a spike claim');
    assert.equal(K.tierFor('JA', 'lower'), 'JA');
});

test('Skip it without a higher estimate says it is a LOWiSPIKE rule, not a spike', () => {
    const S2 = { barcode: '4000000000303', name: 'Kochschinken', brand: 'Test', cat: 'meat', facts: { c: 1, s: 1, p: 20, fat: 3 }, ingredients: 'Schweinefleisch, Salz' };
    const m = C.model(clone(S2), 50);
    if (m && m.verdict === 'NEIN' && m.impact !== 'higher') {
        const h = C.cardHTML(clone(S2), 1, 50);
        assert.match(h, /Keine LOWiSPIKE-Wahl/);
        assert.doesNotMatch(h, /Spike-Schätzung|trotzdem/);
    }
});

test('added sugar is a reason only when there is enough sugar to matter (over 5 g per 100 g)', () => {
    const y = C.cardHTML(clone(YOG), 0, 150);
    assert.match(y, /Added sugar/);
    assert.doesNotMatch(y, /Added sugar \(/, 'no raw ingredient word in brackets');
    assert.doesNotMatch(C.cardHTML(clone(CHIPS), 0, 30), /Added sugar/);
    assert.ok(P.POLICY.thresholds.lowSugarMaxPer100 === 5 && P.POLICY.thresholds.lowSugarMaxPer100ml === 2.5);
    assert.equal(P.POLICY.rules.find(r => r.id === 'glucose.higher').verdict, 'NEIN');
});

test('the same three tier words everywhere, in English, German and Spanish', () => {
    const T = K.TIERS;
    assert.deepEqual([T.en.JA.name, T.en.SELTEN.name, T.en.NEIN.name], ['Everyday', 'Small portion', 'Skip it']);
    assert.deepEqual([T.de.JA.name, T.de.SELTEN.name, T.de.NEIN.name], ['Alltag', 'Kleine Portion', 'Lieber nicht']);
    assert.deepEqual([T.es.JA.name, T.es.SELTEN.name, T.es.NEIN.name], ['Diario', 'Porción pequeña', 'Mejor no']);
    const L = ['en', 'de', 'es'];
    /* the card words */
    const card = { JA: [C.cardHTML(clone(SKYR), 0, 150), C.cardHTML(clone(SKYR), 1, 150), C.cardHTML(clone(SKYR), 2, 150)],
        NEIN: [C.cardHTML(clone(CHIPS), 0, 30), C.cardHTML(clone(CHIPS), 1, 30), C.cardHTML(clone(CHIPS), 2, 30)] };
    L.forEach((l, i) => {
        assert.ok(card.JA[i].includes('<strong class="fc-word">' + T[l].JA.name + '</strong>'), 'JA ' + l);
        assert.ok(card.NEIN[i].includes('<strong class="fc-word">' + T[l].NEIN.name + '</strong>'), 'NEIN ' + l);
        assert.ok(card.NEIN[i].includes(T[l].NEIN.subSpike), 'spike sub ' + l);
        assert.ok(card.NEIN[i].includes(T[l].anyway), 'anyway ' + l);
        assert.equal(K.label('SELTEN', l), T[l].SELTEN.name.toUpperCase());
    });
    /* the other surfaces */
    const html = read('index.html');
    assert.match(html, /const RLAB = \{ja:"Everyday", selten:"Small portion", nein:"Skip it"/);
    assert.match(html, /const RB = \{ja:"Everyday", selten:"Small portion", nein:"Skip it"\}/);
    assert.match(html, /L\("Small portion", "Kleine Portion", "Porción pequeña"\)/);
    assert.match(html, /\["Small portion", "Kleine Portion", "Porción pequeña"\]/);
    assert.match(html, /\["Skip it", "Lieber nicht", "Mejor no"\]/);
    assert.match(html, /\["Everyday", "Alltag", "Diario"\]/);
    assert.match(read('store-picks.js'), /'Food-Check: Kleine Portion'/);
    assert.match(read('seller-zone.js'), /T\('Small portion', 'Kleine Portion', 'Porción pequeña'\)/);
    assert.match(read('seller-zone.js'), /T\('Everyday', 'Alltag', 'Diario'\)/);
    assert.equal(S.text(['c_rare'], 1), 'Food-Check: Kleine Portion');
    assert.equal(S.text(['c_no'], 2), 'Análisis del alimento: Mejor no');
});

test('no frequency verdicts left in what people read (code comments and old What\'s New history aside)', () => {
    for (const f of ['index.html', 'food-card-core.js', 'food-knowledge-core.js', 'food-assess-core.js', 'spike-core.js', 'store-picks.js', 'seller-zone.js', 'seller-zone-data.js', 'spirit.js']) {
        const lines = read(f).split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l));
        const hits = lines.map(l => l.replace(/\/\*.*?\*\//g, '')).filter(l => !NOT_FOOD.test(l) && (FREQ_PHRASE.test(l) || FREQ_BADGE.test(l)));
        assert.deepEqual(hits.map(h => h.trim().slice(0, 120)), [], f);
    }
    assert.doesNotMatch(read('index.html'), /\bSELTEN\b(?=[^"]*"[,\]])/, 'no SELTEN shown as a word in a text string');
});

test('the scan card: "Buy this instead" without a second language, names never hyphenated mid-word', () => {
    const sz = read('seller-zone.js');
    assert.match(sz, /esc\(T\('Buy this instead', 'Kauf lieber das', 'Mejor compra esto'\)\) \+ '<\/h4>'/);
    const css = read('seller-zone.css');
    const rule = css.match(/\.sz-mini b \{[^}]*\}/)[0];
    assert.doesNotMatch(rule, /hyphens: auto|overflow-wrap: anywhere/);
    assert.match(rule, /hyphens: manual/);
    const html = read('index.html');
    assert.match(html, /LowiFoodCard\.cardHTML\(p, LI\(\), g, \{swaps: !!szs\}\)/);
});
