'use strict';
const test = require('node:test'), assert = require('node:assert');
const R = require('../community-rooms-core.js');

test('room ids: room 1 keeps the old shared id, others are r<n>', () => {
  assert.strictEqual(R.roomId(1), 'all'); assert.strictEqual(R.roomId(7), 'r7');
  assert.strictEqual(R.roomNum('all'), 1); assert.strictEqual(R.roomNum('r12'), 12); assert.strictEqual(R.roomNum('evil'), 0);
  assert.strictEqual(R.channelName('r3'), 'lowi-room-r3'); assert.strictEqual(R.channelName('x;drop'), 'lowi-room-all');
});

test('newcomer goes to a random open room with space; a new room only when all are full', () => {
  const cap = 10;
  const dir = R.directory([{ n: 1, c: 10, u: [] }, { n: 2, c: 4, u: [] }, { n: 3, c: 9, u: [] }]);
  const picks = new Set(); for (let i = 0; i < 40; i++) picks.add(R.choose(dir, cap, () => i / 40));
  assert.deepStrictEqual([...picks].sort(), [2, 3]);
  assert.strictEqual(R.choose(R.directory([{ n: 1, c: 10 }, { n: 2, c: 10 }]), cap), 3);
  assert.strictEqual(R.choose(R.directory([{ n: 1, c: 10 }, { n: 3, c: 10 }]), cap), 2, 'reuses a closed number');
  assert.strictEqual(R.choose(new Map(), cap), 1, 'nobody anywhere: room 1');
});

test('directory keeps the newest entry per room and ignores junk', () => {
  const d = R.directory([{ n: 2, c: 3, t: 1 }, { n: 2, c: 5, t: 2 }, { n: 0, c: 1 }, null, { n: 'x' }]);
  assert.strictEqual(d.size, 1); assert.strictEqual(d.get(2).c, 5);
});

test('over-cap race: everyone agrees the latest joiners move on; guests of a present host stay', () => {
  const ms = []; for (let i = 0; i < 12; i++) ms.push({ k: 'u' + String(i).padStart(2, '0'), at: 1000 + i });
  const s = R.seated(ms, 10);
  assert.strictEqual(s.size, 10); assert.ok(!s.has('u10') && !s.has('u11'));
  assert.ok(R.mustLeave(ms, 'u11', 10)); assert.ok(!R.mustLeave(ms, 'u00', 10));
  const withGuest = ms.slice(0, 10).concat([{ k: 'g1', at: 5000, guestOf: 'u03' }, { k: 'g2', at: 5001, guestOf: 'nobody-here' }]);
  assert.ok(!R.mustLeave(withGuest, 'g1', 10), 'guest of a present member stays');
  assert.ok(R.mustLeave(withGuest, 'g2', 10), 'host gone: no guest seat');
  assert.strictEqual(R.lead(ms), 'u00');
});

test('join a person: direct with space, knock when full', () => {
  const d = R.directory([{ n: 4, c: 30, u: ['bea'] }, { n: 5, c: 2, u: ['max'] }]);
  assert.strictEqual(R.findPerson(d, 'bea').n, 4); assert.strictEqual(R.findPerson(d, 'zed'), null);
  assert.strictEqual(R.joinMode(R.findPerson(d, 'max'), 30), 'join');
  assert.strictEqual(R.joinMode(R.findPerson(d, 'bea'), 30, 0), 'knock');
  assert.strictEqual(R.joinMode(R.findPerson(d, 'bea'), 30, R.GUESTS), 'full');
});

test('flatten reads presence state without personal fields', () => {
  const f = R.flatten({ a: [{ at: 5, g: 'b', name: 'secret' }], b: [{ at: 3 }] });
  assert.deepStrictEqual(f, [{ k: 'a', at: 5, guestOf: 'b' }, { k: 'b', at: 3, guestOf: '' }]);
});
