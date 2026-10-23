'use strict';
/* Bug hunt 23 Oct 2026 (Community > Ranking): your own row said "Sunny Leaf" (the old herb auto name from LowiHerbTamagotchi.name)
   while Misty's card says "Misty" or the name you gave your companion, and the look shared with other phones carried that same
   auto name. Both now use the BH-006 chain (own companion > a typed name > Misty); the shared name is left out while it is the
   default "Misty". Also: a German short date "19. Okt." before the sentence's dot read "19. Okt..". */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const grab = (src, sig) => { const i = src.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig); const j = src.indexOf('\n', i); return src.slice(i, j); };
const world = (o) => ({
  LowiHerbIdentity: { autoName: () => 'Sunny Leaf' },
  LowiHerbTamagotchi: { readPrefs: () => ({ name: o.typed || '' }), current: () => ({ p: {}, m: {} }), name: () => 'Sunny Leaf' },
  LowiBirthCompanion: o.birth ? { has: () => true, get: () => ({ name: o.birth }) } : { has: () => false, get: () => null },
  LowiR2: { S: () => ({ herb: { name: 'Sunny Leaf' } }) }
});

test('ranking: your own companion name follows the BH-006 chain, never the herb auto name', () => {
  const src = R('ranking.js');
  const fn = grab(src, '    function companionName()');
  const run = (o) => vm.runInNewContext(fn + '; companionName()', { W: world(o) });
  assert.strictEqual(run({}), 'Misty', 'nothing chosen: Misty, like Misty\'s card');
  assert.strictEqual(run({ birth: 'Nyxa' }), 'Nyxa', 'own companion name');
  assert.strictEqual(run({ typed: 'Bubbles' }), 'Bubbles', 'a typed name');
  assert.strictEqual(run({ typed: 'Sunny Leaf' }), 'Misty', 'the auto name typed back is not a choice');
  const own = src.slice(src.indexOf('    function companion(p, lv)'), src.indexOf('    function art('));
  assert.ok(!/H\.name\(c\.p, c\.m\)/.test(own), 'the old herb name call is gone from your row');
  assert.ok(/companionName\(\)/.test(own) && /displayName/.test(own), 'your row uses the shared chain');
});

test('companion: the shared look carries the chosen name, nothing while it is the default Misty', () => {
  const src = R('companion.js');
  const cn = grab(src, '    function companionName()'), my = grab(src, '    function myName()');
  assert.ok(!/H\.name\(c\.p, c\.m\)/.test(my), 'no herb auto name in the shared look');
  const run = (o) => vm.runInNewContext(cn.replace('const w = typeof window !== \'undefined\' ? window : globalThis;', 'const w = W;') + '\n' + my + '; myName()', { W: world(o) });
  assert.strictEqual(run({}), '', 'default Misty is not shared (other phones show the evolution form)');
  assert.strictEqual(run({ birth: 'Nyxa' }), 'Nyxa');
  assert.strictEqual(run({ typed: 'Bubbles' }), 'Bubbles');
});

test('ranking: a date ending in a dot does not double the sentence dot; ellipses stay', () => {
  const src = R('ranking.js');
  const fn = grab(src, '    function tr(k, v)');
  const T = { perW: ['since Monday, {d}. Up to 12.', 'seit Montag, {d}. Bis zu 12.', 'desde el lunes {d}. Hasta 12.'], dots: ['wait... {d}', 'warte... {d}', 'espera... {d}'] };
  const run = (l, k, v) => vm.runInNewContext(fn + '; tr(k, v)', { T, lang: () => l, k, v });
  assert.strictEqual(run(1, 'perW', { d: '19. Okt.' }), 'seit Montag, 19. Okt. Bis zu 12.');
  assert.strictEqual(run(0, 'perW', { d: 'Oct 19' }), 'since Monday, Oct 19. Up to 12.');
  assert.strictEqual(run(2, 'perW', { d: '19 oct' }), 'desde el lunes 19 oct. Hasta 12.');
  assert.strictEqual(run(1, 'dots', { d: 'x' }), 'warte... x', 'an ellipsis is kept');
});
