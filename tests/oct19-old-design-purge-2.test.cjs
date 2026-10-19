'use strict';
/* Oct 19 old-design purge, round 2: the last places that drew an older Misty instead of her current cell. Each check fails on 20261019-134704. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('friends tree: your own spot is the real Misty cell, with the old cell only as a last resort', () => {
  const src = read('cell-room.js');
  assert.doesNotMatch(src, /cellSVG\('me',myHue\(\),\{cls:'cr-fc'\}\)\+/, 'the tree still draws the Oct 15 cell for you');
  const a = src.indexOf('function mineSVG(){'); assert.ok(a > 0);
  const fn = src.slice(a, src.indexOf('\n', a));
  const ctx = { root: {}, cellSVG: () => '<svg class="cr-fc old-cell"></svg>', myHue: () => 200 }; vm.createContext(ctx);
  vm.runInContext('var root=this.root,cellSVG=this.cellSVG,myHue=this.myHue;' + fn + ';this.f=mineSVG;', ctx);
  assert.match(ctx.f(), /old-cell/, 'no Misty renderer: the plain cell, so the tree never breaks');
  ctx.root.LowiHerbTamagotchi = { current: () => ({ m: {}, p: 'p' }), plantHTML: (m, size) => '<svg class="tmg-plant cf-form" data-size="' + size + '"></svg>' };
  const out = ctx.f();
  assert.match(out, /^<svg class="cr-fc cr-own tmg-plant cf-form" data-size="node">/);
  assert.match(src, /mineSVG\(\)\+/, 'the mine spot uses it');
});

test('companion traits never paint the mini-blob over Misty on the friends tree', () => {
  const src = read('companion.js');
  assert.match(src, /if \(mine && prefs\(\)\.traits && !mine\.querySelector\('svg\.cr-own'\)\)/);
});

test('the old herb room hero and dock draw the current cell, never the bare potted herb', () => {
  const src = read('herb-tamagotchi.js');
  assert.doesNotMatch(src, /[^a-zA-Z.]plant\(m,'(dock|hero)',p\)/, 'room/dock still call the bare plant drawing');
  assert.equal((src.match(/curArt\(m,'(dock|hero)',p\)/g) || []).length, 3);
  const a = src.indexOf('function curArt('); const fn = src.slice(a, src.indexOf('\n', a));
  const ctx = { window: {}, plant: () => 'HERB' }; vm.createContext(ctx);
  vm.runInContext('var window=this.window,plant=this.plant;' + fn + ';this.f=curArt;', ctx);
  assert.equal(ctx.f({}, 'hero', 1), 'HERB', 'before cell-world loads it may only use the base drawing');
  ctx.window.LowiHerbTamagotchi = { plantHTML: () => 'CELL' };
  assert.equal(ctx.f({}, 'hero', 1), 'CELL');
});

test('the census probe for old designs stays in the repo', () => {
  const p = read('playtest/probe-old-design.cjs');
  for (const s of ['old-onboard', 'comm-me', 'firstrun', 'wordmark']) assert.ok(p.includes(s), s);
});
