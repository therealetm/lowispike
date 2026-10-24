'use strict';
/* Code error sweep 24 Oct 14:02: do Cook's featured / rebuild recipe rows ("sub · N finds") read in German and Spanish?
   Asks LowiLang.line for every non-book recipe line and for the count, and counts lines that stay English.
   node tools/sweep-cook-finds-1402.cjs [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const where = process.argv[2] || 'https://therealetm.github.io/lowispike/index.html';
  const res = {};
  for (const [lang, device] of [['de', 'iPhone 15'], ['es', 'Pixel 7']]) {
    const o = { device, engine: 'chromium', members: 2, messages: 2, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
    await R.goto(); await H.sleep(4000);
    res[lang] = await P.evaluate(() => {
      const out = { lang: LowiLang.get(), build: (document.querySelector('meta[name="lowi-build"]') || {}).content, rows: 0, english: [], samples: [] };
      const all = (window.LowiAllRecipes ? LowiAllRecipes() : []).filter(r => !r.book);
      for (const r of all) { out.rows++; const t = LowiLang.line(r.sub || ''); if (t === r.sub) out.english.push(r.sub); else if (out.samples.length < 4) out.samples.push(t); }
      out.count6 = LowiLang.line(' · 6 finds'); out.count1 = LowiLang.line(' · 1 find');
      return out;
    });
    res[lang].errs = R.errs.slice(0, 5);
    await R.close();
  }
  console.log(JSON.stringify(res, null, 1));
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
