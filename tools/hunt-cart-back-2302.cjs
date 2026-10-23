'use strict';
/* Bug hunt 23 Oct 23:02: swipe back (history.back) on Shop it. Before the fix, back left Shop it open and switched the
   tab under it to Home, and the next back left the app. Checks: Cook tab > Shop it, Shuffle pick > Shop it, cart > shop at
   the store (in-store list) > back closes the list only > back closes the cart; a sheet opened over the cart closes alone.
   node tools/hunt-cart-back-2302.cjs <device> [url|root] [lang] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en';
  const o = { device, engine: 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page; let bad = 0;
  await R.ctx.addInitScript((l) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  console.log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null), device, lang);
  const st = () => P.evaluate(() => { const o = id => { const e = document.getElementById(id); return !!(e && e.classList.contains('open')); };
    return { inApp: !!document.getElementById('whPad'), tab: typeof TAB !== 'undefined' ? TAB : null, cart: o('lsCart'), shop: o('lcShop'), sheet: o('sheetwrap'), r2: document.querySelectorAll('.r2-ov.on:not(.off)').length }; }).catch(e => ({ err: e.message }));
  const expect = async (lbl, want) => { const s = await st(); const ok = Object.keys(want).every(k => s[k] === want[k]); if (!ok) bad++; console.log(ok ? 'OK  ' : 'BAD ', lbl, JSON.stringify(s)); return s; };
  const back = async () => { await P.evaluate(() => history.back()).catch(() => { }); await H.sleep(1600); };
  const toCook = async () => { await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { closeCart(); } catch (e) { } if (typeof goTab === 'function') goTab('shelf'); }); await H.sleep(1400); };
  const SHOP = /^(Shop it|Einkaufen|Comprarlo)$/;
  /* 1: Cook tab > Shop it */
  await toCook();
  await R.tapEl(P.locator('#tab-shelf .cs-btn, #shBody .cs-btn').filter({ hasText: SHOP }).filter({ visible: true }).first()); await H.sleep(2000);
  await expect('cook tab > Shop it opens', { inApp: true, cart: true });
  await back(); await expect('back closes Shop it, stays on Cook', { inApp: true, cart: false, tab: 'shelf' });
  await back(); await expect('back again goes Home', { inApp: true, cart: false, tab: 'home' });
  /* 2: Shuffle pick > Shop it */
  await toCook();
  await R.tap('#r5Go').catch(e => console.log('shuffle tap fail', e.message)); await H.sleep(4500);
  if (await P.locator('#r5Shop').isVisible().catch(() => false)) {
    await R.tap('#r5Shop'); await H.sleep(2000);
    await expect('pick > Shop it opens', { inApp: true, cart: true });
    await back(); await expect('back closes Shop it only, the pick waits under it', { inApp: true, cart: false, tab: 'shelf', r2: 1 });
    await back(); await expect('back closes the pick, stays on Cook', { inApp: true, cart: false, tab: 'shelf', r2: 0 });
  } else console.log('SKIP pick: no #r5Shop');
  /* 3: cart > in-store list > back > back */
  await toCook();
  await R.tapEl(P.locator('#tab-shelf .cs-btn, #shBody .cs-btn').filter({ hasText: SHOP }).filter({ visible: true }).first()); await H.sleep(1800);
  const shopBtn = P.locator('#lsCart [data-lc="shop"]').filter({ visible: true }).first();
  if (await shopBtn.count()) {
    await R.tapEl(shopBtn); await H.sleep(1500);
    await expect('in-store list opens', { inApp: true, cart: true, shop: true });
    await back(); await expect('back closes the in-store list only', { inApp: true, cart: true, shop: false });
    await back(); await expect('back closes Shop it', { inApp: true, cart: false, tab: 'shelf' });
  } else console.log('SKIP in-store: no shop button (empty cart?)');
  /* 4: a sheet over the cart (add a meal) closes alone */
  await toCook();
  await R.tapEl(P.locator('#tab-shelf .cs-btn, #shBody .cs-btn').filter({ hasText: SHOP }).filter({ visible: true }).first()); await H.sleep(1800);
  const add = P.locator('#lsCart [data-lc="addmeal"]').filter({ visible: true }).first();
  if (await add.count()) {
    await R.tapEl(add); await H.sleep(1500);
    const s0 = await st(); console.log('    sheet over cart', JSON.stringify(s0));
    if (s0.sheet || s0.r2) { await back(); await expect('back closes the sheet, cart stays', { inApp: true, cart: true, sheet: false, r2: 0, tab: 'shelf' }); await back(); await expect('back closes Shop it', { inApp: true, cart: false, tab: 'shelf' }); }
  } else console.log('SKIP add meal: no button');
  console.log('RESULT', bad ? 'FAIL ' + bad : 'PASS', 'errs', JSON.stringify(R.errs).slice(0, 600), 'crashed', R.crashed);
  await R.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
