'use strict';
/* 29 Oct 2026 sweep: on an iPhone SE (320x568) Swipen opened inside Circle with its Rückgängig row (514-569) under the floating
   bottom back button #lwBX (498-554), so Undo could not be tapped until the panel was scrolled by hand. Opening a Circle game now
   scrolls the panel just enough that the game's main control ends above the button, and stops once the user scrolls. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'circle-games.js'), 'utf8');

function cls(list) { const s = new Set(list); return { contains: c => s.has(c), add: (...c) => c.forEach(x => s.add(x)), remove: (...c) => c.forEach(x => s.delete(x)), toggle: (c, on) => { if (on === undefined ? !s.has(c) : on) s.add(c); else s.delete(c); } }; }

function boot(hiddenChecks) {
  const timers = [];
  let hidden = hiddenChecks || 0;
  const sb = { scrollTop: 6, scrollHeight: 414, clientHeight: 334, on: {}, addEventListener(ev, f) { this.on[ev] = f; } };
  /* Swipen's action row: at scrollTop 6 it sits at 514-569 (live iPhone SE measurement) */
  const row = ['Nie wieder', 'Heute nicht', 'Rückgängig', 'Bald kochen', 'Heute kochen'].map((t, i) => ({ t, getBoundingClientRect: () => { const top = 514 - (sb.scrollTop - 6); return { top, bottom: top + (i === 2 ? 55 : 50), width: 50, height: 50 }; } }));
  const bx = { getBoundingClientRect: () => ({ top: 498, bottom: 554, left: 132, width: 56, height: 56 }) };
  const els = { shBody: sb, lwBX: bx, 'tab-foryou': { classList: cls(['holo-under']) } };
  const doc = {
    readyState: 'complete', documentElement: { lang: 'de', classList: cls([]), style: { setProperty() { } } },
    getElementById: id => els[id] || null,
    querySelector: () => null,
    querySelectorAll: s => (/#tab-shelf \.r3k-b$/.test(s) ? row : []),
    addEventListener() { }, body: {}, createElement: () => ({ setAttribute() { }, classList: cls([]), dataset: {} })
  };
  const win = {
    document: doc, LowiHost: { tab: () => 'shelf' }, LowiFood: { setView() { } }, goTab() { },
    getComputedStyle: () => (hidden-- > 0 ? { display: 'flex', visibility: 'hidden', opacity: '0' } : { display: 'block', visibility: 'visible', opacity: '1' }), addEventListener() { }
  };
  /* in the browser window is the global object, so the context is the window too */
  const ctx = Object.assign(win, { setTimeout: (f, t) => { timers.push([t, f]); return timers.length; }, setInterval: () => 0, MutationObserver: class { observe() { } }, requestAnimationFrame: f => f() });
  ctx.window = ctx;
  vm.runInNewContext(SRC, ctx);
  const run = () => { timers.sort((a, b) => a[0] - b[0]); const t = timers.splice(0); t.forEach(([, f]) => f()); };
  return { G: win.LowiCircleGames, sb, row, run, timers };
}

test('need(): how far to scroll so a control ends 8 px above the back button', () => {
  const { G } = boot();
  assert.strictEqual(typeof G.need, 'function');
  assert.strictEqual(G.need(569, 498), 79);
  assert.strictEqual(G.need(489, 498), 0);
  assert.strictEqual(G.need(0, 498), 0, 'nothing drawn yet');
  assert.strictEqual(G.need(569, 0), 0, 'no button');
});

test('opening Swipen in Circle on an iPhone SE scrolls Rückgängig out from under the back button', () => {
  const { G, sb, row, run } = boot();
  G.select('swipen');
  sb.scrollTop = 6; /* the deck draws and lands at 6, as measured live */
  run();
  const undo = row[2].getBoundingClientRect();
  assert.ok(sb.scrollTop > 6, 'the panel scrolled');
  assert.ok(undo.bottom <= 498, 'Undo ends above the button top (498), got ' + undo.bottom);
  assert.ok(sb.scrollTop <= sb.scrollHeight - sb.clientHeight, 'never past the end');
});

test('the back button fading in late (after 3 s, as on a slow open) still gets Rückgängig scrolled clear', () => {
  const { G, sb, row, timers } = boot(5); /* hidden at the 200, 600, 1200, 2000 and 3000 ms checks */
  G.select('swipen');
  sb.scrollTop = 6;
  timers.sort((a, b) => a[0] - b[0]);
  assert.ok(timers.some(([t]) => t > 3900), 'a check runs after the button fades in (~3.9 s)');
  timers.splice(0).forEach(([, f]) => f());
  assert.ok(sb.scrollTop > 6, 'the panel scrolled');
  assert.ok(row[2].getBoundingClientRect().bottom <= 498, 'Undo ends above the button top');
});

test('it leaves the panel alone once the user touches it', () => {
  const { G, sb, timers } = boot();
  G.select('swipen');
  sb.scrollTop = 6;
  timers.sort((a, b) => a[0] - b[0]);
  const [first, ...rest] = timers.splice(0);
  first[1]();
  assert.ok(sb.scrollTop > 6, 'first check scrolled');
  sb.on.touchstart(); /* the user puts a finger on the panel and drags it */
  sb.scrollTop = 20;
  rest.forEach(([, f]) => f());
  assert.strictEqual(sb.scrollTop, 20);
});

test('a redraw that resets the scroll is corrected on the next check', () => {
  const { G, sb, row, timers } = boot();
  G.select('swipen');
  timers.sort((a, b) => a[0] - b[0]);
  const all = timers.splice(0);
  sb.scrollTop = 6; all[0][1]();
  sb.scrollTop = 0; /* Kochen redraws and jumps back to the top */
  all.slice(1).forEach(([, f]) => f());
  assert.ok(row[2].getBoundingClientRect().bottom <= 498);
});
