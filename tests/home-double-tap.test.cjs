const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'body-world-3d.js'), 'utf8');

test('double tap on Today uses Home\'s own World map <-> Misty glide (the re-layout resets rig.fly)', () => {
  assert.match(src, /onDouble: \(x, y\) => \{[^\n]*LowiWorldHome[^\n]*toggleZoom\(\)/);
});

test('double tap on a glowing place does not zoom', () => {
  assert.match(src, /if \(id && id !== 'cell'\) return;/);
});
