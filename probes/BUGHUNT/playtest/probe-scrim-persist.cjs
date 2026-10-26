/* Run 27: P-FRESH-SCRIM siblings. fresh-scrim.js only guards overlays that are ADDED to <body> (born time from a MutationObserver).
   Overlays that live in <body> from boot and are shown by toggling hidden/class are never 'fresh'. This lists every body child that is
   fixed + full screen now or after showing, and every visible opener (aria-haspopup=dialog). node probe-scrim-persist.cjs <url> [view] */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/'; const view = process.argv[3] || 'chromium390';
  const h = await L.open({ url: url + (url.includes('?') ? '&' : '?') + 'sp=' + Date.now(), view });
  const page = h.page;
  await page.waitForFunction(() => window.LowiFreshScrim && document.getElementById('whPad'), null, { timeout: 90000 }).catch(() => {});
  await L.sleep(4000);
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {} });
  const r = await page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight, out = [];
    for (const el of document.body.children) {
      const cs = getComputedStyle(el); if (cs.position !== 'fixed') continue;
      const b = el.getBoundingClientRect();
      out.push({ id: el.id, cls: (el.className + '').slice(0, 50), hidden: el.hidden, disp: cs.display, vis: cs.visibility, op: cs.opacity, pe: cs.pointerEvents, w: Math.round(b.width), h: Math.round(b.height), full: b.width >= vw * .9 && b.height >= vh * .9, age: Math.round(LowiFreshScrim.age(el)) });
    }
    const openers = [...document.querySelectorAll('[aria-haspopup=dialog],[aria-haspopup=true]')].map(e => { const b = e.getBoundingClientRect(); return { id: e.id, cls: (e.className + '').slice(0, 40), lab: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; }).filter(o => o.w);
    return { out, openers };
  });
  for (const o of r.out) console.log('BODYFIXED ' + JSON.stringify(o));
  for (const o of r.openers) console.log('OPENER ' + JSON.stringify(o));
  console.log('ERR', JSON.stringify(await L.snap(h)));
  await h.browser.close(); if (h.srv) h.srv.close();
})();
