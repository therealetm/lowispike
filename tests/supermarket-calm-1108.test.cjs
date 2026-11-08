'use strict';
/* Nov 8 2026 (Emmanuel: "Dieses meine Woche, ich schmeiß das komplett raus, das ist kompliziert und scheiße ... ich nutze das nicht
   mal" and "Supermarket, die Knöpfe und der Stil ... kompliziert ... I hate feeling overwhelmed ... people also hate having to read a
   lot"): the week planner has no door any more, and the shop choice is the question, the chains, one quiet location row. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const sp = read('store-picks.js'), css = read('store-picks.css');

test('Meine Woche planen has no door: no Zu Hause tab, old links land on Supermarkt', () => {
  assert.match(sp, /const homeTab = \(\) => false;/);
  assert.match(sp, /tab = start === 'sz' && SZ\(\) \? 'sz' : start === 'home' && homeTab\(\) \? 'home'/, 'openAt(\'home\') falls through to shop');
});

test('the Fakeaway row left both Supermarkt views (it lives in the Weekly Challenge)', () => {
  const pick = sp.slice(sp.indexOf('    function pickHTML(msg) {'), sp.indexOf('    /* ---------------- the list ---------------- */'));
  assert.ok(pick.length > 200);
  assert.doesNotMatch(pick, /planRowHTML\(\)/);
  assert.doesNotMatch(sp, /'<div class="stp-scroll">' \+ planRowHTML\(\)/);
  assert.match(sp, /fakeaway: openFakeaway,/, 'the overlay is still there for the Challenge');
});

test('the shop choice: no paragraph, chains first, location is a quiet row, no Skip button, one short privacy line', () => {
  const pick = sp.slice(sp.indexOf('    function pickHTML(msg) {'), sp.indexOf('    /* ---------------- the list ---------------- */'));
  assert.match(pick, /titleRow\(T\('Which shop\?', 'Welcher Laden\?', '¿Qué tienda\?'\)\) \+ '<\/div>' \+/, 'nothing under the question');
  assert.doesNotMatch(pick, /Teil deinen Standort, um/);
  assert.doesNotMatch(pick, /stp-skip|Überspringen/);
  assert.ok(pick.indexOf("'</div>' +\n            '<div class=\"stp-scroll stp-pick-calm\"><div class=\"stp-chips stp-wrap\">' + chains") > 0, 'chains are the first thing');
  assert.match(pick, /class="stp-more stp-loc" data-stp="locate"/);
  assert.doesNotMatch(pick, /class="stp-go" data-stp="locate"/, 'only one big green button (Scan in the shop)');
  assert.match(pick, /'Dein Standort bleibt auf diesem Handy\. Kartendaten © OpenStreetMap-Mitwirkende\. '/);
  assert.match(css, /\.stp-loc \{ display: flex;/);
});
