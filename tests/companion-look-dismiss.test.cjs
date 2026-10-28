'use strict';
/* Oct 28 2026 (Emmanuel on the call, Companion > Aussehen: "ich kann nicht zurück und nicht runterziehen, nur das X").
   The panel drew an iOS grabber but nothing listened. It now closes like an iOS sheet: pull down from the top bar, or
   from anywhere once its list is scrolled to the top; swipe right from the left edge = back. The X stays, the list keeps
   its own scrolling, a half-picked style survives. Live gesture check: tools/look-recap-probe.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const js = fs.readFileSync(path.join(__dirname, '..', 'companion.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'companion.css'), 'utf8');

test('pull down and edge swipe both go through dismiss(): back to the card when it was opened from there, else close', () => {
    assert.match(js, /function dismiss\(\) \{\s*try \{ const R = W\.LowiR2; if \(R && R\.back && R\.top && R\.top\(\) === V\.ov\) \{ R\.back\(V\.ov\);/);
    assert.match(js, /key !== 'Escape'\) return; e\.stopPropagation\(\); dismiss\(\);/);
    assert.match(js, /setTimeout\(\(\) => \{ if \(V\.ov === ov\) dismiss\(\); \}, 180\)/);
});

test('touch: non-passive move so iOS does not bounce first; the list only hands over at scrollTop 0 moving down', () => {
    assert.match(js, /D\.addEventListener\('touchmove', [^\n]*\{ capture: true, passive: false \}\)/);
    assert.match(js, /pull = top \|\| \(kind === 'touch' && sc && sc\.scrollTop <= 0\)/);
    assert.match(js, /if \(g\.pull && g\.inScroll && g\.sc\.scrollTop > 0\) g\.pull = false;/);
    assert.match(js, /if \(!\(g\.pull && downward\) && !\(g\.edge && rightward\)\) \{ if \(Math\.abs\(dx\) > 6 \|\| Math\.abs\(dy\) > 6\) G = null; return; \}/, 'moving up scrolls the list as before');
    assert.match(js, /NOGRAB = 'input\[type=range\], textarea, select, \[contenteditable\], \.no-pull'/);
});

test('a short pull springs back; far or fast enough closes; the release is not a tap', () => {
    assert.match(js, /dy > Math\.min\(140, g\.h \* 0\.25\) \|\| \(g\.v > 0\.5 && dy > 40\)/);
    assert.match(js, /dx > g\.w \* 0\.33 \|\| \(g\.v > 0\.45 && dx > 30\)/);
    assert.match(js, /eatClick && Date\.now\(\) - eatClick < 350/);
    assert.match(js, /prefers-reduced-motion: reduce/);
});

test('nothing is lost: every choice saves at once and a half-picked style is kept for the next open', () => {
    assert.match(js, /V\.pickOpen = !!V\.pend;/);
    assert.ok(!/V\.pend = null; V\.pickOpen = false;/.test(js), 'open() no longer wipes a half-picked style');
});

test('the top bar is a drag handle and the X is still there', () => {
    assert.match(css, /\.cf-ov \.cf-head, \.cf-ov \.cf-panel > \.r2-pback-row \{ touch-action: none; \}/);
    assert.match(css, /\.cf-ov\.cf-dragging \{ background: rgba\(3, 8, 24, calc\(\.72 \* var\(--cf-pull, 1\)\)\); \}/);
    assert.match(js, /class="cf-x"/);
});
