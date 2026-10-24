'use strict';
/* Oct 24, 2026 button sweep (19:20): in German and Spanish, screen readers still heard English "Close" / "Back" on the
   X and back buttons of several sheets although the sheet itself was translated: the generic r2 sheet X (every r2 sheet),
   the r2 header back, the audiobook sheet, the personality sheets (X + back), the sign-in / keep-your-account sheet,
   the recipe cook-mode Back (p2-ckb) and the n1 sheet. Each label now goes through LowiLang.t. Fails on the old code. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('no X or back button in index.html keeps an English-only aria-label', () => {
  const left = html.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /aria-label="(Close|Back)"/.test(l)).map(([n]) => n);
  assert.deepEqual(left, [], 'English-only Close/Back labels on lines ' + left.join(', '));
});

test('the sheets that had them now build the label in the user\'s language', () => {
  const via = s => 'aria-label="\' + (window.LowiLang ? LowiLang.t("' + s + '") : "' + s + '") + \'"';
  for (const pre of ['<button class="r2-x" data-r2="close" ', '<button class="r2-back" data-r2a="home" ', '<button class="r5-sback" data-r5="pback" ',
    '<button class="r2-btn ghost p2-ckb" data-p2="prev" ']) {
    const w = /back|prev/.test(pre) ? 'Back' : 'Close';
    assert.ok(html.includes(pre + via(w)), 'not via LowiLang: ' + pre);
  }
  const xs = html.split('<button class="xbtn" data-act="close-sheet" ' + via('Close')).length - 1;
  assert.ok(xs >= 6, 'sheet X buttons via LowiLang: ' + xs);
});

test('Close and Back have German and Spanish rows', () => {
  assert.ok(html.includes('["Close", "Schließen", "Cerrar"]'));
  assert.ok(html.includes('["Back", "Zurück", "Atrás"]'));
});
