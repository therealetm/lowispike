'use strict';
/* Nov 8 2026 (owner: "Alles bezüglich meiner Impressum findest du hier ... https://versteckmich.de/emanwel/impressum"). The legal notice is
   one tap away on the first screen (before sign-up), in About & info, on the shared pages, and the privacy policy names the provider
   through it instead of placeholders. Browser check: first screen shows "Impressum · Datenschutz" under "Ich habe schon ein Konto". */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const IMP = 'https://versteckmich.de/emanwel/impressum';

test('Impressum everywhere it must be, no placeholders left', () => {
  assert.ok(read('herb-start.js').includes('<p class="hs-legal"><a href="' + IMP + '"'), 'first screen');
  assert.ok(read('store-ready.js').includes("const IMPRINT = '" + IMP + "';"), 'About & info');
  assert.ok(read('post/index.html').includes(IMP), 'shared post');
  assert.ok(read('fakeaway/index.html').includes(IMP), 'shared Fakeaway week');
  const pv = read('privacy.html');
  assert.ok(!pv.includes('[OWNER:'), 'no placeholders');
  assert.equal((pv.match(new RegExp(IMP.replace(/[./]/g, '\\$&'), 'g')) || []).length, 3, 'en, de, es');
});
