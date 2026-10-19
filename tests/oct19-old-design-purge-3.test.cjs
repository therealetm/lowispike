'use strict';
/* Oct 19 old-design purge, round 3: friends are drawn with the current glass cell (their own shared form on it), not the old mini-blob.
   The first five checks fail on 20261019-135912; the sixth guards the probe. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function load() {
  const src = read('companion.js');
  const a = src.indexOf('    function uniq('), b = src.indexOf('    function swap(');
  assert.ok(a > 0 && b > a, 'companion.js has uniq() and friendSVG() before swap()');
  const ctx = { T: null, calls: [] };
  ctx.C = {
    clampStage: s => Math.max(0, Math.min(5, s | 0)),
    apply: (svg, g) => svg.replace('class="tmg-plant', 'class="tmg-plant cf-form cf-el-' + g.el).replace('</svg>', '<g class="cf-back" fill="url(#xcytof)"></g></svg>'),
    miniSVG: (g, id) => '<svg class="cf-mini OLD"></svg>'
  };
  vm.createContext(ctx);
  vm.runInContext('var C=this.C;const HT=()=>this.T;' + src.slice(a, b) + ';this.friendSVG=friendSVG;this.uniq=uniq;', ctx);
  return ctx;
}

test('a friend is the current glass cell carrying their form, at their stage, without your hat or clothes', () => {
  const ctx = load(), g = { el: 'fire', st: 3 };
  assert.match(ctx.friendSVG(g, 'f0'), /OLD/, 'before cell-world loads only the mini drawing exists');
  const cell = function (m, size, p, o) { ctx.calls.push({ m, size, p, o }); return '<svg class="tmg-plant cw-cell"><defs><radialGradient id="xcyto"/></defs><ellipse class="lh-body cw-wall" fill="url(#xcyto)"/></svg>'; };
  cell.cell = true;
  const wrapped = function () { return 'MY-OWN-FORM'; }; wrapped.cell = true; wrapped.cf = true; wrapped.original = cell;
  ctx.T = { plantHTML: wrapped, current: () => ({ m: { index: 5, mood: 'droopy', dim: true }, p: { name: 'x', equipment: { hat: 'crown' } } }) };
  const out = ctx.friendSVG(g, 'f0');
  assert.doesNotMatch(out, /OLD|MY-OWN-FORM/, 'not the mini-blob and not your own fused form');
  assert.match(out, /^<svg class="cf-friend tmg-plant cf-form cf-el-fire cw-cell"/);
  assert.match(out, /cw-wall/);
  const c = ctx.calls[0];
  assert.equal(c.m.index, 3); assert.equal(c.m.dim, false); assert.equal(c.m.mood, 'happy'); assert.equal(c.size, 'node');
  assert.equal(Object.keys(c.p.equipment).length, 0, 'your wardrobe never goes on a friend');
  assert.match(out, /id="xcyto_f0"/); assert.match(out, /url\(#xcyto_f0\)/); assert.doesNotMatch(out, /id="xcyto"/);
});

test('two friends on one screen never share gradient ids; refs to outside ids are left alone', () => {
  const ctx = load();
  const s = '<svg><defs><linearGradient id="a1"/><path id="p"/></defs><rect fill="url(#a1)"/><use href="#p"/><rect fill="url(#elsewhere)"/></svg>';
  const x = ctx.uniq(s, 'f1'), y = ctx.uniq(s, 'f2');
  assert.match(x, /id="a1_f1"[\s\S]*url\(#a1_f1\)[\s\S]*href="#p_f1"/);
  assert.match(y, /id="a1_f2"/);
  assert.match(x, /url\(#elsewhere\)/);
});

test('the friends tree and Community chat use the current friend drawing first', () => {
  const c = read('companion.js');
  const sw = c.slice(c.indexOf('    function swap('), c.indexOf('    function paintFriends('));
  assert.match(sw, /friendSVG\(g, id\)/); assert.doesNotMatch(sw, /C\.miniSVG/);
  assert.match(c, /friendLooks: [^\n]*friendSVG/, 'exported for Community');
  const cc = read('community-chat.js');
  const mate = cc.slice(cc.indexOf('function mate('), cc.indexOf('\n', cc.indexOf('function mate(')));
  assert.ok(mate.indexOf('friendSVG') > 0 && mate.indexOf('friendSVG') < mate.indexOf('C.miniSVG'), 'friendSVG before the mini fallback');
});

test('a friend who shares no look is the plain current cell (never the mini-blob); nothing at all before cell-world', () => {
  const ctx = load();
  assert.equal(ctx.friendSVG(null, 'f2'), '', 'cell-room keeps its own fallback until cell-world is there');
  const cell = function () { return '<svg class="tmg-plant cw-cell" style="--tmg-a:#fff" role="img" aria-label="Misty"><defs><g id="q"/></defs><ellipse class="lh-body cw-wall"/></svg>'; }; cell.cell = true;
  ctx.T = { plantHTML: cell, current: () => ({ m: { index: 2 }, p: {} }) };
  const out = ctx.friendSVG(null, 'f2');
  assert.match(out, /^<svg class="cf-friend tmg-plant cw-cell"/); assert.doesNotMatch(out, /cf-back|OLD/);
  assert.match(out, /aria-hidden="true"/); assert.doesNotMatch(out, /aria-label="Misty"/, 'a friend is never announced as your Misty');
  assert.match(out, /id="q_f2"/);
});

test('friends tree, picked card, More friends list, invite card and your room never draw the Oct 15 cell when the current one exists', () => {
  const src = read('cell-room.js');
  for (const k of ["'f'+i", "'sel'", "'r'+x.uid", "'inv'"]) { assert.ok(src.includes('friendCell(' + k), k + ' uses friendCell'); assert.ok(!src.includes('cellSVG(' + k), k + ' still draws the old cell'); }
  assert.ok(!src.includes("cellSVG('room'"), 'your room still draws the old cell for you');
  assert.match(src, /class="cr-me"[^\n]*mineSVG\(\)/);
  const a = src.indexOf('function friendCell('), fn = src.slice(a, src.indexOf('\n', a));
  const ctx = { root: {}, cellSVG: () => '<svg class="cr-cell cr-fc OLD"></svg>' }; vm.createContext(ctx);
  vm.runInContext('var root=this.root,cellSVG=this.cellSVG;' + fn + ';this.f=friendCell;', ctx);
  assert.match(ctx.f('f0', 300, { cls: 'cr-fc' }), /OLD/, 'no companion.js yet: the old drawing, so the tree never breaks');
  ctx.root.LowiCompanion = { friendSVG: (g, k) => g === null ? '<svg class="cf-friend tmg-plant" style="--tmg-a:#fff" data-k="' + k + '"></svg>' : 'BAD' };
  const out = ctx.f('f0', 300, { cls: 'cr-fc' });
  assert.match(out, /^<svg class="cr-fc cr-cur cf-friend tmg-plant" style="--cr-hue:100deg;--tmg-a:#fff" data-k="f0">/);
  assert.match(ctx.f('f1', 20, { cls: 'cr-fc' }), /--cr-hue:180deg/);
  assert.match(read('cell-room.css'), /svg\.cr-fc\.cr-cur\{filter:hue-rotate\(var\(--cr-hue/);
});

test('the friend-forms probe stays in the repo', () => {
  const p = read('playtest/probe-friend-forms.cjs');
  for (const s of ['cw-wall', 'shared id', 'lowispike.friendlooks.v1']) assert.ok(p.includes(s), s);
});
