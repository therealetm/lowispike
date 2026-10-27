'use strict';
/* P16 (27 Oct 2026): Insulinfreundlich (green) / Nicht insulinfreundlich (red) everywhere. Renders the verdict surfaces in the
   running app (scanner food card, meal analysis, meal detail, meal photo, journal, Community meal pill, Shop scan) and reads the
   words and the computed colours. Usage: node p16-insulin-label.cjs <lang> <iPhone 13|iPad Pro 11> <dark|light> [live] */
const L = require('./lib.cjs');
(async () => {
  const lang = process.argv[2] || 'de', device = process.argv[3] || 'iPhone 13', theme = process.argv[4] || 'dark', live = process.argv[5] === 'live';
  const errs = [];
  let h, page;
  if (live) {
    const browser = await L.pw.webkit.launch();
    const dev = Object.assign({}, L.pw.devices[device]);
    const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block', locale: lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-US', colorScheme: theme }));
    const seed = L.existingSeed({ lang });
    await ctx.addInitScript(s => { try { for (const k in s.kv) localStorage.setItem(k, s.kv[k]); for (const k in s.session) sessionStorage.setItem(k, s.session[k]); } catch (e) {} }, seed);
    page = await ctx.newPage(); page.on('pageerror', e => errs.push(String(e.message || e)));
    await page.goto(L.BASE + '?v=' + Date.now(), { waitUntil: 'load' }); await L.sleep(5000);
    h = { browser, page };
  } else {
    h = await L.launch({ device, lang, locale: lang === 'de' ? 'de-DE' : 'en-US' }); page = h.page;
    page.on('pageerror', e => errs.push(String(e.message || e)));
    await L.openApp(h, { settle: 2500 });
  }
  await page.evaluate(th => { document.documentElement.setAttribute('data-ui', th); document.documentElement.setAttribute('data-theme', th); }, theme);
  const out = await page.evaluate(lang => {
    const r = {};
    r.build = (document.querySelector('meta[name="lowi-build"]') || {}).content || (window.LOWI_BUILD || '');
    const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:0;top:0;width:360px;z-index:99999'; document.body.appendChild(box);
    const col = (sel) => { const e = box.querySelector(sel); if (!e) return null; const s = getComputedStyle(e); return { c: s.color, bg: s.backgroundColor, disp: s.display }; };
    const K = window.LowiFoodKnowledge;
    r.words = K ? [K.ifWord('low', lang), K.ifWord('mid', lang), K.tierName('SELTEN', lang), K.tierName('NEIN', lang), K.tierName('JA', lang)] : 'no K';
    const MR = window.LowiMealResult, MD = window.LowiMealDetailCore, MS = window.LowiMealSnap, MJ = window.LowiMealJournal, SS = window.LowiShopScanCore, BC = window.LowiBucketCore;
    try { r.mealResult = ['low', 'mid', 'high'].map(k => MR.STR[lang][k]); } catch (e) { r.mealResult = 'x ' + e.message; }
    try { r.mealDetail = ['low', 'mid', 'high'].map(k => MD.t(k, lang)); } catch (e) { r.mealDetail = 'x ' + e.message; }
    try { r.mealPhoto = ['low', 'mid', 'high'].map(k => MS.t(k, lang)); } catch (e) { r.mealPhoto = 'x ' + e.message; }
    try { r.shopScan = ['v_none', 'v_mild', 'v_spike'].map(k => SS.tx(k, lang === 'de' ? 1 : lang === 'es' ? 2 : 0)); } catch (e) { r.shopScan = 'x ' + e.message; }
    /* colours of the old middle level next to the red one */
    box.innerHTML = '<div class="sc-card"><div class="fc-head fc-nein"><span class="fc-light"><i></i><i></i></span><strong class="fc-word">x</strong></div></div>' +
      '<span class="cs-meal cs-meal-mid" id="a"><i></i></span><span class="cs-meal cs-meal-high" id="b"><i></i></span>' +
      '<span class="md-lv md-lv-mid" id="c"><i></i></span><span class="mj-bs mj-bs-mid" id="d"><i></i></span>' +
      '<span class="badge selten" id="e">x</span><span class="badge nein" id="f">x</span><span class="sz-sel" id="g">x</span>' +
      '<div class="mr-verdict mr-mid" id="h">x</div><span class="k9-spk warn" id="i">x</span><span class="lvl medium" id="j">x</span><span class="lvl high" id="k">x</span>';
    r.fcWordHidden = col('.sc-card .fc-word').disp;
    r.colours = { csMid: col('#a i'), csHigh: col('#b i'), mdMid: col('#c i'), mjMid: col('#d i'), badgeSelten: col('#e'), badgeNein: col('#f'), szSel: col('#g'), mrMid: getComputedStyle(box.querySelector('#h')).getPropertyValue('--mr-c'), k9warn: col('#i'), lvlMed: col('#j'), lvlHigh: col('#k') };
    try {
      const p = { name: 'Haferflocken', brand: 'Test', verdict: 'better', n: { carbs: 58, sugar: 1, fiber: 10, protein: 13, fat: 7 }, serve: 40 };
      const fc = window.LowiFoodCard && window.LowiFoodCard.cardHTML ? window.LowiFoodCard.cardHTML(p, lang) : '';
      r.foodCard = fc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 220);
    } catch (e) { r.foodCard = 'x ' + e.message; }
    box.remove();
    r.sideScroll = document.documentElement.scrollWidth > window.innerWidth + 1;
    return r;
  }, lang);
  out.errors = errs;
  console.log(JSON.stringify(out, null, 1));
  await h.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
