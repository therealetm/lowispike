'use strict';
/* 22 Oct 2026 (item 41): Eman on his iPhone, Community > Chat: "Look at the text bar. It's way too low. And when you try to type,
   it doesn't work." The room is sized to the visual viewport, so the composer sits above Safari's toolbar and the home indicator
   at rest and right on the keyboard while typing; the room name pill no longer spills over the pinned message.
   The browser check is tools/community-chat-kb/probe.cjs (WebKit iPhone SE, 13, 15 as Safari and home-screen app, Pixel 7). */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('community-tg.css').replace(/\/\*[\s\S]*?\*\//g, ''), js = read('community-chat.js');

test('in a room the app follows the visual viewport (top and height), only while Community is the open tab', () => {
  assert.match(css, /html\.cr-room:has\(#tab-foryou\.active\) #app\{top:var\(--cr-vv-top,0px\)!important;bottom:auto!important;height:var\(--cr-vv-h,100%\)!important\}/);
});

test('roomVV writes the visual viewport into --cr-vv-top / --cr-vv-h on every viewport change and undoes iOS scrolling the page to the field', () => {
  const i = js.indexOf('function roomVV(){'); assert(i > 0, 'roomVV exists');
  const f = js.slice(i, js.indexOf('\nfunction fit(){', i));
  assert.match(f, /v\.offsetTop/); assert.match(f, /v\.height/);
  assert.match(f, /setProperty\('--cr-vv-top'/); assert.match(f, /setProperty\('--cr-vv-h'/);
  assert.match(f, /D\.scrollingElement/, 'page scroll put back'); assert.match(f, /getElementById\('tab-foryou'\)/);
  assert.match(f, /hasAttribute\('data-room'\)/, 'scroll reset only in a room');
  assert.match(f, /list\.scrollTop=list\.scrollHeight/, 'stays on the newest message');
  assert.match(js, /function fit\(\)\{\n roomVV\(\);/, 'fit (visualViewport resize + scroll, focus) runs it first');
  assert.match(js, /W\.visualViewport\.addEventListener\('scroll',fit\);\}roomVV\(\);/, 'set once at start');
});

test('typing height in a room trims what the field still hides (item 38 shell); the list stays on the newest message when the composer grows', () => {
  assert.match(js, /if\(over>0&&D\.activeElement===inp\)pane\.style\.setProperty\('--cs-keyboard-height',Math\.max\(0,h-over\)\+'px'\)/);
  assert.match(js, /if\(l&&d>0&&l\.scrollHeight-l\.scrollTop-l\.clientHeight-d<90\)l\.scrollTop=l\.scrollHeight;/);
});

test('room name pill lays out in one row and clips, so its text cannot fall onto the pinned message', () => {
  const i = css.indexOf('.cr-head .cr-id{'), r = css.slice(i, css.indexOf('}', i));
  assert.match(r, /flex-direction:row!important/); assert.match(r, /flex-wrap:nowrap!important/); assert.match(r, /overflow:hidden/); assert.match(r, /height:48px/);
});

test('message field stays at 16 px or more so iOS does not zoom when it focuses', () => {
  assert.match(css, /textarea#cmInput[^{]*\{[^}]*font-size:16px!important/);
});

test('typing puts back any ancestor scroll iOS made, and the @mention list in a room is one sideways row', () => {
  assert.match(js, /mentions\(\);\/\*[^*]*\*\/if\(threadOpen\)\(W\.requestAnimationFrame\|\|setTimeout\)\(roomVV\);\}\);/);
  assert.match(css, /\.cm-compose #cmMention:not\(:empty\)\{flex-wrap:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important/);
});
