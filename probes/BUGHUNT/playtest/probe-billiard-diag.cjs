'use strict';
/* diag: fps + table state over time after one aimed shot. usage: node probe-billiard-diag.cjs <dir> <view> */
const L = require('./lib.cjs');
(async () => {
  const srv = await L.serve(process.argv[2]); const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const h = await L.open({ view: process.argv[3] || 'iphone13', url, settle: 7000 }); const P = h.page;
  await P.evaluate(() => window.goTab('foryou')); await L.sleep(3500);
  await P.evaluate(() => { const gx = window.__lgGx, E = window.LowiEnergy; const me = gx.map.spots.find(s => s.me); const o = gx.map.spots.filter(s => !s.me).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0]; E.fire(Math.atan2(o.y - me.y, o.x - me.x), .9); window.__f0 = window.__bh.frames; });
  for (let i = 0; i < 25; i++) { await L.sleep(1000); const s = await P.evaluate(() => { const f = window.__bh.frames - window.__f0; window.__f0 = window.__bh.frames; return { fps: f, busy: window.LowiEnergy.busy(), st: window.LowiEnergy.state() }; }); console.log(i, JSON.stringify(s).slice(0, 400)); if (!s.busy && i > 3) break; }
  console.log(JSON.stringify(await L.snap(h)), h.log.pageerror);
  await h.browser.close(); srv.close();
})();
