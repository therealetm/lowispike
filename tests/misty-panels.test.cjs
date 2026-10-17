/* Oct 17 (E-man's list, item 5): Fasting, Meals, Today and Weather wear the Move panel's look, main actions in right-thumb reach. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('misty-panels.css'), html = read('index.html'), sw = read('sw.js');
const moveCss = read('move-bubble.css'), fastJs = html, spiritJs = read('spirit.js'), topBar = read('top-bar.js');
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

test('misty-panels.css loads after the older panel looks, versioned with the page, cached offline', () => {
  /* the closing slots (glass-nav, cook-shop, sym-home) are pinned by their own tests and style none of these panels */
  const at = html.indexOf('id="mpnCss"');
  assert.ok(at > 0, 'linked');
  for (const f of ['today-sheet.css', 'scan-screens.css', 'world-home.css', 'misty-pop.css']) assert.ok(at > html.lastIndexOf(f + '?v='), 'after ' + f);
  const b = (html.match(/<meta name="lowi-build" content="([^"]+)"/) || [])[1];
  assert.ok(b && html.includes('misty-panels.css?v=' + b), 'same build as the page');
  assert.ok(/const STATIC = \[[^\]]*"misty-panels\.css"/.test(sw), 'offline cache');
});

test('the four panels share one sheet surface, taken from the Move panel', () => {
  assert.ok(rules.includes('rgba(28, 28, 30, .86)'), 'the r2 sheet colour at 86 %, as glassSheet paints the Move panel');
  assert.ok(rules.includes('blur(22px) saturate(1.3)'), 'the Move panel blur');
  const surface = rules.slice(0, rules.indexOf('background: var(--mpn-sheet)'));
  for (const sel of ['#sheet:has(> .fst-sh)', '.ss-sheet:not(.full):has(.sp-quick-log) .r2-sh', '#whToday.wh-today', '#tbWx .tbw-sheet']) assert.ok(surface.includes(sel), sel);
});

test('rows are the Move row: 14 px, faint blue fill, Misty cyan rim', () => {
  assert.ok(/\.wm-row\s*\{[^}]*border-radius:\s*14px[^}]*rgba\(140,\s*200,\s*255,\s*\.1\)[^}]*rgba\(143,\s*231,\s*255,\s*\.2\)/.test(moveCss), 'the Move row is still the reference');
  assert.ok(rules.includes('--mpn-row: rgba(140, 200, 255, .1)') && rules.includes('--mpn-rim: rgba(143, 231, 255, .2)') && rules.includes('--mpn-row-r: 14px'));
  for (const sel of ['.fst-sum', '.sp-quick-item', '.tbw-facts > div', '.tbw-note']) assert.ok(rules.includes(sel), sel);
  assert.ok(/#whToday\s*\{[^}]*--ts-glass:\s*var\(--mpn-row\)[^}]*--ts-rim:\s*var\(--mpn-rim\)[^}]*--ts-r:\s*var\(--mpn-row-r\)/.test(rules), 'Today points its own tokens at the Move row');
});

test('the selectors match markup that exists', () => {
  for (const c of ['fst-sh', 'fst-title', 'fst-sum', 'fst-chips', 'fst-go', 'fst-earn']) assert.ok(fastJs.includes(c), c);
  for (const c of ['sp-quick-log', 'sp-quick-cap', 'sp-quick-item', 'sp-herb-tip', 'sp-manual']) assert.ok(spiritJs.includes(c), c);
  for (const c of ['tbw-top', 'tbw-btn', 'data-tbw="refresh"', 'data-tbw="close"', 'tbw-body']) assert.ok(topBar.includes(c), c);
});

test('right thumb: Weather Refresh and Close sit at the bottom right, 52 px, and the readings scroll clear of them', () => {
  assert.ok(/#tbWx \.tbw-top \.tbw-btn\s*\{[^}]*position:\s*absolute[^}]*bottom:/.test(rules));
  assert.ok(/\.tbw-btn\[data-tbw="close"\]\s*\{\s*right:/.test(rules) && /\.tbw-btn\[data-tbw="refresh"\]\s*\{\s*right:/.test(rules));
  assert.ok(/#tbWx \.tbw-top \.tbw-btn\s*\{[^}]*width:\s*52px/.test(rules));
  assert.ok(/#tbWx \.tbw-body\s*\{[^}]*padding-bottom:\s*calc\([^;]*\+\s*82px\)/.test(rules));
});

test('buttons stay big: fasting chips 44 px, main actions the blue pill', () => {
  assert.ok(/\.fst-chips \.chip\s*\{[^}]*min-height:\s*44px/.test(rules));
  assert.ok(/\.fst-go,[\s\S]*?\.sp-next\s*\{[^}]*var\(--mpn-pri\)[^}]*border-radius:\s*999px/.test(rules));
});

test('paint only: no hiding, no motion, no pointer changes, the Move panel itself untouched', () => {
  assert.ok(!/display:\s*none/.test(rules), 'nothing hidden');
  assert.ok(!/pointer-events|animation|transition/.test(rules), 'no new motion or tap rules');
  assert.ok(!/\.wm-sheet|\.wm-row|\.wme-/.test(rules), 'the Move and Meals hold panels stay as they are');
});
