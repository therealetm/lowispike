'use strict';
/* Oct 24 bug hunt (simulated iPhone 13, live build 20261024-060714, item 29): with the galaxy chat open, the hidden Room
   galaxy's sky loop (community-galaxy.js sky().loop) ran at the full screen rate, about 55 frame callbacks a second next to the
   3D world's, although thread(true) stops it on purpose. Every refresh while the chat was open went through skyStart(), which
   started the loop again. skyStart() now leaves the sky stopped while the chat room is open; closing the room starts it again.
   The fixture is the one in community-room.test.cjs, read from that file so the two cannot drift apart. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const K = require('../community-chat-core.js');
const roomSrc = fs.readFileSync(path.join(__dirname, 'community-room.test.cjs'), 'utf8');
const a = roomSrc.indexOf('function fixture(){'), b = roomSrc.indexOf('\n}\n', a);
const fixture = new Function('require', 'assert', 'fs', 'vm', 'path', 'K', '__dirname', roomSrc.slice(a, b + 2) + ';return fixture;')(require, assert, fs, vm, path, K, __dirname);

function withSky() {
  const f = fixture(), sky = { running: false, starts: 0 };
  f.nodes.cgSky = f.nodes.cgSky || { id: 'cgSky', dataset: {}, style: {}, attrs: {}, setAttribute() { }, removeAttribute() { } };
  f.nodes.cgSky.getContext = () => ({});
  f.win.LowiGalaxy.sky = () => ({ set() { }, start() { sky.running = true; sky.starts++; }, stop() { sky.running = false; }, resize() { }, running: () => sky.running });
  return { f, sky };
}

test('the Room galaxy sky runs while you see the galaxy', () => {
  const { f, sky } = withSky(); f.scope('a');
  assert.equal(sky.running, true);
});

test('opening the chat room stops the sky, and refreshes while the room is open do not start it again', () => {
  const { f, sky } = withSky(); f.scope('a');
  f.click({ chat: 'history' });
  assert.equal(sky.running, false, 'the room covers the galaxy');
  for (let i = 0; i < 5; i++) { f.win.LowiCommunity.refresh(); f.flush(); }
  assert.equal(sky.running, false, 'a new message or any repaint in the open room leaves the sky stopped');
  f.win.LowiCommunity.thread(true); f.flush();
  assert.equal(sky.running, false);
});

test('closing the chat room brings the sky back', () => {
  const { f, sky } = withSky(); f.scope('a');
  f.click({ chat: 'history' }); assert.equal(sky.running, false);
  f.win.LowiCommunity.thread(false); f.flush();
  assert.equal(sky.running, true);
});
