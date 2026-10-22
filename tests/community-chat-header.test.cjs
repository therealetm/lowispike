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

test('the message list starts below the strip, which runs past the pinned bar', () => {
  assert.match(rule(P + ' .cr-room #cmList.cm-list'), /padding:var\(--cr-top\)/);
  const top = +rule(P).match(/--cr-top:(\d+)px/)[1], pin = rule(P + ' .cr-pin');
  const pinBottom = +pin.match(/top:(\d+)px/)[1] + +pin.match(/min-height:(\d+)px/)[1];
  assert(top >= pinBottom + 4, 'strip ' + top + ' vs pinned bar bottom ' + pinBottom);
});

test('item 36 tab-row rules stay, and Day gets a light tab row', () => {
  const R = 'html.cr-room[data-lay=phone] #cmPaneChat[data-spirit-chat][data-room]';
  assert.match(css, /html\.cr-room\[data-lay=phone\] #cmPaneChat\[data-spirit-chat\]\[data-room\]>\.rm-bar\{display:flex!important/);
  assert.match(css, /html\.cr-room\[data-lay=phone\] #cmPaneChat\[data-spirit-chat\]\[data-room\]>\.rm-bar>:not\(\.rm-tabs\)\{display:none!important\}/);
  assert.match(rule(R + ' .rm-tabs'), /backdrop-filter:none!important;background:rgba\(8,16,40,\.94\)!important/);
  const day = rule('html[data-theme=light].cr-room[data-lay=phone] #cmPaneChat[data-spirit-chat][data-room] .rm-tabs');
  assert.match(day, /background:rgba\(255,255,255,\.9\d\)!important/);
  assert.match(css, /html\[data-theme=light\]\.cr-room\[data-lay=phone\] #cmPaneChat\[data-spirit-chat\]\[data-room\] \.rm-tabs \.rm-tab\{color:#3a465c!important/);
});
