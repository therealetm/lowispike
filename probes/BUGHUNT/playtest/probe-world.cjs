'use strict';
const L = require('./lib.cjs'), path = require('path');
(async () => {
  const srv = await L.serve(path.resolve(process.argv[2]));
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  const h = await L.open({ url, view: process.argv[3] || 'chromium390', settle: 5000 }); const P = h.page;
  const st = () => P.evaluate(() => { const R = window.LowiWorldRegions; let s = null; try { s = R.state && JSON.stringify(Object.fromEntries(Object.entries(R.state).filter(([k, v]) => typeof v !== 'object' || v === null))).slice(0, 200); } catch (e) { s = e.message; } return { keys: Object.keys(R).join(','), cur: R.current && R.current(), st: s, html: document.documentElement.className.split(' ').filter(c => /rw-|bw|warp|world|wh-/.test(c)).join(' ') }; });
  console.log(JSON.stringify(await st()));
  const t0 = Date.now();
  console.log('travel ->', await P.evaluate(() => window.LowiWorldRegions.travel('liver')));
  for (let i = 0; i < 16; i++) { await L.sleep(1000); const s = await st(); console.log(((Date.now() - t0) / 1000).toFixed(1), s.cur, s.st, s.html); }
  console.log('back ->', await P.evaluate(() => window.LowiWorldRegions.travel('hub')));
  for (let i = 0; i < 12; i++) { await L.sleep(1000); const s = await st(); console.log(((Date.now() - t0) / 1000).toFixed(1), s.cur, s.st, s.html); }
  console.log(JSON.stringify(h.log).slice(0, 1500));
  await h.browser.close(); srv.close();
})();
