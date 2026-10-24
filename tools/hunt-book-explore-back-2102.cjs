'use strict';
/* Bug hunt 24 Oct 21:02: My Recipe Book (empty) > Explore recipes, then back (history.back = swipe back) twice.
   Expect: back 1 closes All recipes (book or Cook shows), back 2 closes the book, and you stay in the app.
   Logs history.length / state and open sheets at each step, N fresh runs.
   node tools/hunt-book-explore-back-2102.cjs <device> [url|root] [lang] [runs] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 15', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en', runs = +(process.argv[5] || 3);
  const o = { device, engine: 'webkit', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  const snap = (w) => P.evaluate((w) => { const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && +s.opacity > .05; }; return { w, inApp: !!document.getElementById('whPad'), hl: history.length, st: JSON.stringify(history.state).slice(0, 80), on: [...document.querySelectorAll('.r2-ov.on')].map(e => String(e.className).replace('r2-ov', '').replace(/ on| au-physics/g, '').trim()), visible: [...document.querySelectorAll('.r2-ov')].filter(vis).length, tab: (document.querySelector('nav .on, .tabbar .on, [data-tab].on') || {}).textContent || '' }; }, w).catch(e => ({ w, gone: String(e.message).slice(0, 80), url: P.url() }));
  const res = [];
  for (let i = 0; i < runs; i++) {
    await R.goto(); await H.sleep(5000);
    await P.evaluate(() => { try { goTab('shelf'); } catch (e) { } }); await H.sleep(1500);
    const steps = [await snap('cook')];
    const book = P.locator('#tab-shelf button, #tab-shelf [role=button], #tab-shelf [data-ck]').filter({ hasText: /My Recipe Book|Mein Rezeptbuch|Mi recetario/ }).first();
    await book.evaluate(e => e.scrollIntoView({ block: 'center' })); await H.sleep(500); await R.tapEl(book); await H.sleep(2500);
    steps.push(await snap('book open'));
    const ex = P.locator('.r2-ov.on').last().locator('button').filter({ hasText: /Browse recipes|Rezepte entdecken|Explorar recetas/ }).first();
    if (await ex.count()) { await R.tapEl(ex); await H.sleep(2500); steps.push(await snap('explore tapped')); } else steps.push({ w: 'no explore button' });
    await P.evaluate(() => history.back()).catch(() => { }); await H.sleep(3500); steps.push(await snap('back 1'));
    await P.evaluate(() => history.back()).catch(() => { }); await H.sleep(4000); steps.push(await snap('back 2'));
    res.push(steps);
  }
  console.log(JSON.stringify({ device, lang, build: R.url, crashed: R.crashed, errs: R.errs, res }, null, 1));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
