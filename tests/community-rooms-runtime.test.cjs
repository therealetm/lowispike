'use strict';
/* Runs the real community-rooms.js for simulated phones against tools/sim/fake-realtime.cjs (no network). */
const test = require('node:test'), assert = require('node:assert');
const rn = require('../tools/sim/rooms-node.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function settle(w, cap, ms) { const end = Date.now() + ms; while (Date.now() < end) { await sleep(400); const c = w.census(); if (!c.get(0) && [...c.entries()].every(([n, k]) => n === 0 || k <= cap)) return c; } return w.census(); }

test('a burst of 45 arrivals settles into rooms of at most the cap, all chat and energy scoped to the room', { timeout: 30000 }, async () => {
  const cap = 10, w = rn.world({ cap, minMs: 10, maxMs: 60 });
  const ps = []; for (let i = 0; i < 45; i++) ps.push(w.phone('u' + String(i).padStart(3, '0')));
  await Promise.all(ps.map(p => new Promise(r => setTimeout(() => p.start().then(r, r), Math.random() * 1500))));
  const c = await settle(w, cap, 15000);
  assert.ok(!c.get(0), 'everyone is in a room');
  for (const [n, k] of c) assert.ok(k <= cap, 'room ' + n + ' has ' + k);
  assert.strictEqual([...c.values()].reduce((a, b) => a + b, 0), 45);
  assert.strictEqual(c.size, 5, 'five rooms of ten: ' + JSON.stringify([...c]));
  // a message in room 2 reaches only room 2
  const r2 = ps.filter(p => p.rooms.num() === 2).length;
  const reached = w.srv.insert({ id: 'm1', room: 'r2', body: 'hi' });
  assert.strictEqual(reached, r2);
  // an energy shot reaches only the shooter's room
  const shooter = ps.find(p => p.rooms.num() === 3); const before = ps.map(p => p.got.energy);
  assert.ok(shooter.rooms.sendEnergy({ id: 's1' })); await sleep(300);
  ps.forEach((p, i) => { const d = p.got.energy - before[i]; if (p === shooter) assert.strictEqual(d, 0); else assert.strictEqual(d, p.rooms.num() === 3 ? 1 : 0); });
  ps.forEach(p => p.rooms.stop());
});

test('few people: everyone shares room 1 (the old shared room id), a new room opens only when it is full', { timeout: 20000 }, async () => {
  const cap = 4, w = rn.world({ cap, minMs: 10, maxMs: 40 });
  const ps = []; for (let i = 0; i < 6; i++) { const p = w.phone('p' + i); ps.push(p); await p.start(); await sleep(250); }
  const c = await settle(w, cap, 8000);
  assert.strictEqual(c.get(1), 4); assert.strictEqual(c.get(2), 2);
  assert.strictEqual(ps[0].rooms.room(), 'all');
  ps.forEach(p => p.rooms.stop()); await sleep(200);
  assert.strictEqual(w.srv.topics.size, 0, 'empty rooms close: no channel left');
});

test('join a person: direct when there is space, knock + let in when full', { timeout: 30000 }, async () => {
  const cap = 3, w = rn.world({ cap, minMs: 10, maxMs: 40 });
  const ps = []; for (let i = 0; i < 6; i++) { const p = w.phone('k' + i); ps.push(p); await p.start(); await sleep(200); }
  await settle(w, cap, 8000); await sleep(1200);
  const a = ps.find(p => p.rooms.num() === 1), b = ps.find(p => p.rooms.num() === 2);
  const extra = w.phone('late'); await extra.start(); await settle(w, cap, 6000); await sleep(1200);
  const host = ps.find(p => p.rooms.num() === 1 && p !== extra);
  assert.strictEqual(extra.rooms.num(), 3, 'rooms 1 and 2 are full, so a third room opened');
  const pending = extra.rooms.joinPerson(host.uid);
  for (let i = 0; i < 40 && !host.rooms.knocks().length; i++) await sleep(100);
  assert.strictEqual(host.rooms.knocks().length, 1, 'host sees the knock');
  assert.ok(await host.rooms.letIn('late'));
  const res = await pending; assert.ok(res.ok, JSON.stringify(res)); assert.strictEqual(res.why, 'let-in');
  await sleep(1500);
  assert.strictEqual(extra.rooms.num(), 1, 'guest stays in the full room');
  assert.strictEqual(host.rooms.members().length, cap + 1);
  // direct join where there is space: one person leaves room 2, a newcomer joins someone there directly
  const two = ps.filter(p => p.rooms.num() === 2); two[0].rooms.stop(); await sleep(1500);
  const solo = w.phone('solo'); await solo.start(); await sleep(1500);
  const r = await solo.rooms.joinPerson(two[1].uid); assert.ok(r.ok, JSON.stringify(r)); assert.ok(r.why === 'joined' || r.why === 'here');
  await sleep(800); assert.strictEqual(solo.rooms.num(), 2);
  [...ps, extra, solo].forEach(p => p.rooms.stop()); void a; void b;
});
