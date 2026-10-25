/* Oct 25 heat (COORD-heat-battery.md): the Room galaxy's own drawing and the bobbing companions slow down when nobody touches the
   screen (about 20 a second after 3 s, 10 after 30 s, 5 after 90 s, the "page" tiers of power-saver.js) and go back to full speed on
   the next touch. Time keeps real speed, so everything looks the same, only drawn less often. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const G = require('../community-galaxy.js');

test('idle tiers match power-saver.js page tiers: full, 20, 10, 5 a second', () => {
  assert.equal(G.idleGap(0), 0);
  assert.equal(G.idleGap(2999), 0);
  assert.equal(G.idleGap(3000), 50);
  assert.equal(G.idleGap(29999), 50);
  assert.equal(G.idleGap(30000), 100);
  assert.equal(G.idleGap(89999), 100);
  assert.equal(G.idleGap(90000), 200);
  assert.equal(G.idleGap(3600000), 200);
});

function fakeRoot(extra) {
  const L = {}, timers = new Map(); let tid = 0, clock = 0, rafs = 0;
  const root = Object.assign({
    performance: { now: () => clock },
    addEventListener: (t, fn) => { (L[t] = L[t] || []).push(fn); },
    setTimeout: (fn, ms) => { timers.set(++tid, { fn, at: clock + ms }); return tid; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame: fn => { rafs++; return root.setTimeout(() => fn(clock), 16); },
    cancelAnimationFrame: id => timers.delete(id),
    matchMedia: () => ({ matches: false }), devicePixelRatio: 1
  }, extra || {});
  const fire = t => (L[t] || []).forEach(fn => fn({ type: t }));
  const advance = ms => { const end = clock + ms; for (;;) { let next = null; for (const [id, x] of timers) if (x.at <= end && (!next || x.at < next[1].at)) next = [id, x]; if (!next) break; timers.delete(next[0]); clock = next[1].at; next[1].fn(); } clock = end; };
  return { root, fire, advance, rafs: () => rafs };
}
function fakeAnim() {
  const a = { animationName: 'cgBob', playState: 'running', currentTime: 0, sets: 0, effect: { target: { isConnected: true }, getTiming: () => ({ iterations: Infinity }) } };
  a.pause = () => { a.playState = 'paused'; }; a.play = () => { a.playState = 'running'; };
  return a;
}

test('the Room draws at full speed while touched, then ~20, ~10, ~5 a second, and full speed again on the next touch; bobbing follows', () => {
  const F = fakeRoot(); const draws = []; const bob = fakeAnim();
  const ctx = new Proxy({}, { get: (o, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() { } }) : (typeof k === 'string' && /^(set|clear|fill|begin|arc|move|line|close|quad|stroke|ellipse)/.test(k) ? () => { if (k === 'clearRect') draws.push(F.root.performance.now()); } : o[k]), set: () => true });
  const box = { getAnimations: () => [bob] };
  const canvas = { getContext: () => ctx, getBoundingClientRect: () => ({ width: 300, height: 400 }), width: 0, height: 0, parentElement: box };
  const sk = G.sky(canvas, { root: F.root, bobs: box });
  sk.start();
  const rate = (ms) => { draws.length = 0; F.advance(ms); return draws.length / (ms / 1000); };
  assert.ok(rate(2000) >= 25, 'touched: about 30 a second as before');
  assert.equal(bob.playState, 'running', 'touched: bobbing runs on its own');
  F.advance(1500);
  const calm = rate(10000); assert.ok(calm >= 17 && calm <= 21, 'calm (3-30 s): ~20 a second, got ' + calm);
  assert.equal(bob.playState, 'paused', 'calm: bobbing is held and stepped by the Room');
  const t0 = bob.currentTime; F.advance(1000); assert.ok(Math.abs(bob.currentTime - t0 - 1000) <= 220, 'bobbing time keeps real speed');
  F.advance(20000);
  const rest = rate(30000); assert.ok(rest >= 8.5 && rest <= 10.5, 'rest (30-90 s): ~10 a second, got ' + rest);
  F.advance(30000);
  const deep = rate(20000); assert.ok(deep >= 4 && deep <= 5.5, 'deep (90 s+): ~5 a second, got ' + deep);
  const ctBefore = bob.currentTime;
  F.fire('pointerdown');
  F.advance(20);
  assert.equal(bob.playState, 'running', 'a touch hands bobbing back to the browser');
  assert.ok(bob.currentTime >= ctBefore, 'bobbing carries on from where it was, no jump back');
  assert.ok(rate(1000) >= 25, 'a touch brings back full speed at once');
  sk.stop();
  assert.equal(bob.playState, 'running', 'leaving the Room never leaves bobbing frozen');
});

test('uses the app-wide power saver when it is there (one place knows how calm the app is)', () => {
  let iv = 0; const F = fakeRoot({ LowiPower: { interval: back => (assert.equal(back, true, 'the Room is a page'), iv) } });
  const draws = [];
  const ctx = new Proxy({}, { get: (o, k) => k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() { } }) : (typeof k === 'string' && /^(set|clear|fill|begin|arc|move|line|close|quad|stroke|ellipse)/.test(k) ? () => { if (k === 'clearRect') draws.push(1); } : o[k]), set: () => true });
  const canvas = { getContext: () => ctx, getBoundingClientRect: () => ({ width: 300, height: 400 }), width: 0, height: 0, parentElement: null };
  const sk = G.sky(canvas, { root: F.root });
  sk.start(); F.advance(1000); const full = draws.length; draws.length = 0;
  iv = 200; F.advance(5000); const slow = draws.length;
  assert.ok(full >= 25 && slow >= 20 && slow <= 27, 'follows LowiPower.interval(true): ' + full + ' then ' + slow + ' in 5 s');
  sk.stop();
});

test('wired: the Room keeps time at real speed and never touches the 3D world, CSS animation or audio files', () => {
  const src = fs.readFileSync(__dirname + '/../community-galaxy.js', 'utf8');
  assert.ok(/idleGap/.test(src) && /LowiPower/.test(src) && /cgBob/.test(src));
  assert.ok(!/body-world-3d|AudioContext/.test(src.slice(src.indexOf('function idleGap'))), 'pace code stays in the Room');
});
