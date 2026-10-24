'use strict';
/* Bug hunt (companion): open and close Misty's card quickly (API and real taps), then report what stays in the page:
   overlays still marked on, their opacity / pointer-events, and whether a tap on Home reaches Home.
   node tools/hunt-misty-fast.cjs <device> [mode api|tap] [url] */
const H = require('./sim/harness.cjs');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 13', mode = A[1] || 'api', url = A[2] || 'https://therealetm.github.io/lowispike/index.html';
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang: 'en', members: 5, messages: 5 });
  const P = R.page; await R.goto(); await H.sleep(5000);
  const state = () => P.evaluate(() => ({
    build: (document.querySelector('meta[name="lowi-build"]') || {}).content,
    ovs: [...document.querySelectorAll(".mh-ov")].map(e => { const s = getComputedStyle(e), sh = e.querySelector(".r2-sh"), q = sh && sh.getBoundingClientRect(), bg = getComputedStyle(e, "::before"); return "shTop=" + (q ? Math.round(q.top) : "-") + " shOp=" + (sh ? getComputedStyle(sh).opacity : "-") + " bg=" + s.backgroundColor + " " + e.className + ' | op=' + s.opacity + ' pe=' + s.pointerEvents + ' vis=' + s.visibility + ' disp=' + s.display; }),
    cards: document.querySelectorAll('#mistyHub').length,
    hit: (() => { const t = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return t ? (t.id || String(t.className).slice(0, 50) || t.tagName) + ' in ' + ((t.closest('.r2-ov') || {}).className || '-') : null; })()
  }));
  console.log('before', JSON.stringify(await state()));
  for (let i = 0; i < 8; i++) {
    if (mode === 'api') { await P.evaluate(() => LowiMistyHub.open()); await H.sleep(120 + i * 30); await P.evaluate(() => LowiMistyHub.close()); await H.sleep(90); }
    else { await P.evaluate(() => LowiMistyHub.open()); await H.sleep(250 + i * 40); await P.keyboard.press('Escape'); await H.sleep(150); }
  }
  for (const w of [300, 1500, 4000]) { await H.sleep(w); console.log('after +' + w, JSON.stringify(await state(), null, 1)); }
  await P.evaluate(() => LowiMistyHub.open()); await H.sleep(2500);
  console.log('reopen', JSON.stringify(await state(), null, 1));
  await P.evaluate(() => LowiMistyHub.close()); await H.sleep(2000);
  console.log('closed', JSON.stringify(await state(), null, 1));
  console.log('crashed', R.crashed, 'errs', JSON.stringify(R.errs.slice(0, 6)));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
