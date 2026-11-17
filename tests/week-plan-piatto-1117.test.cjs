/* 17 Nov 2026 (owner: "This whole interface in my app is messy & confusion for ppl so make it like" Piatto): Supermarkt opens on a
   clean week plan: thin setup progress, hello + "geplant für", shopping card + budget ring, dinner cards with price per portion,
   one way to the shelves and back, and only honest claims (estimates, no lunch plan, no drag and drop). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const wb = read('week-basket.js'), sp = read('store-picks.js'), css = read('week-basket.css');
const week = wb.slice(wb.indexOf('function weekHTML'), wb.indexOf('function listHTML'));

test('setup: a thin progress bar with an accessible step count, and the shelves one tap away before the first plan', () => {
  assert.match(wb, /class="wb-prog" role="progressbar"/);
  assert.match(wb, /'Schritt ' \+ n \+ ' von ' \+ STEPS\.length/);
  assert.match(wb, /const browse = !S\.setup && inl && inl\.onBack \?/);
  assert.match(wb, /if \(!S\.setup && S\.store && step === 0\) step = 1;/, 'a shop known from Supermarkt skips that question');
  assert.match(css, /\.wb-prog \{/);
});

test('the plan: shopping card, budget ring, dinner cards, browse card, estimate note', () => {
  assert.match(week, /class="wb-shopcard" data-wb="view" data-v="list"/, 'the shopping card opens the existing list');
  assert.match(week, /'Liste \\u00f6ffnen'/);
  assert.match(week, /class="wb-ring"/);
  assert.match(week, /class="wb-browse" data-wb="tosm"/);
  assert.match(week, /'Preise sind Sch\\u00e4tzungen, keine Live-Preise des Ladens\.'/);
  assert.match(wb, /eur\(cost \/ Math\.max\(1, S\.people\)\) \+ T\('\/portion', '\/Portion'/);
  assert.match(wb, /'geplant f\\u00fcr '/);
  assert.ok(!/drag|Mittagessen|allergiefrei|allergy-safe/i.test(week.replace(/\/\*[\s\S]*?\*\//g, '')), 'no feature the plan does not have');
  assert.ok(!/insulin/i.test(wb), 'no insulin wording in the planner (week-flow rule)');
});

test('Supermarkt: plan first, products remembered, a way back from the products', () => {
  assert.match(sp, /const homeTab = \(\) => !!WB\(\);/);
  assert.match(sp, /data-stp="toplan"/);
  assert.match(sp, /if \(a === 'toplan'\) return setTab\('home'\);/);
  assert.match(sp, /lastSm\(\) !== 'shop'/);
});
