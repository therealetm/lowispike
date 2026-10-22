'use strict';
/* Affiliates: every screen can be scrolled to its bottom after a screen change (22 Oct 2026).
   The layout check (tools/blueprint/check.cjs) timed out on iPhone 13 tapping 'Zu den Aufnahmen' on the UGC script: WebKit on
   iPhone-sized screens stopped scrolling at an old, shorter height when the views were swapped while the page was scrolled far down
   and only then scrolled to the top. Reproduced on a bare page with no app code (WebKit, iPhone 13): swap then scroll = stuck,
   scroll then swap = fine. The longer scripts with the Listen card made the jump big enough. So go() scrolls up first. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'affiliates', 'blueprint.js'), 'utf8');

test('go() scrolls to the top before it swaps the views', () => {
  const m = src.match(/function go\(to\) \{([\s\S]*?)\n  \}/);
  assert.ok(m, 'go() found');
  const body = m[1].replace(/\/\*[\s\S]*?\*\//g, '');
  const firstScroll = body.indexOf('window.scrollTo(0, 0)'), swap = body.indexOf('show()');
  assert.ok(firstScroll >= 0 && swap >= 0, 'go() scrolls and shows');
  assert.ok(firstScroll < swap, 'scrollTo(0, 0) comes before show()');
});

test('the layout check proves each screen can still be scrolled to its bottom', () => {
  const chk = fs.readFileSync(path.join(__dirname, '..', 'tools', 'blueprint', 'check.cjs'), 'utf8');
  assert.match(chk, /async function reach\(/, 'reach() helper');
  assert.ok((chk.match(/await reach\(page, W, /g) || []).length >= 4, 'reach() runs after the screen changes');
});
