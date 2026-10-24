'use strict';
/* Community room, pure rules. Oct 24 2026 (Emmanuel: "nuke Circle ... we just have one chat"): one room, no support-room split. */
const test = require('node:test'), assert = require('node:assert');
const C = require('../community-rooms-core.js');

test('one room: the old shared id, one channel name, no room-splitting rules left', () => {
  assert.strictEqual(C.ROOM, 'all');
  assert.strictEqual(C.channelName(), 'lowi-room-all');
  for (const k of ['CAP', 'GUESTS', 'roomId', 'roomNum', 'choose', 'joinMode', 'mustLeave', 'findPerson', 'reduceDirectory', 'guestOf']) assert.strictEqual(C[k], undefined, k + ' is gone');
  assert.ok(C.DRAW > 0, 'only a draw limit for recent writers in the Raum is left');
});

test('flatten reads presence state without personal fields', () => {
  const out = C.flatten({ u1: [{ at: 5, name: 'Ana', mail: 'x@y' }], u2: [{ at: 1 }, { at: 9 }], u3: [] });
  assert.deepStrictEqual(out, [{ k: 'u1', at: 5 }, { k: 'u2', at: 9 }, { k: 'u3', at: 0 }]);
  assert.deepStrictEqual(C.flatten(null), []);
});
