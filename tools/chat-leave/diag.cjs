/* one leave cycle with the camera state dumped (debug aid for chat-leave). node tools/chat-leave/diag.cjs url device */
'use strict';
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
(async () => {
  const url = process.argv[2], device = process.argv[3] || 'Pixel 7', engine = device === 'Pixel 7' ? 'chromium' : 'webkit';
  const R = await H.open({ engine, device, probe: false, url, lang: 'en' });
  const p = R.page;
  const dump = tag => p.evaluate(tag => { const WH = window.LowiWorldHome, r = WH && WH.rig && WH.rig(), st = WH && WH.state, C = document.documentElement.classList;
    return tag + ' ' + JSON.stringify({ mode: r && r.mode, dist: r && +r.dist.toFixed(2), homeDist: r && r.homeDist, homeRest: r && r.homeRest, maxD: r && r.maxD, pull: st && st.pull, za: st && st.zoomAnim, mz: st && st.mz,
      cls: ['wh-mapview', 'wh-cosmos', 'gx-in', 'gx-out', 'gx-keep', 'wh-world-live'].filter(c => C.contains(c)), act: [...document.querySelectorAll('.tab.active')].map(e => e.id).join(',') }); }, tag).then(console.log);
  try {
    await R.goto(); await sleep(2500);
    await dump('start');
    await N.openCommunity(R); await sleep(800); await dump('community');
    await p.evaluate(() => goTab('home'));
    for (const ms of [100, 400, 1000, 2000, 4000]) { await sleep(ms === 100 ? 100 : ms - [100, 400, 1000, 2000][[400, 1000, 2000, 4000].indexOf(ms)]); await dump('home+' + ms); }
    console.log('errs', JSON.stringify(R.errs.slice(0, 5)));
  } catch (e) { console.log('ERR', e.message); }
  await R.close();
})();
