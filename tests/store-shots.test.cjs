// 25 Nov 2026 (Emmanuel: "update our App Store ... where the images go ... the community, the studio, our own chat box ... our own For You
// page, cross-platform ... our own mirroring fitness room"). The store page shows seven real screens, each with a caption in EN / DE / ES,
// each file served and cached for offline; the old shot-2 / shot-3 (they showed the owner's companion name) are gone.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const sp = R('store-page.js'), sw = R('sw.js');
const SHOTS = ['shot-chat', 'shot-1', 'shot-foryou', 'shot-circle', 'shot-studio', 'shot-mirror', 'shot-home'];
test('seven real screens in this order, each a 585 x 1050 webp that the service worker caches', () => {
  const order = [...sp.matchAll(/\['store\/(shot-[a-z0-9]+)\.webp', t\('(\w+)'\)\]/g)].map(m => m[1]);
  assert.deepStrictEqual(order, SHOTS);
  for (const s of SHOTS) {
    const f = path.join(__dirname, '..', 'store', s + '.webp'); assert.ok(fs.existsSync(f), s);
    const b = fs.readFileSync(f); assert.strictEqual(b.toString('ascii', 8, 12), 'WEBP', s);
    assert.ok(sw.includes('"store/' + s + '.webp"'), s + ' cached');
  }
  for (const old of ['shot-2', 'shot-3']) { assert.ok(!fs.existsSync(path.join(__dirname, '..', 'store', old + '.webp')), old); assert.ok(!sw.includes('store/' + old + '.webp'), old); }
});
test('every caption exists in English, German and Spanish', () => {
  for (const k of ['sChat', 'sFy', 'sCircle', 'sStudio', 'sMirror', 's1', 's2']) assert.strictEqual(sp.split(' ' + k + ": '").length - 1, 3, k);
});
