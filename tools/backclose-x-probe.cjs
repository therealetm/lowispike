'use strict';
/* Back and close sweep 13:40 (Oct 24 2026): open one thing (an expression), then report the visible top layer and whether the
   bottom X (#whX) is on top where it is drawn, tap it, and report again.
   node tools/backclose-x-probe.cjs "<open expression>" [chromium|webkit] [WxH|device] [url|root] */
const H = require('./sim/harness.cjs');
const expr = process.argv[2] || 'LowiHomeOrbitV2.openSettings()';
const engine = process.argv[3] || 'chromium', dev = process.argv[4] || '390x844';
const target = process.argv[5] || 'https://therealetm.github.io/lowispike/index.html';
const sleep = H.sleep;
const LOOK = () => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const ov = [...document.querySelectorAll('.r2-ov, [aria-modal="true"]')].filter(vis).map(e => String(e.className).slice(0, 50) + ' z' + getComputedStyle(e).zIndex);
  const x = document.getElementById('whX'); let xs = null;
  if (x && !x.hidden && vis(x)) { const r = x.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); xs = { x: r.left + r.width / 2, y: r.top + r.height / 2, z: getComputedStyle(x).zIndex, hit: t ? (t === x || x.contains(t) ? 'ok' : (t.id || String(t.className).slice(0, 40))) : 'none' }; }
  return { tab: (document.querySelector('#main > .tab.active') || {}).id || '', ov, whX: xs };
};
(async () => {
  const o = { engine, members: 12, messages: 30, probe: false, lang: 'en' };
  if (/^https?:/.test(target)) o.url = target; else o.root = target;
  if (engine === 'webkit') o.device = dev; else { const [w, h] = dev.split('x').map(Number); o.viewport = { width: w, height: h }; }
  const R = await H.open(o); const P = R.page;
  await R.goto(); await sleep(9000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  await P.evaluate(e => (0, eval)(e), expr); await sleep(2500);
  const a = await P.evaluate(LOOK); console.log('open', JSON.stringify(a));
  if (a.whX) { await P.touchscreen.tap(a.whX.x, a.whX.y); await sleep(2000); console.log('after X', JSON.stringify(await P.evaluate(LOOK))); }
  console.log('errors', JSON.stringify(R.errs.map(e => e.m)).slice(0, 400));
  await R.close();
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
