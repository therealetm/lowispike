/* Oct 28 2026: the Billardtisch physics (room-table-core.js). Emmanuel: "Es soll wie ein Billard-Spiel funktionieren, aber halt mit
   Energy Blasts ... Da rollt nichts wie ein Billard." These pin the billiards: a blast hit rolls a ball, momentum carries over in a
   straight hit, cushions bounce, chain reactions happen, everything comes to rest on the table, and the same shot gives the same
   result every time (the shooter and every replaying phone agree). */
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../room-table-core.js');
const T = C.T;

test('a blast hits the first ball in its path and that ball rolls, then rests', () => {
  const t = C.table(); t.load([['a', 500, 1100], ['b', 500, 600], ['c', 500, 300]]);
  assert.equal(t.shoot('a', 0, -1, 1), true);
  let steps = 0, rolled = false;
  while (t.moving() && steps < T.MAXSTEPS) { t.step(); steps++; if (t.find('b').vy < -100) rolled = true; }
  assert.ok(rolled, 'b rolled up the table');
  assert.equal(t.hits().find(h => h.k === 'blast').uid, 'b', 'the first ball on the line takes the blast, not the one behind it');
  assert.equal(t.moving(), false, 'everything comes to rest');
  assert.ok(steps < T.MAXSTEPS, 'rests by itself, not by the cap');
  for (const b of t.balls()) { assert.equal(b.vx, 0); assert.equal(b.vy, 0); }
});

test('a straight centre hit passes the momentum on (Newton\'s cradle): the hit ball nearly stops, the next one runs', () => {
  const t = C.table(); t.load([['a', 500, 1180], ['b', 500, 700], ['c', 500, 599]]);
  t.shoot('a', 0, -1, .6);
  /* fly until the blast has hit b and b has hit c */
  let n = 0; while (!t.hits().some(h => h.k === 'ball') && n < 400) { t.step(); n++; }
  t.step();
  const b = t.find('b'), c = t.find('c');
  assert.ok(Math.abs(c.vy) > 5 * Math.abs(b.vy), `c runs (${c.vy.toFixed(0)}), b nearly stops (${b.vy.toFixed(0)})`);
});

test('ball-to-ball collisions keep momentum and lose only a little energy', () => {
  const t = C.table(); const a = t.set('a', 300, 700), b = t.set('b', 420, 760);
  a.vx = 900; a.vy = 100;
  const p0 = t.momentum(), e0 = t.energy();
  /* one step with no friction to look at the impulse alone */
  const damp = T.DAMP, roll = T.ROLL; T.DAMP = 1; T.ROLL = 0;
  try { for (let i = 0; i < 6; i++) t.step(); } finally { T.DAMP = damp; T.ROLL = roll; }
  const p1 = t.momentum(), e1 = t.energy();
  assert.ok(Math.abs(p1.x - p0.x) < 1e-6 && Math.abs(p1.y - p0.y) < 1e-6, 'momentum is conserved');
  assert.ok(b.vx > 0, 'b was pushed');
  assert.ok(e1 <= e0 + 1e-6 && e1 > e0 * .85, 'restitution below 1: a little energy is lost, not gained');
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  assert.ok(d >= a.r + b.r - .01, 'balls never stay inside each other');
});

test('cushions reflect a ball with restitution and keep it on the table', () => {
  const t = C.table(); const a = t.set('a', 900, 600); a.vx = 2000; a.vy = 0;
  let bounced = false; for (let i = 0; i < 60; i++) { t.step(); if (a.vx < 0) bounced = true; assert.ok(a.x <= T.W - a.r + 1e-9 && a.x >= a.r - 1e-9); }
  assert.ok(bounced, 'bounced off the right cushion');
  assert.ok(Math.abs(a.vx) < 2000 * T.WALL, 'lost speed in the cushion');
  assert.ok(t.hits().some(h => h.k === 'wall'));
});

test('a full table: chain reactions, nobody leaves the table, nobody overlaps at rest, and it rests within 25 seconds', () => {
  const uids = Array.from({ length: 40 }, (_, i) => 'u' + String(i).padStart(2, '0'));
  const spots = C.homeSpots(uids, {}); const start = uids.map(u => [u, spots[u].x, spots[u].y]);
  const me = spots.u07, tg = uids.filter(u => u !== 'u07').map(u => spots[u]).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
  const r = C.simulate(start, 'u07', tg.x - me.x, tg.y - me.y, 1);
  assert.ok(r, 'shot ran'); assert.ok(r.hit, 'hit someone');
  assert.ok(r.moved.length >= 4, `chain reaction moved ${r.moved.length} balls`);
  assert.ok(r.steps < T.MAXSTEPS, `rested after ${(r.steps / T.HZ).toFixed(1)} s`);
  for (const [, x, y] of r.final) { assert.ok(x >= T.R - .1 && x <= T.W - T.R + .1 && y >= T.R - .1 && y <= T.H - T.R + .1); }
  for (let i = 0; i < r.final.length; i++) for (let j = i + 1; j < r.final.length; j++) { const a = r.final[i], b = r.final[j]; assert.ok(Math.hypot(a[1] - b[1], a[2] - b[2]) >= 2 * T.R - 1, `${a[0]} and ${b[0]} overlap`); }
});

test('the same start and the same shot give exactly the same result (shooter and replaying phones agree)', () => {
  const uids = Array.from({ length: 25 }, (_, i) => 'x' + i);
  const sp = C.homeSpots(uids, {}); const start = uids.map(u => [u, sp[u].x, sp[u].y]);
  const a = C.simulate(start, 'x3', .41, -.9, .83), b = C.simulate(JSON.parse(JSON.stringify(start)), 'x3', .41, -.9, .83);
  assert.deepEqual(a.final, b.final); assert.equal(a.steps, b.steps);
  /* the start order does not matter: balls are solved in uid order */
  const c = C.simulate(start.slice().reverse(), 'x3', .41, -.9, .83);
  assert.deepEqual(c.final, a.final);
  /* the live, step-by-step playback lands where the instant simulation said */
  const t = C.table(); t.load(start); t.shoot('x3', .41, -.9, .83); while (t.moving()) t.step();
  assert.deepEqual(t.snapshot(), a.final);
});

test('a soft shot rolls less far than a hard one, and a miss only bumps the shooter back a little', () => {
  const soft = C.table(); soft.load([['a', 500, 1150], ['b', 500, 750]]); soft.shoot('a', 0, -1, .1); soft.settle();
  const hard = C.table(); hard.load([['a', 500, 1150], ['b', 500, 750]]); hard.shoot('a', 0, -1, 1); hard.settle();
  assert.ok(hard.find('b').moved > soft.find('b').moved * 1.8);
  const miss = C.table(); miss.load([['a', 500, 600], ['b', 100, 100]]); miss.shoot('a', 1, 0, 1); miss.settle();
  assert.ok(miss.hits().some(h => h.k === 'fizzle'), 'the blast fizzles in the cushion');
  assert.deepEqual([Math.round(miss.find('a').x), Math.round(miss.find('a').y)], [500, 600], 'no recoil without a hit');
  assert.ok(hard.find('a').y > 1150, 'a hit pushes the shooter back a little (recoil)');
});

test('home spots: the same spot for a uid on every phone, all on the table, none overlapping', () => {
  const uids = Array.from({ length: 40 }, (_, i) => 'm' + i);
  const a = C.homeSpots(uids, {}), b = C.homeSpots(uids.slice().reverse(), {});
  assert.deepEqual(a, b);
  const list = Object.values(a);
  for (const p of list) assert.ok(p.x >= T.R && p.x <= T.W - T.R && p.y >= T.R && p.y <= T.H - T.R);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) assert.ok(Math.hypot(list[i].x - list[j].x, list[i].y - list[j].y) >= 2 * T.R);
});

test('relax pushes balls that were saved on top of each other apart, inside the table', () => {
  const t = C.table(); t.load([['a', 60, 60], ['b', 62, 61], ['c', 64, 59]]); t.relax(60);
  const bs = t.balls();
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.ok(Math.hypot(bs[i].x - bs[j].x, bs[i].y - bs[j].y) >= 2 * T.R - .5);
  for (const b of bs) assert.ok(b.x >= T.R && b.y >= T.R);
});

test('the guide line finds the ball the blast will hit first', () => {
  const balls = [{ uid: 'me', x: 500, y: 1150, r: T.R }, { uid: 'near', x: 510, y: 800, r: T.R }, { uid: 'far', x: 500, y: 300, r: T.R }, { uid: 'side', x: 800, y: 1000, r: T.R }];
  const g = C.guide(balls, 'me', 500, 1085, 0, -1);
  assert.equal(g.uid, 'near');
  const w = C.guide(balls, 'me', 500, 1085, -1, 0);
  assert.equal(w.uid, null); assert.ok(Math.abs(w.x) < 1e-6, 'misses run to the cushion');
  const a = C.aim(0, 100, 140);
  assert.ok(a.dy < 0 && Math.abs(a.p - 100 / 140) < 1e-9, 'pulling down aims up (slingshot)');
});
