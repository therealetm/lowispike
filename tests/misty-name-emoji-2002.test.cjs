'use strict';
/* Code error sweep Oct 24 20:02: an emoji the user typed into Misty's name ('Lumi ✨') was swapped for an outline icon on
   Misty's card, because spirit.js symbols() turns every emoji in UI text into a LowiIcons svg. A name the user chose is
   their own text (like chat and captions), so the walker must skip the card title. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const spirit = fs.readFileSync(path.join(root, 'spirit.js'), 'utf8');
const hub = fs.readFileSync(path.join(root, 'misty-hub.js'), 'utf8');

function skipSelector() {
  const fn = spirit.slice(spirit.indexOf('function symbols(node)'));
  const m = fn.match(/p\.closest\('([^']+)'\)\) continue;/);
  assert.ok(m, 'symbols() skip selector found');
  return m[1].split(',').map(s => s.trim());
}

test("the emoji-to-icon walker skips the companion's name on Misty's card", () => {
  assert.ok(skipSelector().includes('.mh-name'), 'symbols() leaves .mh-name alone');
});

test("Misty's card still writes the name inside .mh-name, so the skip applies", () => {
  assert.match(hub, /<div class="mh-name"><h2>' \+ esc\(name\(\)\) \+ '<\/h2><\/div>/);
});

test('user text that was already skipped stays skipped', () => {
  const s = skipSelector();
  for (const k of ['input', 'textarea', '.cm-t', '.fy-cap', '[contenteditable]']) assert.ok(s.includes(k), k);
});
