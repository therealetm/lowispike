'use strict';
/* Nov 8 2026 (owner: "Alles bezüglich meiner Impressum findest du hier ... https://versteckmich.de/emanwel/impressum"). The legal notice is
   one tap away on the first screen (before sign-up), in About & info, on the shared pages, and the privacy policy names the provider
   through it instead of placeholders. Browser check: first screen shows "Impressum · Datenschutz" under "Ich habe schon ein Konto". */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
/* changed 23 Nov 2026 (Emmanuel: "you take over and you do this correctly"): the Impressum lives on lowispike.com (impressum.html, c/o address
   service so his home stays private); pages one folder down link ../impressum.html */
const IMP = 'impressum.html';

test('Impressum everywhere it must be, no placeholders left', () => {
  assert.ok(read('herb-start.js').includes('<p class="hs-legal"><a href="' + IMP + '"'), 'first screen');
  assert.ok(read('store-ready.js').includes("const IMPRINT = '" + IMP + "';"), 'About & info');
  assert.ok(read('post/index.html').includes('../' + IMP), 'shared post');
  assert.ok(read('fakeaway/index.html').includes('../' + IMP), 'shared Fakeaway week');
  const pv = read('privacy.html');
  assert.ok(!pv.includes('[OWNER:'), 'no placeholders');
  assert.equal((pv.match(new RegExp(IMP.replace(/[./]/g, '\\$&'), 'g')) || []).length, 3, 'en, de, es');
});

test('the own Impressum page: § 5 DDG name, c/o address, email, § 19 UStG, § 18 MStV, consumer dispute line, privacy links; cached offline', () => {
  const h = read('impressum.html');
  for (const k of ['Angaben gemäß § 5 DDG', 'Emmanuel Montag', 'c/o SourceArt · VM-00003462', 'Fritz-Thiele-Straße 3', '28279 Bremen', 'emanuristic@versteckmich.de', '§ 19 UStG', '§ 18 Abs. 2 MStV', 'Verbraucherschlichtungsstelle', 'privacy.html#de']) assert.ok(h.includes(k), k);
  assert.match(read('sw.js'), /STATIC\.push\("store-ready\.js", "privacy\.html", "impressum\.html"\)/);
  const pv = read('privacy.html');
  for (const k of ['Verantwortlicher im Sinne der DSGVO', 'Cloudflare', 'EU-US Data Privacy Framework', 'Art. 21 DSGVO', 'Art. 22 DSGVO', '§ 25 Abs. 2 TDDDG'.replace('§', '&sect;'), 'Push-Mitteilungen']) assert.ok(pv.includes(k), k);
  assert.ok(!/versteckmich\.de\/emanwel/.test(pv + read('store-page.js') + read('index.html') + read('herb-start.js') + read('store-ready.js')), 'no link to the third-party page left');
});
