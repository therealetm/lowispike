'use strict';
/* Owner request 14 (28 Oct 2026): Kochen rose over Home with no backdrop, Home showed straight through and nothing was readable.
   body-world-3d.css clears every tab background with !important, so the Kochen panel needs a selector with more ids and a solid,
   frosted backdrop; Home behind it is dimmed and blurred. Same for the small Essenspause panel. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = R('section-nav.css'), gap = R('gap-view.css');
const alphaOf = s => { const m = [...s.matchAll(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([.\d]+)\s*\)/g)].map(x => +x[1]); return m.length ? Math.min(...m) : 1; };

test('Kochen panel paints a solid backdrop that beats the body-world tab reset', () => {
  const m = css.match(/html\.cook-holo\.cook-holo\.cook-holo #app #main#main>#tab-shelf\.tab\.active:not\(#bw3x\)\{([^}]+)\}/);
  assert.ok(m, 'high-specificity Kochen panel rule exists');
  assert.match(m[1], /background-color:#[0-9a-f]{6}!important/i, 'opaque base colour');
  const grad = (m[1].match(/linear-gradient\(([^;]+)\)!important/) || [])[1] || '';
  assert.ok(alphaOf(grad) >= 0.95, 'panel gradient at least 95% opaque');
  assert.match(m[1], /backdrop-filter:blur\(\d+px\)/, 'frosted');
  /* specificity: more ids than html.wb-on.wb-on.wb-on #app #main > .tab.tab:not(#bw3x) (3 ids) */
  const sel = 'html.cook-holo.cook-holo.cook-holo #app #main#main>#tab-shelf.tab.active:not(#bw3x)';
  assert.ok((sel.match(/#/g) || []).length > 3);
});

test('Home behind Kochen is dimmed and blurred', () => {
  const m = css.slice(css.lastIndexOf('owner request 15')).match(/html\.cook-holo #cookHoloScrim\{([^}]+)\}/);
  assert.ok(m);
  assert.ok(alphaOf(m[1]) >= 0.6, 'scrim at least 60% dark');
  assert.match(m[1], /backdrop-filter:blur\((1[2-9]|[2-9]\d)px/);
  assert.match(css, /html\.cook-holo #main>#pfBtn,html\.cook-holo #main>#tbTheme\{visibility:hidden/);
});

test('Essenspause stays small but solid, Home dimmed behind it', () => {
  const tail = gap.slice(gap.lastIndexOf('owner request 15'));
  const card = (tail.match(/\.gv-card \{([^}]+)\}/) || [])[1] || '';
  const lin = (card.match(/linear-gradient\(([^;]+)\);/) || [])[1] || '';
  assert.ok(lin && alphaOf(lin) >= 0.95, 'card at least 95% opaque');
  assert.match(card, /background-color: #[0-9a-f]{6}/i);
  const ov = (tail.match(/\.gv-ov, html\.lt \.gv-ov, html\[data-ui="light"\] \.gv-ov \{([^}]+)\}/) || [])[1] || '';
  assert.ok(alphaOf(ov) >= 0.6, 'scrim at least 60% dark');
  assert.match(ov, /backdrop-filter: blur\(\d+px\)/);
  assert.match(gap, /max-width: 370px/, 'still the small panel from owner request 13');
});
