'use strict';
/* 22 Oct 2026 (item 43): Emmanuel, on a screenshot of the chat: "It's just that it's not in my branding color. Why do we have green
   in there? My branding color isn't green. And this is in white mode, even though my app is currently in dark mode."
   The chat (room, tab row, composer) paints only theme tokens in the app's brand: Misty ice blue #8fe7ff, brand blue #1668dc and
   violet #4458d0 on deep-space navy. No teal, no mint. Day and Night are token sets keyed on html[data-theme], so the open room
   restyles the moment the theme changes. Browser check: tools/community-chat-brand/probe.cjs (iPhone SE, 13, 15, Pixel 7). */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const tg = strip(read('community-tg.css')), rooms = strip(read('community-rooms.css'));
const P = 'html body #tab-foryou #cmPaneChat#cmPaneChat[data-room]';
const rule = (css, sel) => { const i = css.indexOf(sel + '{'); assert(i >= 0, 'missing rule ' + sel); return css.slice(i, css.indexOf('}', i)); };

const rgb = c => { c = c.trim(); if (c[0] === '#') { let h = c.slice(1); if (h.length === 3) h = [...h].map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); } const m = c.match(/rgba?\(([^)]+)\)/); return m ? m[1].split(/[ ,/]+/).slice(0, 3).map(Number) : null; };
const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return { h: 0, s: 0, l }; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; return { h: h < 0 ? h + 360 : h, s, l }; };
const isGreen = c => { const v = rgb(c); if (!v) return false; const x = hsl(v); return x.h >= 140 && x.h <= 190 && x.s > 0.28 && x.l > 0.12 && x.l < 0.93; };
const colours = s => s.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]+\)/g) || [];
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; const [r, g, b] = rgb(c); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const tok = (body, name) => { const m = body.match(new RegExp('--' + name + ':([^;]+);')); assert(m, 'token ' + name); return m[1].trim(); };

test('no hard-coded teal or mint anywhere in the chat stylesheet', () => {
  const bad = colours(tg).filter(isGreen);
  assert.deepEqual(bad, [], 'teal/green in community-tg.css: ' + bad.join(' '));
  for (const old of ['#1cf7f9', '#2ef8b6', '#18d2c9', '#1ad9e6', '#22d39f', '#3ef2f4', '#087684', '#08808e', '#08735d', '#07798a', '#05515c', '#03222a']) assert.ok(!tg.toLowerCase().includes(old), 'old green ' + old);
});

test('the Affiliates / Chat / Creation / Room tab highlight is brand blue, not cyan', () => {
  const sel = rooms.match(/#cmPaneChat\[data-spirit-chat\] \.rm-tab\[aria-selected=true\]\{[^}]*\}/g) || [];
  assert.ok(sel.length, 'active tab rule');
  for (const r of sel) assert.deepEqual(colours(r).filter(isGreen), [], r.slice(0, 120));
  const pill = rooms.match(/\.rm-tabs::before\{[^}]*\}/g) || [];
  for (const r of pill) assert.deepEqual(colours(r).filter(isGreen), [], 'tab pill ' + r.slice(0, 120));
  assert.match(tg, /\.rm-tabs::before\{background:rgba\(22,104,220,\.12\)!important/, 'Day pill in brand blue');
});

test('Night and Day are token sets; every accent in the room reads from them', () => {
  const night = rule(tg, P), day = rule(tg, 'html[data-theme=light] body #tab-foryou #cmPaneChat#cmPaneChat[data-room]');
  for (const set of [night, day]) {
    assert.equal(tok(set, 'cr-mine-g'), 'linear-gradient(135deg,#1668dc,#4458d0)', 'own bubble brand blue to violet');
    assert.equal(tok(set, 'cr-send-g'), 'linear-gradient(135deg,#1668dc,#4458d0)', 'send button brand blue to violet');
    for (const t of ['cr-acc', 'cr-acc-strong', 'cr-chip-on', 'cr-quote-bg', 'cr-canvas', 'cr-mine-c', 'cr-send-c']) assert.deepEqual(colours(tok(set, t)).filter(isGreen), [], t);
  }
  assert.equal(tok(night, 'cr-acc'), '#8fe7ff', 'Night accent is Misty ice blue, like the sheets');
  assert.ok(lum(tok(night, 'cr-bub')) < 0.05 && lum(tok(day, 'cr-bub')) > 0.9, 'dark bubbles by Night, white by Day');
  /* badges, pinned bar, links, mentions and reactions use the tokens, not colours of their own */
  assert.match(tg, /\.cr-pin::before\{[^}]*background:var\(--cr-acc-strong\)/);
  assert.match(tg, /background:var\(--cr-chip-on\)/);
});

test('WCAG AA: own bubble and send in both themes, accent text on its background', () => {
  const night = rule(tg, P), day = rule(tg, 'html[data-theme=light] body #tab-foryou #cmPaneChat#cmPaneChat[data-room]');
  for (const [name, set] of [['night', night], ['day', day]]) {
    const fg = tok(set, 'cr-mine-text');
    for (const stop of ['#1668dc', '#4458d0']) assert.ok(ratio(fg, stop) >= 4.5, name + ' own text on ' + stop + ' ' + ratio(fg, stop).toFixed(2));
    assert.ok(ratio(tok(set, 'cr-send-ic'), '#1668dc') >= 4.5, name + ' send icon');
    assert.ok(ratio(tok(set, 'cr-acc'), tok(set, 'cr-bub')) >= 4.5, name + ' accent on bubble ' + ratio(tok(set, 'cr-acc'), tok(set, 'cr-bub')).toFixed(2));
    assert.ok(ratio(tok(set, 'cr-text'), tok(set, 'cr-bub')) >= 4.5, name + ' text on bubble');
  }
});
