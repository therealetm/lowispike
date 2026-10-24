/* Code error sweep 2026-10-24 06:02 (bug queue from the 03:02 bug hunt): "muesli with milk" (also "Müsli mit Milch",
   "Muesli con leche") was logged as plain milk, 127 kcal, because the food data has no muesli row and the word was dropped
   as unknown. Muesli is now a dish built from oats, raisins and nuts; a muesli bar stays a bar.
   Also: the German scan line "Keine Bubble für dieses" read like it was cut off (Spanish "Sin burbuja para este" too). */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const M = require('../meal-db-core.js');
M.load(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/meals/fndds.json'), 'utf8')));

test('muesli with milk is muesli plus milk, never just milk, in every language', () => {
  const names = [];
  for (const t of ['muesli with milk', 'Müsli mit Milch', 'Muesli con leche']) {
    const r = M.parse(t);
    assert.match(r.name, /muesli/i, t + ' -> ' + r.name);
    assert.ok(r.ingredients.includes('oats'), t + ': ' + r.ingredients.join(', '));
    assert.ok(r.ingredients.includes('milk'), t + ': ' + r.ingredients.join(', '));
    assert.deepEqual(r.unknown || [], [], t + ' leaves nothing unknown');
    assert.ok(r.kcal >= 300, t + ' is a bowl, not a glass of milk (' + r.kcal + ' kcal)');
    names.push(r.name + ' ' + r.kcal);
  }
  assert.equal(new Set(names).size, 1, 'same meal in English, German and Spanish: ' + names.join(' | '));
});

test('muesli alone and Bircher muesli are muesli, not a rough mixed meal', () => {
  for (const t of ['muesli', 'Müsli', 'Bircher Müsli', 'muesli with yogurt']) {
    const r = M.parse(t);
    assert.match(r.name, /muesli/i, t + ' -> ' + r.name);
    assert.notEqual(r.how, 'rough', t);
  }
});

test('a muesli bar is still a bar, and granola stays granola', () => {
  for (const t of ['muesli bar', 'Müsliriegel']) {
    const r = M.parse(t);
    assert.match(r.name, /bar/i, t + ' -> ' + r.name);
    assert.doesNotMatch(r.name, /\+/, t + ' -> ' + r.name);
  }
  assert.match(M.parse('granola with milk').name, /granola/i);
  assert.match(M.parse('oat milk').name, /oat milk/i);
});

test('the scan "no bubble" line is a whole sentence in German and Spanish', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const m = html.match(/ncT: \["([^"]+)", "([^"]+)", "([^"]+)"\]/);
  assert.ok(m, 'ncT row found');
  assert.doesNotMatch(m[2], /\b(dieses|diese|diesen)$/i, 'German ends mid-phrase: ' + m[2]);
  assert.doesNotMatch(m[3], /\b(este|esta|para)$/i, 'Spanish ends mid-phrase: ' + m[3]);
  assert.match(m[2], /Bubble/);
  assert.match(m[3], /burbuja/);
});
