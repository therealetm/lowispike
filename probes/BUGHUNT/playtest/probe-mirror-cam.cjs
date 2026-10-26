'use strict';
/* Run 19: Move > Mirror mode camera start races (pattern "async result painted into stale UI").
   getUserMedia is stubbed with a slow fake (canvas captureStream) so we can count camera tracks left running.
   A: tap "Without camera" while "Starting the camera…"   B: tracker fails to load (offline) while the camera permission is pending
   C: close (Escape) while starting, reopen, start again   D: "Turn camera back on" after background, then Escape while starting
   node probe-mirror-cam.cjs <view> <url> */
const L = require('./lib.cjs');
const view = process.argv[2] || 'chromium390', target = process.argv[3] || 'https://therealetm.github.io/lowispike/';
const PRE = `(() => { window.__tracks = []; window.__gumDelay = 1500;
  const fake = () => { const c = document.createElement('canvas'); c.width = 64; c.height = 48; const x = c.getContext('2d'); x.fillRect(0, 0, 64, 48); const s = c.captureStream(10); s.getTracks().forEach(t => window.__tracks.push(t)); return s; };
  const md = navigator.mediaDevices || {}; try { Object.defineProperty(navigator, 'mediaDevices', { value: md, configurable: true }); } catch (e) {}
  md.getUserMedia = () => new Promise(r => setTimeout(() => r(fake()), window.__gumDelay));
  window.__liveTracks = () => window.__tracks.filter(t => t.readyState === 'live').length; })();`;
(async () => {
    let url = target, srv = null; if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 6000, preInit: PRE }); const P = h.page; const res = {};
    const click = sel => P.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
    const openMirror = async () => { await P.evaluate(() => { let b = document.getElementById('__mmOpen'); if (!b) { b = document.createElement('button'); b.id = '__mmOpen'; b.setAttribute('data-mm', 'open'); b.style.cssText = 'position:fixed;left:-99px'; document.body.appendChild(b); } b.click(); }); await L.sleep(300); await click('[data-mm="pick"][data-r="chair"]'); await L.sleep(300); };
    const state = () => P.evaluate(() => ({ live: window.__liveTracks(), open: !!document.getElementById('mmOv') && !document.getElementById('mmOv').hidden, sheet: ((document.querySelector('#mmOv .mm-sheet:not([hidden])') || {}).textContent || '').slice(0, 60), camCls: document.documentElement.classList.contains('mm-cam') }));
    const closeAll = async () => { await P.keyboard.press('Escape'); await L.sleep(300); await P.evaluate(() => { const o = document.getElementById('mmOv'); if (o && !o.hidden) { const b = o.querySelector('[data-mm="close"]'); if (b) b.click(); } }); await L.sleep(300); };
    let mpMode = 'slow';
    await h.ctx.route('**/vendor/mediapipe-0.10.14/**', async r => { if (mpMode === 'fail') return r.abort(); if (mpMode === 'slow') await L.sleep(4000); return r.continue(); });
    try {
        res.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || '');
        res.hasMirror = await P.evaluate(() => !!window.LowiMirrorCore);
        /* A */
        await openMirror(); res.A_camBtn = await click('[data-mm="cam"]'); await L.sleep(250);
        res.A_freeBtn = await click('#mmOv .mm-stage [data-mm="free"]'); await L.sleep(2500);
        res.A = await state(); await closeAll(); res.A_afterClose = await state();
        /* B */
        mpMode = 'fail'; await P.evaluate(() => { window.__gumDelay = 2500; });
        await openMirror(); await click('[data-mm="cam"]'); await L.sleep(4000);
        res.B = await state(); await closeAll(); res.B_afterClose = await state();
        /* C */
        mpMode = 'slow'; await P.evaluate(() => { window.__gumDelay = 1500; window.__tracks.forEach(t => t.stop()); });
        await openMirror(); await click('[data-mm="cam"]'); await L.sleep(300); await P.keyboard.press('Escape'); await L.sleep(300);
        await openMirror(); await click('[data-mm="cam"]'); await L.sleep(6500);
        res.C = await state(); await closeAll(); res.C_afterClose = await state();
        /* D: resumeCam then Escape while starting */
        await P.evaluate(() => { window.__tracks.forEach(t => t.stop()); window.__gumDelay = 1500; });
        await openMirror(); await click('#mmOv .mm-sheet [data-mm="nocam"]'); await L.sleep(500); await P.evaluate(() => { const o = document.getElementById('mmOv'); const s = o.querySelector('.mm-sheet'); s.innerHTML = '<div class="mm-panel"><button type="button" data-mm="resumecam">resume</button></div>'; s.hidden = false; });
        await click('[data-mm="resumecam"]'); await L.sleep(300); await P.keyboard.press('Escape'); await L.sleep(6000);
        res.D = await state();
        res.bh = await L.snap(h);
        res.pageerror = h.log.pageerror.slice(0, 5);
        res.pass = res.A_afterClose.live === 0 && res.A.live === 0 && res.B.live === 0 && res.B_afterClose.live === 0 && res.C_afterClose.live === 0 && res.C.live <= 1 && res.D.live === 0 && !res.D.camCls && !res.bh.rej.length;
    } catch (e) { res.error = String(e).slice(0, 300); }
    console.log(JSON.stringify(res, null, 1));
    await h.browser.close(); if (srv) srv.close();
})();
