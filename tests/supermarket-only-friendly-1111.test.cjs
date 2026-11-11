// 11 Nov 2026 (Emmanuel, Supermarket screenshots): "I don't know why there's a ... scan button there" and "a supermarket where I
// only see the insulin friendly stuff". Supermarket lists only what passes: no Scan in the shop button under the shelves, no
// Show left out chip, no aisle that has nothing to offer.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const sp = fs.readFileSync(path.join(__dirname, '..', 'store-picks.js'), 'utf8');
const list = sp.slice(sp.indexOf('function listHTML(state, err)'), sp.indexOf('function listHTML(state, err)') + 9000);

test('Supermarket: no Scan in the shop button under the shelves or the shop picker', () => {
  assert.doesNotMatch(sp, /footBtns\([^)]*scanBtn\(\)/);
  assert.match(list, /footBtns\(''\)\);/);
});

test('Supermarket: the category row has no Show left out chip', () => {
  assert.match(list, /'<div class="stp-chips stp-jumps">' \+ chips \+ '<\/div>'/);
  assert.match(sp, /let ov = null, view = 'list', data = null, built = null, q = '', showFail = false/, 'left-out products start hidden and nothing turns them on');
});

test('Supermarket: only aisles with something insulin-friendly get a chip and a section', () => {
  assert.match(list, /const chips = built\.groups\.filter\(g => g\.pass\.length\)\.map\(/);
  assert.match(list, /built\.groups\.filter\(g => g\.pass\.length\)\.map\(groupHTML\)/);
});

test('Supermarket: a search that only finds left-out products says so, in EN/DE/ES', () => {
  assert.match(list, /const onlyOut = !!\(q && c\.total && !c\.pass\);/);
  assert.match(list, /T\('Nothing insulin-friendly matches that search\.', 'Zu der Suche gibt es hier nichts Insulinfreundliches\.', 'No hay nada apto para la insulina con esa búsqueda\.'\)/);
});
