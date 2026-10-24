'use strict';
/* Oct 24 2026 (Emmanuel: in day mode he can't see what he types in the chat room). community-composer.css paints the typed
   text with -webkit-text-fill-color:#fff (it beats color in WebKit and Chromium). The room (community-tg.css) gives the field a
   light fill in day mode and sets color:var(--cr-text), but never the fill colour, so the letters stayed white on white.
   The room field must set the fill colour from the theme tokens for the text and the placeholder. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const tg = read('community-tg.css'), comp = read('community-composer.css'), html = read('index.html');
const ROOM = 'html body #tab-foryou #cmPaneChat#cmPaneChat[data-room] .cm-inrow textarea#cmInput';
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function rule(css, sel) { const m = css.match(new RegExp(esc(sel) + '\\{([^}]*)\\}')); return m ? m[1] : ''; }
function hex(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
function lum(c) { return c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0); }
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
function tokens(block) { const o = {}; for (const m of block.matchAll(/--(cr-[a-z-]+):([^;]+);?/g)) o[m[1]] = m[2].trim(); return o; }

test('the galaxy composer paints white glyphs with -webkit-text-fill-color (the cause in the light room)', () => {
  assert.match(comp, /-webkit-text-fill-color:#fff/);
  assert.ok(html.indexOf('community-composer.css') < html.indexOf('community-tg.css'), 'community-tg.css loads after the composer sheet');
});

test('in a room the typed text and caret take the theme text colour, also as the WebKit fill colour', () => {
  const r = rule(tg, ROOM);
  assert.ok(r, 'room field rule exists');
  assert.match(r, /color:var\(--cr-text\)!important/);
  assert.match(r, /-webkit-text-fill-color:var\(--cr-text\)!important/, 'fill colour follows the theme, not the galaxy #fff');
  assert.match(r, /caret-color:var\(--cr-acc-strong\)/);
});

test('in a room the placeholder takes the theme placeholder colour, also as the fill colour', () => {
  const r = rule(tg, ROOM + '::placeholder');
  assert.match(r, /color:var\(--cr-ph\)!important/);
  assert.match(r, /-webkit-text-fill-color:var\(--cr-ph\)!important/);
});

test('day and night tokens give readable text on the field (4.5:1) and placeholder (3:1)', () => {
  const night = tokens(tg.match(/\/\* ---- theme tokens: night[\s\S]*?\{([\s\S]*?)\}/)[1]);
  const day = tokens(tg.match(/html\[data-theme=light\] body #tab-foryou #cmPaneChat#cmPaneChat\[data-room\]\{([\s\S]*?)\}/)[1]);
  const field = (t, canvas) => { const m = t['cr-field'].match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/); const c = hex(t[canvas]); const a = +m[4]; return [1, 2, 3].map((i, k) => +m[i] * a + c[k] * (1 - a)); };
  for (const [name, t] of [['day', day], ['night', night]]) {
    const f = field(t, 'cr-canvas-c');
    assert.ok(ratio(hex(t['cr-text']), f) >= 4.5, name + ' text contrast ' + ratio(hex(t['cr-text']), f).toFixed(2));
    assert.ok(ratio(hex(t['cr-ph']), f) >= 3, name + ' placeholder contrast ' + ratio(hex(t['cr-ph']), f).toFixed(2));
  }
});
