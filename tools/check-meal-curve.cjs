'use strict';
/* Oct 24 2026: the Gap card's "After your meal" strip in a real browser: it leads the card, the current phase glows, a tap and a
   sideways swipe change the open phase, the Move lever shows on the peak, nothing spills off screen, no errors. Screenshots go to /tmp.
   node tools/check-meal-curve.cjs [chromium|webkit] [WxH | device] [url] [lang] [minutesSinceMeal] */
const H = require('./sim/harness.cjs');
const engine = process.argv[2] || 'chromium', dev = process.argv[3] || '390x844';
const url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
const lang = process.argv[5] || 'de', mins = +(process.argv[6] || 40);
(async () => {
  const o = { engine, probe: false, url, lang };
  if (engine === 'webkit') o.device = dev; else { const [w, h] = dev.split('x').map(Number); o.viewport = { width: w, height: h }; }
  const R = await H.open(o); const P = R.page; const res = [], errs = [];
  P.on('pageerror', e => errs.push(String(e && e.message || e)));
  await R.goto(); await H.sleep(9000);
  await P.evaluate(l => { try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } }, lang); await H.sleep(1200);
  await P.evaluate(m => {
    try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove();
    const t = Date.now() - m * 60000; if (window.LowiFastStop) window.LowiFastStop.startOf = () => t;
  }, mins);
  await P.evaluate(() => LowiGapView.open()); await H.sleep(1000);
  const st = () => P.evaluate(() => {
    const q = s => document.querySelector(s), card = q('.gv-card'), mc = q('.mc');
    const vw = innerWidth, r = mc && mc.getBoundingClientRect(), row = q('.mc-row'), rr = row && row.getBoundingClientRect();
    const kids = [...document.querySelectorAll('.mc *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > vw + 1 || b.left < -1); }).length;
    const order = card ? [...card.querySelectorAll('.mc, .gv-now, .gv-list')].map(e => e.className.split(' ')[0]) : [];
    return { lang: (window.LowiLang && LowiLang.get()) || document.documentElement.lang, open: !!card, mc: !!mc, sel: (q('.mc-ph.sel') || {}).dataset && q('.mc-ph.sel').dataset.i, now: q('.mc-ph.now') ? q('.mc-ph.now').dataset.i : null,
      title: (q('.mc-title h3') || {}).textContent, move: !!q('.mc [data-gv="move"]'), off: kids, rowFits: rr ? rr.right <= vw + 1 && row.scrollWidth <= row.clientWidth + 1 : false, order, mcTop: r ? Math.round(r.top) : null };
  });
  let s = await st();
  res.push(['strip is in the Gap card', s.open && s.mc, s.lang + ' ' + JSON.stringify(s.order)]);
  res.push(['current phase glows and is open', s.now !== null && s.sel === s.now, 'now ' + s.now + ' ' + s.title]);
  res.push(['phase row fits, nothing off screen', s.rowFits && s.off === 0, 'off ' + s.off]);
  res.push(['Move lever on a walk phase that is now', (mins >= 30 && mins < 120) ? s.move : !s.move]);
  await P.screenshot({ path: '/tmp/mc-' + engine + '-' + dev + '-' + lang + '-a.png' });
  await P.evaluate(() => document.querySelector('.mc').scrollIntoView({ block: 'start' })); await H.sleep(400);
  await P.screenshot({ path: '/tmp/mc-' + engine + '-' + dev + '-' + lang + '-b.png' });
  const tap = async sel => { const p = await P.evaluate(sel => { const b = document.querySelector(sel); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel); if (engine === 'webkit') await P.mouse.click(p.x, p.y); else await P.touchscreen.tap(p.x, p.y); await H.sleep(500); };
  await tap('.mc-ph[data-i="4"]'); s = await st();
  res.push(['tap a phase opens it', s.sel === '4', s.title]);
  await P.evaluate(() => { const c = document.querySelector('[data-mc-card]'); const r = c.getBoundingClientRect(); const x = r.left + r.width * .7, y = r.top + 40;
    const pe = (t, xx) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: xx, clientY: y }));
    pe('pointerdown', x); pe('pointermove', x - 60); pe('pointerup', x - 120); }); await H.sleep(500);
  s = await st(); res.push(['swipe right-to-left at the end stays on the last', s.sel === '4']);
  await P.evaluate(() => { const c = document.querySelector('[data-mc-card]'); const r = c.getBoundingClientRect(); const x = r.left + r.width * .3, y = r.top + 40;
    const pe = (t, xx) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch', isPrimary: true, clientX: xx, clientY: y }));
    pe('pointerdown', x); pe('pointermove', x + 60); pe('pointerup', x + 120); }); await H.sleep(500);
  s = await st(); res.push(['swipe left-to-right goes back one phase', s.sel === '3', s.title]);
  await tap('[data-gv="mcprev"]'); s = await st(); res.push(['back arrow', s.sel === '2']);
  await P.screenshot({ path: '/tmp/mc-' + engine + '-' + dev + '-' + lang + '-c.png' });
  await P.evaluate(() => LowiGapView.close()); await H.sleep(1200);
  const cc = await P.evaluate(() => ({ open: LowiGapView.isOpen(), ov: document.querySelectorAll('.gv-ov').length, ae: document.activeElement && document.activeElement.className }));
  res.push(['closes clean', !cc.open && !cc.ov, JSON.stringify(cc)]);
  res.push(['no page errors', errs.length === 0, errs.slice(0, 3).join(' | ')]);
  let bad = 0; for (const [n, ok, d] of res) { if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); }
  await R.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
