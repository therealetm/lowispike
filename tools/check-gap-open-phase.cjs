'use strict';
/* Oct 24 2026: does Gap open the "After your meal" card on the phase you are in? Emmanuel's screenshot (18:52, last meal 16:11,
   German): the 2 h phase glowed, but the card showed phase 1 "Zucker steigt". This opens Gap the way a person does (a real tap on
   the Gap bubble on Home, no startOf override: the last meal is saved like Fuel saves it) and reads which phase glows and which is open.
   node tools/check-gap-open-phase.cjs [chromium|webkit] [WxH | device] [url] [lang] [minutesSinceMeal] */
const H = require('./sim/harness.cjs');
const engine = process.argv[2] || 'chromium', dev = process.argv[3] || '390x844';
const url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
const lang = process.argv[5] || 'de', mins = +(process.argv[6] || 161);
(async () => {
  const o = { engine, probe: false, url, lang };
  if (engine === 'webkit') o.device = dev; else { const [w, h] = dev.split('x').map(Number); o.viewport = { width: w, height: h }; }
  const R = await H.open(o); const P = R.page; const res = [], errs = [];
  P.on('pageerror', e => errs.push(String(e && e.message || e)));
  await R.goto(); await H.sleep(9000);
  await P.evaluate(l => { try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } }, lang); await H.sleep(800);
  const how = await P.evaluate(m => {
    try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove();
    const t = Date.now() - m * 60000;
    if (window.LowiFastEdit && LowiFastEdit.setStart) { try { LowiFastEdit.setStart(t); return 'setStart'; } catch (e) { } }
    try { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); f.last = t; f.hist = []; localStorage.setItem('lowi_fast_v1', JSON.stringify(f)); } catch (e) { }
    try { dispatchEvent(new CustomEvent('lowi:fast-start')); } catch (e) { }
    return 'storage';
  }, mins);
  await H.sleep(800);
  const start = await P.evaluate(() => { const m = LowiGapView.model(); return { min: Math.round(m.elapsed / 60000), cur: m.mcCur }; });
  const b = await P.evaluate(() => { const e = document.getElementById('spFast'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; });
  if (b && b.w) { await P.touchscreen.tap(b.x, b.y); } else await P.evaluate(() => LowiGapView.open());
  await H.sleep(1500);
  const s = await P.evaluate(() => { const q = x => document.querySelector(x); const dots = [...document.querySelectorAll('.mc-dots i')].findIndex(i => i.classList.contains('on'));
    return { open: LowiGapView.isOpen(), now: q('.mc-ph.now') && q('.mc-ph.now').dataset.i, sel: q('.mc-ph.sel') && q('.mc-ph.sel').dataset.i, dot: dots, title: (q('.mc-title h3') || {}).textContent }; });
  res.push(['Gap opened by a tap on its bubble', s.open, how + ' ' + JSON.stringify(start) + (b ? ' bubble' : ' api')]);
  res.push(['open card is the glowing phase', s.now != null && s.sel === s.now && s.dot === +s.now, JSON.stringify(s)]);
  await P.screenshot({ path: '/tmp/gop-' + engine + '-' + dev + '-' + lang + '.png' });
  res.push(['no page errors', errs.length === 0, errs.slice(0, 3).join(' | ')]);
  let bad = 0; for (const [n, ok, d] of res) { if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); }
  await R.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
