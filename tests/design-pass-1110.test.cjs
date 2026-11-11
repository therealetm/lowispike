'use strict';
/* Nov 10 2026 design pass (Emmanuel: "der Design-Feinschliff, damit die ganze App einheitlich wirkt ... behebe Fehler, Design Fehler,
   Dinge, die einfach unlogisch sind"). 38 screens were opened and measured in Chromium (393 x 852, German): tap areas, text sizes,
   contrast, clipped labels. These guards keep what the pass fixed. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('design-pass.css'), html = read('index.html');

test('wiring: design-pass.css is linked after the other sheets and precached', () => {
  assert.match(html, /<script src="haptics\.js\?v=[^"]+"><\/script>\n<link rel="stylesheet" href="design-pass\.css\?v=/);
  assert.ok(read('sw.js').includes('"design-pass.css"'));
});

test('legibility: notes and footers read like iOS secondary text, nothing under 11 px, "min" is dark on the white pill', () => {
  assert.match(read('liquid-glass.css'), /--dim: rgba\(235, 235, 245, \.55\) !important;/, 'was .34 (2.6:1 on black)');
  assert.match(css, /\.chip\.on small \{ color: #0b1d3f !important; opacity: \.8; \}/);
  assert.match(css, /#tab-shelf #g2cTiles \.g2c-tile small \{ font-size: 11px !important; \}/);
  assert.match(css, /\.cwk-dish small, \.fyb-tag, \.r5-dci \.sh-pk, \.rt-kt \{ font-size: 11px !important; \}/);
});

test('fields: 16 px in the share link field (no Safari zoom); the dictation mic is never stretched by a form', () => {
  assert.match(css, /\.shs-card \.shs-url \{ font-size: 16px; \}/);
  assert.match(css, /\.mic-btn \{ width: 34px !important; height: 34px !important; min-width: 0 !important; min-height: 0 !important; flex: none !important; \}/);
});

test('layout: full tile titles in Kochen, one-line Move start, tool sheets end above the close button, no chat status over the table', () => {
  assert.match(css, /#tab-shelf #g2cTiles \.g2c-tile \{ flex: 0 0 auto !important;/);
  assert.match(css, /#mv-screen \.mv-go\.btn\.primary \{ font-size: 16px; text-wrap: balance; \}/);
  assert.match(css, /html\.lw-bx-on #bSheet \.b-sh \{ padding-bottom: calc\(env\(safe-area-inset-bottom, 0px\) \+ 84px\); \}/);
  assert.match(css, /html\.csp-circle #cmPaneChat \.cs-status \{ display: none !important; \}/);
});

test('Profile fits above the round back button (it sat on "Look & Ton"), and "Deine Daten" is there once', () => {
  assert.match(html, /function bxTop\(\)\{ try \{ const b = D\.getElementById\("lwBX"\); if \(b && b\.classList\.contains\("on"\)\)/);
  assert.match(html, /return Math\.min\(r, bxTop\(\)\); \}/);
  assert.match(css, /#tab-profile > \.r2-hero > \.r3-hacts \[data-yd="open"\] \{ display: none !important; \}/);
  assert.match(html, /const GRID = \["details", "cycle", "app", "todo", "comm", "swaps", "glow", "look"\];/, 'the tile stays first');
});

test('44 pt: small controls get an invisible tap area', () => {
  for (const s of ['.k9-chips .chip::after', '#fyFeed .fy-rail .fy-act::after', '.rt-balls .rt-ball::after', '.toggle::before', '.cme-langs > button::after'])
    assert.ok(css.includes(s), s);
});

test('words: Mein Tag and the member card speak the app language', () => {
  assert.match(read('misty-hub.js'), /const tl = v => \{ try \{ return W\.LowiLang && W\.LowiLang\.line \? W\.LowiLang\.line\(v\) : v; \}/);
  assert.ok(html.includes('["Share profile", "Profil teilen", "Compartir perfil"], ["See Ranking", "Zur Rangliste", "Ver ranking"], ["Next birthday", "Nächster Geburtstag", "Próximo cumpleaños"]'));
  assert.ok(html.includes('[/^in (\\d+) days$/, "in $1 Tagen", "en $1 días"]'));
  const i = html.indexOf('function bdayLong(b){'), j = html.indexOf('\n', html.indexOf('return p[2] + " " + M[p[1] - 1]', i));
  const mk = l => new Function('window', 'LowiLang', html.slice(i, j) + '\nreturn bdayLong;')({ LowiLang: { get: () => l } }, { get: () => l });
  assert.equal(mk('de')('1990-01-01'), '1. Januar 1990');
  assert.equal(mk('en')('1990-01-01'), '1 January 1990');
  assert.equal(mk('es')('0004-03-12'), '12 de marzo');
  assert.match(html, /data-tr="vis" role="switch" aria-checked="' \+ \(C\.vis === "tribe"\) \+ '" aria-label="' \+ esc\(fyT\("Show it in For You"\)\)/);
});
