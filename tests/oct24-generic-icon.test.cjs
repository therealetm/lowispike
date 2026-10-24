'use strict';
/* Oct 24 (Eman, call Oct 23): after Add to Home Screen everybody got his own companion (Misty) as the app icon, plus the line
   "made by Eman who lost 45 kg in 7 months". The icon is now one generic LOWiSPIKE mark, and the line is gone everywhere. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
/* the Misty icons shipped from Oct 19 until build 20261024-221305 */
const MISTY = { 180: 'e2bfbcb570c77f4d6bd714a54ff9f920', 192: '4f94e7f5026fc8ea0f57c865889df760', 512: '0d4f1ab67e90b7f880c91d18e23d0ec4', touch: 'e2bfbcb570c77f4d6bd714a54ff9f920', fav: '743c683575dc213c794323ee2c106b1a' };

test('icon files and inline icons are no longer the Misty companion picture', () => {
  for (const n of [180, 192, 512]) assert.notEqual(md5(fs.readFileSync(path.join(root, 'icon-' + n + '.png'))), MISTY[n], 'icon-' + n + ' is still Misty');
  const html = read('index.html');
  const t = html.match(/<link rel="apple-touch-icon" href="data:image\/png;base64,([^"]+)"/), f = html.match(/<link rel="icon" href="data:image\/png;base64,([^"]+)"/);
  assert.ok(t && f);
  assert.notEqual(md5(Buffer.from(t[1], 'base64')), MISTY.touch, 'apple-touch-icon is still Misty');
  assert.notEqual(md5(Buffer.from(f[1], 'base64')), MISTY.fav, 'favicon is still Misty');
});

test('new icons reach phones that cached the old ones: manifest and its icons carry a version', () => {
  const html = read('index.html');
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest\?v=[^"]+">/);
  const man = JSON.parse(read('manifest.webmanifest'));
  for (const i of man.icons) assert.match(i.src, /^icon-\d+\.png\?v=/);
});

test('no "lost 45 kg in 7 months" line in what users see (manifest, share tags, first screen, founder profile)', () => {
  for (const f of ['manifest.webmanifest', 'index.html', 'herb-start.js']) {
    const s = read(f);
    assert.ok(!/lost 45|45 kg|45 kilo|Made by Eman|Von Eman|Creada por Eman/i.test(s), f + ' still has the founder weight-loss line');
  }
});
