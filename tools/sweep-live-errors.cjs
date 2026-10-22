/* Code error sweep: load the live site (or a local root) on phone sizes, open every main tab and Community, and record
   page errors, console errors, same-host failed requests (4xx/5xx) and renderer crashes. Nothing leaves the machine
   except same-host GETs (harness blocks the rest; Supabase is faked).
   node tools/sweep-live-errors.cjs [url|root] [device...] */
'use strict';
const H = require('./sim/harness.cjs');
const [where = 'https://therealetm.github.io/lowispike/index.html', ...devs] = process.argv.slice(2);
const devices = devs.length ? devs : ['iPhone SE', 'iPhone 13', 'iPhone 15', 'Pixel 7'];
(async () => {
  const out = {};
  for (const device of devices) {
    const o = { engine: 'webkit', device }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    let R;
    try {
      R = await H.open(o); const P = R.page; const bad = [];
      P.on('response', r => { if (r.status() >= 400 && new URL(r.url()).host === new URL(R.url).host) bad.push(r.status() + ' ' + r.url().replace(/\?.*/, '')); });
      R.step = 'load'; await R.goto(); await H.sleep(5000);
      for (const tab of ['home', 'scan', 'shelf', 'move', 'profile', 'foryou', 'home']) {
        R.step = 'tab ' + tab; await P.evaluate(t => { try { window.goTab(t); } catch (e) { throw new Error('goTab ' + t + ': ' + e.message); } }, tab).catch(e => R.errs.push({ step: R.step, m: e.message }));
        await H.sleep(2500); await P.keyboard.press('Escape').catch(() => { }); await H.sleep(400);
      }
      out[device] = { errs: R.errs, bad: [...new Set(bad)], crashed: R.crashed, loads: R.loads };
    } catch (e) { out[device] = { broken: e.message.slice(0, 300) }; }
    if (R) await R.close();
  }
  console.log(JSON.stringify(out, null, 1));
})();
