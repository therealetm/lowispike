'use strict';
/* Item 31 (20 Oct 2026, simulated play): on a full Community (45 members, 300 messages) every keystroke in the composer
   repainted the whole room (all message rows, the galaxy, the status line), and the room list held all 300 messages with a
   full companion drawing each (~13k DOM nodes, ~500 SVG gradients) even while the room was closed. Typing now touches only
   the composer, and the list holds the newest 60 messages with "Show earlier messages" for more.
   The fixture is the one in community-room.test.cjs, read from that file so the two cannot drift apart. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const K = require('../community-chat-core.js');
const roomSrc = fs.readFileSync(path.join(__dirname, 'community-room.test.cjs'), 'utf8');
const a = roomSrc.indexOf('function fixture(){'), b = roomSrc.indexOf('\n}\n', a);
const fixture = new Function('require', 'assert', 'fs', 'vm', 'path', 'K', '__dirname', roomSrc.slice(a, b + 2) + ';return fixture;')(require, assert, fs, vm, path, K, __dirname);
const js = fs.readFileSync(path.join(__dirname, '..', 'community-chat.js'), 'utf8');
const many = n => { const now = Date.now(), ms = []; for (let i = 0; i < n; i++) ms.push({ id: 'm' + i, uid: 'u' + (i % 9), by: 'P' + (i % 9), t: 'line ' + i, ts: now - (n - i) * 6e4 }); return ms; };
const rowCount = h => (h.match(/<article/g) || []).length;

test('typing a letter does not schedule a room repaint; the composer still follows (send button, counter)', () => {
  const f = fixture(); f.host.messages = () => many(120); f.scope('a');
  const list = f.nodes.cmList.innerHTML, status = f.nodes.csStatus.innerHTML;
  let paints = 0, sv = status; Object.defineProperty(f.nodes.csStatus, 'innerHTML', { configurable: true, get: () => sv, set: x => { paints++; sv = x; } });
  f.input.value = 'H'; f.event('input', { target: f.input });
  f.input.value = 'Hello'; f.event('input', { target: f.input });
  assert.equal(f.nodes.cmSend.disabled, false, 'send button turns on while typing');
  assert.equal(f.nodes.csCount.textContent, '5/600');
  assert.equal(f.nodes.cmList.innerHTML, list, 'room rows untouched by typing');
  assert.equal(paints, 0, 'no room paint ran for the keystrokes (paint always rewrites the status line)');
  f.win.LowiCommunity.refresh(); f.flush(); assert.ok(paints > 0, 'control: a real refresh does paint');
  f.input.value = ''; f.event('input', { target: f.input });
  assert.equal(f.nodes.cmSend.disabled, true, 'empty draft turns send off again');
  assert.match(js, /changed:\(\)=>\{if\(typingNow\)\{typed\(\);return;\}refresh\(\);\}/, 'draft saves from typing skip refresh()');
  assert.match(js, /if\(e\.target\.id!=='cmInput'\)return;typeDraft\(e\.target\.value\)/);
});

test('the draft typed is still kept for next time (saved to the device)', () => {
  const f = fixture(); f.scope('a');
  f.input.value = 'keep me'; f.event('input', { target: f.input });
  const saved = Object.entries(f.storage).find(([k]) => /community\.draft/.test(k));
  assert.ok(saved && /keep me/.test(saved[1]));
});

test('the room list holds the newest 60 messages and a Show earlier button; the button adds 60 more', () => {
  const f = fixture(); f.host.messages = () => many(300); f.scope('a'); f.click({ chat: 'history' });
  let h = f.nodes.cmList.innerHTML;
  assert.equal(rowCount(h), 60, 'newest 60 rows');
  assert.match(h, /line 299/); assert.doesNotMatch(h, /line 239\b/);
  assert.match(h, /data-chat="earlier"/); assert.match(h, /Show earlier messages/);
  f.click({ chat: 'earlier' }); h = f.nodes.cmList.innerHTML;
  assert.equal(rowCount(h), 120); assert.match(h, /line 180\b/);
  f.click({ chat: 'close-thread' }); f.win.LowiCommunity.refresh(); f.flush();
  assert.equal(rowCount(f.nodes.cmList.innerHTML), 60, 'closing the room shrinks it back');
});

test('a short room has no Show earlier button', () => {
  const f = fixture(); f.host.messages = () => many(12); f.scope('a'); f.click({ chat: 'history' });
  assert.equal(rowCount(f.nodes.cmList.innerHTML), 12); assert.doesNotMatch(f.nodes.cmList.innerHTML, /data-chat="earlier"/);
});

test('Show earlier messages has German and Spanish words', () => {
  assert.match(js, /earlier:\['Show earlier messages','Ältere Nachrichten zeigen','Ver mensajes anteriores'\]/);
});
