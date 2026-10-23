'use strict';
/* Oct 23 bug hunt: What's New never showed after an update you got by reopening the app. tick() only offers the news on Home,
   but appFree() (since Oct 21) returned false whenever Home was the active page, so the offer never ran. tick now asks
   appFree(true): Home counts when nothing is on top. The old first-run tour stays off (the Settings tutorial replaced it),
   and a brand-new phone does not get a What's New bubble. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const cut = (a, b) => { const i = html.indexOf(a); assert(i >= 0, 'missing ' + a); const j = html.indexOf(b, i); assert(j > i, 'missing ' + b); return html.slice(i, j); };

test('the news check lets Home count as free; other callers keep the old rule', () => {
  const f = cut('function appFree(home){', '\nconst onHome');
  assert(f.includes('(!home && $("#tab-home.active"))'), 'Home is only excluded when home is not asked for');
  const t = cut('function tick(){', 'function init(){');
  assert(t.includes('if (!appFree(true))'), 'tick asks with home=true');
  assert(t.includes('if (!onHome()) return;'), 'the offer still waits for Home');
  assert(cut('function helpPlace(){', 'b.classList.toggle').includes('appFree()'), 'the ? button keeps the old rule');
});

test('the old first-run tour does not come back and a new phone gets no news bubble', () => {
  const t = cut('function tick(){', 'function init(){');
  const i = t.indexOf('if (!m.t && window.LowiTutorial)'); assert(i > 0);
  const g = t.slice(i, t.indexOf('else if (!m.t)', i));
  assert(!g.includes('start('), 'no old tour start while the Settings tutorial exists');
  assert(g.includes('!seenList().length') && g.includes('markSeen(NEWS.id)') && g.includes('localStorage.setItem(TOURED, NEWS.id)') && g.includes('remember({t:"skip"})'), 'a new phone gets neither the news bubble nor the Show me tour');
  assert(t.indexOf('offerNews()') > i, 'news offer comes after the guard');
});
