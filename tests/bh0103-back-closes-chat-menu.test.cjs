'use strict';
/* 29 Oct 2026 01:03 (bug hunt, simulated iPhone 15 and SE, live 20261029-010030): in Community > Chat, tap someone's bubble so the
   floating menu opens, then swipe back from the left edge (Android: back). The menu closed and Chat switched to Circle as well.
   back-swipe.js's topLayer() skips the menu's dialog box because it measures 0 px high, so its Escape went to the message list
   and on to Community's own Escape. Now any Escape while the menu is open closes only the menu.
   Browser check: tools/hunt-cx-back-0103.cjs (menu open, back -> still Chat, menu closed). */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const js = fs.readFileSync(path.join(__dirname, '..', 'community-chat.js'), 'utf8');
const line = js.split('\n').find(l => /^D\.addEventListener\('keydown',e=>\{if\(e\.key==='Escape'&&menuFor&&menuEl/.test(l));

test('an Escape while the chat menu is open is caught first (document, capture) and closes only the menu', () => {
  assert(line, 'capture listener present');
  assert.match(line, /,true\);\s*$/, 'capture phase, before Community\'s own Escape');
});

function run(open, key) {
  let listener = null, closed = 0, stopped = 0, prevented = 0;
  const D = { addEventListener: (t, f, cap) => { if (t === 'keydown' && cap === true) listener = f; } };
  const menuEl = { classList: { contains: c => c === 'on' && open } };
  new Function('D', 'menuFor', 'menuEl', 'closeMenu', line)(D, open ? 'm1' : '', open ? menuEl : null, () => { closed++; });
  listener({ key, preventDefault: () => prevented++, stopPropagation: () => stopped++ });
  return { closed, stopped, prevented };
}

test('menu open + back\'s Escape: the menu closes and the Escape goes no further (Chat stays)', () => {
  assert.deepEqual(run(true, 'Escape'), { closed: 1, stopped: 1, prevented: 1 });
});

test('menu closed: Escape passes through untouched (back from Chat still goes to Circle as before)', () => {
  assert.deepEqual(run(false, 'Escape'), { closed: 0, stopped: 0, prevented: 0 });
});

test('other keys are never caught', () => {
  assert.deepEqual(run(true, 'Enter'), { closed: 0, stopped: 0, prevented: 0 });
});
