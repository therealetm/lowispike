'use strict';
/* Oct 23 check (Eman: "when they scan chips, chocolate, Haribo, biscuits, give them real alternatives they would buy"):
   1) scan a Haribo barcode (Open Food Facts mocked with full sugar data): the card shows the Seller Zone buys under the verdict,
      three links to shop pages, and See all opens the zone on the gummies shelf;
   2) type "Pringles" in the camera's food-name field, Go: the same buys (name estimate path);
   3) Fuel > Shop panel: the Seller Zone entry opens the zone; switch shelves and regions; close ends the world pause.
   Records errors, overflow, cut-off text, English in de/es, with screenshots.
   node tools/check-seller-zone.cjs <device> [url|root] [outdir] [lang en|de|es] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const out = process.argv[4] || '/tmp/check-sz', lang = process.argv[5] || 'en';
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: process.env.ENG || 'webkit', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = device.replace(/\W/g, '') + '-' + lang;
  const HARIBO = { status: 1, code: '4001686301265', product: { product_name: 'Goldb\u00e4ren', brands: 'Haribo', categories_tags: ['en:confectioneries', 'en:gummies'], ingredients_text: 'Glukosesirup, Zucker, Gelatine, Dextrose, Fruchtsaft', nutriments: { 'energy-kcal_100g': 343, carbohydrates_100g: 77, sugars_100g: 46, fat_100g: 0.5, proteins_100g: 6.9, fiber_100g: 0, salt_100g: 0.07 } } };
  await R.ctx.route(u => /(^|\.)openfoodfacts\.org$/.test(new URL(u).host), r => {
    const u = r.request().url();
    if (/4001686301265/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(HARIBO) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 0, products: [] }) });
  });
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); localStorage.removeItem('lowi.sellerZone.region'); } catch (e) { } }, lang);
  R.step = 'load'; await R.goto(); await H.sleep(5000);
  const res = { device, lang, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null), cases: [], finds: [] };
  const find = async (kind, info) => { const f = path.join(out, tag + '-find-' + res.finds.length + '.png'); await R.shot(f); res.finds.push(Object.assign({ kind, shot: f }, info)); console.log('FIND', kind, JSON.stringify(info)); };
  const reset = async () => { try { await P.evaluate(() => { try { LowiSellerZone.close(); } catch (e) { } try { LowiStorePicks.close(); } catch (e) { } }); } catch (e) { } for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(100); } await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('home'); } catch (e) { } }).catch(() => { }); await H.sleep(700); };
  const openScan = async () => { await reset(); await P.evaluate(() => { try { LowiDex.scan(); } catch (e) { } }); await H.sleep(1500); return P.evaluate(() => !!document.querySelector('#b3Cam')); };
  const layout = sel => P.evaluate(sel => {
    const root = document.querySelector(sel); if (!root) return null;
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const wide = [...root.querySelectorAll('*')].filter(e => vis(e) && e.getBoundingClientRect().right > innerWidth + 2 && !e.closest('.sz-chips')).slice(0, 3).map(e => e.className || e.tagName);
    const cut = [...root.querySelectorAll('b,small,span,p,h3,h4,a,button')].filter(e => vis(e) && e.children.length === 0 && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow === 'hidden' && !/-webkit-box/.test(getComputedStyle(e).display)).slice(0, 3).map(e => e.textContent.slice(0, 40));
    return { text: (root.innerText || '').replace(/\s+/g, ' ').trim(), wide, cut, links: [...root.querySelectorAll('a[href]')].map(a => a.href), mini: root.querySelectorAll('.sz-mini').length, cards: root.querySelectorAll('.sz-card').length, on: [...root.querySelectorAll('.sz-chip.on')].map(b => b.getAttribute('data-sz-cat') || b.getAttribute('data-sz-reg')) };
  }, sel);
  const checkText = async (what, s) => {
    if (!s) return;
    if (s.wide.length) await find('overflow', { what, wide: s.wide });
    if (s.cut.length) await find('cut off', { what, cut: s.cut });
    if (/undefined|NaN|\[object/.test(s.text)) await find('broken text', { what, text: s.text.slice(0, 200) });
    if (lang !== 'en' && /\b(Buy this instead|See all in|Open shop|Find on Amazon|Everyday|Sometimes|Checked and not passing)\b/.test(s.text)) await find('english in ' + lang, { what, text: s.text.slice(0, 160) });
  };
  const cardSwap = async what => {
    const s = await layout('.sz-swap');
    await R.shot(path.join(out, tag + '-' + what.replace(/\W+/g, '_') + '.png'));
    console.log(`CASE ${what}: ${s ? 'mini=' + s.mini + ' links=' + s.links.length + ' :: ' + s.text.slice(0, 220) : 'NO SELLER ZONE SWAP'}`);
    res.cases.push({ what, ok: !!(s && s.mini >= 2), s });
    if (!s) { await find('no Seller Zone swap on the scan card', { what }); return false; }
    if (s.mini < 2 || s.links.some(h => !/^https:\/\//.test(h))) await find('swap links', { what, links: s.links });
    await checkText(what, s);
    return true;
  };
  const zone = async (what, wantCat) => {
    await H.sleep(600);
    const s = await layout('#sellerZone');
    await R.shot(path.join(out, tag + '-' + what.replace(/\W+/g, '_') + '.png'));
    const paused = await P.evaluate(() => document.documentElement.classList.contains('sz-open'));
    console.log(`CASE ${what}: ${s ? 'cards=' + s.cards + ' on=' + s.on.join(',') + ' paused=' + paused + ' :: ' + s.text.slice(0, 200) : 'ZONE NOT OPEN'}`);
    res.cases.push({ what, ok: !!(s && s.cards >= 1 && (!wantCat || s.on.includes(wantCat))), s: s && { cards: s.cards, on: s.on } });
    if (!s) { await find('zone did not open', { what }); return false; }
    if (!s.cards) await find('zone empty', { what });
    if (wantCat && !s.on.includes(wantCat)) await find('wrong shelf', { what, on: s.on });
    await checkText(what, s);
    return true;
  };
  const e0 = R.errs.length;
  // 1) Haribo barcode
  if (await openScan()) {
    const inp = P.locator('#b3Cam input[inputmode="numeric"]').first();
    if (!await inp.isVisible().catch(() => false)) { const t = P.locator('#b3Cam').getByText(/Type the number|Nummer eingeben|Escribe el n|Nummer tippen|n\u00famero/i).first(); if (await t.count()) { await R.tapEl(t).catch(() => { }); await H.sleep(500); } }
    await inp.tap().catch(() => { }); await inp.fill('').catch(() => { }); await P.keyboard.type('4001686301265', { delay: 25 });
    const btn = P.locator('#b3Cam button').filter({ hasText: /^(Check|Pr\u00fcfen|Comprobar)/i }).first();
    if (await btn.count()) await R.tapEl(btn).catch(() => { }); else await P.keyboard.press('Enter');
    await H.sleep(7000);
    if (await cardSwap('haribo barcode')) {
      const all = P.locator('.sz-swap .sz-all').first();
      await all.scrollIntoViewIfNeeded().catch(() => { });
      await R.tapEl(all).catch(() => { });
      await zone('see all from haribo', 'gummy');
    }
  } else await find('cannot open scan', {});
  // 2) typed name
  if (await openScan()) {
    const f = P.locator('#b3Cam #b3Nm').first();
    if (await f.count() && await f.isVisible().catch(() => false)) {
      await f.tap().catch(() => { }); await f.fill(''); await P.keyboard.type('Pringles Original', { delay: 30 }); await H.sleep(900);
      await P.keyboard.press('Enter'); await H.sleep(5000);
      await cardSwap('typed pringles');
    } else await find('no name field in the camera', {});
  }
  // 3) Fuel > Shop panel entry
  await reset();
  await P.evaluate(() => { try { LowiStorePicks.open(); } catch (e) { } }); await H.sleep(1500);
  const entry = P.locator('.sz-entry').first();
  if (await entry.count() && await entry.isVisible().catch(() => false)) {
    await entry.scrollIntoViewIfNeeded().catch(() => { });
    await R.tapEl(entry).catch(() => { });
    if (await zone('zone from shop panel')) {
      for (const c of ['chips', 'choc', 'biscuit']) { await R.tapEl(P.locator(`#sellerZone [data-sz-cat="${c}"]`).first()).catch(() => { }); await zone('shelf ' + c, c); }
      for (const r of ['us', 'uk', 'eu']) { await R.tapEl(P.locator(`#sellerZone [data-sz-reg="${r}"]`).first()).catch(() => { }); await zone('region ' + r, r); }
      await R.tapEl(P.locator('#sellerZone .sz-close').first()).catch(() => { }); await H.sleep(600);
      const after = await P.evaluate(() => ({ open: !!document.querySelector('#sellerZone'), paused: document.documentElement.classList.contains('sz-open'), shop: !!(window.LowiStorePicks && LowiStorePicks.isOpen()) }));
      console.log('CASE close:', JSON.stringify(after));
      res.cases.push({ what: 'close', ok: !after.open && !after.paused, after });
      if (after.open || after.paused) await find('close did not end the zone or the pause', after);
    }
  } else { await R.shot(path.join(out, tag + '-shop-panel.png')); await find('no Seller Zone entry in the Shop panel', {}); }
  const errs = R.errs.slice(e0).filter(e => !/favicon|openfoodfacts|net::ERR|Failed to load resource|supabase|ERR_NAME|status of 4\d\d/i.test(String(e)));
  if (errs.length) await find('page errors', { errs: errs.slice(0, 5).map(String) });
  res.ok = res.cases.length >= 6 && res.cases.every(c => c.ok) && !res.finds.length;
  fs.writeFileSync(path.join(out, tag + '.json'), JSON.stringify(res, null, 2));
  console.log('RESULT', tag, res.build, res.ok ? 'PASS' : 'FAIL', res.cases.filter(c => c.ok).length + '/' + res.cases.length, 'finds=' + res.finds.length);
  await R.close();
})().catch(e => { console.error(e); process.exit(1); });
