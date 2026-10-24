'use strict';
/* Bug hunt 24 Oct 2026 (companion / Misty's card): the rank pill under Misty's name had the label "Sunny Leaf is number 2
   worldwide" (the old herb auto name from LowiHerbTamagotchi.name) while the card says "Misty" or the name you gave. VoiceOver read
   the wrong name. The label now uses the same BH-006 chain as the card. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'misty-hub.js'), 'utf8');
const rk = src.slice(src.indexOf('if (W.LowiMistyRank) return;'));
const i = rk.indexOf('    function myName()'), fn = rk.slice(i, rk.indexOf('\n', i));
const world = (o) => ({
  LowiHerbIdentity: { autoName: () => 'Sunny Leaf' },
  LowiHerbTamagotchi: { readPrefs: () => ({ name: o.typed || '' }), current: () => ({ p: {}, m: {} }), name: () => 'Sunny Leaf' },
  LowiBirthCompanion: o.birth === undefined ? undefined : { displayName: () => o.birth },
  LowiR2: { S: () => ({ herb: { name: 'Sunny Leaf' } }) }
});
const run = o => vm.runInNewContext(fn + '; myName()', { W: world(o) });

test('Misty rank pill label: the name the card shows, never the herb auto name', () => {
  assert.ok(i > 0, 'myName in the rank pill');
  assert.ok(!/H\.name\(c\.p, c\.m\)/.test(fn), 'the old herb auto name call is gone');
  assert.strictEqual(run({ birth: 'Misty' }), 'Misty', 'nothing chosen: Misty, like the card');
  assert.strictEqual(run({ birth: 'Nova' }), 'Nova', 'a renamed companion');
  assert.strictEqual(run({}), 'Misty', 'no companion module: still not Sunny Leaf');
  assert.strictEqual(run({ typed: 'Bubbles' }), 'Bubbles', 'a typed herb name');
  assert.strictEqual(run({ typed: 'Sunny Leaf' }), 'Misty', 'the auto name typed back is not a choice');
});
