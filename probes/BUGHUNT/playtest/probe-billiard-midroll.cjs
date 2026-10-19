'use strict';
/* reload mid-roll: the companion that was rolling comes back where it was at that moment. usage: node probe-billiard-midroll.cjs <dir> <view> */
const L = require('./lib.cjs');
(async () => {
  const srv = await L.serve(process.argv[2]); const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const h = await L.open({ view: process.argv[3] || 'chromium390', url, settle: 7000 }); const P = h.page;
  await P.evaluate(() => window.goTab('foryou')); await L.sleep(3500);
  await P.evaluate(() => { const gx = window.__lgGx, E = window.LowiEnergy; const me = gx.map.spots.find(s => s.me); const o = gx.map.spots.filter(s => !s.me).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0]; E.fire(Math.atan2(o.y - me.y, o.x - me.x), .9); });
  let s = null; for (let i = 0; i < 40; i++) { await L.sleep(100); s = await P.evaluate(() => ({ busy: window.LowiEnergy.busy(), st: window.LowiEnergy.state() })); if (s.st && s.st.bodies.some(b => b.vx || b.vy)) break; }
  console.log('mid-roll', JSON.stringify(s));
  await P.reload({ waitUntil: 'load' }); await L.sleep(7000); await P.evaluate(() => window.goTab('foryou')); await L.sleep(3000);
  const after = await P.evaluate(() => { const gx = window.__lgGx, E = window.LowiEnergy; return gx.map.spots.map(x => [x.uid, E.offset(x.uid)]).filter(([k, v]) => v && (v.x || v.y)); });
  console.log('after reload', JSON.stringify(after)); const sn = await L.snap(h); console.log('errors', JSON.stringify(sn.err), JSON.stringify(sn.rej), JSON.stringify(h.log.pageerror));
  await h.browser.close(); srv.close(); process.exit(after.length ? 0 : 1);
})();
