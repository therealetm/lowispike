/* Oct 27, 2026: the calm Log meal sheet. Emmanuel: "It's very confusing and overwhelming whilst opening. There's just too much
   redundancy there ... Remember our focus is minimalism, efficiency, convenience ... They are seeing this for the first time."
   One field (type, mic, Foto, Barcode), a quiet clock instead of four time chips, own values behind one quiet link, one Save,
   "Wie immer" for one tap, the companion's idea apart, past meals in the app's language. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SP = read('spirit.js');
const K = require(path.join(ROOT, 'spirit-core.js'));
const quick = (() => { const a = SP.indexOf('        if (quick) {\n            const back = lmToday;'); assert.ok(a > 0, 'calm quick path present'); return SP.slice(a, SP.indexOf('            return;\n        }', a)); })();

test('Log meal opens straight into one calm sheet (no Meal-or-snack screen first)', () => {
    assert.ok(!/K\.slotOk\(slot\)\) \{\s*slotPicker\(\);/.test(SP), 'no detour through the slot picker on open');
    assert.match(quick, /class="lm-kind" role="group"/, 'Meal | Snack is a small switch on the sheet');
    assert.match(quick, /data-sp="lmKind"/);
    assert.match(SP, /function slotPicker\(\) \{\s*lmToday = true;\s*mealForm\(/, 'slotPicker only brings you back to the sheet');
});

test('one field: typing, mic, Foto and Barcode together, no second "Manuell" field or three tiles', () => {
    assert.equal((quick.match(/name="title"/g) || []).length, 1, 'exactly one meal text field');
    assert.match(quick, /id="lmTitle"[^>]*data-mic="1"/, 'the mic sits in that field');
    assert.match(quick, /class="lm-chip" data-sp="photo"/);
    assert.match(quick, /class="lm-chip" data-sp="scan"/);
    assert.ok(!/sp-slot-how|slotWrite|tr\('manual'\)|sp-manual/.test(quick), 'no Schreiben / Scannen / Foto tiles, no MANUELL heading');
    const f = quick.indexOf('<form id="spMeal"'), photo = quick.indexOf('data-sp="photo"'), save = quick.indexOf('lm-save');
    assert.ok(f > 0 && photo > f && save > photo, 'Foto / Barcode live inside the one form, before Save');
});

test('time: Now by default, one quiet native clock, no row of chips; future refused; fresh open resets', () => {
    assert.ok(!/data-sp="when" data-m=/.test(quick) && !/whenRow\(/.test(quick), 'no Jetzt / vor 30 Min. / vor 1 Std. chips');
    assert.match(quick, /<input type="time" class="lm-time-in"/);
    assert.match(SP, /function lmTimeChange\(inp\)[\s\S]{0,600}editFuture/, 'a time in the future is refused');
    assert.match(SP, /from: 'when', ateAt: at, at: Date\.now\(\)/, 'the picked time backdates through LowiMealCtx like before');
    assert.match(quick, /if \(!back && window\.LowiMealCtx && window\.LowiMealCtx\.from === 'when'\) window\.LowiMealCtx = null;/);
    assert.match(SP, /function lmAt\(\)[\s\S]{0,200}from === 'gap'/, 'the Gap\'s saved time shows on the clock');
});

test('own values hide behind one quiet link; the fast note is a small line under Save', () => {
    assert.match(quick, /class="lm-own" id="lmOwn" hidden/);
    assert.match(quick, /data-sp="lmOwn" aria-expanded="false" aria-controls="lmOwn"/);
    assert.match(SP, /a === 'lmOwn'/);
    const save = quick.indexOf('lm-save'), note = quick.indexOf('fastNote(at)');
    assert.ok(note > save, 'fast note right under Save');
    const css = read('meal-sheet.css');
    assert.match(css, /\.lm \.sp-fast-note \{[^}]*border: 0 !important;[^}]*background: none !important;[^}]*font-size: 12\.5px/, 'no box, small text');
});

test('"Wie immer" right under Save for one tap; the companion\'s idea is apart and never says Misty itself', () => {
    const u = quick.indexOf('lm-usual'), i = quick.indexOf('lm-idea'), save = quick.indexOf('lm-save');
    assert.ok(save > 0 && u > save && i > u, 'Save, then Wie immer, then the idea');
    assert.match(quick, /form \+ usual \+ idea \+ today/);
    assert.match(SP, /lmUsual: \['Your usual', 'Wie immer', 'Lo de siempre'\]/);
    assert.ok(!/EIN TIPP|ein Tipp/.test(quick), 'no "ein Tipp" next to Wie immer');
    assert.match(quick, /wnm\(tr\('lmIdea'\)\)/, 'the idea title goes through the companion name');
    assert.match(quick, /data-sp="quickMeal"/);
    assert.match(quick, /lmShow\(n\)/, 'past meal names are shown in the app language');
});

test('today\'s stats are a quiet line at the bottom of the sheet', () => {
    const ns = read('nutri-stats.js');
    assert.match(ns, /querySelector\('\.lm-foot'\)[\s\S]{0,160}ns-quiet/);
    assert.match(quick, /<div class="lm-foot"><\/div><\/div>'/);
});

test('meal-sheet.css is linked and cached', () => {
    assert.match(read('index.html'), /<link rel="stylesheet" id="lmCss" href="meal-sheet\.css\?v=/);
    assert.match(read('sw.js'), /STATIC\.push\("meal-sheet\.css"\)/);
    const css = read('meal-sheet.css');
    assert.match(css, /\.lm \.lm-chip \{[^}]*min-height: 44px/, '44 pt targets');
    assert.match(css, /@media \(max-width: 359px\)/, 'small iPhone');
});

test('past meal names in the app language, only when every word is known', () => {
    assert.equal(K.mealName('Lettuce wraps with ground beef', 'de'), 'Salat-Wraps mit Rinderhack');
    assert.equal(K.mealName('Lettuce wraps with ground beef', 'es'), 'Wraps de lechuga con carne picada');
    assert.equal(K.mealName('Scrambled eggs with minced meat', 'de'), 'Rührei mit Hackfleisch');
    assert.equal(K.mealName('Greek yogurt with berries', 'de'), 'Griechischer Joghurt mit Beeren');
    assert.equal(K.mealName('Oatmeal with walnuts', 'de'), 'Haferbrei mit Walnüssen');
    assert.equal(K.mealName('Toast with eggs', 'de'), 'Toast mit Eiern');
    assert.equal(K.mealName('Chicken rice bowl', 'de'), 'Hähnchen-Reis-Bowl');
    assert.equal(K.mealName('Chicken rice bowl', 'es'), 'Bowl de pollo y arroz');
    assert.equal(K.mealName('Zucchini Turkey Burger Melt', 'de'), 'Zucchini Turkey Burger Melt', 'an unknown word: left exactly as it was');
    assert.equal(K.mealName('Rührei', 'de'), 'Rührei');
    assert.equal(K.mealName('Lettuce wraps with ground beef', 'en'), 'Lettuce wraps with ground beef');
    assert.equal(K.mealName('', 'de'), '');
    assert.equal(K.mealName(null, 'de'), '');
});
