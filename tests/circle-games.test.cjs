'use strict';
/* 29 Oct 2026: Circle games bar (Billard · Mischen · Swipen · Freundesbaum) replaces the quiet-hours line in Circle.
   5 Nov 2026: the Freundesbaum is gone (owner: "we can nuke it"), three games left. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('index.html and the service worker load the Circle games bar', () => {
  const idx = read('index.html'), sw = read('sw.js');
  assert.match(idx, /<link rel="stylesheet" href="circle-games\.css\?v=/);
  assert.match(idx, /<script src="circle-games\.js\?v=/);
  assert.ok(idx.indexOf('circle-games.js') > idx.indexOf('section-nav.js'), 'after section-nav (Kochen panel)');
  assert.match(sw, /"circle-games\.css", "circle-games\.js"/);
});

test('the bar has exactly the three games in order, one menu, German labels, no Freundesbaum', () => {
  const src = read('circle-games.js');
  const ids = [...src.matchAll(/\{ id: '([a-z]+)'/g)].map(m => m[1]);
  /* test changed 8 Nov 2026 (Emmanuel: "Weekly Challenge, wo jeder mitmachen kann ... wie bei wo Mission und Shuffle"): a fourth
     tab, Challenge, after the three games (circle-weekly-challenge.test.cjs) */
  assert.deepStrictEqual(ids, ['billard', 'mischen', 'swipen', 'challenge']);
  for (const w of ['Billard', 'Mischen', 'Swipen', 'Spiele']) assert.ok(src.includes("'" + w + "'"), w);
  assert.ok(!src.includes("'Freundesbaum'") && !/openTree|csp-tree/.test(src), 'no Friends tree tab or tree hook');
  assert.match(src, /view: 'shuffle'/);
  assert.match(src, /view: 'swipe'/);
});

test('Circle hides the quiet-hours line and the old tree corner button, keeps real errors', () => {
  const css = read('circle-games.css');
  assert.match(css, /html\.csp-circle #cmPaneChat:not\(\[data-room\]\) #csStatus:not\(\[data-state="error"\]\)[^{]*\{display:none!important\}/);
  assert.ok(!/csp-tree|cr-ov-tree/.test(css), 'no Friends tree styles left');
  /* inside Circle Kochen shows no title row and no own Mischen | Swipen switch, and no dim scrim over Circle */
  assert.match(css, /html\.csp-game #tab-shelf #shTop/);
  assert.match(css, /#ckBar \.ck-view\{display:none!important\}|#ckBar \.ck-view\{display:none/);
  assert.match(css, /html\.csp-game #cookHoloScrim\{display:none!important\}/);
});

test('the module boots without a DOM and exposes its API', () => {
  delete require.cache[require.resolve(path.join(ROOT, 'circle-games.js'))];
  assert.doesNotThrow(() => require(path.join(ROOT, 'circle-games.js')));
});
