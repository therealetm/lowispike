'use strict';
/* Oct 14: water bubble fasting timer on Home (fast-bubble.js / fast-bubble.css) */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const F = require('../fast-bubble.js');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'fast-bubble.js'), 'utf8'), css = fs.readFileSync(path.join(root, 'fast-bubble.css'), 'utf8');
const STAGES = [{h: 0, n: 'Start'}, {h: 3, n: 'Blood sugar'}, {h: 8, n: 'Liver'}, {h: 12, n: 'Fat burn'}, {h: 14, n: 'Ketones'}, {h: 16, n: 'Goal'}];

test('water level follows the fill paintFast sets, with a shallow pool before a fast', () => {
  assert.equal(F.parseFill('34.4%'), 0.344);
  assert.equal(F.parseFill(''), 0);
  assert.equal(F.parseFill('140%'), 1);
  assert.equal(F.level(0, false), F.MIN_LEVEL);
  assert.equal(F.level(0.5, false), F.MIN_LEVEL);
  assert.equal(F.level(0.01, true), F.MIN_LEVEL);
  assert.equal(F.level(0.5, true), 0.5);
  assert.equal(F.level(1, true), F.MAX_LEVEL);
  assert.equal(F.level(NaN, true), F.MIN_LEVEL);
});

test('markers sit inside the glass at their share of the goal, past and next marked', () => {
  const m = F.marks(STAGES, 16, 5.5);
  assert.deepEqual(m.map(x => x.h), [3, 8, 12, 14]);
  assert.equal(m[0].y, 3 / 16);
  assert.deepEqual(m.map(x => x.past), [true, false, false, false]);
  assert.deepEqual(m.map(x => x.next), [false, true, false, false]);
  assert.deepEqual(F.marks(STAGES, 13, 1).map(x => x.h), [3, 8, 12]);
  assert.equal(F.marks(STAGES, 16, 20).filter(x => x.next).length, 0);
  assert.deepEqual(F.marks(null, 16, 1), []);
});

test('next stage for the screen reader line, then the goal, then nothing', () => {
  assert.deepEqual(F.nextStage(STAGES, 16, 5), {h: 8, n: 'Liver'});
  assert.deepEqual(F.nextStage(STAGES, 16, 15), {h: 16, n: 'Goal'});
  assert.deepEqual(F.nextStage([], 16, 15), {h: 16, n: ''});
  assert.equal(F.nextStage(STAGES, 16, 17), null);
});

test('a poke makes a gentle wave that settles back to calm', () => {
  const s = F.surface(32);
  assert.equal(F.energy(s), 0);
  F.poke(s, 0.5, 1.1);
  s.tv += 1.2;
  for (let i = 0; i < 20; i++) F.step(s, 1 / 60);
  const e1 = F.energy(s);
  assert.ok(e1 > 0.001, 'water moves');
  let peak = 0;
  for (let i = 0; i < 600; i++) { F.step(s, 1 / 60); for (let k = 0; k < s.n; k++) peak = Math.max(peak, Math.abs(s.h[k])); }
  assert.ok(peak < 0.5, 'stays gentle');
  assert.ok(F.energy(s) < e1 / 100, 'settles');
  assert.ok(Math.abs(s.tilt) <= 0.4);
  for (let i = 0; i < 400; i++) { s.tv += 3; F.step(s, 1 / 60); }
  assert.ok(Math.abs(s.tilt) <= 0.4, 'tilt is capped');
  const big = F.surface(8);
  F.step(big, 5);
  assert.ok([...big.h].every(Number.isFinite), 'a long frame gap does not blow up');
});

test('labels never sit on the bubble text', () => {
  const txt = [{x: 30, y: 40, w: 76, h: 24}];
  assert.equal(F.overlaps({x: 90, y: 50, w: 16, h: 12}, txt, 2), true);
  assert.equal(F.overlaps({x: 110, y: 50, w: 16, h: 12}, txt, 2), false);
  assert.equal(F.overlaps({x: 90, y: 70, w: 16, h: 12}, txt, 0), false);
});

test('read-only: never writes the fast, health data or storage, never starts or stops a fast', () => {
  assert.doesNotMatch(src, /localStorage\.(setItem|removeItem|clear)/);
  assert.doesNotMatch(src, /LowiFastStop\.(open|stop|start|end|set)\(/);
  assert.doesNotMatch(src, /LowiFast\.(start|stop|set|save)\(/);
  assert.equal((src.match(/\.innerHTML\s*=[^=]/g) || []).length, (src.match(/b\.mk\.innerHTML = html/g) || []).length, 'only its own marker layer gets new HTML');
  assert.match(src, /getItem\('lowi_fast_v1'\)/);
});

test('a drag only plays with the water; a tap still reaches the fasting sheet', () => {
  assert.match(src, /if \(b\.dragged\) \{ b\.dragged = false; e\.stopPropagation\(\); e\.preventDefault\(\); return; \}/);
  assert.match(src, /addEventListener\('click', e => \{[\s\S]*?\}, true\)/);
  assert.match(src, /\{ passive: true \}/);
});

test('reduced motion: still frame, no loop, no ripples; CSS calms down too', () => {
  assert.match(src, /prefers-reduced-motion: reduce/);
  assert.match(src, /if \(reduced\(\)\) \{ b\.lv = b\.target; draw\(b, 0\); return; \}/);
  assert.match(src, /if \(!reduced\(\)\) \{ poke\(/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/);
});

test('accessible: decoration is hidden, the next marker is read out, text keeps its contrast', () => {
  assert.match(src, /cv\.setAttribute\('aria-hidden', 'true'\)/);
  assert.match(src, /mk\.setAttribute\('aria-hidden', 'true'\)/);
  assert.match(src, /Nächste Marke/);
  assert.match(src, /Siguiente marca/);
  assert.match(css, /#spFast\.fb-on \.sp-fast-copy \{[^}]*z-index: 4;[^}]*text-shadow/);
  assert.match(css, /html\[data-theme=light\] #spFast\.fb-on \.sp-fast-copy/);
  assert.match(css, /prefers-contrast: more/);
});

test('loaded with the app and cached for offline', () => {
  const ui = fs.readFileSync(path.join(root, 'apple-ui.js'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(ui, /'fast-bubble\.js'/);
  assert.match(ui, /fast-bubble\.css\?v=/);
  assert.match(sw, /"fast-bubble\.js"/);
  assert.match(sw, /"fast-bubble\.css"/);
});

test('spirit.js still owns the timer text and the tap action', () => {
  const sp = fs.readFileSync(path.join(root, 'spirit.js'), 'utf8');
  assert.match(sp, /function paintFast\(\)/);
  assert.match(sp, /el\.style\.setProperty\('--sp-fill'/);
  assert.match(sp, /a === 'fast'[\s\S]{0,600}LowiFastStop\.open\(\)/);
});
