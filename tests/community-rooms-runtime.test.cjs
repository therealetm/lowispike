'use strict';
/* Runs the real community-rooms.js for simulated phones against tools/sim/fake-realtime.cjs (no network).
   Oct 24 2026 (Emmanuel: "we just have one chat ... Nuke everything that has to do with being able to open multiple rooms"):
   everyone is in the one room, however many arrive; chat and energy reach everyone. */
const test = require('node:test'), assert = require('node:assert');
const rn = require('../tools/sim/rooms-node.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

test('a burst of 45 arrivals all land in the one room; chat and energy reach everyone', { timeout: 30000 }, async () => {
  const w = rn.world({ minMs: 10, maxMs: 60 });
  const ps = []; for (let i = 0; i < 45; i++) ps.push(w.phone('u' + String(i).padStart(3, '0')));
  await Promise.all(ps.map(p => new Promise(r => setTimeout(() => p.start().then(r, r), Math.random() * 1500))));
  const end = Date.now() + 15000; let c = w.census();
  while (Date.now() < end && c.get(1) !== 45) { await sleep(300); c = w.census(); }
  assert.deepStrictEqual([...c], [[1, 45]], 'one room for everyone, nobody waiting or moved');
  ps.forEach(p => { assert.strictEqual(p.rooms.room(), 'all'); assert.strictEqual(p.rooms.num(), 1); });
  const seen = () => ps.filter(p => p.rooms.members().length === 45).length;
  for (let t = Date.now() + 8000; Date.now() < t && seen() < 45;) await sleep(250);
  assert.strictEqual(seen(), 45, 'everyone sees everyone here: ' + JSON.stringify(ps.map(p => p.rooms.members().length)));
  assert.ok(ps.every(p => !p.events.some(e => /move|full|knock|reassign/.test(e.type))), 'no moves, no full rooms, no knocks');
  assert.deepStrictEqual([...w.srv.topics.keys()], ['lowi-room-all'], 'one channel only: no rooms directory, no extra rooms');
  const reached = w.srv.insert({ id: 'm1', room: 'all', body: 'hi' });
  assert.strictEqual(reached, 45, 'a chat message reaches every phone');
  const shooter = ps[7], before = ps.map(p => p.got.energy);
  assert.ok(shooter.rooms.sendEnergy({ id: 's1' })); await sleep(300);
  ps.forEach((p, i) => assert.strictEqual(p.got.energy - before[i], p === shooter ? 0 : 1));
  ps.forEach(p => p.rooms.stop()); await sleep(200);
  assert.strictEqual(w.srv.topics.size, 0, 'no channel left once everyone leaves');
});

test('the one room keeps the id older installed apps already talk in, and the old multi-room API is gone', { timeout: 15000 }, async () => {
  const w = rn.world({ minMs: 10, maxMs: 40 });
  const a = w.phone('a'), b = w.phone('b');
  await a.start(); await b.start(); await sleep(400);
  assert.strictEqual(a.rooms.room(), 'all');
  assert.ok(a.rooms.has('b') && b.rooms.has('a'));
  for (const k of ['joinPerson', 'joinRoom', 'letIn', 'dismiss', 'knocks', 'rooms', 'readDirectory']) assert.strictEqual(a.rooms[k], undefined, k + ' is gone');
  assert.strictEqual(await a.start({ client: async () => a.client, uid: () => 'a' }), true, 'starting again while in is a no-op');
  a.rooms.stop(); await sleep(300);
  assert.ok(!b.rooms.has('a'), 'leaving drops you from the room');
  b.rooms.stop();
});
