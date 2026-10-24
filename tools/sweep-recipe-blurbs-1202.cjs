'use strict';
/* Code error sweep 24 Oct 12:02: which Cook recipe lines (blurb under each recipe) have no German / Spanish line?
   Opens the app in each language and asks LowiLang.line() for every recipe's sub text.
   node tools/sweep-recipe-blurbs-1202.cjs [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const where = process.argv[2] || 'https://therealetm.github.io/lowispike/index.html';
  const res = {};
  for (const lang of ['de', 'es']) {
    const o = { device: 'iPhone 13', engine: 'chromium', members: 2, messages: 2, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
    await R.goto(); await H.sleep(4000);
    res[lang] = await P.evaluate(() => {
      const out = { lang: window.LowiLang && LowiLang.get && LowiLang.get(), total: 0, missing: [] };
      const seen = new Set(), subs = [];
      try { (typeof RECIPE_BOOK !== 'undefined' ? RECIPE_BOOK : []).forEach(r => r && r.sub && subs.push(r.sub)); } catch (e) { out.err = String(e); }
      try { if (typeof RECIPES_FEAT !== 'undefined') RECIPES_FEAT.forEach(r => r && r.sub && subs.push(r.sub)); } catch (e) { }
      for (const s of subs) { if (seen.has(s)) continue; seen.add(s); out.total++; const t = LowiLang.line(s); if (t === s) out.missing.push(s); }
      return out;
    });
    res[lang].errs = R.errs.slice(0, 5);
    await R.close();
  }
  console.log(JSON.stringify(res, null, 1));
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
