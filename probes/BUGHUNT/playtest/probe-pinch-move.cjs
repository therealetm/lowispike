/* Run 24: probe-pinch seed 24 landed on the Move tab after pinches on Home. Which gesture does it? Each case starts on Home.
   node probe-pinch-move.cjs [url] */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/';
  const h = await L.open({ view: 'chromium390', url, settle: 8000 }); const { page } = h; const cdp = await h.ctx.newCDPSession(page);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i, radiusX: 4, radiusY: 4, force: 1 })) });
  const cx = 195, cy = 420;
  async function pinch(from, to, steps, opts = {}) { const pts = d => [[cx - d / 2, cy], [cx + d / 2, cy]]; await T('touchStart', pts(from));
    for (let i = 1; i <= steps; i++) { const d = from + (to - from) * i / steps; await T('touchMove', pts(d)); await L.sleep(opts.ms || 16); if (opts.cut && i === Math.floor(steps * opts.cut)) { await T('touchCancel', []); return; } }
    await T('touchEnd', []); }
  const tab = () => page.evaluate(() => ({ tabs: [...document.querySelectorAll('.tab.active, [id^="tab-"].active')].map(e => e.id).join(','), hash: location.hash, under: (() => { const e = document.elementFromPoint(195, 420); return e ? e.tagName + '.' + String(e.className && e.className.baseVal != null ? e.className.baseVal : e.className).slice(0, 40) + '#' + e.id : null; })() }));
  const home = async () => { await page.evaluate(() => window.goTab('home')); await L.sleep(1500); };
  console.log('start', JSON.stringify(await tab()));
  const cases = { inFull: () => pinch(300, 100, 12), inCut: () => pinch(300, 100, 12, { cut: 0.5 }), outFull: () => pinch(100, 300, 12), outCut: () => pinch(100, 300, 12, { cut: 0.5 }), rapidIn: async () => { for (let i = 0; i < 6; i++) await pinch(300, 100, 4, { ms: 8 }); }, tapCentre: async () => { await T('touchStart', [[cx, cy]]); await T('touchEnd', []); } };
  for (const [k, f] of Object.entries(cases)) for (let rep = 0; rep < 2; rep++) { await home(); const b = await tab(); await f(); await L.sleep(1200); const a = await tab(); console.log(k, rep, b.tabs, '->', a.tabs, 'under:', b.under); }
  await h.browser.close();
})().catch(e => { console.error(String(e).slice(0, 300)); process.exit(2); });
