'use strict';
/* Run 49 (generic P-BACK-LEAVES): every opener (window.Lowi*.open / show / openX with no args) on Home:
   open it, put the back guard down (as a touch does), history.back(). The app must stay, and the layer should close.
   usage: node probe-back-layers.cjs <url|dir> [view] [filterRegex] */
const L = require('./lib.cjs');
const SKIP = /^(LowiOwnerAdmin|LowiHandoff|LowiStudioLockCore|LowiR2\.showGate|LowiPraise|LowiRegionPalsCore|LowiWorldSci|LowiAfterMeal\.shown|LowiRealmBack|LowiCareBoard|LowiForYou|LowiForYouCore|LowiTutorial|LowiK1\.opened|LowiCookTabs\.opening|LowiR2\.openCount|LowiAfterMealCore\.(startedAt|open)|LowiFastEditCore|LowiFastEdit\.startOf|LowiFastStop\.startOf|LowiShopPlan\.showErr|LowiFyEmbed|LowiWorld3D|LowiCellRoom|LowiBloom\.open|LowiArrival)/;
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'chromium390', filt = process.argv[4] ? new RegExp(process.argv[4]) : null;
  const pre = "try{localStorage.setItem('lowi.tutorial.done','1');}catch(e){}";
  let h = null, P = null;
  async function boot() {
    if (h) await h.browser.close().catch(() => {});
    h = await L.open({ url, view, lang: 'en', preInit: pre }); P = h.page;
    await P.waitForFunction(() => document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
    await L.sleep(2000);
    await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  }
  await boot();
  const list = await P.evaluate(() => { const out = []; Object.keys(window).filter(k => /^Lowi/.test(k)).forEach(k => { try { const o = window[k]; if (o && typeof o === 'object') Object.keys(o).filter(n => typeof o[n] === 'function' && /^(open|show)/i.test(n)).forEach(n => out.push(k + '.' + n)); } catch (e) { } }); return out; });
  const todo = list.filter(n => !SKIP.test(n) && (!filt || filt.test(n)));
  console.log('openers', todo.length);
  const layers = () => P.evaluate(() => {
    const vw = innerWidth, vh = innerHeight, out = [];
    document.querySelectorAll('[aria-modal="true"], [role="dialog"], dialog[open], .r2-ov.on').forEach(e => {
      if (e.closest('.r2-ov.off, [inert]')) return; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return;
      const a = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      if (a < vw * vh * 0.2) return;
      out.push((e.id ? '#' + e.id : e.tagName.toLowerCase()) + '.' + String(e.className).split(/\s+/).slice(0, 2).join('.'));
    });
    return out;
  });
  const state = () => P.evaluate(() => ({ tab: (document.querySelector('.tab.active') || {}).id || '', href: location.href }));
  const results = [];
  for (const name of todo) {
    let row = { name };
    try {
      if (!/lowispike|127\.0\.0\.1/.test(P.url())) await boot();
      await P.evaluate(() => { for (let i = 0; i < 4; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); if (window.LowiSections && LowiSections.close) LowiSections.close(); else goTab('home'); }).catch(() => {});
      await L.sleep(900);
      const base = await layers();
      await P.evaluate(n => { const [o, f] = n.split('.'); try { const r = window[o][f](); if (r && r.catch) r.catch(() => {}); } catch (e) { window.__openErr = String(e).slice(0, 120); } }, name);
      await L.sleep(1600);
      const s0 = await state(); const l0 = (await layers()).filter(x => !base.includes(x));
      row.tab0 = s0.tab;
      if (!l0.length && s0.tab === 'tab-home') { row.r = 'nothing'; results.push(row); continue; }
      row.layer = l0.join(' ');
      await P.evaluate(() => { window.LowiBackSwipe && LowiBackSwipe.guard(); });
      await P.evaluate(() => history.back());
      await L.sleep(1500);
      const href = P.url();
      if (!/lowispike|127\.0\.0\.1/.test(href)) { row.r = 'LEFT_APP'; results.push(row); console.log(JSON.stringify(row)); continue; }
      const s1 = await state(); const l1 = (await layers()).filter(x => !base.includes(x));
      row.tab1 = s1.tab; row.after = l1.join(' ');
      row.r = l1.length && l1.join() === l0.join() && s1.tab === s0.tab ? 'STAYED_OPEN' : 'ok';
    } catch (e) { row.r = 'ERR ' + String(e).slice(0, 100); }
    results.push(row); if (row.r !== 'ok') console.log(JSON.stringify(row));
  }
  console.log('---');
  console.log('ok', results.filter(r => r.r === 'ok').map(r => r.name).join(' '));
  console.log('nothing', results.filter(r => r.r === 'nothing').map(r => r.name).join(' '));
  const s = await L.snap(h).catch(() => ({})); console.log('errors', JSON.stringify({ err: s.err, rej: (s.rej || []).slice(0, 5) }));
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
