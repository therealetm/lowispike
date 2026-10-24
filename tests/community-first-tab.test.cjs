'use strict';
/* Item 33 (22 Oct 2026, Emmanuel: "when I open Community something different is supposed to be the first thing that opens, but it
   always opens the chat. And then after that it opens what I set my first page to be"). Community opens straight on the first tab
   of the saved order, with nothing else drawn first. Simulation: tools/community-sweep/first-tab.cjs. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../community-tab-order.js');

test('firstAction: every opening lands on the first tab of the order', () => {
  const A = C.firstAction;
  /* first = Studio (Affiliates + Creation since 24 Oct 2026): from Room, from Chat, from a chat room left open, already there */
  assert.strictEqual(A('studio', '', false, false, false), 'studio');
  assert.strictEqual(A('studio', 'chans', false, false, false), 'studio');
  assert.strictEqual(A('studio', '', true, false, false), 'studio', 'a chat room left open on the last visit no longer wins');
  assert.strictEqual(A('studio', 'aff', false, false, false), null, 'already in Studio (Affiliates half)');
  assert.strictEqual(A('studio', 'create', false, false, false), null, 'already in Studio (Creation half)');
  assert.strictEqual(A('aff', 'chans', false, false, false), 'studio', 'an old saved first tab reads as Studio');
  /* first = For You */
  assert.strictEqual(A('fy', '', false, false, false), 'fy');
  assert.strictEqual(A('fy', 'fy', false, false, false), null);
  assert.strictEqual(A('fy', 'aff', false, false, false), 'fy');
  /* first = Room */
  assert.strictEqual(A('room', '', false, false, false), null);
  assert.strictEqual(A('room', 'chans', false, false, false), 'room');
  assert.strictEqual(A('room', '', true, false, false), 'room', 'the old chat room closes: Room shows');
  assert.strictEqual(A('room', 'create', false, false, false), 'room');
  assert.strictEqual(A('room', 'fy', false, false, false), 'room');
  /* first = Chat: the galaxy chat room itself since item 36 (there is no channel list any more) */
  assert.strictEqual(A('chat', '', false, false, false), 'chat');
  assert.strictEqual(A('chat', 'chans', false, false, false), 'chat');
  assert.strictEqual(A('chat', 'aff', false, false, false), 'chat');
  assert.strictEqual(A('chat', '', true, false, false), null, 'already in the chat room: leave it');
  /* only a chat room opened for this visit (a reply from a Home visit) or a deep link is left alone */
  assert.strictEqual(A('studio', '', true, true, false), null);
  assert.strictEqual(A('room', 'chans', false, false, true), null);
  /* nonsense order falls back to Room */
  assert.strictEqual(A('cook', 'chans', false, false, false), 'room');
  assert.ok(C.FRESH_MS >= 800 && C.FRESH_MS <= 3000);
});

test('reopening Community keeps the live page instead of rebuilding it (no stale chat, then galaxy, then first tab)', () => {
  const s = R('index.html');
  const g = s.slice(s.indexOf('function goTab(t){'), s.indexOf('let homeSig = "";'));
  assert.match(g, /const keepCommunity = t === "foryou" && cached && TAB !== "foryou" && !!document\.querySelector\("#tab-foryou #cmPaneChat\[data-spirit-chat\]"\)/);
  const k = g.indexOf('if (keepCommunity)'), r = g.indexOf('refreshCachedTab(t)');
  assert.ok(k > 0 && k < r, 'kept before the rebuild path');
  assert.match(g.slice(k, g.indexOf('\n', k)), /cancelTabRefresh\(\);.*LowiCommunity\.refresh\(\).*return;/);
});

test('the first tab is set in the same turn Community opens, the bar is built on the spot, Home replies are stamped', () => {
  const s = R('community-tab-order.js');
  const f = s.slice(s.indexOf('function openFirst('), s.indexOf('function check()'));
  assert.match(f, /if \(R && !t && R\.paint\) \{ try \{ R\.paint\(\); \} catch \(e\) \{ \} t = tabsEl\(\); \}/);
  assert.match(f, /firstAction\(order\(\)\[0\]/);
  assert.doesNotMatch(f, /if \(th && th\.hasAttribute\('data-open'\)\) return;/, 'a leftover chat room must not block the first tab');
  assert.match(s, /C\.openMessage = function \(\) \{ roomStamp = Date\.now\(\);/);
  assert.match(s, /C\.thread = function \(o\) \{ if \(o && !isOpen\(\)\) roomStamp = Date\.now\(\);/);
  assert.match(s, /new MutationObserver\(check\)\.observe\(p, \{ attributes: true, attributeFilter: \['class'\] \}\)/);
});

test('Creation and Affiliates frames: a rebuilt page never leaves them blank, hidden pages are freed', () => {
  const s = R('community-rooms-ui.js');
  const e = s.slice(s.indexOf('function ensureView('), s.indexOf('function copyText('));
  assert.match(e, /for\(const k in frames\)if\(frames\[k\]\.parentNode!==box\)/, 'a detached frame is dropped and made again');
  assert.match(s, /function dropFrames\(keep\)/);
  assert.match(s, /if\(chat\)dropFrames\(''\);/, 'opening the chat room frees the hidden Creation/Affiliates pages');
  assert.match(s, /if\(cls&&pageOn&&!on\)\{dropFrames\(null\);/, 'leaving Community frees them all');
  assert.match(s, /if\(kids&&on&&!\(bar&&bar\.isConnected\)\)paint\(\);/, 'a rebuilt page gets its tab bar in the same frame');
});

test('no warp into the galaxy when the first tab is not Room', () => {
  const s = R('galaxy-zoom.js');
  assert.match(s, /if \(from === 'home' && t === 'foryou' && firstIsRoom\(\)\) dir = 'out';/);
  assert.match(s, /T\.order\(\)\[0\] === 'room'/);
});

test('chat room memory: message bubbles have no backdrop blur of their own (item 29/33)', () => {
  const s = R('community-tg.css');
  const i = s.indexOf('.cr-room .cp-msg .cm-bub{display:flow-root!important;');
  assert(i > 0);
  const rule = s.slice(i, s.indexOf('}', i));
  assert.match(rule, /-webkit-backdrop-filter:none!important;backdrop-filter:none!important/);
  assert.doesNotMatch(rule, /blur\(/);
  /* item 37: own bubbles are a flat brand gradient (no blur either) */
  assert.match(s, /\.cp-msg\.mine \.cm-bub\{background:var\(--cr-mine-c\)!important;background-image:var\(--cr-mine-g\)!important;/);
});
