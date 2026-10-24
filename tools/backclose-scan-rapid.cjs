'use strict';
/* Back/close sweep repro: open Scan and press back quickly, a few times in a row. Does the app stay put on Home?
   node tools/backclose-scan-rapid.cjs [chromium|webkit] [url|root] [rounds] [gapMs] */
const H = require('./sim/harness.cjs');
const fs = require('fs'), path = require('path');
(async () => {
  const eng = process.argv[2] || 'chromium', target = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const rounds = +(process.argv[4] || 4), gap = +(process.argv[5] || 350);
  const o = { engine: eng, members: 10, messages: 20, probe: false };
  if (/^https?:/.test(target)) o.url = target; else o.root = target;
  if (eng === 'webkit') o.device = 'iPhone 13'; else o.viewport = { width: 390, height: 844 };
  const R = await H.open(o); const P = R.page;
  if (eng === 'webkit') await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
  const navs = [];
  P.on('framenavigated', f => { if (f === P.mainFrame()) navs.push(R.el() + ' ' + f.url().replace(/^.*\//, '')); });
  await R.goto(); await H.sleep(9000);
  await P.touchscreen.tap(8, 420); await H.sleep(800);
  const app = P.url().split('?')[0], loads0 = R.loads;
  const s = () => Promise.race([new Promise(r => setTimeout(() => r('HUNG >20s'), 20000)), P.evaluate(() => ({ h: history.length, st: JSON.stringify(history.state), tab: (document.querySelector('.tab.active') || {}).id, cam: !!document.querySelector('.b3-on,#b3.on,#b3Cam.on') || document.documentElement.classList.contains('b3-open') })).catch(e => 'ERR ' + e.message.slice(0, 60))]);
  console.log('base', JSON.stringify(await s()));
  const scanXY = await P.evaluate(() => { const r = document.querySelector('[data-orbit="scan"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  if (process.env.XFIRST) { await P.touchscreen.tap(scanXY[0], scanXY[1]); await H.sleep(2500); const x = await P.evaluate(() => { const b = document.querySelector('.b3-cx'); if (!b) return null; const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); console.log('x', x); if (x) await P.touchscreen.tap(x[0], x[1]); await H.sleep(5000); console.log('after X', JSON.stringify(await s())); }
  let left = false;
  for (let i = 0; i < rounds && !left; i++) {
    await P.touchscreen.tap(scanXY[0], scanXY[1]).catch(() => { });
    await H.sleep(gap);
    const a = await s();
    await P.evaluate(() => history.back()).catch(() => { });
    await H.sleep(300);
    const b = await s();
    console.log('round', i, 'after tap', JSON.stringify(a), '| after back', JSON.stringify(b));
    if (P.url().split('?')[0] !== app || R.loads !== loads0) left = true;
  }
  for (let w = 0; w < 12 && !left; w++) { await H.sleep(1500); if (P.url().split('?')[0] !== app || R.loads !== loads0) left = true; }
  const fin = await s();
  console.log(left ? 'LEFT THE APP' : 'stayed', P.url(), 'loads', R.loads, 'final', JSON.stringify(fin));
  console.log('navs', JSON.stringify(navs));
  console.log('errs', JSON.stringify(R.errs).slice(0, 600));
  await R.close();
  process.exit(left ? 1 : 0);
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
