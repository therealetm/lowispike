'use strict';
/* 27 Oct 2026, Emmanuel: "überall nur Insulinfreundlich grün / Nicht insulinfreundlich rot, keine widersprüchlichen Spike-Stufen
   oder Farben". The scanner card's Why? lines name the verdict word too, so they say the same two words as the card, never the
   old Lower / Moderate / Higher levels. */
const test = require('node:test');
const assert = require('node:assert');
const C = require('../shop-scan-core.js');

const OLD = /\b(Lower|Moderate|Higher|Niedriger|Mittel|Höher|Bajo|Moderado|Alto)\b/;

test('Why? meaning lines use only the insulin label words, in all three languages', () => {
  for (const k of ['m_none', 'm_mild', 'm_mildP', 'm_spike']) {
    for (let li = 0; li < 3; li++) {
      const s = C.tx(k, li);
      assert.ok(!OLD.test(s), k + ' [' + li + '] still names an old spike level: ' + s);
      const word = k === 'm_none' ? C.tx('v_none', li) : C.tx('v_spike', li);
      assert.ok(s.toLowerCase().includes(word.toLowerCase()), k + ' [' + li + '] should name "' + word + '": ' + s);
    }
  }
});

test('Shop finds tag paints the old middle level red (no), never the cyan ok tag', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'grocery-hunt.js'), 'utf8');
  assert.match(src, /const cls = \{ none: 'best', mild: 'no', spike: 'no' \}\[h\.lvl\]/);
});

test('the mild level reads the same as the spike level on the card (red, not insulin-friendly)', () => {
  for (let li = 0; li < 3; li++) assert.strictEqual(C.tx('v_mild', li), C.tx('v_spike', li));
});
