/* Nov 5 2026 shared pop-up shell (sheet-style.css): one near-black panel with one thin neutral rim in Dark, no cyan stripes or
   blue glow, the round X keeps a 12px gap, and the sheet is loaded once, after every older style sheet (only bottom-close.css follows), and precached. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('sheet-style.css'), html = read('index.html'), sw = read('sw.js');

test('sheet-style.css is linked exactly once, after every other pop-up stylesheet, with the shell build', () => {
  const links = [...html.matchAll(/<link rel="stylesheet"[^>]*href="([^"?]+)\?v=([^"]+)"/g)];
  const own = links.filter(m => m[1] === 'sheet-style.css');
  assert.strictEqual(own.length, 1);
  /* bottom-close.css + .js must stay the last two tags before </body> (tests/bottom-close.test.cjs); every other sheet comes before */
  assert.deepStrictEqual(links.slice(-2).map(m => m[1]), ['sheet-style.css', 'bottom-close.css']);
  assert.strictEqual(own[0][2], sw.match(/const SHELL_BUILD = "([^"]+)"/)[1]);
});

test('the service worker precaches it on its own line and keeps the older entries', () => {
  assert.match(sw, /^STATIC\.push\("sheet-style\.css"\);/m);
  for (const f of ['bottom-close.css', 'one-sheet.css', 'misty-hub.css', 'feedback.css', 'galaxy-still.css']) assert.ok(sw.includes('"' + f + '"') || html.includes(f), f);
});

test('Dark paints one near-black panel with a thin neutral rim and no blur, stripes or glow', () => {
  assert.match(css, /--sh-panel: #0e0e10;/);
  assert.match(css, /--sh-rim: rgba\(255, 255, 255, \.12\);/);
  assert.match(css, /--mb-surface: var\(--sh-panel\);/, 'membrane stripes token replaced');
  assert.match(css, /--mb-glow: 0 20px 50px -20px rgba\(0, 0, 0, \.8\);/, 'cyan glow token replaced');
  const shell = css.match(/html\[data-black\]\[data-black\] body \.r2-ov:not\(\.full\) \.r2-sh,[\s\S]*?\{([\s\S]*?)\}/)[1];
  for (const want of ['background: var(--sh-panel) !important', 'border: 1px solid var(--sh-rim) !important', 'border-radius: var(--sh-r) !important',
    'backdrop-filter: none !important', 'background-image: none !important', 'text-shadow: none !important']) assert.ok(shell.includes(want), want);
});

test('no cyan or blue colour anywhere in the Dark rules; every themed rule is Dark-only', () => {
  assert.doesNotMatch(css, /143, 231, 255|110, ?225, ?255|8fe7ff|64d2ff|6ee7c8/i);
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+\{/g).map(s => s.trim());
  for (const sel of rules) if (!/^:root:root/.test(sel)) assert.match(sel, /^html\[data-black\]\[data-black\]/, sel);
});

test('companion and tutorial: no cme-ov added (the tutorial keys on it); tutorial cards share the panel', () => {
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /cme-ov/);
  assert.match(css, /\.lt-card \{ background: var\(--sh-panel\) !important;/);
  assert.match(css, /\.r2-ov\.mh-ov:not\(\.full\) \.r2-sh/);
});

test('round X gap: 76px above the safe area leaves 12px between a tall sheet and the 58px X (measured; 72px left 8px)', () => {
  assert.match(css, /--one-x-gap: calc\(var\(--sab, env\(safe-area-inset-bottom\)\) \+ 76px\)/);
});
