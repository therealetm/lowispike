/* Run 44 (Emmanuel 26 Oct: auto fly must only start when the user taps autopilot itself, it is annoying and breaks the UI).
   After 'Start next journey' (body-trips startNext, the Today journey row) does the controller drop into autopilot and
   clean view (lw-clean-auto) hide Home? Also checks idle Home for 40 s with no tap: no autopilot, no clean view.
   node probe-journey-auto.cjs <url|dir> [view]   env RM=1 */
'use strict';
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'iphone13';
  const pre = "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){}";
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: 'en', preInit: pre });
  const P = h.page; let bad = 0;
  await P.waitForFunction(() => window.LowiBodyTrips && window.LowiPad && window.LowiWorldHome, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(3000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {} });
  const st = () => P.evaluate(() => { const H = document.documentElement, ps = (() => { try { return LowiPad.state(); } catch (e) { return {}; } })();
    const vis = [...document.querySelectorAll('.wh-hud button, .wh-hud [role=button], .lh-bubble, .b3-cell')].filter(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 8 && cs.visibility !== 'hidden' && +cs.opacity > 0.05; }).length;
    let jt = null; try { const B = LowiBodyTrips, s = B.state(); jt = Object.keys(s.trips || {}).length; } catch (e) {}
    return { pad: ps.pad || '', mode: ps.mode || '', clean: H.classList.contains('lw-clean'), cleanAuto: H.classList.contains('lw-clean-auto'), adv: !!(window.LowiAdventure && LowiAdventure.on), vis, trips: jt }; });
  const IDLE = +(process.env.IDLE || 40000); const s0 = await st(); console.log('idle start', JSON.stringify(s0));
  await L.sleep(IDLE);
  const s1 = await st(); console.log('idle +40s', JSON.stringify(s1));
  if (s1.pad === 'auto' || s1.cleanAuto || s1.adv) { bad++; console.log('FAIL idle: autopilot without a tap'); }
  const ok = await P.evaluate(() => { try { const S = window.LowiSun, f = S.energyNow; S.energyNow = function () { const r = Object.assign({}, f.apply(this, arguments) || {}); r.value = Math.max(+r.value || 0, 0.8); r.canTravel = true; if (r.tier === 'low' || r.tier === 'tired' || r.tier === 'empty') r.tier = 'ok'; return r; }; return LowiBodyTrips.startNext(); } catch (e) { return 'err ' + e.message; } });
  console.log('startNext ->', ok);
  for (const t of [1500, 6000, 20000]) { await L.sleep(t === 1500 ? 1500 : t - (t === 6000 ? 1500 : 6000)); const s = await st(); console.log('after journey +' + t + 'ms', JSON.stringify(s)); if (t >= 6000 && (s.pad === 'auto' || s.cleanAuto)) { bad++; console.log('FAIL journey: autopilot / clean view without the user choosing autopilot'); } }
  const e = await L.snap(h); console.log('errors', JSON.stringify(e.err), JSON.stringify(e.rej), 'pageerror', JSON.stringify(h.log.pageerror));
  await h.browser.close(); if (srv) srv.close();
  console.log(bad ? 'RESULT FAIL ' + bad : 'RESULT PASS'); process.exit(0);
})();
