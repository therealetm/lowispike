// 4 Nov 2026 (Emmanuel: "Circle navigation: selecting a Circle item changes content in place instead of unexpectedly changing
// the whole interface"). Reproduced in iPhone-size WebKit emulation: tapping Mischen or Swipen in Circle's games bar switched
// to Kochen underneath with the normal sideways page slide, so the whole Community page slid off for about two seconds and
// snapped back. Fix in circle-games.js: Circle's own tab switches are instant (LowiSections.instant), like the X and back.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'circle-games.js'), 'utf8');
const lg = fs.readFileSync(path.join(__dirname, '..', 'liquid-glass.js'), 'utf8');
const nav = fs.readFileSync(path.join(__dirname, '..', 'section-nav.js'), 'utf8');

test('Circle switches tabs instantly: no page slide under a game panel', () => {
  const go = js.match(/const go = t => \{([^\n]*)\};/);
  assert.ok(go, 'one go() for every Circle tab switch');
  assert.match(go[1], /W\.LowiSections\.instant = true;[\s\S]*W\.goTab\(t\)/, 'instant is set before the switch');
  assert.doesNotMatch(js.replace(go[0], ''), /W\.goTab\(/, 'no other path switches tabs without it');
  // the page slide skips while the flag is up, and the flag is a 700 ms window
  assert.match(lg, /!quiet && !\(window\.LowiSections && window\.LowiSections\.instant\)\) \{ const d = pendingDx; pendingDx = 0; slide\(prevTab, t, d\); \}/);
  assert.match(nav, /instantUntil = v \? performance\.now\(\) \+ 700 : 0/);
});

