'use strict';
/* Back and close sweep (Oct 24 12:40): open a sheet, back, open it again, back. Each back must close the sheet and keep the app.
   node tools/backclose-twice-probe.cjs [chromium|webkit] [WxH|device] [url|root] */
const H = require('./sim/harness.cjs');
const engine = process.argv[2] || 'chromium', dev = process.argv[3] || '390x844';
const target = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
const CASES = [
  ['Body stats', 'LowiBodyStats.open()', 'LowiBodyStats.isOpen()'],
  ['Weight journey', 'LowiWeightJourney.open()', 'document.querySelector(`#bsOv:not(.bs-out)`)'],
  ['Gap view', 'LowiGapView.open()', 'document.querySelector(`#gvSheet.on`)'],
  ['Weather', 'LowiTopBar.openWeather()', 'document.querySelector(`#tbWx`)'],
  ['Shop finds (grocery hunt)', 'LowiGrocery.open()', 'document.querySelector(`.gh-ov.in`)'],
];
(async () => {
  const o = { engine, members: 12, messages: 30, probe: false, lang: 'en' };
  if (/^https?:/.test(target)) o.url = target; else o.root = target;
  if (engine === 'webkit') o.device = dev; else { const [w, h] = dev.split('x').map(Number); o.viewport = { width: w, height: h }; }
  const R = await H.open(o); const P = R.page; const sleep = H.sleep;
  const ev = e => P.evaluate(e => { try { const v = (0, eval)(e); return v && typeof v === 'object' ? true : v; } catch (x) { return 'ERR ' + x.message; } }, e).catch(() => 'dead');
  const boot = async () => { await R.goto(); await sleep(9000); await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); }); await P.touchscreen.tap(8, 420); await sleep(800); };
  await boot();
  let bad = 0;
  for (const [n, open, isOpen] of CASES) {
    const app = P.url().split('?')[0]; const loads = R.loads; const res = [];
    for (let i = 0; i < 3; i++) {
      const ok = await ev(open); await sleep(1200);
      const was = await ev(isOpen);
      await P.evaluate(() => history.back()); await sleep(1500);
      const left = P.url().split('?')[0] !== app || R.loads !== loads;
      const still = left ? 'n/a' : await ev(isOpen);
      res.push({ i, open: String(ok).slice(0, 20), was: !!was, left, still: !!still && still !== 'n/a' });
      if (left) { bad++; break; }
    }
    console.log(n, JSON.stringify(res));
    if (res.some(r => r.left)) await boot();
  }
  console.log('BAD', bad, 'errs', JSON.stringify(R.errs.slice(0, 4)).slice(0, 600));
  await R.close();
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
