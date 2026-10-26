'use strict';
/* Run 47 (P-SESSION-OUTLIVES-SCREEN siblings): the food camera (Snap food, spirit.js photo(), #ssFood).
   A) Escape / Safari swipe back while the camera is open: does the camera close (and stop), or does back go past it?
   B) background -> foreground (visibilitychange): the stream is stopped on hide. Does the camera come back, or is the
      screen left on a dead stream? Does the shutter then take a frame of a dead track?
   Chromium fake camera. usage: node probe-foodcam.cjs <url|dir> [A|B] [view] */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const which = process.argv[3] || 'A', view = process.argv[4] || 'chromium390';
  const pre = "try{localStorage.setItem('lowi.tutorial.done','1');}catch(e){} (function(){const md=navigator.mediaDevices;if(md&&md.getUserMedia){const g=md.getUserMedia.bind(md);window.__tracks=[];window.__gum=0;md.getUserMedia=c=>{window.__gum++;return g(c).then(s=>{s.getTracks().forEach(t=>window.__tracks.push(t));return s;});};}})();";
  const h = await L.open({ url, view, lang: 'en', preInit: pre, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'], ctxHook: async ctx => { try { await ctx.grantPermissions(['camera']); } catch (e) { } } });
  const P = h.page;
  await P.waitForFunction(() => document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(2500);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  const st = () => P.evaluate(() => { const f = document.getElementById('ssFood'), v = f && f.querySelector('video'); const s = v && v.srcObject; return { cam: !!f, live: !!(f && f.classList.contains('live')), card: f ? (f.querySelector('.ss-card') || {}).textContent : '', liveTracks: (window.__tracks || []).filter(t => t.readyState === 'live').length, srcLive: !!(s && s.getTracks().some(t => t.readyState === 'live')), vw: v ? v.videoWidth : 0, gum: window.__gum || 0, tab: (document.querySelector('.tab.active') || {}).id || '', hist: history.length, href: location.href.slice(-40) }; });
  await P.evaluate(() => LowiSpirit.photo()); await L.sleep(3000);
  const s0 = await st(); console.log('camera open', JSON.stringify(s0));
  if (!s0.cam) { console.log('FAIL camera did not open'); await h.browser.close(); process.exit(0); }
  let bad = false;
  if (which === 'back') {
    /* Safari's edge swipe back: the back-swipe guard entry is pushed on the first touch */
    const c = await L.center(h, '#ssFood .ss-title'); if (c) await L.tap(h, c.x, c.y); await L.sleep(500);
    const before = await st(); console.log('before back', JSON.stringify(before));
    await P.evaluate(() => history.back()); await L.sleep(1800);
    const s2 = await st().catch(() => ({ href: 'gone' })); console.log('after back', JSON.stringify(s2));
    if (!/lowispike|127\.0\.0\.1/.test(s2.href || '')) { bad = true; console.log('BUG back with the food camera open LEFT THE APP'); }
    else if (s2.cam || s2.liveTracks) { bad = true; console.log('BUG back did not close the food camera'); }
  } else if (which === 'A') {
    await P.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))); await L.sleep(1200);
    const s1 = await st(); console.log('after Escape', JSON.stringify(s1));
    if (s1.cam || s1.liveTracks) { bad = true; console.log('BUG Escape left the food camera open/running'); }
    if (s1.cam) {
      /* swipe back: the back-swipe guard needs a touch first */
      const c = await L.center(h, '#ssFood .ss-title'); if (c) await L.tap(h, c.x, c.y); await L.sleep(400);
      await P.evaluate(() => goTab('cook')).catch(() => {}); await L.sleep(800);
      const before = await st(); console.log('on cook before back', JSON.stringify(before));
      await P.evaluate(() => history.back()); await L.sleep(1500);
      const s2 = await st(); console.log('after back', JSON.stringify(s2));
      if (s2.cam) { bad = true; console.log('BUG back changed ' + before.tab + ' -> ' + s2.tab + ' UNDER the camera, camera still open'); }
    }
  } else {
    const vis = v => P.evaluate(v => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => !v }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v ? 'visible' : 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); }, v);
    await vis(false); await L.sleep(800);
    console.log('hidden', JSON.stringify(await st()));
    await vis(true); await L.sleep(3000);
    const s1 = await st(); console.log('back to foreground', JSON.stringify(s1));
    if (s1.cam && !s1.srcLive) { bad = true; console.log('BUG food camera came back on a dead stream (no restart): card "' + s1.card + '" live class ' + s1.live); }
    const shot = await P.evaluate(async () => { const b = document.querySelector('#ssFood [data-sp=shutter]'); if (!b) return 'no shutter'; b.click(); await new Promise(r => setTimeout(r, 1500)); return { camAfter: !!document.getElementById('ssFood'), sheet: !!document.querySelector('.r2-ov.on, .sp-flight, .sp-photo') }; });
    console.log('shutter after foreground', JSON.stringify(shot));
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }));
  console.log(bad ? 'FAIL' : 'PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
