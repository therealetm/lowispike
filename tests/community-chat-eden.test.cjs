'use strict';
/* 22 Oct 2026 (item 37): the Community room in the Eden layout, in LOWiSPIKE's brand colours, light by Day and dark by Night.
   The browser check is tools/community-chat-eden/probe.cjs (simulated iPhone SE, 13, 15 and Pixel 7, both themes). */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('community-tg.css').replace(/\/\*[\s\S]*?\*\//g, ''), js = read('community-chat.js');
const P = 'html body #tab-foryou #cmPaneChat#cmPaneChat[data-room]';
const rule = sel => { const i = css.indexOf(sel + '{'); assert(i >= 0, 'missing rule ' + sel); return css.slice(i, css.indexOf('}', i)); };

test('night and day are token sets on the room; Day follows html[data-theme=light] so a theme change restyles the open room live', () => {
  const night = rule(P), day = rule('html[data-theme=light] body #tab-foryou #cmPaneChat#cmPaneChat[data-room]');
  for (const t of ['--cr-canvas', '--cr-text', '--cr-bub', '--cr-mine-c', '--cr-mine-g', '--cr-time', '--cr-acc', '--cr-glass', '--cr-field', '--cr-strip']) { assert.match(night, new RegExp(t + ':'), 'night ' + t); assert.match(day, new RegExp(t + ':'), 'day ' + t); }
  assert.match(night, /--cr-bub:#18233f/); assert.match(day, /--cr-bub:#ffffff/);
  assert.match(night, /#1ad9e6/, 'night own bubble in Brain cyan to Gut mint'); assert.match(day, /--cr-text:#0f1729/);
  assert.match(css, /html\[data-theme=light\] body #tab-foryou #cmPaneChat#cmPaneChat\[data-room\] \.cr-sky\{display:none!important\}/, 'no stars by day');
});

test('bubbles: filled, no outline, no blur of their own; own bubbles without avatar; avatar gap only inside a group', () => {
  const b = rule(P + ' .cr-room .cp-msg .cm-bub');
  assert.match(b, /border:0!important/); assert.match(b, /background:var\(--cr-bub\)!important/); assert.match(b, /backdrop-filter:none!important/); assert.doesNotMatch(b, /blur\(/);
  assert.match(css, /\.cr-room \.cp-msg\.mine \.cp-av\{display:none!important\}/);
  assert.match(css, /\.cr-room \.cp-msg \.cp-av\.cp-gap\{visibility:hidden\}/);
  assert.match(css, /\.cp-msg:not\(\.mine\) \.cm-bub\{border-bottom-left-radius:6px!important\}/, 'tail corner next to the avatar');
});

test('time sits inline at the end of the last line: text flows inline, the footer floats right, the actions button is visually hidden but kept', () => {
  assert.match(rule(P + ' .cr-room .cp-msg .cm-t'), /display:inline!important/);
  assert.match(rule(P + ' .cr-room .cm-foot'), /float:right!important/);
  assert.match(rule(P + ' .cr-room .cm-foot .cp-more'), /clip-path:inset\(50%\)/);
  assert.match(css, /\.cm-foot \.cp-more:focus-visible\{position:static!important/, 'keyboard users still reach it');
  assert.match(js, /'cp-more'\)\)\+'<time datetime=/, 'the actions button still renders before the time');
});

test('reactions are small pills, actions are small pills', () => {
  const c = rule(P + ' .cr-room .cm-rx .cm-chip');
  assert.match(c, /height:24px!important/); assert.match(c, /border-radius:12px!important/); assert.match(c, /border:0!important/);
  assert.match(rule(P + ' .cr-room .cp-acts .cm-mini'), /height:30px!important/);
});

test('item 38: the room is a rounded box under the tab bar and the composer is its bottom, in the flow; typing ends the box above the keyboard', () => {
  const c = rule(P + ' .cm-compose'), box = rule(P + ' .cp-room.cg-room#cpRoom');
  assert.match(c, /position:relative!important;inset:auto!important;flex:none!important/);
  assert.match(c, /border-radius:0 0 28px 28px!important/);
  assert.match(box, /border-radius:28px 28px 0 0!important/);
  assert.match(box, /max-width:760px!important/, 'as wide as the tab bar');
  assert.doesNotMatch(css, /#cmPaneChat#cmPaneChat\[data-room\]\{padding:0!important\}/, 'the pane keeps the padding of the other tabs');
  assert.match(css, /html\.cs-chat-typing body #tab-foryou #cmPaneChat#cmPaneChat\[data-room\]\{padding-bottom:8px!important\}/);
  assert.match(rule(P + ' .cg-thread.cr-room[data-open]'), /inset:0!important/);
  assert.match(css, /\.cr-room #cmList\.cm-list\.cm-list\{padding-top:12px!important;padding-bottom:10px!important/, 'nothing floats over the end of the list');
});

test('the room stays light on the phone: two frosted strips, the room itself has no full-screen blur', () => {
  const blurs = css.match(/(?<!-webkit-)backdrop-filter:blur\(/g) || [];
  assert.equal(blurs.length, 2, 'top strip and composer strip only');
  assert.match(rule(P + ' .cg-thread.cr-room[data-open]'), /-webkit-backdrop-filter:none!important;backdrop-filter:none!important/);
  assert.match(css, /@media\(prefers-reduced-transparency:reduce\)/);
});

test('community-chat.js measures the composer, keeps the newest message in view as it grows, and adds a round jump-to-latest button', () => {
  assert.match(js, /function roomDress\(p,on\)\{/);
  assert.match(js, /new ResizeObserver\(\(\)=>\{const h=Math\.round\(c\.getBoundingClientRect\(\)\.height\),l=D\.getElementById\('cmList'\),d=h-\(compRO\.__h\|\|h\);/);
  assert.match(js, /if\(l&&d>0&&l\.scrollHeight-l\.scrollTop-l\.clientHeight-d<90\)l\.scrollTop=l\.scrollHeight;/);
  assert.match(js, /b\.className='cr-down';b\.setAttribute\('data-chat','latest'\)/);
  assert.match(js, /COPY\.toLatest=\['Jump to the latest message','Zur neuesten Nachricht','Ir al último mensaje'\]/);
  assert.match(js, /th\.classList\.toggle\('cr-up',!nb\)/, 'scrolling up shows it, reaching the bottom hides it');
  assert.match(js, /roomDress\(p,on\);\}/, 'set and cleared with the room flag');
});

test('item 38: fit() keeps the field you type in above the keyboard and the newest message in view', () => {
  assert.match(js, /stick=!!l&&\(!roomKbH\|\|l\.scrollHeight-l\.scrollTop-l\.clientHeight<140\)/);
  assert.match(js, /over=Math\.ceil\(r\.bottom\+10-bottom\)/);
  assert.match(js, /if\(!typing\)\{roomKbH=0;return;\}/);
});
