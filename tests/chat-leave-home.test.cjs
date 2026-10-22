'use strict';
/* Oct 22 2026 (Emmanuel's screen recording, German, iPhone): back on Home from the Community chat, Home stayed covered by the
   spirit world behind the chat (big see-through cells in nets of dots and lines), his bubbles faded and Misty barely there.
   Cause: the camera's dive from Community back to Misty only moved on world frames, at most 0.05 s per frame, so on a busy
   phone it took 10-15 s (simulated: 14.7 s on a slowed Pixel 7), never ended with no frames at all, and settle() did nothing
   once the dive had started. The dive now lands by the wall clock. Browser check: tools/chat-leave/probe.cjs. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const wh = read('world-home.js'), nav = read('section-nav.js'), rooms = read('community-rooms-ui.js');

test('the dive back to Home ends by the wall clock, even with slow or no world frames', () => {
  assert.match(wh, /const DIVE_MAX = (\d+);/);
  assert(+wh.match(/const DIVE_MAX = (\d+);/)[1] <= 1000, 'Home looks normal within a second');
  assert(wh.includes('dive: true, w0: now()'), 'the dive remembers when it started');
  assert(wh.includes('(z.dive && now() - z.w0 > DIVE_MAX)'), 'a slow frame ends a late dive');
  assert(wh.includes('setTimeout(() => { if (st.zoomAnim === z) landZoom(); }, DIVE_MAX + 60);'), 'no frames at all: a timer lands it');
  const land = wh.slice(wh.indexOf('function landZoom() {'), wh.indexOf('function landZoom() {') + 500);
  for (const bit of ['st.zoomAnim = null;', 'r.dist = z.to;', 'paintZoom();', 'frame(0);']) assert(land.includes(bit), 'landing: ' + bit);
});

test('settle() lands a running dive, and a second diveIn() never aims at the spirit world', () => {
  assert(wh.includes('else if (st.zoomAnim && st.zoomAnim.dive) landZoom();'));
  assert(wh.includes("r.dist > (r.maxD || 13) * 1.01 ? { dist: baseDist(r), pitch: 0.42 } : { dist: r.dist, pitch: r.pitch }"));
});

test('leaving Community still closes the chat and the X / back stay instant', () => {
  assert(rooms.includes('W.LowiCommunity.thread(false)'), 'leaving Community closes the chat room');
  assert(nav.includes('function homeWorldNow()'), 'X / back put the world home in the same moment');
});
