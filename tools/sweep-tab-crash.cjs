/* Code error sweep: repeat the main-tab walk on one device and say at which step the WebKit renderer crashed.
   node tools/sweep-tab-crash.cjs <url|root> <device> <runs> [tabs comma list] */
'use strict';
const H = require('./sim/harness.cjs');
const [where, device = 'Pixel 7', runs = '4', tabsArg = 'home,scan,shelf,move,profile,foryou,home'] = process.argv.slice(2);
const tabs = tabsArg.split(',');
(async () => {
  const res = [];
  for (let i = 0; i < +runs; i++) {
    const o = { engine: 'webkit', device }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    let R, at = null; const t0 = Date.now();
    try {
      R = await H.open(o); const P = R.page;
      P.on('crash', () => { at = at || (R.step + ' +' + ((Date.now() - t0) / 1000).toFixed(1) + 's'); });
      R.step = 'load'; await R.goto(); await H.sleep(5000);
      for (const tab of tabs) {
        if (R.crashed) break;
        R.step = 'tab ' + tab; await P.evaluate(t => window.goTab(t), tab).catch(() => { });
        await H.sleep(2500); if (R.crashed) break; R.step = 'esc after ' + tab; await P.keyboard.press('Escape').catch(() => { }); await H.sleep(400);
      }
      res.push({ run: i + 1, crashed: R.crashed, at, errs: R.errs.filter(e => !/closed/.test(e.m || '')).slice(0, 3) });
    } catch (e) { res.push({ run: i + 1, broken: e.message.slice(0, 200) }); }
    if (R) await R.close().catch(() => { });
  }
  console.log(JSON.stringify(res));
})();
