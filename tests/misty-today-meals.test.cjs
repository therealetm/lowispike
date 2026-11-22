// 22 Nov 2026 (Emmanuel): Today opens on today's meals with Edit and Delete (two taps), water / Move / steps in one line, the rest behind More.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'misty-sheet.js'), 'utf8'), css = fs.readFileSync(path.join(__dirname, '..', 'misty-hub.css'), 'utf8');
test('Today starts with the meals list, then the chips, the rest is behind More', () => { assert.match(js, /return mealsHTML\(d\) \+ chipsHTML\(d\) \+/); assert.match(js, /'<div class="ms-rest"' \+ \(more \? '' : ' hidden'\)/); });
test('each meal can be edited (the app meal form) and deleted with a second tap', () => { assert.match(js, /data-ms-edit=/); assert.match(js, /t\.dataset\.sp = 'editMeal'/); assert.match(js, /if \(!b\.classList\.contains\('arm'\)\)/); assert.match(js, /J\.remove\(id\)/); });
test('buttons are real touch targets and the names wrap', () => { assert.match(css, /\.ms-mb \{[^}]*min-width: 44px; height: 44px/); assert.match(css, /\.ms-mtx b \{ font-size: 16px; overflow-wrap: anywhere/); });
