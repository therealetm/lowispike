'use strict';
/* Nov 8 2026 (Emmanuel, with fakeaway-handoff.zip: "into somewhere that it makes sense, so that it's aligned with our UI ... I want to
   be able to share the page, and whoever I send it to, even if they aren't signed in, can immediately use it ... replace it with the
   weekly meal thingy that's in supermarket ... fuse it with ... the shopping, supermarket, the prices").
   - fakeaway/index.html: the Fakeaway week as its own public page (https://therealetm.github.io/lowispike/fakeaway/), no login, no app
     shell, in the app's look (navy glass, cyan, light-blue pill, system type, no web fonts), with a Teilen button. Built from
     tools/fakeaway/src (node build.cjs, node verify.cjs); recipes, amounts, times and prices are the handoff's, unchanged.
   - Supermarkt: the old "Meine Woche planen" row opens the Fakeaway week over Supermarkt instead, in the app's language and Day/Night;
     there its list has "In meine LOWiSPIKE-Liste", which puts every item into the app's shopping list with packs and the price per pack.
   - The service worker never turns /fakeaway/ into the app and keeps the last copy for offline.
   Browser walk (scratch, Chromium, local site, network blocked, 393 x 852): the row opens the page dark and German, the list button put
   24 items into the app list; the page alone at 390 x 844 dark and light without sideways scroll or console errors. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const page = read('fakeaway/index.html');

test('the public page: no web fonts, no login, the app\'s colours, share, the doctor note and the price note kept', () => {
    assert.doesNotMatch(page, /fonts\.googleapis|fonts\.gstatic/, 'no third-party requests');
    assert.doesNotMatch(page, /supabase|LOWI_CFG/, 'nothing about accounts');
    assert.match(page, /--accent:#8fe7ff/);
    assert.match(page, /data-act="share"/);
    assert.match(page, /function share\(\) \{/);
    assert.ok(page.includes("prices: 'Preise: Aldi Süd Online-Shop, 6.11.2026."), 'price source note');
    assert.match(page, /med:/, 'the doctor note stays');
});
test('the week itself is the handoff\'s (2 people about 103 euros)', () => {
    const F = require('../tools/fakeaway/src/data.js');
    const b = F.basket(2, 0);
    assert.equal(Math.round(b.total), 103);
    assert.equal(b.rows.length, 24);
});
test('inside the app the list goes into the app\'s shopping list with packs and prices', () => {
    assert.match(page, /const items = b\.rows\.map\(r => \(\{ n: F\.ITEMS\[r\.it\]\[L\(\)\], packs: r\.packs, pe: F\.ITEMS\[r\.it\]\.price \}\)\);/);
    assert.match(page, /P\.LOWI_SHELF && typeof P\.LOWI_SHELF\.addIngredients === 'function'/, 'only when the app is around it');
    const sp = read('store-picks.js');
    assert.match(sp, /if \(a === 'weekshop'\) return openFakeaway\(\);/);
    assert.match(sp, /<iframe class="faw-fr" src="fakeaway\/index\.html\?app=1&amp;lang=/);
    assert.match(sp, /T\('Fakeaway week', 'Fakeaway-Woche', 'Semana fakeaway'\)/);
});
test('the service worker serves the page as itself, network first, offline from the last copy', () => {
    const sw = read('sw.js');
    assert.match(sw, /if \(url\.pathname\.indexOf\("\/fakeaway\/"\) >= 0 && req\.method === "GET"\) \{/);
    assert.ok(sw.indexOf('/fakeaway/') < sw.indexOf('if (req.mode === "navigate" && !isShell(url)) return;'), 'before the app\'s own page handling');
    const site = require('../scripts/site-files.cjs');
    assert.ok(site.published('fakeaway/index.html'), 'published');
    assert.ok(!site.published('tools/fakeaway/src/data.js'), 'the sources stay out of the site');
});
