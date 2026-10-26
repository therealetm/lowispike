'use strict';
/* Run 39 (P-REUSED-OVERLAY, last site): #spWorld (spirit.js) is made once at boot and shown again (hidden=false) whenever a camera
   opens inside Misty's world (Products empty "Scan" [data-cktoss=scan], herb care, any LowiDex.scan('cam') that is not the direct
   Home scan). It is not 'born' when shown again, so the 2nd tap of a double tap on the opener could press whatever the camera puts
   under the finger (barcode / name field, Scan, Deep analyze link, mood buttons, the X).
   A real opener ([data-cktoss="scan"]) is placed under the world (z 1) at each spot and tapped twice with real taps.
   node probe-spworld-dbl.cjs <url|dir> [view] [gaps] [fx:fy,...]   env RM=1 */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'iphone13';
  const gaps = (process.argv[4] || '0,120,250').split(',').map(Number);
  const spots = (process.argv[5] || '0.5:0.55,0.5:0.65,0.5:0.76,0.09:0.89,0.9:0.055').split(',').map(v => v.split(':').map(Number));
  const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){}",
    ctxHook: async ctx => require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 10, messages: 5, me: 'Fixture' }) });
  const P = h.page; let bad = 0;
  await P.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(4000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot');
    /* no real camera in the probe: getUserMedia never resolves, so the camera stays on its first frame */
    try { navigator.mediaDevices.getUserMedia = () => new Promise(() => {}); } catch (e) {}
    window.__ck = []; window.__focus = [];
    addEventListener('click', e => { const b = e.target.closest && e.target.closest('button,a,input,label,[data-b3],[data-sp],[data-cktoss]'); window.__ck.push(Math.round(e.timeStamp) + ' ' + (b ? (b.tagName + (b.id ? '#' + b.id : '') + ' ' + (b.getAttribute('data-b3') || b.getAttribute('data-sp') || b.getAttribute('data-cktoss') || b.className)).slice(0, 60) : e.target.tagName + '.' + e.target.className).slice(0, 70)); }, true);
    addEventListener('focusin', e => window.__focus.push((e.target.id || e.target.tagName)));
    /* links with target=_blank: record instead of leaving */
    addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href]'); if (a && !e.defaultPrevented) { (window.__opened = window.__opened || []).push(a.href.slice(0, 60)); e.preventDefault(); } }, false);
    try { window.open = u => { (window.__opened = window.__opened || []).push(String(u)); return null; }; } catch (e) {} });
  const vp = await P.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  for (const [fx, fy] of spots) for (const gap of gaps) {
    /* reset: close the camera and the world */
    await P.evaluate(() => { try { closeScanner(true); } catch (e) {} try { LowiSpirit.close(true); } catch (e) {} const o = document.getElementById('bhOpener'); if (o) o.remove();
      window.__ck.length = 0; window.__focus.length = 0; window.__opened = []; try { document.activeElement && document.activeElement.blur(); } catch (e) {} });
    await L.sleep(1500);
    const y = Math.round(vp.h * fy), x = Math.round(vp.w * fx);
    await P.evaluate(([x, y]) => { const b = document.createElement('button'); b.id = 'bhOpener'; b.type = 'button'; b.setAttribute('data-cktoss', 'scan'); b.textContent = 'Scan';
      b.style.cssText = 'position:fixed;left:' + (x - 30) + 'px;width:60px;top:' + (y - 20) + 'px;height:40px;z-index:1'; document.body.appendChild(b); }, [x, y]);
    await L.sleep(500);
    const t = Date.now(); await L.tap(h, x, y); const w = gap - (Date.now() - t); if (w > 0) await L.sleep(w); await L.tap(h, x, y);
    const took = Date.now() - t; await L.sleep(1500);
    const st = await P.evaluate(() => { const w = document.getElementById('spWorld'), cam = document.getElementById('b3Cam');
      return { world: !!(w && !w.hidden), cam: !!cam, camInWorld: !!(cam && cam.closest('#spWorld')), clicks: window.__ck.slice(), focus: window.__focus.slice(), opened: window.__opened || [] }; });
    /* the 2nd tap must not press anything in the camera: only the opener's own click(s) */
    const extra = st.clicks.filter(c => !/bhOpener/.test(c));
    const ok = st.cam && st.world && extra.length === 0 && !st.focus.some(f => /b3Bc|b3Nm/.test(f)) && !st.opened.length; if (!ok) bad++;
    console.log((ok ? 'PASS' : 'FAIL') + ' x' + fx + ' y' + fy + ' gap' + gap + ' (' + took + 'ms) ' + JSON.stringify(st));
  }
  /* a deliberate later tap on the X still closes the camera */
  { await P.evaluate(() => { const o = document.getElementById('bhOpener'); if (o) o.remove(); }); await L.sleep(600);
    const x = await L.center(h, '#spWorld [data-sp="close"]');
    if (x) { await L.tap(h, x.x, x.y); await L.sleep(1200); const ok = await P.evaluate(() => { const w = document.getElementById('spWorld'); return !w || w.hidden; }); console.log((ok ? 'PASS' : 'FAIL') + ' later X closes the world'); if (!ok) bad++; } else console.log('no world X'); }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
