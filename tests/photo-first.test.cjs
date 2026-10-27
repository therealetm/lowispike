/* Oct 27, 2026: photo-first Log meal. Emmanuel: "remove the barcode scanner because there's no point of having it there. This is
   really just for someone who's about to eat... They take a picture of their food. The AI can analyze what they ate. And just
   to be a little bit generous... just give them 10. If they run out, they run out. Make the picture one very clear, and very
   easy to open and to access. Don't make it confusing." */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SP = read('spirit.js');
const quick = (() => { const a = SP.indexOf('        if (quick) {\n            const back = lmToday;'); assert.ok(a > 0); return SP.slice(a, SP.indexOf('            return;\n        }', a)); })();
const fnBody = (src, sig) => { const i = src.indexOf(sig); assert.ok(i >= 0, sig); const j = src.indexOf('{', i); let d = 0; for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(j, k + 1); } throw new Error('unclosed ' + sig); };

test('meal sheet: no Barcode anywhere, the photo is one big button on top, typing and the mic under it', () => {
    assert.doesNotMatch(quick, /data-sp="scan"|tr\('barcode'\)|lm-chip/, 'no Barcode chip, no small chips on the meal sheet');
    assert.match(quick, /'<div class="lm-kind"[\s\S]*lmSnapHTML\(\) \+ form \+ usual/, 'Meal | Snack, then the photo, then the field');
    const snap = fnBody(SP, 'function lmSnapHTML()');
    assert.match(snap, /<button type="button" class="lm-snap/, 'a real button (tappable, read by VoiceOver)');
    assert.match(snap, /icon\('camera'\)/);
    assert.match(snap, /tr\('lmSnapT'\)/);
    assert.match(snap, /wnm\(tr\('lmSnapS'\)\)/, 'the line under it uses the companion\'s own name');
    assert.match(SP, /lmSnapT: \['Take a photo of your food', 'Foto von deinem Essen', 'Haz una foto de tu comida'\]/);
    assert.match(SP, /lmOrType: \['Or type what you ate', 'Oder schreib, was du isst', 'O escribe lo que comes'\]/);
    const css = read('meal-sheet.css');
    assert.match(css, /\.lm \.lm-snap \{[^}]*min-height: 92px/, 'big and easy to hit');
});

test('food camera: no Barcode switch; the store scanner itself is untouched', () => {
    const photo = fnBody(SP, 'async function photo()');
    assert.doesNotMatch(photo, /data-sp="toBarcode"/);
    assert.match(photo, /data-sp="shutter"/);
    assert.match(photo, /data-sp="meal"/, 'Type it stays as the way out');
    assert.match(SP, /a === 'toBarcode'|toBarcode/, 'the handler stays for the scanner screens that still use it');
});

test('no photos left: the button calmly says so and a tap goes to typing', () => {
    const snap = fnBody(SP, 'function lmSnapHTML()');
    assert.match(snap, /st\.none \? 'snapNone' : 'photo'/);
    assert.match(snap, /st\.none \? tr\('lmSnapNone'\)/);
    assert.match(SP, /lmSnapNone: \['No photos left today\. Just type it below\.', 'Heute keine Fotos mehr\. Schreib es einfach unten\.', 'Hoy no quedan fotos\. Escr\u00edbelo abajo\.'\]/);
    assert.match(SP, /else if \(a === 'snapNone'\) \{ const f = D\.getElementById\('lmTitle'\); if \(f\) f\.focus\(\); \}/);
    assert.match(SP, /function lmSnapState\(\)[^\n]*q\.left === 0/, 'only a real 0 from the server turns it off');
});

test('10 photo checks a day, in the app and on the server', () => {
    const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; };
    global.localStorage = global.localStorage || mem(); global.sessionStorage = global.sessionStorage || mem();
    delete require.cache[require.resolve('../meal-photo.js')];
    const M = require('../meal-photo.js');
    assert.strictEqual(M.DAY_MAX, 10);
    assert.strictEqual(M.SOON, 3);
    for (let n = 10; n >= 0; n--) { M.setLeft(n, 10); assert.strictEqual(M.leftSoon('de') !== '', n <= 3, n + ' left'); }
    const ts = read('supabase/functions/food-photo/index.ts');
    assert.match(ts, /\bDAY_MAX = 10\b/, 'the server counts 10 a day');
    assert.doesNotMatch(ts, /DAY_MAX = 3,/);
    const A = read('food-photo-ai.js');
    assert.doesNotMatch(A, /\b3 photo checks|deine 3 Foto|tus 3 an/, 'no old "3" in the limit messages');
});

test('the server keeps the live translate mode and asks for portions in the user\'s language', () => {
    const ts = read('supabase/functions/food-photo/index.ts');
    assert.match(ts, /translate/, 'translate mode (used by chat food cards and Wie immer names) is kept');
    assert.match(ts, /German|Deutsch|de:/, 'portion words in German');
    assert.match(ts, /Spanish|Espa\u00f1ol|es:/, 'and Spanish');
});
