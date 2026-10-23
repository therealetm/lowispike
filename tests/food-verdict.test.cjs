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
const PEANUTS = { name: 'Gesalzene Erdnüsse', facts: { c: 10, s: 4, f: 8, p: 25, fat: 50 }, ingredients: 'Erdnüsse, Salz' };
const YOG = { name: 'Naturjoghurt', cat: 'dairy', facts: { c: 4, s: 4, p: 4, fat: 3.5 }, ingredients: 'Milch, Joghurtkulturen' };
const BEER = { name: 'Bier', cat: 'drink', facts: { c: 3, s: 0 }, ingredients: 'Wasser, Gerstenmalz, Hopfen, Alkohol' };
const rate = p => S.assess(p);

test('foodVerdict follows the Food check card: NEIN -> spike, SELTEN -> at least better, JA keeps the estimate', () => {
    assert.equal(S.assess(ULTJE).verdict, 'better', 'blood sugar estimate alone');
    assert.equal(S.foodVerdict(ULTJE), 'spike', 'Ultje: card says NO');
    assert.equal(S.assess(HAM).verdict, 'ok');
    assert.equal(S.foodVerdict(HAM), 'spike', 'pork: card says NO');
    assert.equal(S.foodVerdict(BEER), 'spike', 'alcohol: card says NO');
    assert.equal(S.foodVerdict(PEANUTS), 'better', 'nuts: card says RARELY');
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
    assert.equal(SS.verdictOf(PEANUTS, rate), 'better');
    assert.equal(SS.verdictOf(YOG, rate), 'ok');
    const out = SS.split([ULTJE, HAM, PEANUTS, YOG, BEER], { rate });
    assert.deepEqual(out.keep.map(i => i.product.name).sort(), ['Gesalzene Erdnüsse', 'Naturjoghurt']);
    assert.deepEqual(out.toss.map(i => i.product.name).sort(), ['Bier', 'Schinken gekocht', 'Ültje Süß & Salzig']);
});

test('scan-sort: a manual entry or a rate() without the engine keeps its own rating', () => {
    assert.equal(SS.verdictOf({ ...HAM, manual: true }, () => ({ verdict: 'ok', engine: {} })), 'ok');
    assert.equal(SS.verdictOf(HAM, () => ({ verdict: 'ok' })), 'ok');
});
