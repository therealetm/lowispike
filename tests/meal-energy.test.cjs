/* 28 Oct 2026, Emmanuel: "It didn't work." A photo bowl (Magerjoghurt, Mischbeeren, 35 Mandeln, 3 Kiwi-Scheiben, Chiasamen)
   read red "Nicht insulinfreundlich" with "Nüsse: eine große Portion ist viel Energie · etwa 14 g Netto-KH", although its
   blood-sugar estimate was low. His rule: keep blood-sugar / insulin impact, calories and portion apart. A big portion of
   nuts or cheese is an energy note beside the verdict; a small fruit inside a low-estimate meal meets its own SELTEN
   ("small portion, with a meal"); the net-carb figure names its sum; a sugary meal is still not insulin-friendly. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const S = require('../meal-photo.js');
global.LowiMealSnap = S;
const K = require('../food-knowledge-core.js');
const P = require('../food-policy-core.js');
const MR = require('../meal-result.js');
const MD = require('../meal-detail-core.js');
const FP = require('../food-photo-ai.js');

const BOWL = [
    { name: 'Magerjoghurt', portion: '1 Schüssel', grams: 150, kcal: 105, protein: 15, carbs: 6, sugar: 6, fiber: 0, fat: 1, count: 1 },
    { name: 'Mischbeeren tiefgekühlt', portion: '1 Handvoll', grams: 80, kcal: 42, protein: 1, carbs: 8, sugar: 5, fiber: 4, fat: 1, count: 1 },
    { name: 'Mandeln', portion: '35 Stück', grams: 42, kcal: 200, protein: 7, carbs: 2, sugar: 1, fiber: 4, fat: 18, count: 1 },
    { name: 'Kiwi', portion: '3 Scheiben', grams: 60, kcal: 30, protein: 1, carbs: 7, sugar: 5, fiber: 2, fat: 0, count: 3 },
    { name: 'Chiasamen', portion: '1 Esslöffel', grams: 12, kcal: 49, protein: 2, carbs: 4, sugar: 0, fiber: 3, fat: 3, count: 1 }
];
/* the deployed photo prompt still rates more than 30 g of nuts and any whole fruit SELTEN */
const OLD_MODEL = { v: 1, verdict: 'SELTEN', light: 'yellow', score: 15, spike: 'low', counted: ['Kiwi'], confidence: 'medium',
    parts: BOWL.map(d => ({ name: d.name, verdict: /Mandeln|Kiwi/.test(d.name) ? 'SELTEN' : 'JA' })) };
const SWEET = [
    { name: 'Pfannkuchen', portion: '3 Stück', grams: 240, kcal: 520, protein: 14, carbs: 75, sugar: 12, fiber: 2, fat: 16, count: 3 },
    { name: 'Ahornsirup', portion: '3 Esslöffel', grams: 60, kcal: 156, protein: 0, carbs: 40, sugar: 36, fiber: 0, fat: 0, count: 1 }
];

test('the bowl: low blood-sugar estimate, insulin-friendly, energy said on its own line', () => {
    const v = MR.verdict(BOWL, [], null, 'de');
    assert.strictEqual(v.level, 'low');
    assert.strictEqual(v.food.verdict, 'JA');
    assert.deepStrictEqual(v.food.notes.map(n => [n.rule, n.name, n.kcal]), [['policy.nuts_large', 'Mandeln', 200]]);
    const h = MR.headline(v, 'de');
    assert.strictEqual(h.ans, 'Insulinfreundlich');
    assert.doesNotMatch(h.why, /Energie|Nüsse/, 'energy is not the reason of the verdict');
    assert.match(h.why, /14 g Netto-(KH|Kohlenhydrate) \(27 g KH − 13 g Ballaststoffe\)/, 'net carbs name their sum: ' + h.why);
    assert.match(h.energy, /^Energie, nicht Blutzucker: 35 Mandeln haben etwa 200 kcal\./);
    assert.match(h.energy, /kleine Handvoll \(etwa 30 g\)/);
    for (const l of ['en', 'es']) {
        const x = MR.headline(MR.verdict(BOWL, [], null, l), l);
        assert.ok(x.energy && /200 kcal/.test(x.energy) && /30 g/.test(x.energy), l + ' energy line');
        assert.match(x.why, /27 g/, l + ' sum');
    }
});

test('the old photo prompt cannot turn the bowl red for nut energy or the kiwi slices', () => {
    const v = MR.verdict(BOWL, [], OLD_MODEL, 'de');
    assert.strictEqual(v.food.verdict, 'JA');
    assert.strictEqual(MR.headline(v, 'de').ans, 'Insulinfreundlich');
    /* without its per-food verdicts the model block still tightens, as before */
    const noParts = Object.assign({}, OLD_MODEL); delete noParts.parts;
    assert.strictEqual(MR.verdict(BOWL, [], noParts, 'de').food.verdict, 'SELTEN');
    /* a NEIN part, or a SELTEN part the app cannot explain or no longer sees, still tightens */
    const neinPart = Object.assign({}, OLD_MODEL, { parts: OLD_MODEL.parts.map(p => p.name === 'Chiasamen' ? { name: p.name, verdict: 'NEIN' } : p) });
    assert.notStrictEqual(MR.verdict(BOWL, [], neinPart, 'de').food.verdict, 'JA');
    const gone = Object.assign({}, OLD_MODEL, { parts: OLD_MODEL.parts.concat([{ name: 'Granola', verdict: 'SELTEN' }]) });
    assert.strictEqual(MR.verdict(BOWL, [], gone, 'de').food.verdict, 'SELTEN');
    const yog = Object.assign({}, OLD_MODEL, { parts: OLD_MODEL.parts.map(p => p.name === 'Magerjoghurt' ? { name: p.name, verdict: 'SELTEN' } : p) });
    assert.strictEqual(MR.verdict(BOWL, [], yog, 'de').food.verdict, 'SELTEN', 'a SELTEN the rulebook does not explain');
});

test('a genuinely sugary meal is still not insulin-friendly, with no energy line', () => {
    const v = MR.verdict(SWEET, [], null, 'de');
    assert.strictEqual(v.level, 'high');
    const h = MR.headline(v, 'de');
    assert.strictEqual(h.ans, 'Nicht insulinfreundlich');
    assert.strictEqual(h.energy, '');
    /* nuts do not rescue it either */
    const both = SWEET.concat([BOWL[2]]);
    assert.strictEqual(MR.headline(MR.verdict(both, [], null, 'de'), 'de').ans, 'Nicht insulinfreundlich');
    /* honey-coated nuts are judged by the honey, not by a portion note */
    assert.strictEqual(K.rateMeal([{ name: 'Honig-Mandeln', grams: 40 }, { name: 'Magerquark', grams: 250 }], { level: 'low' }).verdict, 'NEIN');
});

test('fruit in a meal: a small portion with a low estimate meets SELTEN, more does not', () => {
    const meal = (fruit, level) => K.rateMeal([{ name: 'Magerquark', grams: 250 }, fruit], { level, score: level === 'low' ? 8 : 30 }).verdict;
    assert.strictEqual(meal({ name: 'Kiwi', portion: '3 Scheiben', count: 3 }, 'low'), 'JA');
    assert.strictEqual(meal({ name: 'Apfel', portion: '1 Stück' }, 'low'), 'JA');
    assert.strictEqual(meal({ name: 'Äpfel', portion: '2 Stück', count: 2 }, 'low'), 'SELTEN', 'two pieces');
    assert.strictEqual(meal({ name: 'Kiwi', portion: '1 Stück' }, 'mid'), 'SELTEN', 'the whole meal is not low');
    assert.strictEqual(K.rateMeal([{ name: 'Kiwi', portion: '1 Stück' }], { level: 'low' }).verdict, 'SELTEN', 'fruit alone is not a meal');
    assert.strictEqual(meal({ name: 'Banane', portion: '1 Stück' }, 'low'), 'NEIN', 'banana stays NEIN');
    assert.strictEqual(meal({ name: 'Weintrauben', portion: '1 Handvoll' }, 'low'), 'NEIN', 'grapes stay NEIN');
    /* the fruit keeps its own SELTEN; only the meal reads it as met */
    const r = K.rateMeal([{ name: 'Magerquark', grams: 250 }, { name: 'Kiwi', portion: '1 Stück' }], { level: 'low' });
    assert.strictEqual(r.dishes[1].verdict, 'SELTEN');
    assert.strictEqual(r.dishes[1].mealVerdict, 'JA');
});

test('shared rulebook: big nut and cheese portions are energy notes on every path, never the verdict', () => {
    const rule = id => P.POLICY.rules.find(r => r.id === id);
    for (const id of ['policy.nuts_large', 'policy.cheese_large']) {
        assert.strictEqual(rule(id).verdict, 'NOTE'); assert.strictEqual(rule(id).stage, 'energy');
    }
    assert.deepStrictEqual(P.rateName('Mandeln', 42), { verdict: 'JA', rules: ['ja.nuts_moderate', 'policy.nuts_large'], cats: P.rateName('Mandeln', 42).cats, notes: ['policy.nuts_large'] });
    assert.deepStrictEqual(P.rateName('Mandeln', 25).notes, []);
    /* the policy JSON file and the copy in the code are the same */
    const file = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'food-policy', 'lowispike-policy.v1.json'), 'utf8'));
    assert.deepStrictEqual(file.rules.find(r => r.id === 'policy.nuts_large'), rule('policy.nuts_large'));
});

test('photo model per-food verdicts ride along as parts, cleaned', () => {
    const raw = { lowispike: { v: 1, verdict: 'SELTEN', score: 15, spike: 'low', counted: [], confidence: 'medium' },
        dishes: [{ name: 'Mandeln', verdict: 'SELTEN' }, { name: ' Kiwi ', verdict: 'selten' }] };
    const fp = FP.normalize(raw);
    if (fp && fp.verdictBlock) assert.deepStrictEqual(fp.verdictBlock.parts, [{ name: 'Mandeln', verdict: 'SELTEN' }, { name: 'Kiwi', verdict: 'SELTEN' }]);
    const b = K.parse(Object.assign({}, raw.lowispike, { parts: [{ name: 'Mandeln', verdict: 'SELTEN' }, { name: 'Kiwi', verdict: 'selten' }] }));
    assert.deepStrictEqual(b.parts, [{ name: 'Mandeln', verdict: 'SELTEN' }, { name: 'Kiwi', verdict: 'SELTEN' }]);
    assert.strictEqual(K.parse(Object.assign({}, raw.lowispike, { parts: [{ name: 'Mandeln', verdict: 'MAYBE' }] })).parts, undefined, 'one bad part drops them all');
});

test('meal detail (chat room and diary): same verdict, net-carb sum and energy line', () => {
    const total = { kcal: 426, protein: 26, carbs: 27, sugar: 17, fiber: 13, fat: 23 };
    const d = MD.fromLog({ ai: { name: 'Joghurt-Bowl', items: BOWL.map(x => ({ name: x.name, portion: x.portion, grams: x.grams, kcal: x.kcal })), total } }, 'low');
    assert.strictEqual(d.verdict, 'JA');
    assert.match(MD.whyText(d, 'de'), /\(27 g KH − 13 g Ballaststoffe\)/);
    assert.deepStrictEqual(d.energy, { rule: 'policy.nuts_large', name: 'Mandeln', portion: '35 Stück' });
    assert.match(MD.energyText(d, 'de'), /^Energie, nicht Blutzucker: Mandeln \(35 Stück\)/);
    assert.match(MD.sheetHTML(d, { l: 'de' }), /md-energy/);
    assert.strictEqual(MD.clean({ name: 'x', energy: { rule: 'ja.nuts_moderate', name: 'Mandeln' } }).energy, undefined, 'only energy rules pass the gate');
});

test('the big answer keeps whole words and gets the full card width (iPhone "insulinfreu-ndlich")', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'scan-screens.css'), 'utf8');
    assert.match(css, /\.mr-ans \{ overflow-wrap: normal; word-break: normal; -webkit-hyphens: manual; hyphens: manual;/);
    assert.match(css, /\.mr-vt \{ display: contents; \}/);
    assert.match(css, /\.mr-verdict \{ display: grid;[^}]*container-type: inline-size;/);
    assert.match(css, /\.mr-energy \{/);
});
