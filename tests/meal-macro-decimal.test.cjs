/* Bug hunt 2026-10-25 05:01 (Fuel): the saved-meal sheet (typed meal and photo meal) wrote decimals with a point in German and
   Spanish ("Fett 9.5 g", "PROTEÍNA ≈ 11.5 G") while Today's stats on the same sheet already wrote "11,5". German and Spanish use a
   decimal comma; English keeps the point. Runs spirit.js's real macro grid. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'spirit.js'), 'utf8');
const M = require('../meal-db-core.js');
M.load(JSON.parse(fs.readFileSync(path.join(root, 'data/meals/fndds.json'), 'utf8')));

function grid(l) {
  const start = js.indexOf('    const MDB = window.LowiMealDB;');
  const end = js.indexOf('    function estHTML(');
  assert.ok(start > 0 && end > start);
  const ctx = { window: { LowiMealDB: M }, D: { querySelector: () => null, addEventListener() {} }, fetch: () => Promise.reject(new Error('offline')),
    K: require('../spirit-core.js'), tr: k => k, esc: x => String(x), lang: () => l, console };
  vm.createContext(ctx);
  vm.runInContext(js.slice(start, end) + '\nthis.macroHTML = macroHTML;', ctx);
  return ctx.macroHTML({ t: 'Grilled chicken and white rice', macros: { protein: 42, fiber: 1, sugar: 0, carbs: 50, fat: 9.5, kcal: 480 } });
}

test('German and Spanish write the decimal with a comma on the saved meal (fat 9,5 g), English with a point', () => {
  for (const l of ['de', 'es']) {
    const h = grid(l);
    assert.match(h, /<b>9,5 g<\/b>/, l + ': ' + h);
    assert.doesNotMatch(h, /\d\.\d/, l + ' has no decimal point');
  }
  const en = grid('en');
  assert.match(en, /<b>9\.5 g<\/b>/, en);
  assert.match(en, /<b>480 kcal<\/b>/);
});
