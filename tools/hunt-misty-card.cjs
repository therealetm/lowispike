'use strict';
/* Bug hunt (companion): open Misty's card (LowiMistyHub) on the live site like a user, then report where the card and its buttons
   sit, whether the card scrolls, and whether each button is reachable by scrolling the card.
   node tools/hunt-misty-card.cjs <device> [url] [theme] [lang] [out.png] */
const H = require('./sim/harness.cjs');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 13', url = A[1] || 'https://therealetm.github.io/lowispike/index.html';
  const theme = A[2] || 'dark', lang = A[3] || 'en', shot = A[4] || '/tmp/hunt-cp/misty-card.png';
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  await R.goto(); await H.sleep(5000);
  const P = R.page;
  await P.evaluate(() => LowiMistyHub.open()); await H.sleep(2500);
  const info = await P.evaluate(() => {
    const card = document.getElementById('mistyHub'); if (!card) return { card: null };
    const ov = card.closest('.r2-ov'); const r = card.getBoundingClientRect();
    let sc = card; const chain = [];
    for (let e = card; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); chain.push((e.id || String(e.className).slice(0, 30)) + ' oy=' + s.overflowY + ' h=' + Math.round(e.getBoundingClientRect().height) + ' sh=' + e.scrollHeight + ' ch=' + e.clientHeight + ' top=' + Math.round(e.getBoundingClientRect().top) + ' tf=' + s.transform.slice(0, 40)); }
    const btns = [...card.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0).map(b => { const q = b.getBoundingClientRect(); return (b.getAttribute('aria-label') || b.textContent.trim()).slice(0, 20) + '@' + Math.round(q.top); });
    return { vh: innerHeight, vvh: visualViewport && visualViewport.height, card: [Math.round(r.top), Math.round(r.bottom), Math.round(r.height)], ovCls: ov && ov.className, chain, btns };
  });
  console.log(JSON.stringify(info, null, 1));
  await R.shot(shot);
  /* try to reach the last button the way a user would: swipe up inside the card */
  const reach = await P.evaluate(async () => {
    const card = document.getElementById('mistyHub'); if (!card) return null;
    const all = [...card.querySelectorAll('button')]; const last = all[all.length - 1];
    last.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 400));
    const q = last.getBoundingClientRect(); const t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
    return { lastTop: Math.round(q.top), hit: !!(t && (t === last || last.contains(t))), hitWhat: t && (t.id || String(t.className).slice(0, 40)) };
  });
  console.log('reach', JSON.stringify(reach), 'errs', JSON.stringify(R.errs.slice(0, 5)));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
