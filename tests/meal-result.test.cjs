'use strict';
/* Photo scanner result (meal-result.js, Oct 21 2026): spike verdict first, per-food fixes, drinks, XP from the app's rule.
   The edit -> recalculation -> verdict/XP chain is tested on the real numbers from Emmanuel's screenshots
   ("Garlic cloves" that were really Bel Paese cheese). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../meal-result.js');
const DB = require('../meal-db-core.js');
DB.load(require('../data/meals/fndds.json'));
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const MEAT = { name: 'Cooked meat pieces', portion: '~150 g', grams: 150, kcal: 350, protein: 38, carbs: 0, sugar: 0, fiber: 0, fat: 21 };
const PEPPERS = { name: 'Red bell peppers', portion: '2 halves', grams: 160, kcal: 50, protein: 1.6, carbs: 9.6, sugar: 6.4, fiber: 3.4, fat: 0.5 };
const GARLIC = { name: 'Garlic cloves', portion: '3 cloves', grams: 15, kcal: 22, protein: 1, carbs: 5, sugar: 0.2, fiber: 0.3, fat: 0.1 };
const PLATE = () => [MEAT, PEPPERS, GARLIC].map(R.clean);

// Stand-in for index.html LowiVitalsBridge: same rules (15 XP; 0 for spike, duplicate or cap; eat quest 30 unless spike/dup)
function bridge(o) {
    o = o || {};
    const logged = new Set(o.logged || []);
    const b = {
        MEAL_CAP: 8,
        mealWhy(d) { if (logged.has(d.t)) return 'dup'; if (d.lvl === 'high') return 'spike'; if ((o.meals || 0) >= 8) return 'cap'; return ''; },
        mealXp(d) { return b.mealWhy(d) ? 0 : 15; },
        mealQuestXp(d) { const w = b.mealWhy(d); return w === 'dup' || w === 'spike' || o.questDone ? 0 : 30; }
    };
    return b;
}

test('parseAmount reads counts, grams, volumes and units without eating brand names', () => {
    assert.deepEqual(R.parseAmount('2 babybel'), { count: 2, grams: 0, ml: 0, unit: '', rest: 'babybel' });
    assert.equal(R.parseAmount('150 g beef').grams, 150);
    assert.equal(R.parseAmount('0,5 l Bier').ml, 500);
    assert.equal(R.parseAmount('500ml cola').ml, 500);
    assert.equal(R.parseAmount('3x egg').count, 3);
    assert.equal(R.parseAmount('7up').rest, '7up');
    assert.equal(R.parseAmount('7up').count, 0);
    assert.equal(R.parseAmount('2 lemons').ml, 0);
    assert.equal(R.parseAmount('a glass of wine').count, 1);
    assert.equal(R.parseAmount('a glass of wine').rest, 'wine');
    assert.equal(R.parseAmount('2 slices white bread').rest, 'white bread');
});

test('fixing "Garlic cloves" to Bel Paese x3 re-estimates that card on the device', () => {
    const fixed = R.estimateItem('Bel Paese', '3', GARLIC, DB, 'en');
    assert.equal(fixed.name, 'Bel Paese');
    assert.equal(fixed.src, 'table');
    assert.equal(fixed.count, 3);
    assert.equal(fixed.grams, 75);
    assert.equal(fixed.kcal, 263);
    assert.ok(fixed.protein > 16 && fixed.fat > 20, 'cheese, not garlic');
    assert.match(fixed.portion, /^3 pcs · ~75 g$/);
    // no count typed: the photo's "3 cloves" still means 3 pieces of the new food
    assert.equal(R.estimateItem('belpaese', '', GARLIC, DB, 'en').grams, 75);
    assert.equal(R.estimateItem('2 Babybel', '', GARLIC, DB, 'en').grams, 40);
    // a weight on the photo card stays the plate's amount when nothing else is typed
    const pork = R.estimateItem('pork', '', MEAT, DB, 'en');
    assert.equal(pork.src, 'db');
    assert.equal(pork.grams, 150);
    // "bel paese cheese" style names fall back to the word the meal DB knows
    assert.notEqual(R.estimateItem('mild italian cheese', '', GARLIC, DB, 'en').src, 'kept');
});

test('an unknown food keeps the photo amounts and says so instead of inventing 500 kcal', () => {
    const k = R.estimateItem('Qwzxv', '', GARLIC, DB, 'en');
    assert.equal(k.src, 'kept');
    assert.equal(k.name, 'Qwzxv');
    assert.equal(k.kcal, 22);
    assert.equal(k.carbs, 5);
    assert.match(R.STR.en.kept, /kept the photo/);
});

test('drinks: table first, sizes, diet versions and languages', () => {
    const cola = R.estimateDrink('cola', '', DB, 'en');
    assert.equal(cola.grams, 330);
    assert.ok(cola.sugar > 34 && cola.sugar < 36);
    assert.equal(R.estimateDrink('coke zero', '', DB, 'en').sugar, 0);
    assert.equal(R.estimateDrink('0,5 l Bier', '', DB, 'de').grams, 500);
    assert.equal(R.estimateDrink('Wasser', '', DB, 'de').kcal, 0);
    assert.equal(R.estimateDrink('Café', '', DB, 'es').kcal, 2);
    assert.equal(R.estimateDrink('2 coffee', '', DB, 'en').grams, 400);
    assert.equal(R.estimateDrink('', '', DB, 'en'), null);
    for (const l of ['en', 'de', 'es']) for (const c of R.STR[l].chips) assert.ok(R.lookup(c, true), l + ' chip ' + c + ' is a known drink');
});

test('one verdict: the shared meal card estimate, plus sugary drinks', () => {
    const MS = require('../meal-photo.js');
    const plate = PLATE();
    const v = R.verdict(plate, []);
    assert.equal(v.level, 'low');
    assert.equal(v.lvl, 'low');
    assert.equal(v.spike, false);
    assert.equal(v.level, MS.bloodSugar(R.totals(plate), plate).level, 'same answer as the Community meal card');
    const withCola = R.verdict(plate, [R.estimateDrink('cola', '', DB, 'en')]);
    assert.equal(withCola.level, 'high');
    assert.equal(withCola.lvl, 'high');
    assert.equal(withCola.drink, true);
    assert.equal(R.verdict(plate, [R.estimateDrink('water', '', DB, 'en')]).level, 'low');
    // brand-name sugary drinks count as drinks for the shared card too
    assert.equal(MS.bloodSugar({ kcal: 140, carbs: 35, sugar: 35, fiber: 0, protein: 0, fat: 0 }, [{ name: 'Coke' }]).level, 'high');
});

test('edit -> recalculation -> verdict and XP update together', () => {
    const b = bridge();
    const items = PLATE();
    let fv = R.formValues(items, [], 'en');
    let x = R.xpFor(fv.verdict, fv.title, b);
    assert.equal(fv.lvl, 'low');
    assert.equal(fv.title, 'Cooked meat pieces, Red bell peppers and Garlic cloves');
    assert.equal(fv.macros.kcal, 422);
    assert.deepEqual([x.xp, x.base, x.quest, x.why], [45, 15, 30, '']);

    items[2] = R.clean(R.estimateItem('Bel Paese', '3', items[2], DB, 'en'));
    fv = R.formValues(items, [], 'en');
    x = R.xpFor(fv.verdict, fv.title, b);
    assert.equal(fv.title, 'Cooked meat pieces, Red bell peppers and Bel Paese');
    assert.equal(fv.macros.kcal, 663);
    assert.equal(fv.lvl, 'low');
    assert.equal(x.xp, 45);

    // the same card fixed to something starchy flips the verdict and the XP
    const bread = items.slice();
    bread[2] = R.clean(R.estimateItem('200 g white rice', '', items[2], DB, 'en'));
    const fb = R.formValues(bread, [], 'en');
    assert.equal(fb.verdict.level, 'high');
    assert.equal(fb.lvl, 'high');
    const xb = R.xpFor(fb.verdict, fb.title, b);
    assert.deepEqual([xb.xp, xb.why], [0, 'spike']);
    assert.match(R.xpText(xb, 'en').small, /never cost points/);

    // adding a cola to the cheese plate does the same
    const fc = R.formValues(items, [R.clean(R.estimateDrink('cola', '', DB, 'en'))], 'en');
    assert.equal(fc.title, 'Cooked meat pieces, Red bell peppers, Bel Paese and Cola');
    assert.equal(fc.lvl, 'high');
    assert.equal(R.xpFor(fc.verdict, fc.title, b).xp, 0);
    assert.ok(fc.macros.sugar > 40);
});

test('XP preview follows the app rules: duplicate, cap, quest already done, no bridge', () => {
    const v = R.verdict(PLATE(), []);
    const t = 'Cooked meat pieces, Red bell peppers and Garlic cloves';
    assert.deepEqual(R.xpFor(v, t, bridge({ logged: [t] })).xp, 0);
    assert.equal(R.xpFor(v, t, bridge({ questDone: true })).xp, 15);
    const cap = R.xpFor(v, t, bridge({ meals: 8 }));
    assert.deepEqual([cap.xp, cap.base, cap.quest, cap.why], [30, 0, 30, 'cap']);
    assert.equal(R.xpText(cap, 'en').big, '+30 XP');
    assert.equal(R.xpFor(v, t, null).xp, 15);
    assert.equal(R.xpText({ xp: 45, base: 15, quest: 30, why: '' }, 'de').small, '15 für die Mahlzeit + 30 für die heutige Ess-Quest');
    for (const l of ['de', 'es']) for (const k of Object.keys(R.STR.en)) assert.ok(k in R.STR[l], l + ' has ' + k);
});

test('wiring: photo result mounts it, the log keeps its verdict, edits never send the photo again', () => {
    const fai = read('food-photo-ai.js'), sp = read('spirit.js'), html = read('index.html'), sw = read('sw.js'), mr = read('meal-result.js');
    assert.match(fai, /root\.LowiMealResult/);
    assert.match(fai, /MR\.mount\(box, form, \{ dishes/);
    assert.match(sp, /LowiFoodAI\.mount\(aiForm\.previousElementSibling, aiForm, photoURL, \{ db: MDB, dbReady: mealDb(, file: photoFile)? \}\)/); // Oct 22: + the original photo for the 1024 px copy
    assert.match(sp, /if \(\/\^\(low\|medium\|high\)\$\/\.test\(lvl\)\) seed\.lvl = lvl;/);
    assert.match(html, /<script src="meal-result\.js\?v=/);
    assert.match(sw, /"meal-result\.js"/);
    assert.match(html, /mealQuestXp\(data\)\{if\(!data\|\|this\.mealDup\(data\)\|\|this\.spiky\(data\)\)return 0;/);
    assert.match(html, /if \(!spike\) questDone\("eat"\)/, 'the eat quest rule the preview mirrors');
    assert.doesNotMatch(mr, /fetch\(|XMLHttpRequest|\.analyse\(|LowiFoodAI/, 'fixing a food or adding a drink must not use a photo check');
});

test('one meal path kept: the result screen repeats the live fast line, never its own fast math', () => {
    const mr = read('meal-result.js'), css = read('scan-screens.css');
    assert.match(mr, /window\.LowiFastStop\.mealNote\(\)/, 'uses the same note Log meal shows');
    assert.match(mr, /fastLine\(\) \+/, 'the fast line sits in the result footer');
    assert.doesNotMatch(mr, /mealLogged\(|LowiFastStop\.end\(|points\(/, 'ending the fast stays in index.html mealLogged, so nothing pays twice');
    assert.match(css, /\.mr \.sp-fast-note\.mr-fast/);
});
