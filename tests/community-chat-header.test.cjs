'use strict';
/* 22 Oct 2026 (item 37b): Emmanuel's iPhone screenshot - message text showed through behind the galaxy chat's top bar and pinned bar,
   and the Community tab row above the room (item 36) stayed dark in Day. Browser check: tools/community-chat-eden/probe.cjs. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '..', 'community-tg.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const P = 'html body #tab-foryou #cmPaneChat#cmPaneChat[data-room]';
const rule = sel => { const i = css.indexOf(sel + '{'); assert(i >= 0, 'missing rule ' + sel); return css.slice(i, css.indexOf('}', i)); };
const alpha = (r, t) => { const m = r.match(new RegExp(t + ':rgba\\([^)]*,\\s*([\\d.]+)\\)')); assert(m, t); return +m[1]; };

test('the strip behind the top bar and pinned bar is nearly opaque in Night and Day, with no fade at its edge', () => {
  assert(alpha(rule(P), '--cr-strip') >= 0.9, 'night strip');
  assert(alpha(rule('html[data-theme=light] body #tab-foryou #cmPaneChat#cmPaneChat[data-room]'), '--cr-strip') >= 0.9, 'day strip');
  const strip = rule(P + ' .cr-head::before');
  assert.match(strip, /height:var\(--cr-top\)/);
  assert.doesNotMatch(strip, /mask-image/);
});

test('item 38: the room top bar, the pinned banner and the recent-voices strip are gone', () => {
  assert.match(css, /html body #tab-foryou #cmPaneChat#cmPaneChat\[data-room\] :is\(\.cg-thead\.cr-head,#crPin,#crCrew\)\{display:none!important\}/);
  assert.match(rule(P), /--cr-top:12px/);
});

test('item 38: the item 36/37b room-only tab row is gone, Chat uses the shared Community tab bar', () => {
  assert.doesNotMatch(css, /html\.cr-room\[data-lay=phone\] #cmPaneChat\[data-spirit-chat\]\[data-room\]>\.rm-bar\{display:flex!important/);
  assert.doesNotMatch(css, /html\[data-theme=light\]\.cr-room\[data-lay=phone\] #cmPaneChat\[data-spirit-chat\]\[data-room\] \.rm-tabs/);
});
