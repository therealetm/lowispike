'use strict';
/* Product card (scanned product spike card) layout probe.
   usage: node tools/probe-product-card.cjs <view> <url|dir> <lang> [outPrefix]
   views: iphone13, ipadP, ipadL, chromium390. Prints section order, Details open state, and whether every
   control in the card can be scrolled into view and tapped (not covered by the close X or anything else). */
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
(async () => {
  const view = process.argv[2] || 'iphone13', target = process.argv[3] || 'https://therealetm.github.io/lowispike/', lang = process.argv[4] || 'es', out = process.argv[5] || '/tmp/pc';
  let srv = null, url = target;
  if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const h = await L.open({ view, url, settle: 6000, lang });
  const { page } = h;
  await page.evaluate((lang) => { try { window.LowiLang && LowiLang.set && LowiLang.set(lang); } catch (e) {} }, lang);
  await L.sleep(800);
  /* close anything that opened on its own (Day card, tutorial, news) */
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await L.sleep(300); }
  await page.evaluate(() => {
    const p = { name: 'Putenhackfleisch', brand: 'Dulano (Lidl)', barcode: '4056489123456', cat: 'meat', facts: { q: '500 g', c: 0.5, s: 0.5, f: 0, p: 20, fat: 8, kcal: 150 }, ingredients: 'Putenfleisch, Salz, Gewürze' };
    LowiDex.reveal(p, true);
  });
  /* the sheet opens on a rAF spring (apple-ui.js); headless WebKit runs it slowly, so wait until it has settled */
  await page.waitForFunction(() => { const c = document.querySelector('#b3Card'), sh = c && c.closest('.r2-sh'); if (!sh) return false; const m = new DOMMatrix(getComputedStyle(sh).transform); return Math.abs(m.m42) < 1; }, null, { timeout: 30000, polling: 250 }).catch(() => {});
  await L.sleep(600);
  const res = await page.evaluate(async () => {
    const card = document.querySelector('#b3Card'); if (!card) return { err: 'no card' };
    const sh = card.closest('.r2-sh');
    const order = [...card.children].map(e => (e.className || e.tagName).split(' ').filter(c => /^sc-/.test(c)).join('.') || e.tagName);
    const det = card.querySelector('details.sc-more');
    const bad = [], seen = [];
    const ctrls = [...card.querySelectorAll('button, summary, a')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.height; });
    for (const e of ctrls) {
      e.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 120));
      const b = e.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + Math.min(b.height / 2, 20);
      const lab = (e.dataset.b3 || e.dataset.sc || e.className || e.tagName) + ':' + e.textContent.trim().slice(0, 30);
      if (cy < 0 || cy > innerHeight || cx < 0 || cx > innerWidth) { bad.push('offscreen ' + lab); continue; }
      const t = document.elementFromPoint(cx, cy);
      if (!(t === e || e.contains(t))) bad.push('covered ' + lab + ' by ' + (t ? (t.className && t.className.baseVal != null ? t.className.baseVal : t.className) || t.tagName : 'null'));
      else seen.push(lab);
    }
    /* bottom: scroll the sheet to the end; the last control must sit fully above the sheet bottom and clear of the X */
    sh.scrollTop = sh.scrollHeight; await new Promise(r => setTimeout(r, 200));
    const last = ctrls[ctrls.length - 1].getBoundingClientRect(), shr = sh.getBoundingClientRect();
    const x = [document.getElementById('whX'), sh.querySelector('.r2-x')].find(e => e && e.getBoundingClientRect().width), xr = x ? x.getBoundingClientRect() : null;
    const lastClear = last.bottom <= Math.min(shr.bottom, innerHeight) + .5;
    const xOverlap = xr && xr.width ? ctrls.filter(e => { const b = e.getBoundingClientRect(); return b.right > xr.left && b.left < xr.right && b.bottom > xr.top && b.top < xr.bottom; }).map(e => e.className) : [];
    return { order, detailsOpen: !!(det && det.open), detailsTop: det ? Math.round(det.getBoundingClientRect().top + sh.scrollTop - shr.top) : null, bad, seen: seen.length, lastClear, xOverlap, x: xr && [x.id || x.className, Math.round(xr.left), Math.round(xr.top), Math.round(xr.width), getComputedStyle(x).position], lastBottom: Math.round(last.bottom), sheet: [Math.round(shr.top), Math.round(shr.bottom), innerHeight, sh.scrollHeight], lang: document.documentElement.lang, summary: det && det.querySelector('summary').textContent };
  });
  await page.evaluate(() => { const sh = document.querySelector('#b3Card').closest('.r2-sh'); sh.scrollTop = 0; });
  await L.sleep(300);
  await page.screenshot({ path: out + '-' + view + '-' + lang + '-top.png' });
  await page.evaluate(() => { const sh = document.querySelector('#b3Card').closest('.r2-sh'); sh.scrollTop = sh.scrollHeight; });
  await L.sleep(300);
  await page.screenshot({ path: out + '-' + view + '-' + lang + '-bottom.png' });
  res.errors = h.log.pageerror;
  console.log(JSON.stringify(res));
  await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(1); });
