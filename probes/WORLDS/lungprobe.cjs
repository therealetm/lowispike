'use strict';
/* Why does Misty never reach st 'inside' in the lung world? travel there, sample flight state every 2 s. node lungprobe.cjs [--view chromium390] [--world lung] [--secs 60] [--url URL|--root DIR] */
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', '/home/sprite/wt-worlds-playtest')));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const h = await L.open({ url, view: arg('view', 'chromium390'), settle: 6000, lang: 'en' }); const P = h.page;
  await P.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiWorldRegions && window.LowiMistyFlight, null, { timeout: 150000 }).catch(() => { });
  const w = arg('world', 'lung');
  await P.evaluate(w => LowiWorldRegions.travel(w), w);
  const t0 = Date.now(), end = t0 + 1000 * +arg('secs', 60); let last = '';
  while (Date.now() < end) {
    const s = await P.evaluate(() => { const f = LowiMistyFlight.state(); return { cur: LowiWorldRegions.current(), st: f.st, inT: f.inT, near: f.near, nearD: f.nearD, hs: f.hs, p: f.p, orb: f.orb, autoX: f.autoX, fps: (() => { try { return LowiWorld3D.fps(); } catch (e) { return null; } })(), log: f.log.slice(-4).join(' / ') }; });
    const k = JSON.stringify(s); if (k !== last) console.log(((Date.now() - t0) / 1000).toFixed(0) + 's', k.slice(0, 600)); last = k;
    await L.sleep(2000);
  }
  const s = await L.snap(h); console.log('ERRORS', JSON.stringify([...h.log.pageerror, ...s.err, ...s.rej]).slice(0, 1500));
  await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(2); });
