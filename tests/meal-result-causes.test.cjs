'use strict';
/* 29 Oct 2026 (Emmanuel, photo check): "says insulin spike but doesn't say why or which food, and when I tap X on what it
   guessed wrong, nothing updates". The result names the foods that tip the verdict with the rulebook reason, and a removed
   or fixed food recomputes verdict, carbs and reason locally (the photo model's whole-meal verdict stops applying). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const MR = require('../meal-result.js');
globalThis.LowiMealSnap = require('../meal-photo.js');
const P = require('../food-policy-core.js');

const salad = { name: 'Gemischter Salat mit Avocado und Ei', portion: '1 Teller', grams: 300, kcal: 280, protein: 9, carbs: 6, sugar: 2, fiber: 5, fat: 24 };
const egg = { name: 'Gekochtes Ei', portion: '1 Ei', grams: 50, kcal: 80, protein: 7, carbs: 1, sugar: 0, fiber: 0, fat: 5 };
const avo = { name: 'Avocado', portion: '1/2', grams: 100, kcal: 130, protein: 2, carbs: 9, sugar: 1, fiber: 7, fat: 13 };
const bread = { name: 'Vollkornbrot', portion: '2 Scheiben', grams: 100, kcal: 220, protein: 8, carbs: 47, sugar: 3, fiber: 4, fat: 2 };
const plate = [salad, egg, avo, bread];
const sig = its => JSON.stringify(its.map(d => [d.name.trim().toLowerCase(), +d.carbs || 0, +d.fiber || 0, +d.sugar || 0, 1]));
const NEIN = { v: 1, verdict: 'NEIN', light: 'red', score: 60, spike: 'mid', counted: [], confidence: 'medium' };

test('the headline names the food that tips it, with the rulebook reason and its net carbs', () => {
    const v = MR.verdict(plate, [], null, 'de');
    const c = MR.causes(v, plate, [], null, 'de');
    assert.strictEqual(c.length, 1);
    assert.strictEqual(c[0].id, 'f3');
    assert.strictEqual(c[0].name, 'Vollkornbrot');
    assert.match(c[0].why, /viel Stärke/);
    assert.match(c[0].why, /43 g Netto-KH/);
});

test('a stricter photo verdict without its own reason still names the food with the carbs', () => {
    const chick = { name: 'Kichererbsen', portion: '1 Schale', grams: 200, kcal: 300, protein: 15, carbs: 50, sugar: 3, fiber: 10, fat: 5 };
    const its = [salad, egg, chick];
    const v = MR.verdict(its, [], NEIN, 'de');
    assert.strictEqual(v.food.source, 'model');
    const c = MR.causes(v, its, [], NEIN, 'de');
    assert.strictEqual(c[0].name, 'Kichererbsen');
    assert.match(c[0].why, /40 g Netto-KH/);
});

test('an insulin-friendly plate names no culprit', () => {
    const its = [salad, egg, avo];
    const v = MR.verdict(its, [], null, 'de');
    assert.strictEqual(MR.headline(v, 'de').cls, 'low');
    assert.deepStrictEqual(MR.causes(v, its, [], null, 'de'), []);
});

test('removing a food drops the photo model whole-meal verdict and the app recomputes locally', () => {
    const orig = sig(plate);
    assert.strictEqual(MR.liveBlock(NEIN, plate, orig), NEIN);   // untouched plate: the photo verdict still applies
    const rest = [salad, egg, avo];
    const b = MR.liveBlock(NEIN, rest, orig);
    assert.strictEqual(b, null);
    const v = MR.verdict(rest, [], b, 'de');
    assert.strictEqual(MR.headline(v, 'de').cls, 'low');
    assert.strictEqual(v.net, 4);
});

test('after an edit, photo per-food verdicts stay for the foods still there; a NEIN stays, a rulebook-JA SELTEN goes', () => {
    const parts = Object.assign({}, NEIN, { parts: [{ name: salad.name, verdict: 'JA' }, { name: 'Gekochtes Ei', verdict: 'JA' }, { name: 'Avocado', verdict: 'SELTEN' }, { name: 'Vollkornbrot', verdict: 'NEIN' }] });
    const orig = sig(plate);
    const noBread = MR.liveBlock(parts, [salad, egg, avo], orig);
    assert.strictEqual(noBread.verdict, 'JA');
    const noAvo = MR.liveBlock(parts, [salad, egg, bread], orig);
    assert.strictEqual(noAvo.verdict, 'NEIN');
    // a fixed amount counts as an edit too
    const fixed = [salad, egg, avo, Object.assign({}, bread, { carbs: 12 })];
    assert.notStrictEqual(MR.liveBlock(NEIN, fixed, orig), NEIN);
});

test('a part of a combined dish listed again gets a counted-twice hint', () => {
    assert.strictEqual(MR.dupOf(plate, 1), salad.name);
    assert.strictEqual(MR.dupOf(plate, 2), salad.name);
    assert.strictEqual(MR.dupOf(plate, 0), '');
    assert.strictEqual(MR.dupOf(plate, 3), '');
});

test('eggs in every form and croutons are known to the rulebook', () => {
    for (const n of ['Ei', 'Gekochtes Ei', 'Spiegelei', 'Rührei', '2 Eier']) assert.strictEqual(P.rateName(n).verdict, 'JA', n);
    assert.strictEqual(P.rateName('Eis').verdict, 'NEIN');
    assert.strictEqual(P.rateName('Croutons').verdict, 'NEIN');
});

test('the screen shows the cause under the headline and marks the card; X recomputes', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'meal-result.js'), 'utf8');
    assert.match(src, /class="mr-cause"/);
    assert.match(src, /mr-bad/);
    assert.match(src, /values: \(\) => formValues\(st\.items, st\.drinks, l, block\(\)\)/);
    assert.doesNotMatch(src, /formValues\(st\.items, st\.drinks, l, opts\.verdictBlock\)/);
    const css = fs.readFileSync(path.join(__dirname, '..', 'scan-screens.css'), 'utf8');
    assert.match(css, /\.mr-cause \{/);
    assert.match(css, /\.mr-flag \{/);
});

test('fixing a wrong guess into a common German food gets that food\'s values, not the old ones', () => {
    const D = require('../meal-db-core.js');
    D.load(require('../data/meals/fndds.json'));
    for (const [n, want] of [['Gurke', /Cucumber/], ['Brokkoli', /Broccoli/], ['Paprika', /pepper/i], ['Erdbeeren', /^Strawberries/], ['Hähnchenbrust', /Chicken breast/], ['Vollkornbrot', /Whole wheat bread/], ['Süßkartoffel', /Sweet potato/]]) {
        const r = D.parse(n);
        assert.notStrictEqual(r.how, 'rough', n);
        assert.match(r.name, want, n);
    }
});
