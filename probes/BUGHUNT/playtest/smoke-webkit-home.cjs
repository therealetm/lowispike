/* Run 24: WebKit iPhone 13 smoke of the live build after BH-023: Home loads, a tap on Water / Move opens its panel, no page errors. */
'use strict';
const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
const H = require(WT + '/tools/regress/harness.cjs');
(async () => {
  const R = await H.open({ probe: false, lang: 'en', url: process.argv[2], engine: 'webkit', device: 'iPhone 13', viewport: { width: 390, height: 844 } });
  const p = R.page, errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await R.goto(); await H.sleep(6000);
  const out = { build: await p.evaluate(() => window.BUILD || (document.querySelector('meta[name="build"]') || {}).content || null), fingers: await p.evaluate(() => !!window.LowiBubbles) };
  for (const k of ['water', 'move']) { const b = await p.locator('[data-orbit="' + k + '"]').first().boundingBox(); await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await H.sleep(2500); out[k] = await p.evaluate(() => !!document.querySelector('#hb2Bloom.on')); await p.keyboard.press('Escape'); await H.sleep(1500); }
  console.log(JSON.stringify({ out, errs }));
  await R.close();
})().catch(e => { console.log('FAIL', String(e).slice(0, 300)); process.exit(1); });
