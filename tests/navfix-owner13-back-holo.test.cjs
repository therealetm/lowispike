'use strict';
/* Oct 28 2026 (owner request 13, Emmanuel on the call): one back returns where you came from, things that open in place stay in
   place. Plus the audit's chat notification that opened Home. Browser check: tools/check-navfix.cjs. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Kochen rises in place as a glass panel over the page it came from; a tap beside it goes back', () => {
  const js = read('section-nav.js'), css = read('section-nav.css');
  assert.match(js, /function holo\(from, to\)/);
  assert.match(js, /try \{ holo\(from, to\); \} catch \(e\) \{ \}/);
  assert.match(js, /u\.classList\.add\('holo-under'\)/);
  assert.match(js, /holoScrim\.id = 'cookHoloScrim'/);
  assert.match(js, /if \(tabOf\(\) === 'shelf'\) back\(\);/);
  assert.match(css, /html\.cook-holo #main>\.tab\.holo-under[^{]*\{opacity:1!important;pointer-events:none!important;content-visibility:visible!important\}/);
  assert.match(css, /html\.cook-holo #main>#tab-shelf\.active\{position:fixed;/);
  assert.match(css, /left:max\(10px, calc\(50% - 290px\)\);right:max\(10px, calc\(50% - 290px\)\);border-radius:30px/);
  assert.match(css, /html\.cook-holo #cookHoloScrim\{display:block;position:fixed;inset:0;z-index:11;/);
});

test('back returns to the page a page was opened from, and brings back the panel it was opened from', () => {
  const js = read('section-nav.js'), me = read('community-me.js');
  assert.match(js, /let trail = \[\];/);
  assert.match(js, /if \(top && top\.tab === to\) \{ trail\.pop\(\); if \(top\.reopen\)/);
  assert.match(js, /else if \(to === 'home'\) trail = \[\];/);
  assert.match(js, /try \{ track\(from, to\); \} catch \(e\) \{ \}/);
  assert.match(js, /if \(up && up\.tab !== 'home' && up\.tab !== tabOf\(\)\) \{ try \{ W\.goTab\(up\.tab\); return; \}/);
  assert.match(js, /api\.reopen = reopen;/);
  assert.match(js, /T\('Back', 'Zurück', 'Atrás'\)/);
  assert.match(me, /function away\(go\)/);
  assert.match(me, /L\.tab\(\) !== t0\) L\.reopen\(\(\) => open\(\)\)/);
});

test('the Essenspause panel is smaller and see-through, centred, Home visible around it', () => {
  const css = read('gap-view.css'), tail = css.slice(css.indexOf('owner request 13'));
  assert.ok(css.indexOf('owner request 13') > 0);
  assert.match(tail, /\.gv-ov \{ align-items: center;[^}]*background: rgba\(2, 8, 28, \.16\); \}/);
  assert.match(tail, /\.gv-card \{ width: min\(calc\(100% - 36px\), 370px\); max-width: 370px; max-height: min\(64%, 580px\);/);
  assert.match(tail, /backdrop-filter: blur\(16px\)/);
  assert.match(tail, /rgba\(11, 29, 74, \.58\)/);
});
