'use strict';
/* Nov 8 2026 (Emmanuel, the shared Challenge link in a private browser: "nun sieht das nicht mehr so aus, als würde das von derselben App
   kommen" and "wenn man ... klickt ... bei irgendein Rezept oder das mit der Einkaufsliste ... dass das dann ein zur Homepage bringt ...
   registrieren ... Oder wenn jemand schon einen Account hat, dann ... öffnet er sich halt in dem richtigen ... Sektion"). Browser
   checks: the shared page in a light-mode private browser is the app's night look; a recipe and the list open the join card
   (href <app>#challenge); the app opened with #challenge and an account lands on Circle > Challenge; without an account the start
   screen shows and the wish is kept for after sign-up. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const app = read('tools/fakeaway/src/p4_app.js'), page = read('fakeaway/index.html'), cw = read('challenge-week.js');

test('the shared page wears the app night look unless the app passes a theme', () => {
  assert.match(app, /else document\.documentElement\.setAttribute\('data-theme', 'dark'\);/);
  assert.ok(page.includes("else document.documentElement.setAttribute('data-theme', 'dark');"), 'built');
});

test('outside the app a recipe or the list opens the join card; inside the app they open as before', () => {
  assert.match(app, /if \(!cur0\.app && \(w === 'r' \|\| w === 'l'\)\) w = 'j';/);
  assert.match(app, /const APP_URL = \(\) => location\.pathname\.replace\(\/fakeaway\\\/\(index\\\.html\)\?\$\/, ''\) \+ '#challenge';/);
  assert.match(app, /'Kostenlos mitmachen'/); assert.match(app, /'Ich habe schon ein Konto'/); assert.match(app, /'In der App öffnen'/);
  assert.match(page, /<section class="sheet" id="sheet-j" aria-hidden="true" role="dialog" aria-modal="true">/);
  assert.match(read('store-picks.js'), /fakeaway\/index\.html\?app=1/, 'the app frame still passes app=1');
});

test('the app keeps the #challenge wish until it can open Circle > Challenge (after sign-up or sign-in), for one day', () => {
  assert.match(cw, /if \(\/\^#challenge\\b\/\.test\(location\.hash \|\| ''\)\) \{\n\s+try \{ localStorage\.setItem\(PEND, String\(Date\.now\(\)\)\); history\.replaceState/);
  assert.match(cw, /if \(D\.getElementById\('r2gate'\) \|\| H\.classList\.contains\('gate-boot'\)\) return false;/, 'waits behind the start screen');
  assert.match(cw, /G\.select\('challenge'\);\n\s+if \(D\.getElementById\('cwkPane'\)\) \{ try \{ localStorage\.removeItem\(PEND\); \}/);
  assert.match(cw, /Date\.now\(\) - t < DAY \? t : 0/);
});
