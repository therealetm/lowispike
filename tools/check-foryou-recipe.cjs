'use strict';
/* Oct 25, 2026: For You > recipe chip opens ONE recipe view, its X sits at the bottom centre, X and back go straight to the feed.
   node tools/check-foryou-recipe.cjs <w> <h> [url|root] [outdir] [lang en|de|es]
   Fake Supabase (tools/sim/mock-cloud.cjs): nothing reaches the real server.
   Steps (finger taps): Community > For You, the bot's recipe chip (Nibblo, "Tausch des Tages") -> exactly one recipe screen
   (.p2-recov) and no Kitchen recipe page (tab stays For You, #shelf has no recipe), the photo of the post as hero, the X round
   at the bottom centre inside the screen; X -> back in the For You feed, nothing else open; open again, browser/Android back
   -> the same; open again from a Today-style button elsewhere ([data-sh=open-shelf][data-sub=recipe]) -> still one view;
   no page errors. */
const H = require('./sim/harness.cjs');
const fs = require('fs');
(async () => {
  const w = +process.argv[2] || 390, h = +process.argv[3] || 844, where = process.argv[4] || '.', out = process.argv[5] || '/tmp/check-foryou-recipe', lang = process.argv[6] || 'en';
  fs.mkdirSync(out, { recursive: true });
  const o = { engine: process.env.ENG || 'webkit', members: 6, messages: 6, probe: false, lang, viewport: { width: w, height: h } }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  if (o.engine === 'webkit') o.device = w >= 700 ? 'iPad (gen 7)' : 'iPhone 13';
  const R = await H.open(o), P = R.page, tag = w + 'x' + h + '-' + lang + '-' + o.engine;
  await P.setViewportSize({ width: w, height: h });
  await R.ctx.addInitScript(a => { try { localStorage.setItem('lowispike.lang', a.l); localStorage.setItem('lowi.lang', a.l); } catch (e) { } }, { l: lang }).catch(() => {});
  const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info).slice(0, 700) : '')); };
  await R.goto(); await H.sleep(6000);
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || (window.LOWI_BUILD || ''));
  console.log('build', build);
  const openFy = async () => {
    await P.evaluate(() => window.goTab('foryou'));
    await P.waitForSelector('#tab-foryou.active .rm-tabs .rm-tab', { timeout: 30000 }).catch(() => {});
    await H.sleep(800);
    await R.tap('#tab-foryou .rm-tab[data-rm="fy"]'); await H.sleep(2500);
  };
  await openFy();
  /* the first bot slide with a recipe chip */
  const chipSel = await P.evaluate(() => {
    const c = [...document.querySelectorAll('#fyFeed .fy-slide [data-sh="open-shelf"][data-sub="recipe"][data-r]')].find(b => { const p = TRIBE.post(b.closest('.fy-slide').getAttribute('data-id')); return p && p.bot; });
    if (!c) return null; const s = c.closest('.fy-slide'); const f = document.getElementById('fyFeed'); f.scrollTop = s.offsetTop;
    return '#fyFeed .fy-slide[data-id="' + s.getAttribute('data-id') + '"] [data-sh="open-shelf"][data-sub="recipe"]';
  });
  ok('0 For You shows a bot post with a recipe chip', !!chipSel, chipSel);
  if (!chipSel) { await R.close(); process.exit(1); }
  await H.sleep(900);
  const state = () => P.evaluate(() => {
    const ovs = [...document.querySelectorAll('.r2-ov.on:not(.off)')];
    const rec = document.querySelector('.r2-ov.p2-recov.on:not(.off)');
    const act = document.querySelector('.tab.active'), shelf = document.getElementById('shelf');
    let x = null, hero = null;
    if (rec) {
      const b = rec.querySelector('[data-r2="close"]'), r = b && b.getBoundingClientRect();
      const top = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      x = r && { cx: Math.round(r.left + r.width / 2), bottomGap: Math.round(innerHeight - r.bottom), w: Math.round(r.width), onTop: !!(top && b.contains(top)) };
      const im = rec.querySelector('.p2-hero img'); hero = im ? { src: im.getAttribute('src'), loaded: im.complete && im.naturalWidth > 0 } : null;
    }
    const kitchenRecipe = !!(shelf && shelf.classList.contains('on') && shelf.closest('.tab.active') && /sh-heads|data-tr="share-recipe"|sh-bookmark/.test(shelf.innerHTML) && shelf.getBoundingClientRect().width > 0);
    return { tab: act ? act.id : '', open: ovs.map(o => o.className.replace(/\s+/g, '.')), rec: !!rec, x, hero, iw: innerWidth, kitchenRecipe,
      heads: rec ? !!rec.querySelector('.p2-heads') : null, title: rec ? ((rec.querySelector('.p2-rn') || {}).textContent || '') : '',
      feed: !!document.querySelector('#tab-foryou.active #fyFeed .fy-slide') };
  });
  /* 1. tap the chip: one recipe view */
  await R.tap(chipSel); await P.waitForSelector('.r2-ov.p2-recov.on:not(.off)', { timeout: 8000 }).catch(() => {}); await H.sleep(600);
  let s = await state();
  await R.shot(out + '/1-recipe-' + tag + '.png');
  ok('1 the recipe chip opens exactly one recipe view (no Kitchen recipe page, tab stays For You)', s.rec && s.open.length === 1 && s.tab === 'tab-foryou' && !s.kitchenRecipe, { tab: s.tab, open: s.open, kitchen: s.kitchenRecipe, title: s.title });
  ok('2 the X is round, at the bottom centre and on top', s.x && Math.abs(s.x.cx - s.iw / 2) <= 3 && s.x.bottomGap >= 8 && s.x.bottomGap <= 60 && s.x.w >= 44 && s.x.onTop, s.x);
  ok('3 the hero is the photo of the post (no placeholder)', s.hero && s.hero.loaded && /fy-img\/|img|webp|jpg|png/.test(s.hero.src), s.hero);
  ok('4 the heads-up note of the Kitchen page is on the recipe screen too (Espresso Cottage Cream Cups has one)', s.heads === true, { heads: s.heads });
  /* 5. X -> straight back to the feed */
  await R.tap('.r2-ov.p2-recov.on [data-r2="close"]'); await H.sleep(1200);
  s = await state();
  await R.shot(out + '/2-after-x-' + tag + '.png');
  ok('5 X goes straight back to the For You feed, no second recipe page', !s.rec && !s.open.length && s.tab === 'tab-foryou' && !s.kitchenRecipe && s.feed, s);
  /* 6. open again, then browser / Android back */
  await R.tap(chipSel); await P.waitForSelector('.r2-ov.p2-recov.on:not(.off)', { timeout: 8000 }).catch(() => {}); await H.sleep(600);
  s = await state();
  const one2 = s.rec && s.open.length === 1 && !s.kitchenRecipe;
  await P.evaluate(() => history.back()); await H.sleep(1500);
  s = await state();
  ok('6 browser/Android back closes the one recipe view and stays in the For You feed', one2 && !s.rec && !s.open.length && s.tab === 'tab-foryou' && !s.kitchenRecipe && s.feed, { one2, after: s });
  /* 7. a recipe button elsewhere (Today plan style) also opens only the recipe screen */
  const other = await P.evaluate(() => {
    const id = 'rb_espresso_cottage_cream_cups'; const b = document.createElement('button'); b.id = 'chkRecBtn'; b.dataset.sh = 'open-shelf'; b.dataset.t = 'kochen'; b.dataset.sub = 'recipe'; b.dataset.r = id;
    b.textContent = 'Recipe'; b.style.cssText = 'position:fixed;left:10px;top:120px;z-index:5;width:120px;height:44px'; document.body.appendChild(b); return id; });
  await R.tap('#chkRecBtn'); await P.waitForSelector('.r2-ov.p2-recov.on:not(.off)', { timeout: 8000 }).catch(() => {}); await H.sleep(600);
  s = await state();
  ok('7 a recipe button elsewhere opens only the recipe screen too', s.rec && s.open.length === 1 && s.tab === 'tab-foryou' && !s.kitchenRecipe, { other, tab: s.tab, open: s.open, kitchen: s.kitchenRecipe });
  await R.tap('.r2-ov.p2-recov.on [data-r2="close"]'); await H.sleep(1200);
  await P.evaluate(() => { const b = document.getElementById('chkRecBtn'); if (b) b.remove(); });
  /* 8. words do not break badly on the recipe screen (hyphen splits) */
  await R.tap(chipSel); await P.waitForSelector('.r2-ov.p2-recov.on:not(.off)', { timeout: 8000 }).catch(() => {}); await H.sleep(600);
  const hy = await P.evaluate(() => { const r = document.querySelector('.r2-ov.p2-recov.on'); if (!r) return null; const bad = [...r.querySelectorAll('*')].filter(e => { const cs = getComputedStyle(e); return cs.hyphens === 'auto' || cs.webkitHyphens === 'auto'; }).length; return { bad }; });
  ok('8 no automatic word splitting on the recipe screen', hy && hy.bad === 0, hy);
  await R.tap('.r2-ov.p2-recov.on [data-r2="close"]'); await H.sleep(1000);
  const errs = R.errs.map(e => e.m).filter(m => !/supabase|realtime|websocket/i.test(m));
  ok('9 no page errors', !errs.length, errs.slice(0, 5));
  const pass = res.filter(x => x.pass).length;
  console.log('RESULT ' + pass + '/' + res.length + ' ' + tag + ' build ' + build);
  fs.writeFileSync(out + '/result-' + tag + '.json', JSON.stringify({ build, res }, null, 1));
  await R.close().catch(() => {});
  process.exit(pass === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
