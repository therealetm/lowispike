'use strict';
/* Bug hunt (What's New): with the app's own auto start on (lowi.g1.auto) and the tour done, a launch where the running build's news
   is not seen yet shows it once in the app language; Later / the buttons work; a reload does not show it again.
   node tools/hunt-news-probe.cjs <device> [url] [lang] */
const H = require('./sim/harness.cjs');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 13', url = A[1] || 'https://therealetm.github.io/lowispike/index.html', lang = A[2] || 'en';
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowi.g1.auto', '1'); localStorage.setItem('lowispike.lang', l); if (!sessionStorage.getItem('np')) { sessionStorage.setItem('np', '1'); localStorage.removeItem('lowi.news.seen'); localStorage.removeItem('lowi.g1.bn'); localStorage.setItem('lowi.g1', JSON.stringify({ t: 1 })); } } catch (e) { } }, lang);
  const P = R.page;
  const look = () => P.evaluate(() => { const ob = document.getElementById('g1Ob'); const vis = e => e && e.getBoundingClientRect().height > 10 && getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > .1; const g = window.LowiG1; return { lang: document.documentElement.lang, state: g && g.state(), ob: g && g.orbNews(), news: g && g.news && g.news.id, obText: ob && vis(ob) ? ob.innerText.replace(/\s+/g, ' ').slice(0, 400) : null, btns: ob ? [...ob.querySelectorAll('button')].filter(vis).map(b => { const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [b.textContent.trim().slice(0, 30), Math.round(r.top), Math.round(r.width) + 'x' + Math.round(r.height), !!(t && (t === b || b.contains(t)))]; }) : [], seen: localStorage.getItem('lowi.news.seen'), off: ob ? (() => { const r = ob.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), innerWidth, Math.round(r.top), Math.round(r.bottom), innerHeight]; })() : null }; });
  await R.goto();
  let s = null; for (let i = 0; i < 20; i++) { await H.sleep(1500); s = await look(); if (s.obText) break; }
  console.log('FIRST', JSON.stringify(s));
  await R.shot('/tmp/hunt-set/news-' + device.replace(/\W/g, '') + '-' + lang + '.png');
  if (s.obText) {
    const later = await P.evaluate(() => { const ob = document.getElementById('g1Ob'); const b = [...ob.querySelectorAll('button')].find(b => /Later|Später|Luego|×|Close|Schlie|Cerrar|Got it|Verstanden|Entendido|OK/i.test(b.textContent + (b.getAttribute('aria-label') || ''))); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: b.textContent.trim() }; });
    console.log('DISMISS', JSON.stringify(later));
    if (later) { await P.touchscreen.tap(later.x, later.y); await H.sleep(1500); console.log('AFTER', JSON.stringify(await look())); }
  }
  await P.reload({ waitUntil: 'load' }); let s2; for (let i = 0; i < 10; i++) { await H.sleep(1500); s2 = await look(); if (s2.obText) break; }
  console.log('RELOAD', JSON.stringify(s2));
  console.log('ERRS', JSON.stringify(R.errs.filter(e => !/access control/.test(e.m)).slice(0, 5)));
  await R.close();
})().catch(e => { console.log('TOOL ERROR', e && e.stack); process.exit(1); });
