'use strict';
/* Bug hunt 23 Oct 13:02: the Shuffle 'Your pick' card, the Swipe deck card and the recipe sheet show the category and time
   ('Sweet · 5 min + chill', 'Drink · 5 min') in English when the app is in German or Spanish.
   Shuffles until a pick shows, reads the meta line; opens a '+ chill' recipe by a real tap and reads its time line; opens the Swipe deck.
   node tools/hunt-cook-meta-lang.cjs <device> [url|root] [lang de|es] [shots-prefix] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'de', shots = process.argv[5] || '/tmp/cml';
  const o = { device, engine: 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript((l) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await H.sleep(150); }
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
  await P.evaluate(() => goTab('shelf')); await H.sleep(1500);
  const EN = lang === 'de' ? /\b(Meal|Sweet|Drink|chill|freeze|about|From)\b/ : /\b(Meal|Snack|Sweet|Drink|chill|freeze|about|From)\b/;
  const res = { device, lang, build, metas: [], bad: [] };
  for (let i = 0; i < 6; i++) {
    for (let k = 0; k < 2; k++) { await P.keyboard.press('Escape'); await H.sleep(150); }
    await P.evaluate(() => { const b = document.getElementById('r5Go'); b.scrollIntoView({ block: 'center' }); }); await H.sleep(300);
    await R.tap('#r5Go'); await H.sleep(2800);
    const m = await P.evaluate(() => { const c = [...document.querySelectorAll('#r5Pick .r5-ct .small.muted')].pop(); return c ? c.textContent.replace(/\s+/g, ' ').trim() : null; });
    if (m) { res.metas.push(m); if (EN.test(m)) res.bad.push('pick: ' + m); }
    if (i === 0) await R.shot(shots + '-' + lang + '-pick.png');
  }
  /* a '+ chill' recipe opened by a real tap on a recipe button */
  for (let k = 0; k < 3; k++) { await P.keyboard.press('Escape'); await H.sleep(150); }
  await P.evaluate(() => { const t = document.getElementById('tab-shelf'); const b = document.createElement('button'); b.id = 'cmlRec'; b.setAttribute('data-sh', 'recipe'); b.setAttribute('data-r', 'rb_chia_cocoa_crunch_cups'); b.textContent = 'x'; b.style.cssText = 'position:fixed;left:10px;top:200px;z-index:99;width:60px;height:60px'; document.body.appendChild(b); });
  await H.sleep(300); await R.tap('#cmlRec'); await H.sleep(2500);
  res.recipe = await P.evaluate(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const p = n.parentElement; if (!p || p.closest('#r5Pick,#tab-shelf')) continue; const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (/\bmin\b/.test(t) && p.getBoundingClientRect().height > 0) out.push(t); } return out.slice(0, 8); });
  (res.recipe || []).forEach(t => { if (EN.test(t)) res.bad.push('recipe: ' + t); });
  await R.shot(shots + '-' + lang + '-recipe.png');
  await P.evaluate(() => { const b = document.getElementById('cmlRec'); if (b) b.remove(); });
  /* Swipe deck card */
  for (let k = 0; k < 3; k++) { await P.keyboard.press('Escape'); await H.sleep(150); }
  await P.evaluate(() => goTab('shelf')); await H.sleep(800);
  const sw = await P.evaluate(() => { const b = document.querySelector('#tab-shelf [data-ck="view"][data-v="swipe"], #tab-shelf [data-ck="view"]:last-of-type'); const all = [...document.querySelectorAll('#tab-shelf [data-ck="view"]')]; const s = all.find(x => /swip/i.test(x.textContent)) || all[all.length - 1]; if (!s) return null; s.id = s.id || 'cmlSwipe'; s.scrollIntoView({ block: 'center' }); return '#' + s.id; });
  if (sw) { await H.sleep(300); await R.tap(sw); await H.sleep(2000);
    res.deck = await P.evaluate(() => [...document.querySelectorAll('.r5-dci .small')].slice(0, 3).map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    (res.deck || []).forEach(t => { if (EN.test(t)) res.bad.push('deck: ' + t); });
    await R.shot(shots + '-' + lang + '-deck.png');
    await P.evaluate(() => { const all = [...document.querySelectorAll('#tab-shelf [data-ck="view"]')]; const s = all.find(x => /shuffle|mischen|mezclar/i.test(x.textContent)); if (s) s.click(); });
  }
  res.errs = R.errs; res.crashed = R.crashed;
  console.log(JSON.stringify(res, null, 1));
  console.log(res.bad.length ? 'FAIL' : 'PASS');
  await R.close();
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
