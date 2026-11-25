// 23 Nov 2026 (Emmanuel): lowispike.com opens on an app-store-style page for new visitors in a browser. Honest: no fake ratings.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const js = R('store-page.js'), css = R('store-page.css');
test('only for a new visitor in a browser: not in the installed app, not for someone who already uses it, not on a deep link, once per session', () => {
  assert.match(js, /if \(standalone\(\) \|\| ss\.get\(SEEN\) === '1'\) return false;/); assert.match(js, /return !uses\(\);/); /* 23 Nov 2026: uses() is checked last, after the in-app browser case */ assert.match(js, /location\.hash && location\.hash\.length > 1/);
});
/* changed 23 Nov 2026: real reviews now show (review-ask.js); stars and the average come only from them, never from a typed number */
test('no invented numbers: ratings only from real reviews, no chart rank or downloads', () => { const code = js.replace(/\/\*[\s\S]*?\*\//g, ''); assert.doesNotMatch(code, /No\.\s?\d|downloads|(avg|rating|stars)\s*[:=]\s*\d/i); assert.match(code, /const avg = REV\.reduce\(/); assert.match(code, /if \(!REV\.length\) return '';/); });
/* changed 23 Nov 2026: Get no longer closes the page into the old guide; it opens the share menu (see the test below) */
test('Get starts the install flow; Impressum and Privacy in the footer; three languages', () => {
  assert.match(js, /if \(b\.dataset\.lsp === 'get'\) get\(\);/); assert.match(js, /const IMPRINT = 'impressum\.html';/); /* 23 Nov 2026: own Impressum page */ assert.match(js, /href="privacy\.html"/);
  for (const l of ['en', 'de', 'es']) assert.ok(js.includes(l + ': { sub:'), l);
  /* changed 25 Nov 2026: shot-2 / shot-3 were replaced by named real screens (tests/store-shots.test.cjs checks all seven) */
  for (const i of ['1', 'chat', 'foryou', 'circle', 'studio', 'mirror', 'home']) assert.ok(fs.existsSync(path.join(__dirname, '..', 'store', 'shot-' + i + '.webp')));
});
test('it shows above the boot screen and the gate waits behind it', () => { assert.match(css, /#lspStore#lspStore\.lsp\.lsp\.lsp\.lsp\{visibility:visible!important\}/); assert.match(css, /html\.lsp-open #r2gate/); assert.match(R('index.html'), /<script src="store-page\.js\?v=/); });
test('store sections: What’s New, App Privacy (matches privacy.html), Accessibility, Information, slim top bar (23 Nov 2026)', () => {
  for (const k of ['newH', 'privH', 'accH', 'infoH']) assert.ok(js.includes(k + ": '"), k);
  assert.match(js, /p1t: 'No ads, no tracking, no analytics tools\./); assert.match(R('privacy.html'), /We do not sell your data, show ads, or use tracking or analytics tools\./);
  assert.match(js, /iAgeV: '16\+'/); assert.match(R('privacy.html'), /people aged 16 and over/);
  assert.match(js, /el\.classList\.toggle\('mini', on\)/); assert.match(css, /\.lsp\.mini \.lsp-mini::before/);
});
test('the store page is never made inert by the sign-in lock (23 Nov 2026 bug: the whole page was frozen)', () => {
  assert.match(R('index.html'), /function lockApp\(on\)\{ Array\.prototype\.forEach\.call\(document\.body\.children, el => \{ if \(el\.id === "r2gate" \|\| el\.id === "lspStore"/);
  assert.match(js, /attributeFilter: \['inert'\]/);
});
/* changed 23 Nov 2026 (his iPhone): the share menu navigator.share opens has no "Add to Home Screen", so Get on an iPhone plays the
   replay (install-replay.js, tests/install-replay.test.cjs); the small card with the arrow stays as the fallback */
test('Get on an iPhone plays the replay; the card with an arrow is the fallback; in-app browsers open Safari; Android uses its prompt (23 Nov 2026)', () => {
  assert.match(js, /if \(ios\(\)\) \{ replay\(W\.LowiInstallReplay \? W\.LowiInstallReplay\.variantFor\(UA\) : ''\); return; \}/);
  assert.doesNotMatch(/function get\(\) \{[\s\S]*?\n  \}/.exec(js)[0], /navigator\.share|shareSheet/); assert.match(js, /if \(!R \|\| !el\) return instOn\(android\(\) \? 'android' : 'after'\);/);
  assert.match(js, /if \(inapp\(\)\) \{ instOn\('inapp'\);/); assert.match(js, /e\.prompt\(\)/);
  assert.match(js, /sessionStorage\.setItem\('lowi\.a1\.skip', '1'\)/, 'continuing in the browser skips the old step-by-step guide');
  assert.match(css, /\.ix-top\{position:absolute;left:0;right:0;top:0;height:38vh/, 'the loop sits above where the share menu opens');
  for (const l of ['en', 'de', 'es']) assert.ok(js.includes(l + ": { top: '"), l);
});
test('inside Instagram / TikTok the store page always shows, also for someone who used the app there; the old A1 guide is off (23 Nov 2026)', () => {
  assert.match(js, /if \(\/Instagram\|FBAN[^\n]*\.test\(UA\)\) return true;\n\s+return !uses\(\);/);
  assert.match(js, /if \(standalone\(\) \|\| ss\.get\(SEEN\) === '1'\) return false;/);
  assert.match(R('index.html'), /const A1_OFF = true;/);
});
