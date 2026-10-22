'use strict';
/* Item 33 sweep (22 Oct 2026): back from a Community chat room goes to the channel list, never straight Home, and the Home X never
   sits on the Community logo or on the room's back arrow. Simulation: tools/community-sweep/sweep.cjs (room back, phone back,
   Escape, edge swipe, and an overlap check for the X on every step).
   Item 36 (22 Oct): the channel list is gone (Chat opens the galaxy chat itself), so back now goes to the Community tab you came
   from, else leaves Community. tests/community-chat-direct.test.cjs covers that rule. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('phone back and edge swipe in a chat room go to the tab you came from first (item 36; was the channel list)', () => {
  const s = R('section-nav.js');
  assert.match(s, /function innerBack\(\)/);
  assert.match(s, /rm-room-open/, 'only while a chat room is open on Community');
  assert.match(s, /try \{ return !!U\.back\(\); \}/, 'the tab you came from (LowiRoomsUI.back), like the room\'s back arrow');
  assert.doesNotMatch(s, /U\.setTab\(true\)/, 'no channel list to go back to any more');
  assert.match(s, /function back\(\) \{ if \(innerBack\(\)\) return;/, 'the edge swipe');
  assert.match(s, /if \(innerBack\(\)\) \{ try \{ history\.pushState\(\{ lowiSec: tabOf\(\) \}, ''\); \} catch \(x\) \{ \} return; \}/, 'phone back keeps a history entry so the next back leaves Community');
  /* sheets on top of the room still close first */
  assert.ok(s.indexOf('if (openSheet())') < s.indexOf('if (innerBack()) { try'), 'an open sheet closes before the room');
});

test('Escape in a chat room goes back like the room\'s back arrow (item 36; was the channel list)', () => {
  const c = R('community-chat.js');
  assert.match(c, /e\.key==='Escape'&&threadOpen&&active\(\)&&!D\.querySelector\('\.r2-ov\.on'\)\)\{[^{}]*?S\.back\(\);else thread\(false\)/);
});

test('item 38: the Home back button stays in its place in the chat room; the room flag still clears with Community', () => {
  const u = R('community-rooms-ui.js'), css = R('community-rooms.css');
  assert.match(u, /classList\.toggle\('rm-room-open',!!\(chat&&pageActive\(\)\)\)/, 'set only while Community is on screen');
  assert.match(u, /dropFrames\(null\);D\.documentElement\.classList\.remove\('rm-room-open'\)/, 'cleared when Community closes, so other sections keep their X');
  assert.doesNotMatch(css, /html\.rm-room-open \.sec-x\{display:none!important\}/, 'the back button no longer steps aside on Chat');
  assert.match(css, /html\.sec-open #cmPaneChat\[data-spirit-chat\]>\.rm-bar \.rm-head\{padding-left:/);
});
