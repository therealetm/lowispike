'use strict';
/* Oct 24 2026 back and close sweep 18:40: on a phone a real touch drag down on Shop's top bar (title block, tab bar) closes it
   on each tab (Supermarket, Seller Zone, Kitchen), a short drag springs back and leaves it open, a drag in the list does not
   close it, a tab tap still switches tabs, back still closes it, Home comes back clean. On a wide screen nothing drags.
   Chromium only (CDP touch input = the browser's own gesture path, so touch-action and pointercancel behave as on a phone).
   node tools/check-shop-swipe.cjs [WxH] [url|.] */
const H = require('./sim/harness.cjs');
const dev = process.argv[2] || '390x844';
const target = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
(async () => {
  const [w, h] = dev.split('x').map(Number);
  const wide = w >= 700;
  const o = { engine: 'chromium', probe: false, lang: 'en', viewport: { width: w, height: h } };
  if (/^https?:/.test(target)) o.url = target; else o.root = target;
  const R = await H.open(o); const P = R.page; const res = []; const errs = [];
  P.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await R.goto(); await H.sleep(9000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  const cdp = await P.context().newCDPSession(P);
  const touch = async (x, y, x2, y2, steps) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= steps; i++) { await H.sleep(16); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (x2 - x) * i / steps, y: y + (y2 - y) * i / steps }] }); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const isOpen = () => P.evaluate(() => !!(window.LowiStorePicks && LowiStorePicks.isOpen()) && !!document.querySelector('.stp-ov.in'));
  const open = async (t) => { await P.evaluate(t => { localStorage.setItem('lowi.storePicks.tab', t); LowiStorePicks.open('check'); LowiStorePicks.setTab(t); }, t); await H.sleep(900); };
  /* a plain spot of the title block (not a button / field) */
  const spot = (sel) => P.evaluate(sel => {
    const z = document.querySelector('.stp-ov .stp-card > ' + sel); if (!z) return null; let r = z.getBoundingClientRect();
    const h3 = z.querySelector('h3'); if (h3) { const q = h3.getBoundingClientRect(); return { x: q.left + Math.min(40, q.width / 2), y: q.top + q.height / 2 }; }
    for (let y = r.top + 4; y < r.bottom - 2; y += 6) for (let x = r.left + 8; x < r.right - 8; x += 12) { const t = document.elementFromPoint(x, y); if (t && z.contains(t) && !t.closest('button,input,label,a,select')) return { x, y }; }
    return null;
  }, sel);
  const tabs = await P.evaluate(() => { LowiStorePicks.open('check'); const t = [...document.querySelectorAll('.stp-ov [data-stp-tab]')].map(b => b.getAttribute('data-stp-tab')); LowiStorePicks.close(); return t.length ? [...new Set(t)] : ['shop']; });
  await H.sleep(500);
  for (const t of tabs) {
    await open(t);
    if (!(await isOpen())) { res.push([t + ' opens', false]); continue; }
    const head = t === 'sz' ? '.sz-head' : '.stp-head';
    let s = await spot(head); if (!s) { res.push([t + ': title block found', false]); continue; }
    if (wide) {
      await touch(s.x, s.y, s.x + 6, s.y + 300, 12); await H.sleep(700);
      res.push([t + ' (wide): drag leaves it open', await isOpen()]);
      await P.evaluate(() => history.back()); await H.sleep(900);
      res.push([t + ' (wide): back closes it', !(await isOpen())]);
      continue;
    }
    await touch(s.x, s.y, s.x + 3, s.y + 40, 8); await H.sleep(600);
    res.push([t + ': short drag springs back, stays open', await isOpen() && await P.evaluate(() => { const c = document.querySelector('.stp-ov .stp-card'); return !!c && !/translateY\((?!0)/.test(c.style.transform); })]);
    const sc = await P.evaluate(() => { const c = document.querySelector('.stp-ov .stp-scroll'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 40 }; });
    if (sc) { await touch(sc.x, sc.y, sc.x, sc.y + 300, 12); await H.sleep(600); res.push([t + ': drag in the list leaves it open', await isOpen()]); }
    s = await spot(head);
    await touch(s.x, s.y, s.x + 6, s.y + 320, 12); await H.sleep(800);
    res.push([t + ': swipe down on the title closes it', !(await isOpen())]);
    await open(t); const tb = await P.evaluate(() => { const e = document.querySelector('.stp-ov .stp-tab:not(.on)'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (tb) { await touch(tb.x, tb.y, tb.x + 4, tb.y + 300, 12); await H.sleep(800); res.push([t + ': swipe down starting on a tab closes it, without switching tab', !(await isOpen()) && await P.evaluate(t => LowiStorePicks.tab() === t, t)]); }
    await open(t);
    const other = tabs.find(x => x !== t);
    if (other) {
      const b = await P.evaluate(o => { const e = document.querySelector('.stp-ov [data-stp-tab="' + o + '"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, other);
      if (b) { await P.touchscreen.tap(b.x, b.y); await H.sleep(700); res.push([t + ': a tab tap still switches tabs', await isOpen() && await P.evaluate(() => LowiStorePicks.tab()) === other]); }
    }
    await P.evaluate(() => history.back()); await H.sleep(900);
    res.push([t + ': back still closes it', !(await isOpen())]);
    res.push([t + ': Home, nothing left over', await P.evaluate(() => (document.querySelector('.tab.active') || {}).id === 'tab-home' && !document.documentElement.classList.contains('stp-open'))]);
  }
  res.push(['still in the app', !R.crashed && /lowispike|localhost|127\.0\.0\.1/.test(P.url())]);
  res.push(['no page errors', errs.length === 0, errs]);
  let all = true; for (const r of res) { if (!r[1]) all = false; console.log((r[1] ? 'PASS ' : 'FAIL ') + r[0] + (r[2] ? ' ' + JSON.stringify(r[2]).slice(0, 300) : '')); }
  console.log(all ? 'ALL PASS' : 'SOME FAILED');
  await R.close().catch(() => { }); process.exit(all ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
