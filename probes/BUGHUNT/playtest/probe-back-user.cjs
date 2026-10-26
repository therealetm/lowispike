'use strict';
/* Run 50 (P-BACK-LEAVES, user paths): the layers probe-back-layers.cjs flagged, reached the way a person does.
   A: Home > Sound button (.wa-btn) > panel open > back.  B: Profile > companion card (#lcProf) > creator > back (x2).
   usage: node probe-back-user.cjs <url|dir> [view] */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'chromium390';
  const pre = "try{localStorage.setItem('lowi.tutorial.done','1');}catch(e){}";
  const out = {};
  async function boot() {
    const h = await L.open({ url, view, lang: 'en', preInit: pre }); const P = h.page;
    await P.waitForFunction(() => document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
    await L.sleep(2500);
    await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
    return h;
  }
  const inApp = P => /lowispike|127\.0\.0\.1/.test(P.url());
  async function back(P) { await P.evaluate(() => { window.LowiBackSwipe && LowiBackSwipe.guard(); history.back(); }); await L.sleep(1400); }
  /* A: Sound panel */
  {
    const h = await boot(), P = h.page;
    /* the way a person gets there: Settings bubble > World sound row (the Home Sound button itself is hidden on the ring) */
    const set = await P.$('[data-orbit="settings"]');
    if (set) { await set.click({ force: true }).catch(() => {}); await L.sleep(1500); }
    if (!(await P.$('[data-ss2="worldSound"]'))) { await P.evaluate(() => { try { LowiHomeSettingsSleepV2.openSettings(); } catch (e) { } }); await L.sleep(1500); }
    out.rows = await P.evaluate(() => [...document.querySelectorAll('[data-ss2]')].map(e => e.dataset.ss2 + ':' + Math.round(e.getBoundingClientRect().width)).join(' '));
    const btn = await P.$('[data-ss2="worldSound"]');
    if (!btn) out.A = 'no World sound row in Settings';
    else {
      await btn.click({ force: true }).catch(async () => { await P.evaluate(() => document.querySelector('[data-ss2="worldSound"]').click()); }); await L.sleep(1500);
      const open0 = await P.evaluate(() => !!document.querySelector('.wa-panel:not(.mb-ghost)'));
      await back(P);
      if (!inApp(P)) out.A = 'LEFT_APP (panel open before: ' + open0 + ')';
      else out.A = (await P.evaluate(() => !!document.querySelector('.wa-panel:not(.mb-ghost)'))) ? 'STAYED_OPEN' : (open0 ? 'ok' : 'panel never opened');
    }
    await h.browser.close();
  }
  /* B: companion creator from Profile */
  {
    const h = await boot(), P = h.page;
    await P.evaluate(() => { if (typeof goTab === 'function') goTab('profile'); }); await L.sleep(1500);
    const card = await P.$('#lcProf');
    if (!card) out.B = 'no companion card on Profile';
    else {
      out.Bvis = await P.evaluate(() => { const r = document.getElementById('lcProf').getBoundingClientRect(); return r.width + 'x' + r.height; }); console.log('A', out.A, 'Bvis', out.Bvis); await P.evaluate(() => document.getElementById('lcProf').click()); await L.sleep(1000);
      const open0 = await P.evaluate(() => !!document.querySelector('#lcOv.on'));
      await back(P);
      if (!inApp(P)) out.B = 'LEFT_APP after 1st back';
      else {
        const s1 = await P.evaluate(() => ({ ov: !!document.querySelector('#lcOv.on'), tab: (document.querySelector('.tab.active') || {}).id || '' }));
        if (s1.ov) {
          await back(P);
          out.B = !inApp(P) ? 'LEFT_APP after 2nd back (creator stayed on top of ' + s1.tab + ')' : 'creator stayed open after back (tab ' + s1.tab + ')';
        } else out.B = open0 ? 'ok (tab ' + s1.tab + ')' : 'creator never opened';
      }
    }
    const s = await L.snap(h).catch(() => ({})); out.errors = { err: s.err, rej: (s.rej || []).slice(0, 3) };
    await h.browser.close();
  }
  console.log(JSON.stringify(out));
  if (srv) srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
