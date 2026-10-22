'use strict';
/* Item 33 sweep (22 Oct 2026): back from a Community chat room goes to the channel list, never straight Home, and the Home X never
   sits on the Community logo or on the room's back arrow. Simulation: tools/community-sweep/sweep.cjs (room back, phone back,
   Escape, edge swipe, and an overlap check for the X on every step). */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('phone back and edge swipe in a chat room go to the channel list first', () => {
  const s = R('section-nav.js');
  assert.match(s, /function innerBack\(\)/);
  assert.match(s, /rm-room-open/, 'only while a chat room is open on Community');
  assert.match(s, /U\.setTab\(true\)/, 'the channel list, like the room\'s back arrow');
  assert.match(s, /function back\(\) \{ if \(innerBack\(\)\) return;/, 'the edge swipe');
  assert.match(s, /if \(innerBack\(\)\) \{ try \{ history\.pushState\(\{ lowiSec: tabOf\(\) \}, ''\); \} catch \(x\) \{ \} return; \}/, 'phone back keeps a history entry so the next back leaves Community');
  /* sheets on top of the room still close first */
  assert.ok(s.indexOf('if (openSheet())') < s.indexOf('if (innerBack()) { try'), 'an open sheet closes before the room');
});

test('Escape in a chat room goes to the channel list', () => {
  const c = R('community-chat.js');
  assert.match(c, /e\.key==='Escape'&&threadOpen&&active\(\)&&!D\.querySelector\('\.r2-ov\.on'\)\)\{[^{}]*?U\.setTab\(true\);else thread\(false\)/);
});

test('the Home X steps aside in a chat room and clears the Community logo', () => {
  const u = R('community-rooms-ui.js'), css = R('community-rooms.css');
  assert.match(u, /classList\.toggle\('rm-room-open',!!\(chat&&pageActive\(\)\)\)/, 'set only while Community is on screen');
  assert.match(u, /dropFrames\(null\);D\.documentElement\.classList\.remove\('rm-room-open'\)/, 'cleared when Community closes, so other sections keep their X');
  assert.match(css, /html\.rm-room-open \.sec-x\{display:none!important\}/);
  assert.match(css, /html\.sec-open #cmPaneChat\[data-spirit-chat\]>\.rm-bar \.rm-head\{padding-left:/);
});
