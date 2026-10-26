'use strict';
/* Run 50 (P-BACK-ONE-LAYER): inside the body world (3D button on Home), open the World map or the Sound panel, then back.
   One back should close only that layer; the world stays open. usage: node probe-back-world.cjs <url|dir> [view] */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'chromium390', out = {};
  const pre = "try{localStorage.setItem('lowi.tutorial.done','1');}catch(e){}";
  for (const which of ['map', 'sound']) {
    const h = await L.open({ url, view, lang: 'en', preInit: pre }), P = h.page;
    await P.waitForFunction(() => document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
    await L.sleep(2500);
    await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
    await P.evaluate(() => { const b = document.querySelector('.bw3-open'); b && b.click(); });
    const ok = await P.waitForFunction(() => !!document.querySelector('.bw3-full') && document.documentElement.classList.contains('bw3-full-open'), null, { timeout: 60000 }).then(() => true).catch(() => false);
    if (!ok) { out[which] = 'world did not open'; await h.browser.close(); continue; }
    await L.sleep(4000);
    const sel = which === 'map' ? '#bwrMapBtn' : '.bw3-full .wa-btn';
    const has = await P.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
    if (!has) { out[which] = 'no ' + sel; await h.browser.close(); continue; }
    await L.sleep(1500);
    const lay = which === 'map' ? '#bwrMap' : '.wa-panel:not(.mb-ghost)';
    const s0 = await P.evaluate(l => !!document.querySelector(l), lay);
    await P.evaluate(() => { window.LowiBackSwipe && LowiBackSwipe.guard(); history.back(); });
    await L.sleep(1600);
    if (!/lowispike|127\.0\.0\.1/.test(P.url())) { out[which] = 'LEFT_APP'; await h.browser.close(); continue; }
    const s1 = await P.evaluate(l => ({ layer: !!document.querySelector(l), world: document.documentElement.classList.contains('bw3-full-open') && !!document.querySelector('.bw3-full') }), lay);
    out[which] = !s0 ? 'layer never opened' : s1.layer ? 'LAYER_STAYED' : s1.world ? 'ok' : 'WORLD_CLOSED_TOO';
    const s = await L.snap(h).catch(() => ({})); if ((s.err || []).length) out[which + 'Err'] = s.err.slice(0, 3);
    await h.browser.close();
  }
  console.log(JSON.stringify(out)); if (srv) srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
