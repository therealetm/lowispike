'use strict';
/* Oct 24, 2026 button sweep (15:20): in German and Spanish, screen readers heard English on Cook and Shop: the shuffle machine
   ("Shuffle a food"), the Swipe foods deck (section, Never again / Not today / Undo / Cook soon / Cook today, and each card's
   "Up: cook today, right: cook soon ..." hint), the All recipes section, the shelf Back buttons, and the Close buttons of the
   shopping list, Shop it and the store sheet. The words were on screen in the user's language, only the labels stayed English.
   Fails on the old code. Browser check: tools/sweep-buttons-textprobe.cjs --lang es --tab shelf. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const has = s => html.includes('["' + s + '", "');
const viaLang = s => html.includes('aria-label="\' + (window.LowiLang ? LowiLang.t("' + s + '")');

test('Cook and Shop controls no longer carry English-only aria-labels', () => {
  for (const lit of ['data-r5="shuffle" role="button" aria-label="Shuffle a food"', 'id="r3kSwipe" aria-label="Swipe foods"',
    'data-r5="swipe-undo" data-sfx="none" aria-label="Undo"', 'aria-label="\' + D.lab + \'"', 'id="r3kAll" aria-label="All recipes"',
    'data-t="regal" aria-label="Back"', 'data-t="kochen" aria-label="Back"', 'data-td="shopclose" aria-label="Close"',
    'data-lc="close" aria-label="Close"', 'data-lc="rs-close" aria-label="Close"', '.n + ". Up: cook today']) {
    assert.ok(!html.includes(lit), 'still English: ' + lit);
  }
});

test('each of those labels goes through LowiLang and has a German and Spanish row', () => {
  for (const s of ['Shuffle a food', 'Swipe foods', 'Undo', 'All recipes', 'Back', 'Close']) {
    assert.ok(viaLang(s), s + ' does not go through LowiLang'); assert.ok(has(s), 'no de/es row for ' + s);
  }
  assert.ok(html.includes('LowiLang.t(D.lab)'), 'swipe buttons label in English');
  for (const s of ['Cook today', 'Cook soon', 'Not today', 'Never again']) assert.ok(has(s), 'no de/es row for ' + s);
  const hint = 'Up: cook today, right: cook soon, left: not today, down: never';
  assert.ok(html.includes('LowiLang.t("' + hint + '")'), 'card hint stays English'); assert.ok(has(hint), 'no de/es row for the card hint');
});

test('the new rows really translate (de and es)', () => {
  const row = s => { const i = html.indexOf('["' + s + '", "'); const e = html.indexOf(']', i); return JSON.parse(html.slice(i, e + 1)); };
  assert.deepEqual(row('Shuffle a food').slice(1), ['Ein Essen mischen', 'Mezclar una comida']);
  const h = row('Up: cook today, right: cook soon, left: not today, down: never');
  assert.match(h[1], /^Hoch: heute kochen/); assert.match(h[2], /^Arriba: cocinar hoy/);
});
