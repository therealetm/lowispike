'use strict';
/* Item 36 (22 Oct 2026, Emmanuel, screenshot of Community > Chat: "I don't understand what all these rooms are. Remove it so they get
   straight to the chat group."). The Chat tab, and opening Community when Chat is the first tab, opens the galaxy group chat itself:
   no "Your galaxy" landing, no room list. Back from the chat goes to the Community tab you came from, else leaves Community.
   Replies & mentions stay one tap away in the Community menu. Simulation: /tmp/probe36.cjs style runs in tools/community-sweep. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* community-rooms-ui.js in a bare page: no Community pane, so paint() draws nothing; the galaxy chat is a fake #cgThread */
function load(directed) {
  const attrs = {}, th = { hasAttribute: k => k in attrs, setAttribute: (k, v) => { attrs[k] = v; }, removeAttribute: k => { delete attrs[k]; } };
  const calls = [];
  const D = { readyState: 'loading', addEventListener() {}, getElementById: id => id === 'cgThread' ? th : null, querySelector: () => null, querySelectorAll: () => [], documentElement: { classList: { contains: () => false, toggle() {}, add() {}, remove() {} } } };
  const LC = { thread(o) { calls.push(o ? 'open' : 'close'); if (o) th.setAttribute('data-open', ''); else th.removeAttribute('data-open'); }, refresh() {}, directed: () => ({ list: directed || [] }), openMessage(uid, id) { calls.push('msg:' + uid + ':' + id); th.setAttribute('data-open', ''); } };
  const W = { getComputedStyle: () => ({}), addEventListener() {}, LowiCommunity: LC, LowiRooms: null };
  const ctx = { window: W, document: D, setInterval() {}, setTimeout() {}, location: { hash: '' }, navigator: { language: 'en' } }; vm.createContext(ctx);
  vm.runInContext(R('community-rooms-ui.js'), ctx);
  return { U: W.LowiRoomsUI, open: () => 'data-open' in attrs, calls };
}

test('the Chat tab opens the galaxy chat itself, never the channel list', () => {
  const { U, open, calls } = load();
  U.setTab(true);
  assert.strictEqual(open(), true, 'the galaxy chat room is open');
  assert.notStrictEqual(U.view(), 'chans', 'no channel landing');
  assert.deepStrictEqual(calls, ['open']);
  U.setTab(true); assert.deepStrictEqual(calls, ['open'], 'tapping Chat again does not reopen it');
  /* anything still asking for the old landing gets the chat */
  U.setTab(false); assert.strictEqual(open(), false);
  U.showView('chans'); assert.strictEqual(open(), true); assert.strictEqual(U.view(), '');
});

test('back from the chat: the tab you came from, else nothing to go back to (Community closes)', () => {
  const { U, open } = load();
  U.showView('aff'); U.setTab(true); assert.strictEqual(U.from(), 'aff');
  assert.strictEqual(U.back(), true); assert.strictEqual(U.view(), 'aff'); assert.strictEqual(open(), false);
  U.setTab(false); U.setTab(true); assert.strictEqual(U.from(), 'room');
  assert.strictEqual(U.back(), true); assert.strictEqual(open(), false); assert.strictEqual(U.view(), '');
  /* Chat as the first tab: nothing behind it */
  U.showView('create'); U.setTab(true, true); assert.strictEqual(U.from(), '');
  assert.strictEqual(U.back(), false, 'the caller (section-nav) closes Community');
  assert.strictEqual(U.back(), false);
});

test('Replies & mentions: the newest one is in the Community menu and opens in the chat', () => {
  const js = R('community-rooms-ui.js');
  assert.match(js, /function lastDirected\(\)/);
  assert.match(js, /if\(dl\)it\.unshift\(\['replies','💬',tr\('chReplies'\)/);
  assert.match(js, /if\(k==='replies'\)\{const dl=lastDirected\(\),c=W\.LowiCommunity;if\(dl&&c&&c\.thread\)\{const f=cur\(\);view='';c\.thread\(true,dl\.m\.id\);/);
  assert.match(js, /chReplies:\['Replies & mentions','Antworten & Erwähnungen','Respuestas y menciones'\]/);
});

test('wiring: first tab, room back arrow, phone back, Escape, leaving Community', () => {
  const o = R('community-tab-order.js'), u = R('community-rooms-ui.js'), n = R('section-nav.js'), c = R('community-chat.js');
  assert.match(o, /if \(first === 'chat'\) return room \? null : 'chat';/);
  assert.match(o, /else if \(act === 'chat'\) R\.setTab\(true, true\);/, 'opened as the first tab: back leaves Community');
  assert.match(u, /<button type="button" class="rm-back" data-rm="back"><\/button>/);
  assert.match(u, /if\(a==='back'\)goBack\(\);/);
  assert.match(n, /const U = W\.LowiRoomsUI; if \(!U \|\| typeof U\.back !== 'function'\) return false;\s*try \{ return !!U\.back\(\); \}/);
  assert.strictEqual((c.match(/const U=W\.LowiRoomsUI,S=W\.LowiSections;if\(U&&U\.back&&S&&S\.back&&D\.documentElement\.classList\.contains\('rm-room-open'\)\)S\.back\(\);else thread\(false\);/g) || []).length, 2, 'the room\'s arrow and Escape');
  assert.doesNotMatch(c, /U\.setTab\(true\)/);
  assert.match(u, /classList\.remove\('rm-room-open'\);from='';if\(open\(\)\)\{try\{W\.LowiCommunity\.thread\(false\);\}catch\(x\)\{\}\}/, 'leaving Community closes the chat, so html.cr-room never pauses Home');
});

test('phones: the tab row stays above the chat room, with no extra glass blur', () => {
  const css = R('community-tg.css');
  assert.match(css, /html\.cr-room\[data-lay=phone\] #cmPaneChat\[data-spirit-chat\]\[data-room\]>\.rm-bar\{display:flex!important;/);
  assert.match(css, /html\.cr-room\[data-lay=phone\] #cmPaneChat\[data-spirit-chat\]\[data-room\]>\.rm-bar>:not\(\.rm-tabs\)\{display:none!important\}/);
  assert.match(css, /\[data-room\] \.rm-tabs\{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;/);
});
