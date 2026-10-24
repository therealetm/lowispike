'use strict';
/* Oct 24, 2026 button sweep (14:20): on Move in German and Spanish the session cards still showed English (Seated Strength, Walk
   Anywhere, Walk and Lift, In-Bed Training and its line "Lying down. Gentle legs, hips and arms."), the hero tag of four of the five
   formats had no translation, and screen readers heard English on Move's controls (Back, Minutes, Equipment, Safety, Learn while
   you move, the sheet and milestone Close). Fails on the old code. Browser check: tools/sweep-buttons-textprobe.cjs --lang es --tab move. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const has = s => html.includes('["' + s.replace(/"/g, '\\"') + '", "');

test('every Move format name, line and tag has a de/es row (Desk Spike Breaker stays its own name)', () => {
  const m = html.match(/const FORMATS = (\{[\s\S]*?\n\});/); assert.ok(m, 'FORMATS not found');
  const F = Function('return ' + m[1])();
  const missing = [];
  for (const k of Object.keys(F)) for (const f of ['n', 'nNo', 'sub', 'subNo', 'tag']) {
    const s = F[k][f]; if (!s || s === 'Desk Spike Breaker') continue; if (!has(s)) missing.push(k + '.' + f + ': ' + s);
  }
  assert.deepEqual(missing, []);
});

test('Move controls build their aria-label in the user\'s language', () => {
  for (const lit of ['data-mv="close" aria-label="Back"', 'role="group" aria-label="Minutes"', 'role="group" aria-label="Equipment"',
    'data-g2="safe" aria-label="Safety"', 'aria-label="Learn while you move"', 'data-mv="ms-close" aria-label="Close"',
    'function sheet(title, body, foot){ const h = H(); if (!h) return; h.openSheet(\'<button class="xbtn" data-act="close-sheet" aria-label="Close"']) {
    assert.ok(!html.includes(lit), 'still English: ' + lit);
  }
  for (const lab of ['Back', 'Minutes', 'Equipment', 'Safety', 'Learn while you move', 'Close']) {
    assert.ok(html.includes('aria-label="\' + (window.LowiLang ? LowiLang.t("' + lab + '")'), lab + ' does not go through LowiLang');
    assert.ok(has(lab), 'no de/es row for ' + lab);
  }
});
