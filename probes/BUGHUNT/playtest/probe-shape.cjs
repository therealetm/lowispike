'use strict';
/* Run 53: old-save / partial-shape saves. Plays to Home once so the app writes its main save, then for each top-level field of
   the chosen key (default lowispike.v2) that holds an object or array, writes the save back with that ONE field set to null
   (or a number with mode num), reloads, and records boot errors + whether Home is usable (8 ring bubbles, Home tab active).
   Also mode whole: the whole key is a number / a string.
   usage: node probe-shape.cjs <url|dir> [view] [key] [modes: null,num,whole] */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'chromium390', KEY = process.argv[4] || 'lowispike.v2', modes = (process.argv[5] || 'null,num,whole').split(',');
  const pre = "try{localStorage.setItem('lowi.tutorial.done','1');}catch(e){}";
  const h = await L.open({ url, view, lang: 'en', preInit: pre }); const P = h.page;
  async function state() {
    await P.waitForFunction(() => document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 45000 }).catch(() => {});
    await L.sleep(2500);
    return P.evaluate(() => ({ orbit: document.querySelectorAll('[data-orbit]').length, tab: (document.querySelector('.tab.active') || {}).id || '', goTab: typeof window.goTab })).catch(e => ({ e: String(e).slice(0, 80) }));
  }
  const ok0 = await state(); await L.snap(h).catch(() => {});
  const raw = await P.evaluate(k => localStorage.getItem(k), KEY);
  if (!raw) { console.log('no key', KEY); process.exit(3); }
  const snap = await P.evaluate(() => JSON.stringify(Object.assign({}, localStorage)));
  const obj = JSON.parse(raw);
  const fields = Object.keys(obj).filter(f => obj[f] && typeof obj[f] === 'object');
  console.log('baseline', JSON.stringify(ok0), 'fields', fields.join(','));
  const cases = [];
  for (const m of modes) {
    if (m === 'whole') { cases.push(['whole', '42', '42']); cases.push(['whole', 'str', '"hello"']); continue; }
    for (const f of fields) { const o = JSON.parse(raw); o[f] = m === 'num' ? 7 : null; cases.push([m, f, JSON.stringify(o)]); }
  }
  let bad = 0;
  for (const [m, f, val] of cases) {
    await P.evaluate(([s, k, v]) => { const o = JSON.parse(s); localStorage.clear(); Object.keys(o).forEach(x => localStorage.setItem(x, o[x])); localStorage.setItem(k, v); }, [snap, KEY, val]);
    const n0 = h.log.pageerror.length;
    await P.reload({ waitUntil: 'load', timeout: 120000 }).catch(() => {});
    await P.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 45000 }).catch(() => {});
    const st = await state();
    const errs = h.log.pageerror.slice(n0);
    const okHome = st.orbit >= 8 && st.tab === 'tab-home';
    if (errs.length || !okHome) { bad++; console.log(JSON.stringify({ mode: m, field: f, st, errs: errs.slice(0, 4), nErr: errs.length })); }
    else console.log(JSON.stringify({ mode: m, field: f, ok: 1 }));
  }
  console.log('summary', JSON.stringify({ key: KEY, cases: cases.length, bad }));
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(2); });
