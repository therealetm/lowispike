// 23 Nov 2026 (Emmanuel): lowispike.com opens on an app-store-style page for new visitors in a browser. Honest: no fake ratings.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const js = R('store-page.js'), css = R('store-page.css');
test('only for a new visitor in a browser: not in the installed app, not for someone who already uses it, not on a deep link, once per session', () => {
  assert.match(js, /if \(standalone\(\) \|\| ss\.get\(SEEN\) === '1' \|\| uses\(\)\) return false;/); assert.match(js, /location\.hash && location\.hash\.length > 1/);
});
test('no invented numbers: no ratings, stars, chart rank or downloads', () => { const code = js.replace(/\/\*[\s\S]*?\*\//g, ''); assert.doesNotMatch(code, /RATINGS|★|No\.\s?\d|downloads/i); });
test('Get leads on to the Add to Home Screen guide; Impressum and Privacy in the footer; three languages', () => {
  assert.match(js, /if \(b\.dataset\.lsp === 'get'\) close\(\);/); assert.match(js, /versteckmich\.de\/emanwel\/impressum/); assert.match(js, /href="privacy\.html"/);
  for (const l of ['en', 'de', 'es']) assert.ok(js.includes(l + ': { sub:'), l);
  for (const i of [1, 2, 3]) assert.ok(fs.existsSync(path.join(__dirname, '..', 'store', 'shot-' + i + '.webp')));
});
test('it shows above the boot screen and the gate waits behind it', () => { assert.match(css, /#lspStore#lspStore\.lsp\.lsp\.lsp\.lsp\{visibility:visible!important\}/); assert.match(css, /html\.lsp-open #r2gate/); assert.match(R('index.html'), /<script src="store-page\.js\?v=/); });
