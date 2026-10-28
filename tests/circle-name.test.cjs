'use strict';
/* Oct 28 2026, Emmanuel (call, about the Community pool table tab): "was by the way Circle heissen sollte. Wieso heisst das
   noch Raum?" The tab and every line that names it say Circle in EN / DE / ES; no shown text calls it Raum / Room / Sala. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const R = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function ui(lang) {
  const D = { readyState: 'loading', addEventListener() {}, getElementById: () => null, documentElement: {}, querySelector: () => null };
  const W = { getComputedStyle: () => ({}), addEventListener() {}, LowiRooms: null, LowiLang: { get: () => lang } };
  const ctx = { window: W, document: D, setInterval() {}, setTimeout() {}, location: { hash: '' }, navigator: { language: lang }, localStorage: { getItem: () => lang } };
  vm.createContext(ctx); vm.runInContext(R('community-rooms-ui.js'), ctx); return W.LowiRoomsUI;
}

test('the Community tab is called Circle in every language', () => {
  const js = R('community-rooms-ui.js');
  assert.match(js, /room:\['Circle','Circle','Circle'\]/);
  assert.match(js, /obK1:\['Circle: [^']+','Circle: [^']+','Circle: [^']+'\]/);
  assert.ok(ui('de'), 'community-rooms-ui.js still loads');
});

test('no shown line calls the tab Raum / Room / Sala any more', () => {
  const checks = {
    'community-rooms-ui.js': /'(?:Room|Raum|Sala)'|'(?:Room|Raum|Sala): /,
    'community-remove-core.js': /aus Raum,|from Room,|de la Sala,/,
    'finch-extras.js': /Leute(?:n)? im Raum|people in the room|gente de la sala/,
    'cell-room.js': /aus dem Community-Raum|from the Community room|sonst ist im Raum|else is in the room/,
    'tutorial-steps.js': /tap Room, Chat/
  };
  for (const [f, re] of Object.entries(checks)) assert.doesNotMatch(R(f), re, f);
});
