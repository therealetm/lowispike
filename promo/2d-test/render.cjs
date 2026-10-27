/* Render the cartoon part frame by frame in Chromium (my own drawing; the app itself is captured separately in WebKit). */
const { chromium } = require('/tmp/pw/node_modules/playwright');
const fs = require('fs');
const OUT = '/home/sprite/PROMO6/cart/'; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const TL = fs.readFileSync('/home/sprite/PROMO6/timeline.json', 'utf8');
  await p.addInitScript({ content: 'window.TL=' + TL + ';' });
  await p.goto('file:///home/sprite/PROMO6/scene.html');
  await p.evaluate(() => window.READY); await p.evaluate(() => document.fonts.ready);
  const N = await p.evaluate(() => window.N); const states = [];
  const frames = only || [...Array(N).keys()];
  for (const f of frames) { const st = await p.evaluate((f) => window.render(f), f); states.push(Object.assign({ f }, st)); await p.screenshot({ path: OUT + 'c' + String(f).padStart(4, '0') + '.png' }); }
  fs.writeFileSync(OUT + 'states.json', JSON.stringify({ attach: await p.evaluate(() => window.ATTACH), states }));
  console.log('frames', frames.length, 'errors', JSON.stringify(errs.slice(0, 5)));
  await b.close();
})();
