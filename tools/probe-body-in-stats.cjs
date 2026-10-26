'use strict';
/* Stats sheet (nutri-stats) shows the Weight & BMI section; tapping it opens the Body sheet on top. node tools/probe-body-in-stats.cjs <view> <url> */
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
(async () => {
  let url = process.argv[3] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const h = await L.open({ view: process.argv[2] || 'iphone13', url, settle: 6000 });
  const p = h.page; for (let i = 0; i < 3; i++) { await p.keyboard.press('Escape'); await L.sleep(200); }
  const r = {};
  r.opened = await p.evaluate(() => !!(window.LowiNutriStats && LowiNutriStats.open && (LowiNutriStats.open(), true)));
  await L.sleep(900);
  r.section = await p.evaluate(() => { const e = document.querySelector('.bs-sec'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; });
  const c = await L.center(h, '.bs-sec .bs-card');
  if (c) { await p.evaluate(() => { const sh = document.querySelector('.bs-sec').closest('.r2-sh'); sh.scrollTop = sh.scrollHeight; }); await L.sleep(1500); const c2 = await L.center(h, '.bs-sec .bs-card'); r.c2 = c2; r.rect = await p.evaluate(() => { let sc = document.querySelector('.bs-sec'); while (sc && !(sc.scrollHeight > sc.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement; window.__sc = sc ? [sc.className, sc.scrollTop, sc.scrollHeight, sc.clientHeight, JSON.stringify(sc.getBoundingClientRect()), getComputedStyle(sc).maxHeight, getComputedStyle(sc).paddingBottom, sc.parentElement.className, JSON.stringify(sc.parentElement.getBoundingClientRect())] : 'none'; const b = document.querySelector('.bs-sec .bs-card').getBoundingClientRect(); return [b.left, b.top, b.width, b.height, innerWidth, innerHeight, window.__sc]; }); r.hit = await p.evaluate(c => { const t = document.elementFromPoint(c.x, c.y); return t ? (t.id || t.className || t.tagName) + '' : null; }, c2); if (r.hit) await L.tap(h, c2.x, c2.y); else { r.via = 'click() (section is below the peek height of the Stats sheet)'; await p.evaluate(() => document.querySelector('.bs-sec .bs-card').click()); } await L.sleep(700); }
  r.bodyOpen = await p.evaluate(() => !!document.getElementById('bsOv'));
  r.onTop = await p.evaluate(() => { const o = document.getElementById('bsOv'); if (!o) return null; const b = o.querySelector('.bs-close').getBoundingClientRect(); const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!t && o.contains(t); });
  const s = await L.snap(h); r.errors = h.log.pageerror.concat(s.err, s.rej);
  console.log(JSON.stringify(r)); await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(1); });
