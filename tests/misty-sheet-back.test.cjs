'use strict';
/* Misty sheet plan, phase 1 (Nov 5 2026): every child screen of Misty's card goes BACK to the card, the card alone closes.
   Browser check: tools/misty-sheet/p1-nav.cjs (Look, evolution card, Growth, Aura shop; en/de/es, Chromium + WebKit). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Look panel over the card: its button is a named back and goes back through R2 (never out of both)', () => {
  const s = R('companion.js');
  assert.match(s, /cf-x cf-x-back[^\n]*data-bx-label=/);
  assert.match(s, /L\('Back to ' \+ hubNm, 'Zurück zu ' \+ hubNm, 'Volver a ' \+ hubNm\)/);
  assert.match(s, /if \(a === 'close'\) dismiss\(\);/);
  assert.match(s, /if \(e\.target === V\.ov\) \{ dismiss\(\); return; \}/);
});

test('evolution card: "‹ Look" back, not a close', () => {
  const s = R('evo-card.js');
  assert.match(s, /class="evc-x evc-back" data-evc="close" data-bx-label=/);
  assert.match(s, /L\('Back to Look', 'Zurück zu Aussehen', 'Volver a Aspecto'\)/);
  assert.doesNotMatch(s, /class="evc-x" data-evc="close" aria-label="' \+ esc\(L\('Close'/);
});

test('bottom button names where Back goes (data-bx-label), only for a back', () => {
  const s = R('bottom-close.js');
  assert.match(s, /k === 'back' \? String\(top\.getAttribute\('data-bx-label'\)/);
  assert.match(s, /lw-bx-lab/);
  assert.match(R('bottom-close.css'), /\.lw-bx\.lw-bx-named\{/);
});

test('Growth and Aura shop inside the card fold back with "‹ Misty", kept out of the bottom button', () => {
  const s = R('misty-hub.js');
  assert.match(s, /class="mh-sback" data-mh="sback" data-no-bx/);
  assert.match(s, /k === 'sback'/);
});

test('no body claim in the drifting line', () => {
  const s = R('cell-world.js');
  assert.doesNotMatch(s, /Drifting through your bloodstream/);
  assert.match(s, /act_drift: \['Drifting along with you', 'Treibt mit dir mit', 'Flota contigo'\]/);
});
