/* Code error sweep: load the live site (or a local root) on phone sizes, open every main tab and Community, and record
   page errors, console errors, same-host failed requests (4xx/5xx) and renderer crashes. Nothing leaves the machine
   except same-host GETs (harness blocks the rest; Supabase is faked).
   node tools/sweep-live-errors.cjs [url|root] [device...] */
'use strict';
const H = require('./sim/harness.cjs');
const [where = 'https://therealetm.github.io/lowispike/index.html', ...devs] = process.argv.slice(2);
const devices = devs.length ? devs : ['iPhone SE', 'iPhone 13', 'iPhone 15', 'Pixel 7'];
// A crashed renderer never answers evaluate()/keyboard/close, which hung the whole sweep (18:02 run, 23 Oct):
// stop the walk on a crash and give every page call a deadline so the other devices still get checked.
const within = (p, ms, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(what + ' timed out after ' + ms + ' ms')), ms))]);
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
        if (R.crashed) break;
        R.step = 'tab ' + tab; await within(P.evaluate(t => { try { window.goTab(t); } catch (e) { throw new Error('goTab ' + t + ': ' + e.message); } }, tab), 15000, 'goTab ' + tab).catch(e => R.errs.push({ step: R.step, m: e.message }));
        await H.sleep(2500); if (R.crashed) break; await within(P.keyboard.press('Escape'), 5000, 'Escape').catch(() => { }); await H.sleep(400);
      }
      if (R.crashed) R.errs = R.errs.filter(e => !/timed out|closed|crash/i.test(e.m || ''));
      out[device] = { errs: R.errs, bad: [...new Set(bad)], crashed: R.crashed ? R.step : false, loads: R.loads };
    } catch (e) { out[device] = { broken: e.message.slice(0, 300) }; }
    if (R) await within(R.close(), 15000, 'close').catch(() => { });
  }
  console.log(JSON.stringify(out, null, 1));
  process.exit(0); // a stuck crashed browser must not keep the sweep alive
})();
