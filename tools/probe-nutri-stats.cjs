'use strict';
/* Nutrition stats probe: portion block on the product card + Today's stats sheet + Set my targets + Log meal strip.
   usage: node tools/probe-nutri-stats.cjs <view> <url|dir> <lang> [outPrefix]   views: iphone13, ipadP, ipadL, chromium390 */
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const settle = () => L.sleep(900);
(async () => {
  const view = process.argv[2] || 'iphone13', target = process.argv[3] || 'https://therealetm.github.io/lowispike/', lang = process.argv[4] || 'en', out = process.argv[5] || '/tmp/ns';
  let srv = null, url = target;
  if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const h = await L.open({ view, url, settle: 6000, lang });
  const { page } = h, R = {};
  await page.evaluate((lang) => { try { window.LowiLang && LowiLang.set && LowiLang.set(lang); } catch (e) {} }, lang);
  await L.sleep(800);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await L.sleep(300); }
  R.build = await page.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || (window.LOWI_BUILD || ''));
  R.loaded = await page.evaluate(() => !!(window.LowiNutriStats && window.LowiNutriStatsCore));
  /* 1. product card */
  await page.evaluate(() => { const p = { name: 'Haferflocken', brand: 'Kölln', barcode: '4000540000108', cat: 'grain', facts: { q: '500 g', c: 58.7, s: 0.7, f: 10, p: 13.5, fat: 7, kcal: 372 } }; window.__nsP = p; LowiDex.reveal(p, true); });
  await page.waitForFunction(() => { const c = document.querySelector('#b3Card'), sh = c && c.closest('.r2-sh'); if (!sh) return false; const m = new DOMMatrix(getComputedStyle(sh).transform); return Math.abs(m.m42) < 1; }, null, { timeout: 30000, polling: 250 }).catch(() => {});
  await settle();
  const tapCheck = async sel => page.evaluate(async sel => {
    const out = [];
    for (const e of [...document.querySelectorAll(sel)].filter(e => e.getBoundingClientRect().width)) {
      e.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 150));
      const b = e.getBoundingClientRect(), t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      const lab = (e.dataset.ns || e.name || e.className) + '';
      if (b.left < -.5 || b.right > innerWidth + .5 || b.top < 0 || b.bottom > innerHeight) out.push('offscreen ' + lab);
      else if (!(t === e || e.contains(t) || (t && t.closest && t.closest('label') && t.closest('label').contains(e)))) out.push('covered ' + lab + ' by ' + (t && (t.className.baseVal != null ? t.className.baseVal : t.className)));
      if (b.height < 43.5 && !/ns-g/.test(e.className)) out.push('small ' + lab + ' ' + Math.round(b.height));
    }
    return out;
  }, sel);
  R.card = await page.evaluate(() => {
    const card = document.querySelector('#b3Card'), box = card && card.querySelector('.ns-portion'); if (!box) return { err: 'no portion block' };
    const order = [...card.children].map(e => (e.className || '').split(' ').filter(c => /^(sc-|ns-)/.test(c)).join('.'));
    const tiles = [...box.querySelectorAll('.ns-t')].map(t => t.textContent.trim());
    const over = [...box.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(), p = box.getBoundingClientRect(); return b.width && (b.right > p.right + 1 || b.left < p.left - 1); }).map(e => e.className);
    return { order, label: box.querySelector('.ns-plab').textContent, grams: box.querySelector('.ns-g').value, tiles, overflow: over, w: Math.round(box.getBoundingClientRect().width) };
  });
  R.cardTaps = await tapCheck('#b3Card .ns-portion button');
  await page.evaluate(() => { const sh = document.querySelector('#b3Card').closest('.r2-sh'); const b = document.querySelector('.ns-portion'); sh.scrollTop = b.offsetTop - 40; });
  await L.sleep(300);
  await page.screenshot({ path: out + '-' + view + '-' + lang + '-card.png' });
  /* + twice (100 -> 125 -> 150), then type 200 */
  for (let i = 0; i < 2; i++) { await page.click('#b3Card [data-ns="plus"]'); await L.sleep(300); }
  R.rerender = await page.evaluate(async () => { const g = document.querySelector('#b3Card .ns-g').value; LowiDex.reveal(window.__nsP, true); await new Promise(r => setTimeout(r, 800)); return g + ' -> ' + (document.querySelector('#b3Card .ns-g') || {}).value; });
  R.afterPlus = await page.evaluate(() => { const b = document.querySelector('.ns-portion'); return { g: b.querySelector('.ns-g').value, label: b.querySelector('.ns-plab').textContent, protein: b.querySelector('[data-ns-t="protein"] b').textContent }; });
  await page.fill('#b3Card .ns-g', '200'); await L.sleep(250);
  R.after200 = await page.evaluate(() => { const b = document.querySelector('.ns-portion'); return { protein: b.querySelector('[data-ns-t="protein"] b').textContent, sugar: b.querySelector('[data-ns-t="sugar"] b').textContent, kcal: b.querySelector('[data-ns-t="kcal"] b').textContent }; });
  /* log it the way "Ate it" does, then reopen the card: "Last time 200 g" */
  R.logged = await page.evaluate(() => { const m = LowiNutriStats.logMacros(window.__nsP); const r = LowiVitalsBridge.logMeal({ id: 'bc:probe:' + Date.now(), t: 'Haferflocken', macros: m, via: 'barcode' }); return { m, ok: !!r }; });
  await page.evaluate(() => { try { LowiR2.close(); } catch (e) {} }); await L.sleep(500);
  await page.evaluate(() => LowiDex.reveal(window.__nsP, true));
  await page.waitForFunction(() => { const c = [...document.querySelectorAll('.r2-ov.on #b3Card')].pop(), sh = c && c.closest('.r2-sh'); if (!sh) return false; const m = new DOMMatrix(getComputedStyle(sh).transform); return Math.abs(m.m42) < 1; }, null, { timeout: 30000, polling: 250 }).catch(() => {});
  await settle();
  R.openCards = await page.evaluate(() => document.querySelectorAll('#b3Card').length + ' cards, ' + document.querySelectorAll('.r2-ov.on #b3Card').length + ' open');
  R.reopen = await page.evaluate(() => { const b = [...document.querySelectorAll('.r2-ov.on #b3Card .ns-portion')].pop(); return b ? b.querySelector('.ns-plab').textContent + ' ' + b.querySelector('.ns-g').value : 'none'; });
  /* 2. Today's stats from the card */
  await page.evaluate(() => { const b = [...document.querySelectorAll('.r2-ov.on #b3Card [data-ns="open"]')].pop(); b.scrollIntoView({ block: 'center' }); }); await L.sleep(400);
  await page.locator('.r2-ov.on #b3Card [data-ns="open"]').last().click({ timeout: 60000 });
  await page.waitForFunction(() => { const o = document.querySelector('.ns-ov.on .r2-sh'); if (!o) return false; const m = new DOMMatrix(getComputedStyle(o).transform); return Math.abs(m.m42) < 1; }, null, { timeout: 20000, polling: 250 }).catch(() => {});
  await settle();
  R.stats = await page.evaluate(() => {
    const ov = document.querySelector('.ns-ov'); if (!ov) return { err: 'no stats sheet' };
    const sh = ov.querySelector('.r2-sh'), r = sh.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + 60);
    return { onTop: !!(top && ov.contains(top)), score: ov.querySelector('.ns-score').textContent, mood: ov.querySelector('.ns-mood').textContent, rows: [...ov.querySelectorAll('.ns-row')].map(x => x.querySelector('.ns-name').textContent + ' ' + x.querySelector('.ns-val').textContent + ' | ' + x.querySelector('.ns-left').textContent), sheet: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), innerWidth, innerHeight] };
  });
  R.statsTaps = await tapCheck('.ns-ov .ns-acts button');
  await page.evaluate(() => { document.querySelector('.ns-ov .r2-sh').scrollTop = 0; }); await L.sleep(300);
  await page.screenshot({ path: out + '-' + view + '-' + lang + '-stats.png' });
  /* 3. Set my targets: doctor's sugar limit 2 g (so 1.4 g of oats sugar breaks it) */
  await page.click('.ns-ov [data-ns="targets"]'); await L.sleep(400);
  R.formTaps = await tapCheck('.ns-ov .ns-form input, .ns-ov .ns-form button');
  await page.fill('.ns-ov input[name="sugar"]', '1'); await page.fill('.ns-ov input[name="protein"]', '90');
  await page.screenshot({ path: out + '-' + view + '-' + lang + '-targets.png' });
  await page.click('.ns-ov .ns-form button[type="submit"]'); await L.sleep(500);
  R.afterSave = await page.evaluate(() => ({ goals: LowiVitalsBridge.state().user.macroGoals, sugar: document.querySelector('.ns-ov [data-ns-stat="sugar"]').className + ' ' + document.querySelector('.ns-ov [data-ns-stat="sugar"] .ns-left').textContent, protein: document.querySelector('.ns-ov [data-ns-stat="protein"] .ns-val').textContent, mood: document.querySelector('.ns-ov .ns-mood').textContent }));
  await page.screenshot({ path: out + '-' + view + '-' + lang + '-saved.png' });
  /* reload: targets kept */
  await page.reload(); await L.sleep(6000);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await L.sleep(300); }
  R.afterReload = await page.evaluate(() => ({ goals: (LowiVitalsBridge.state().user || {}).macroGoals, rows: LowiNutriStatsCore.rows(LowiVitalsBridge.state()).rows.map(r => r.k + ':' + r.value + '/' + r.target + ':' + r.state) }));
  /* 4. Log meal sheet gets the strip; tapping it puts the stats on top */
  await page.evaluate(() => { try { LowiSpirit.meal(); } catch (e) { window.__err = String(e); } }); await L.sleep(1500);
  await page.waitForFunction(() => { const s = document.querySelector('.sp-sheet .ns-strip'); return s && s.getBoundingClientRect().height >= 44; }, null, { timeout: 15000, polling: 250 }).catch(() => {});
  await settle();
  R.strip = await page.evaluate(() => { const s = document.querySelector('.sp-sheet .ns-strip'); if (!s) return { err: 'no strip', sheets: [...document.querySelectorAll('.r2-ov')].map(o => o.className) }; const b = s.getBoundingClientRect(); return { text: s.textContent, box: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height), innerWidth] }; });
  if (!R.strip.err) {
    await page.screenshot({ path: out + '-' + view + '-' + lang + '-logmeal.png' });
    await page.click('.sp-sheet .ns-strip');
    await page.waitForFunction(() => { const o = document.querySelector('.ns-ov.on .r2-sh'); if (!o) return false; const m = new DOMMatrix(getComputedStyle(o).transform); return Math.abs(m.m42) < 1; }, null, { timeout: 20000, polling: 250 }).catch(() => {});
    await settle();
    R.stripOpen = await page.evaluate(() => { const ov = document.querySelector('.ns-ov'); if (!ov) return 'no sheet'; const r = ov.querySelector('.r2-sh').getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + 80); return ov.contains(t) ? 'on top' : 'covered by ' + (t && t.className); });
    R.logBtn = await page.evaluate(async () => { document.querySelector('.ns-ov [data-ns="log"]').click(); await new Promise(r => setTimeout(r, 1200)); return { statsGone: !document.querySelector('.ns-ov.on'), mealOpen: !!document.querySelector('.sp-sheet.on, .r2-ov.sp-sheet') }; });
  }
  R.errors = h.log.pageerror;
  console.log(JSON.stringify(R, null, 1));
  await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(1); });
